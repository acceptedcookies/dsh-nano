import { spawnSync } from 'node:child_process'

const P = '/Users/seanz/Documents/dsh-plugins/.agents/worktrees/dncs-1119/dsh-nano-cloud-session/'

const cases = {
  '1-track-rejection': `
import {createWorkspaceScopes} from '${P}src/host/workspace-scopes.js';
const s=createWorkspaceScopes();
try { await s.track({}, Promise.reject(new Error('CONTROLLED_RESOURCE_REJECTION'))) } catch { console.log('CALLER_CAUGHT') }
await new Promise(r=>setTimeout(r,25)); console.log('SURVIVED');
`,
  '2-stale-read': `
import {createWorkspaceScopes} from '${P}src/host/workspace-scopes.js';
const s=createWorkspaceScopes(); let release;
const snap=await s.connect({id:'p',orgId:'org-test',baseUrl:'https://api.devin.ai',secret:'fake'}, {session_id:'abc'}, async()=>({root:'/tmp',resources:'ready'}));
const work=s.track(s.get(snap.scopeId),new Promise(r=>{release=r}));
await s.invalidateProfile('p'); release('LATE_OLD_GENERATION_DATA');
console.log({returned:await work,remaining:s.list().length});
`,
  '3-pagination-complete': `
import {readMessagePages} from '${P}src/providers/devin/chat.js';
let n=0; const r=await readMessagePages({getMessages:async()=>({items:[{event_id:\`e\${++n}\`}],has_next_page:true,end_cursor:\`c\${n}\`})},{},'abc',{pages:2});
console.log({pages:r.pages,items:r.items.length,complete:r.complete,cursorStuck:r.cursorStuck});
`,
  '4-symlink-rename': `
import {mkdtempSync,writeFileSync,symlinkSync,existsSync,readlinkSync} from 'node:fs'; import {tmpdir} from 'node:os'; import {join} from 'node:path';
import {createFilesystem} from '${P}src/remote/filesystem.js';
const root=mkdtempSync(join(tmpdir(),'dncs-review-symlink-'));writeFileSync(join(root,'target.txt'),'SAFE');symlinkSync('target.txt',join(root,'link.txt'));
createFilesystem(root).rename({from:'link.txt',to:'moved.txt'});
console.log({root,targetExists:existsSync(join(root,'target.txt')),movedExists:existsSync(join(root,'moved.txt')),linkTarget:readlinkSync(join(root,'link.txt'))});
`,
  '5-invalid-codec-http': `
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dncs-res-'))
const { apply } = await import('file://${P}index.js?wire=' + Date.now())
const routes = new Map()
const ctx = {
  get: (n) => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx.webServer : undefined,
  webServer: { register: (spec) => { routes.set(spec.path, spec.handler); return () => {} } },
  effect: (fn) => fn(),
}
apply(ctx, { requestTimeoutMs: 5000 })
const fakeReq = (body) => { const req = Readable.from([Buffer.from(JSON.stringify(body ?? {}))]); req.method = 'POST'; req.headers = { 'content-type': 'application/json' }; return req }
const fakeRes = () => ({ statusCode: 0, body: '', headers: {}, writableEnded: false, setHeader(k, v) { this.headers[k] = v }, end(s) { this.body = s; this.writableEnded = true } })
const res = fakeRes()
await routes.get('/nano-cloud-session/resources')(fakeReq({ op: 'fs.read', scopeId: 'not-needed', path: 'x', length: 65537 }), res, { bodyLimit: 65536 })
console.log({ http: res.statusCode, json: JSON.parse(res.body || '{}') })
`,
}

for (const [name, code] of Object.entries(cases)) {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 60000 })
  console.log(`===== ${name} exit=${r.status} signal=${r.signal ?? 'none'}`)
  console.log('--- stdout ---')
  process.stdout.write(r.stdout || '(empty)\n')
  console.log('--- stderr ---')
  process.stdout.write(r.stderr || '(empty)\n')
}
