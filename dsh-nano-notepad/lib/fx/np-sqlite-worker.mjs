// notepad sqlite worker — installs opfs-sahpool inside the worker
// (createSyncAccessHandle exists on worker threads, not the main thread),
// then hands the thread to the worker1 message API. Sibling of sqlite3.mjs
// under /nano-notepad/fx/sdk/.
import init from './sqlite3.mjs'
init().then(async (sqlite3) => {
  await sqlite3.installOpfsSAHPoolVfs({ name: 'opfs-sahpool' })
  sqlite3.initWorker1API()
}).catch((e) => {
  postMessage({ type: 'worker1-init-error', message: String(e) })
})
