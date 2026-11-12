/**
 * 04 — nsw-tree-rel-escape (PoCs: v-memberlp tree half, v-sym symlink, v-gitcfg)
 *
 * A remote tree HEAD is co-tenant writable. Malicious `rel`s previously steered
 * pullWorkspace writes outside the replica or onto credential paths:
 *   - `../escape` / `/etc/passwd` — lexical + absolute escapes;
 *   - `imagine/.grok/auth.json`, `.git/config` — SKIP-set credential paths;
 *   - `link/pwned` where `link` is a pre-existing symlink → write lands in the
 *     link target (outside the replica);
 *   - stale-delete following a symlinked entry → deletes the outside victim.
 *
 * Oracle: HEADs with `..`/abs rels are SchemaReject'd whole (no file ever
 * materializes), SKIP rels and symlink-underneath writes are fenced
 * (silently skipped, attacker target never created), stale-delete never
 * touches a symlink, and pushWorkspace never enumerates SKIP/symlinked files.
 *
 * Pure host-function replay — fakeS3 + tmp dirs, no live base.
 */
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fakeS3, headOf, WS, tmp, sha256hex, isSchemaReject, settle, verdicts,
} from '../lib/nsw-fakes.mjs'
import { pullWorkspace, pushWorkspace } from '../../../deprecated/dsh-nano-shared-workspace/src/host/tree.js'

export const fingerprint = 'nsw-tree-rel-escape'
export const describe =
  'tree-head rel ../x | /abs | imagine/.grok/auth.json | symlinked parent — ' +
  'SchemaReject or fenced skip; attacker path never materializes'

export async function run() {
  const v = verdicts()

  /* (a) `..` rel — whole-HEAD SchemaReject before any write, and the escape
   *     target (replica's sibling) never appears on disk. */
  {
    const parent = tmp()
    const root = join(parent, 'replica')
    const sha = sha256hex(Buffer.from('pwned'))
    const s3 = fakeS3({
      [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, [{ rel: '../escape', sha256: sha, size: 5 }]),
      [`workspaces/${WS}/tree/blobs/${sha}`]: Buffer.from('pwned'),
    })
    const r = await settle(() => pullWorkspace(s3, tmp(), WS, root))
    v.check('dotdot-rel-schema-rejected', r.threw && isSchemaReject(r.error, 'schema:rel'),
      r.threw ? `${r.error?.reason}` : 'pulled')
    v.check('dotdot-rel-no-escape-file', !existsSync(join(parent, 'escape')))
  }

  /* (b) Absolute rel — same whole-object reject. */
  {
    const sha = sha256hex(Buffer.from('x'))
    const s3 = fakeS3({
      [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, [{ rel: '/etc/passwd', sha256: sha, size: 1 }]),
    })
    const r = await settle(() => pullWorkspace(s3, tmp(), WS, tmp()))
    v.check('abs-rel-schema-rejected', r.threw && isSchemaReject(r.error, 'schema:rel'),
      r.threw ? `${r.error?.reason}` : 'pulled')
  }

  /* (c) SKIP set: imagine/.grok/auth.json + .git/config validate as rels but
   *     are fenced — the directories are never created under the replica. */
  {
    const root = tmp()
    const ok = Buffer.from('hello')
    const creds = Buffer.from('{"token":"AKIA…"}')
    const files = [
      { rel: 'src/ok.txt', sha256: sha256hex(ok), size: ok.length },
      { rel: 'imagine/.grok/auth.json', sha256: sha256hex(creds), size: creds.length },
      { rel: '.git/config', sha256: sha256hex(creds), size: creds.length },
    ]
    const s3 = fakeS3({
      [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, files),
      [`workspaces/${WS}/tree/blobs/${files[0].sha256}`]: ok,
      [`workspaces/${WS}/tree/blobs/${files[1].sha256}`]: creds,
      [`workspaces/${WS}/tree/blobs/${files[2].sha256}`]: creds,
    })
    const res = await pullWorkspace(s3, tmp(), WS, root)
    v.check('skip-set-pull-ok', res?.ok === true, `res=${JSON.stringify(res)}`)
    v.check('skip-set-safe-file-written', existsSync(join(root, 'src/ok.txt')))
    v.check('skip-set-no-imagine-dir', !existsSync(join(root, 'imagine')))
    v.check('skip-set-no-git-dir', !existsSync(join(root, '.git')))
  }

  /* (d) Symlinked parent: rel 'link/evil.txt' where root/link → outside.
   *     The write must be fenced, never land in `outside`. */
  {
    const root = tmp()
    const outside = tmp()
    symlinkSync(outside, join(root, 'link'), 'dir')
    const buf = Buffer.from('pwned')
    const sha = sha256hex(buf)
    const s3 = fakeS3({
      [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, [{ rel: 'link/evil.txt', sha256: sha, size: buf.length }]),
      [`workspaces/${WS}/tree/blobs/${sha}`]: buf,
    })
    const res = await pullWorkspace(s3, tmp(), WS, root)
    v.check('symlink-pull-ok-fenced', res?.ok === true)
    v.check('symlink-no-write-outside', !existsSync(join(outside, 'evil.txt')))
  }

  /* (e) Stale-delete respects the fence: a symlinked rel in the local base is
   *     skipped — the outside victim keeps its contents. */
  {
    const wsId = WS
    const root = tmp()
    const outside = tmp()
    writeFileSync(join(outside, 'victim.txt'), 'precious')
    writeFileSync(join(root, 'gone.txt'), 'old')
    symlinkSync(join(outside, 'victim.txt'), join(root, 'link.txt'))
    const dshHome = tmp()
    mkdirSync(join(dshHome, 'nsw'), { recursive: true })
    writeFileSync(join(dshHome, 'nsw', `${wsId}.json`), JSON.stringify({
      generation: 4,
      files: [{ rel: 'gone.txt', sha256: 'a'.repeat(64), size: 3 }, { rel: 'link.txt', sha256: 'b'.repeat(64), size: 3 }],
    }))
    const s3 = fakeS3({ [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, []) })
    await pullWorkspace(s3, dshHome, wsId, root)
    v.check('stale-delete-regular-removed', !existsSync(join(root, 'gone.txt')))
    v.check('stale-delete-symlink-untouched',
      existsSync(join(root, 'link.txt')) && readFileSync(join(outside, 'victim.txt'), 'utf8') === 'precious')
  }

  /* (f) Push side: SKIP + symlinks never enumerated into a HEAD/blob. */
  {
    const root = tmp()
    mkdirSync(join(root, 'imagine/.grok'), { recursive: true })
    writeFileSync(join(root, 'imagine/.grok/auth.json'), 'creds')
    mkdirSync(join(root, '.git'), { recursive: true })
    writeFileSync(join(root, '.git/config'), 'gitconfig')
    writeFileSync(join(root, 'src.txt'), 'shareable')
    const outside = tmp()
    writeFileSync(join(outside, 'secret'), 's3cr3t')
    symlinkSync(join(outside, 'secret'), join(root, 'leak.txt'))
    const s3 = fakeS3({
      [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, [], { generation: 1, parent: 0 }),
    })
    const res = await pushWorkspace(s3, tmp(), WS, root, 'w@deadbeef')
    const head = s3.raw(`workspaces/${WS}/tree/HEAD.json`)
    const rels = (head?.files ?? []).map(f => f.rel).sort()
    v.check('push-enumerates-only-safe', res?.ok === true && JSON.stringify(rels) === JSON.stringify(['src.txt']),
      `rels=${rels.join(',')}`)
    const blobKeys = s3.putConds.map(c => c.key).concat(s3.hits.filter(h => h.startsWith('PUTB')).map(h => h.slice(5)))
    v.check('push-no-creds-blobs', blobKeys.every(k => !k.includes('imagine') && !k.includes('.git') && !k.includes('secret')),
      `keys=${blobKeys.join(',') || 'none'}`)
  }

  /* (g) Replica root itself must be absolute + non-symlink. */
  {
    const s3 = fakeS3({ [`workspaces/${WS}/tree/HEAD.json`]: headOf(WS, []) })
    const r1 = await settle(() => pullWorkspace(s3, tmp(), WS, 'relative/path'))
    v.check('relative-root-rejected', r1.threw && isSchemaReject(r1.error, 'schema:localPath'))
    const realDir = tmp()
    const linkDir = join(tmp(), 'link')
    symlinkSync(realDir, linkDir, 'dir')
    const r2 = await settle(() => pullWorkspace(s3, tmp(), WS, linkDir))
    v.check('symlink-root-rejected', r2.threw && isSchemaReject(r2.error, 'schema:localPath'))
  }

  return v.result('schema:rel')
}
