#!/usr/bin/env python3
# DNLS PTY broker worker — one per original execution, inside the guest.
# Control surface is a single 0600 AF_UNIX socket in a private 0700 dir
# (production: root-owned /run/dnls-pty). No TCP listener, no token, no
# shell access for clients — JSON lines only.
#
#   pty-worker.py --socket PATH --ready-fd FD --root DIR --user NAME \
#                 --cwd DIR --cols N --rows N
#
# Requests (one JSON object per line):
#   {"verb":"status"}            -> {"ok":true,"state":"active|ended","pid":N}
#   {"verb":"input","data":str}  -> {"ok":true} (or accepted byte count)
#   {"verb":"read","from":seq}   -> {"ok":true,"seq":N,"from":seq,"bytes_b64":str,"ended":bool}
#   {"verb":"resize","cols":N,"rows":N} -> {"ok":true}
#   {"verb":"drain","from":seq}  -> read-shaped lines until ended
#   {"verb":"close"}             -> {"ok":true,"ended":true} after the child is
#                                 reaped, then the worker exits
#
# The socket binds BEFORE the fork so a bootstrap failure can never orphan a
# shell. The child is reaped only by this loop — never getpgid/kill on a pid
# we may have already reaped: once `reaped` is set the number can be recycled
# by the OS and signalling it would hit an unrelated process.

import base64
import errno
import fcntl
import json
import os
import pty
import pwd
import select
import selectors
import signal
import socket
import struct
import sys
import termios
import time

MAX_LINE = 1 << 16          # one request line
MAX_INPUT = 1 << 20         # per-request input payload
MAX_OUTQ = 1 << 21          # per-client pending reply bytes
RING_MAX = 1 << 20          # retained output bytes across all chunks
OUT_CHUNK = 65536
HUP_GRACE_S = 2.0
SHELL = '/bin/sh'


def fail(message):
    sys.stderr.write(f'pty-worker: {message}\n')
    sys.exit(2)


def parse_args(argv):
    opts = {'--socket': None, '--ready-fd': '-1', '--root': '/run/dnls-pty',
            '--user': 'node', '--cwd': '/', '--cols': '80', '--rows': '24'}
    it = iter(range(0, len(argv), 2))
    for i in it:
        if argv[i] in opts and i + 1 < len(argv):
            opts[argv[i]] = argv[i + 1]
        else:
            fail(f'bad argument: {argv[i]}')
    if not opts['--socket']:
        fail('--socket is required')
    return opts


def check_root(root):
    st = os.lstat(root)
    if not os.path.isdir(root) or (st.st_mode & 0o077) != 0 or st.st_uid not in (0, os.geteuid()):
        fail(f'root dir {root} must exist, be owned by uid 0 or this user, and be mode 0700')


def main():
    opts = parse_args(sys.argv[1:])
    root = opts['--root']
    check_root(root)
    sock_path = opts['--socket']
    if os.path.dirname(sock_path) != root:
        fail('socket must live directly under the private root')
    cwd = opts['--cwd']
    # Reject an invalid guest cwd outright — never silently land in HOME.
    if not cwd.startswith('/') or '..' in cwd.split('/') or not os.path.isdir(cwd):
        fail(f'invalid cwd: {cwd}')

    # Bind + listen before the fork: bootstrap failures never orphan a shell.
    if os.path.lexists(sock_path):
        fail('socket already exists — never replace a live endpoint')
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        server.bind(sock_path)
        os.chmod(sock_path, 0o600)
        server.listen(4)
        server.setblocking(False)
    except OSError:
        try:
            os.unlink(sock_path)
        except OSError:
            pass
        raise

    pid, master = pty.fork()
    if pid == 0:
        # Child: controlling terminal is already ours (forkpty). Become the
        # declared guest user, then exec the fixed shell with minimal env —
        # no inherited credentials, no host path.
        if os.getuid() == 0:
            try:
                entry = pwd.getpwnam(opts['--user'])
            except KeyError:
                os._exit(126)
            os.setgroups([])
            os.setgid(entry.pw_gid)
            os.setuid(entry.pw_uid)
            home = entry.pw_dir
        else:
            home = os.path.expanduser('~')
        try:
            os.chdir(cwd)
        except OSError:
            os._exit(126)
        env = {'HOME': home, 'PATH': '/usr/local/bin:/usr/bin:/bin', 'TERM': 'xterm-256color', 'SHELL': SHELL}
        os.execve(SHELL, [SHELL], env)
        os._exit(127)
    winsz = struct.pack('HHHH', int(opts['--rows']), int(opts['--cols']), 0, 0)
    fcntl.ioctl(master, termios.TIOCSWINSZ, winsz)
    os.set_blocking(master, False)

    # Bootstrap complete: signal readiness and go quiet — no stdio held.
    ready_fd = int(opts['--ready-fd'])
    if ready_fd >= 0:
        os.write(ready_fd, b'ready\n')
        os.close(ready_fd)
    for fd in (0, 1, 2):
        devnull = os.open('/dev/null', os.O_RDWR)
        os.dup2(devnull, fd)
        os.close(devnull)

    sel = selectors.DefaultSelector()
    sel.register(server, selectors.EVENT_READ, 'accept')
    sel.register(master, selectors.EVENT_READ, 'pty')

    ring = []          # [(seq, bytes)] — ephemeral tail, not a restore source
    head = 0           # absolute byte offset of ring[0]
    next_seq = 0       # absolute byte offset after the last byte
    reaped = False     # waitpid reaped OUR child; `pid` is dead to us
    pty_dead = False   # master EOF/EIO seen
    exit_status = None
    pending = {}       # fd -> partial request bytes
    outq = {}          # fd -> bytearray not yet written
    drains = {}        # fd -> last seq enqueued
    conns = {}

    def child_gone():
        return reaped or pty_dead

    def reap(block=False):
        nonlocal reaped, exit_status
        if reaped:
            return True
        try:
            done, status = os.waitpid(pid, 0 if block else os.WNOHANG)
        except ChildProcessError:
            reaped = True
            return True
        if done == pid:
            reaped = True
            exit_status = os.waitstatus_to_exitcode(status)
        return reaped

    def kill_session():
        # Only signal while the child is still ours: a reaped pid may already
        # be recycled. HUP first, escalate to KILL inside a bounded grace.
        if reap():
            return
        try:
            os.killpg(os.getpgid(pid), signal.SIGHUP)
        except (ProcessLookupError, PermissionError, OSError):
            pass
        deadline = time.monotonic() + HUP_GRACE_S
        while time.monotonic() < deadline:
            if reap():
                return
            time.sleep(0.05)
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError, OSError):
            pass
        reap(block=True)

    def close_conn(conn):
        fd = conn.fileno()
        try:
            sel.unregister(conn)
        except Exception:
            pass
        conns.pop(fd, None)
        pending.pop(fd, None)
        outq.pop(fd, None)
        drains.pop(fd, None)
        try:
            conn.close()
        except OSError:
            pass

    def answer(conn, obj):
        # Incremental writes only: never partially emit a reply and pretend
        # it landed whole. A client that cannot drain is disconnected.
        fd = conn.fileno()
        buf = outq.get(fd)
        if buf is None:
            buf = outq[fd] = bytearray()
        buf.extend(json.dumps(obj).encode() + b'\n')
        if len(buf) > MAX_OUTQ:
            close_conn(conn)
            return False
        try:
            sel.modify(conn, selectors.EVENT_READ | selectors.EVENT_WRITE, 'conn')
        except Exception:
            close_conn(conn)
            return False
        return True

    def flush(conn):
        fd = conn.fileno()
        buf = outq.get(fd)
        if not buf:
            try:
                sel.modify(conn, selectors.EVENT_READ, 'conn')
            except Exception:
                pass
            return
        try:
            sent = conn.send(buf)
        except (BlockingIOError, InterruptedError):
            return
        except OSError:
            close_conn(conn)
            return
        del buf[:sent]
        if not buf:
            try:
                sel.modify(conn, selectors.EVENT_READ, 'conn')
            except Exception:
                pass

    def pull_pty():
        nonlocal next_seq, head, pty_dead
        try:
            chunk = os.read(master, OUT_CHUNK)
        except OSError as e:
            if e.errno == errno.EIO:
                pty_dead = True
                return
            raise
        if not chunk:
            pty_dead = True
            return
        ring.append((next_seq, chunk))
        next_seq += len(chunk)
        while next_seq - head > RING_MAX and len(ring) > 1:
            first_seq, first = ring.pop(0)
            head = first_seq + len(first)

    def retire_master():
        nonlocal pty_dead
        pty_dead = True
        try:
            sel.unregister(master)
        except Exception:
            pass
        try:
            os.close(master)
        except OSError:
            pass

    def read_reply(frm):
        if not isinstance(frm, int) or frm < 0:
            frm = head
        if frm < head:
            frm = head
        if frm > next_seq:
            frm = next_seq
        data = b''.join(chunk[max(frm - seq, 0):] for seq, chunk in ring if seq + len(chunk) > frm)
        return {'ok': True, 'seq': next_seq, 'from': frm,
                'bytes_b64': base64.b64encode(data).decode('ascii'), 'ended': child_gone()}

    def handle(conn, line):
        try:
            req = json.loads(line)
        except ValueError:
            return answer(conn, {'ok': False, 'error': 'bad request'})
        verb = req.get('verb')
        if verb == 'status':
            reap()
            return answer(conn, {'ok': True, 'state': 'ended' if child_gone() else 'active',
                                 'pid': pid, 'exit': exit_status})
        if verb == 'input':
            data = req.get('data')
            if not isinstance(data, str) or len(data.encode('utf8', 'ignore')) > MAX_INPUT:
                return answer(conn, {'ok': False, 'error': 'input out of bounds'})
            if child_gone():
                return answer(conn, {'ok': False, 'error': 'ended'})
            payload = data.encode('utf8', 'ignore')
            accepted = 0
            while accepted < len(payload):
                try:
                    accepted += os.write(master, payload[accepted:])
                except (BlockingIOError, InterruptedError):
                    _, writable, _ = select.select([], [master], [], 2.0)
                    if not writable:
                        return answer(conn, {'ok': False, 'error': 'pty write timeout', 'accepted': accepted})
                except OSError:
                    # Report exactly what was accepted; never replay the rest.
                    return answer(conn, {'ok': False, 'error': 'pty closed', 'accepted': accepted})
            return answer(conn, {'ok': True})
        if verb == 'read':
            return answer(conn, read_reply(req.get('from')))
        if verb == 'drain':
            reply = read_reply(req.get('from'))
            if not answer(conn, reply):
                return
            if reply['ended']:
                return
            drains[conn.fileno()] = reply['seq']
            return
        if verb == 'resize':
            try:
                cols, rows = int(req['cols']), int(req['rows'])
            except (KeyError, TypeError, ValueError):
                return answer(conn, {'ok': False, 'error': 'resize out of bounds'})
            if not (2 <= cols <= 512 and 2 <= rows <= 512):
                return answer(conn, {'ok': False, 'error': 'resize out of bounds'})
            if not pty_dead:
                fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
            return answer(conn, {'ok': True})
        if verb == 'close':
            # Reap before any positive receipt: a lost child is unknown, not ok.
            kill_session()
            retire_master()
            for fd in list(conns):
                if fd != conn.fileno():
                    close_conn(conns[fd])
            answer(conn, {'ok': True, 'ended': True})
            # The reply must leave whole: block briefly on the final flush
            # rather than exiting mid-write.
            try:
                conn.setblocking(True)
                conn.sendall(bytes(outq.get(conn.fileno(), b'')))
            except OSError:
                pass
            try:
                os.unlink(sock_path)
            except OSError:
                pass
            sys.exit(0)
        answer(conn, {'ok': False, 'error': 'unknown verb'})

    try:
        while True:
            # Block until work exists; once the child is reaped there is no
            # ticking left to do — an idle ended worker does not spin.
            events = sel.select(None if reaped else 1.0)
            for key, mask in events:
                if key.data == 'accept':
                    conn, _ = server.accept()
                    conn.setblocking(False)
                    sel.register(conn, selectors.EVENT_READ, 'conn')
                    conns[conn.fileno()] = conn
                    pending[conn.fileno()] = b''
                    outq[conn.fileno()] = bytearray()
                elif key.data == 'pty':
                    pull_pty()
                    if pty_dead:
                        retire_master()
                        reap()
                else:
                    conn = key.fileobj
                    if mask & selectors.EVENT_WRITE:
                        flush(conn)
                    if mask & selectors.EVENT_READ:
                        try:
                            data = conn.recv(MAX_LINE + 1)
                        except OSError:
                            data = b''
                        fd = conn.fileno()
                        if not data or len(pending.get(fd, b'')) + len(data) > MAX_LINE:
                            close_conn(conn)
                            continue
                        pending[fd] += data
                        while b'\n' in pending[fd]:
                            line, pending[fd] = pending[fd].split(b'\n', 1)
                            if line.strip():
                                handle(conn, line)
            # drainers get each new chunk until the session ends
            for fd, last in list(drains.items()):
                conn = conns.get(fd)
                if conn is None:
                    drains.pop(fd, None)
                    continue
                reply = read_reply(last)
                if reply['bytes_b64'] or reply['ended']:
                    if not answer(conn, reply):
                        continue
                    drains[fd] = reply['seq']
                    if reply['ended']:
                        drains.pop(fd, None)
            reap()
    finally:
        kill_session()
        try:
            os.unlink(sock_path)
        except OSError:
            pass


if __name__ == '__main__':
    main()
