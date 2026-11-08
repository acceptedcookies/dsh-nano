import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')
const built = spawnSync('npx', [
  '--yes', 'esbuild@0.25.0',
  'src/client/index.jsx',
  '--bundle',
  '--format=iife',
  '--platform=browser',
  '--jsx=transform',
  '--loader:.svg=text',
  '--loader:.png=dataurl',
  '--external:react',
  '--external:react-dom',
  '--external:react-dom/client',
  '--external:@deepseek-ai/dsh-client-ui-primitives',
  `--outfile=${body}`,
], {
  cwd: root,
  stdio: 'inherit',
})
if (built.status !== 0) process.exit(built.status ?? 1)

const source = readFileSync(body, 'utf8')
const start = source.indexOf('{')
const end = source.lastIndexOf('}')
const inner = source.slice(start + 1, end)
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
\tid: "dsh-nano-model-selector",
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${inner}
\t\texports.apply = apply;
\t\texports.inject = inject;
\t\treturn module.exports;
\t}
});
`)
rmSync(body)
