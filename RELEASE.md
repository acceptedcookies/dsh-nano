# 发布与安全信任链

本仓库插件的发布流程、打包方式和完整性校验规范。所有插件共用这一套流程，不随单个插件变化。

## 适用的包

下面的命令用 `dsh-nano-notepad` 做例子。另外几个 overlay 插件把包名换掉即可。`dsh-nano-shared-workspace` 还没有包内 AGENTS.md，安装侧合同以各包 AGENTS.md 的「安装」和 [母版](docs/agents/TEMPLATE.md) 为准，命令是 `dsh plugin --profile web add <spec>`。状态汇总在仓库根 [AGENTS.md](AGENTS.md) 的「A2A onboarding 状态」。

| 包 | 接入 | 规格 | tarball 必须含有 |
|---|---|---|---|
| `dsh-nano-notepad` | [AGENTS.md](dsh-nano-notepad/AGENTS.md) | [规格](docs/specs/dsh-nano-notepad/README.md) | `index.js`、`lib/client.js` 等全部 `lib/` 运行时文件、`cordis.patch.yml`、`AGENTS.md`（以 `package.json` 的 `files` 为准） |
| `dsh-nano-model-selector` | [AGENTS.md](dsh-nano-model-selector/AGENTS.md) | [README](docs/specs/dsh-nano-model-selector/README.md) | 同上，另加 `lib/host-media.js`（`index.js` 直接 import） |
| `dsh-nano-explorer-extra` | [AGENTS.md](dsh-nano-explorer-extra/AGENTS.md) | [README](docs/specs/dsh-nano-explorer-extra/README.md) | `index.js`、`lib/host.js`、`lib/client.js`、`cordis.patch.yml`、`AGENTS.md` |
| `dsh-nano-shared-workspace` | 无包内 AGENTS.md | [spec.md](docs/specs/dsh-nano-shared-workspace/spec.md) | `index.js`、`lib/host.js`、`lib/client.js`、`cordis.patch.yml` |

## 构建环境

构建脚本（各包 `scripts/build-client.mjs`）跨平台：macOS、Linux、Windows 同一条命令。

| 环境 | 前提 | 说明 |
|---|---|---|
| macOS / Linux | Node ≥ 20、npm | 直接 `npm ci && npm run build` |
| Windows | Node ≥ 20、npm（随 Node 安装） | 同样命令。不要走 `node_modules/.bin/esbuild`——那是 POSIX sh 脚本，Windows spawn 不了（`.cmd` 需要 `shell:true`，原生二进制在 `@esbuild/win32-x64/`）。构建脚本通过 esbuild 的 **JS API**（`createRequire('…/package.json')('esbuild').buildSync(...)`）调用本包锁定版本，平台二进制解析留在 esbuild 内部，因此各系统行为一致 |

共同规则：

- 每个插件目录各自独立：`npm ci` 按该目录的 `package-lock.json` 还原依赖，再 `npm run build`（= `node scripts/build-client.mjs`）。仓库根没有 package.json，不要跑 `pnpm install`。
- 构建期的 `file:../packages/*` 依赖（dsh-nano-ui、dsh-performance-review、dsh-s3-client、dsh-host-route-guard 等）被打进 `lib/` 产物；tarball 与本地部署都不需要旁边的 `packages/` 目录参与运行。
- esbuild 不装就构建会给出 `run npm ci first` 提示并退出（P4-06：锁定的 devDependency，不走 npx 回退）。

## 打包方法

插件的对外分发单位是 `npm pack` 产出的单文件 tarball：

```bash
cd dsh-nano-notepad
npm ci           # 按 lockfile 还原（首次或 lockfile 变化后）
npm run build    # 重建 lib/client.js 等构建产物
npm pack         # 产出 dsh-nano-notepad-<version>.tgz
```

`package.json` 的 `files` 字段决定 tarball 内容。各包必须带上的运行时文件见上面的表，也见各包 AGENTS.md 的「交付物」。共同规则：

- 构建产物必须在 `files` 里：都有 `lib/client.js`；explorer / shared-workspace 另有 `lib/host.js`；model-selector 另有 `lib/host-media.js`、`lib/route-guard.js`、`lib/route-table.js`、`lib/perf-review-host.js`；notepad 另有 `lib/s3-sync-host.js`、`lib/route-guard.js`、`lib/route-table.js`、`lib/perf-review-host.js`、`lib/mp-sanitize.js`。源文件（`src/`）不进包。
- `AGENTS.md` 必须在 `files` 里。安装方拿到的是包内这一份，不是仓库根的 [AGENTS.md](AGENTS.md)，也不是 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)。
- 版本号与 git tag 对齐：`package.json` 的 `version` = tag 去掉 `v` 前缀，CI 里断言一致（见 workflow）。
- `cordis.patch.yml` 的 `name` 必须是包名。开发启动器会在本机把它改写成这份副本的 `index.js`；不要把绝对路径提交进仓库。见各包 `cordis.patch.yml` 文件头，以及母版「安装」一节。

将来如果某个插件包含 wasm，`npm pack` 同样适用——把 `.wasm` 列入 `files`，或者用 base64 内联进 `lib/client.js` 保持单 JS 文件。**安全链作用在最外层 tarball 上，与内部格式无关，不需要为完整性目的转 wasm。**

## 安装目标与方式

有两条安装路径，按目标选：

| 目标 | 方式 |
|---|---|
| 任意 web profile（`~/.dsh` 的 `web`、他人的 dsh 实例） | `dsh plugin --profile web add <spec>`（`spec` 为包目录、`.tgz` 或包名）。写入 profile 的 `dependencies` 与 `dsh.profile.bundles`，应用 `cordis.patch.yml` |
| Electron 桌面版 / 无 `dsh plugin` 通道的本地 home | 本地部署脚本（下节）。桌面 profile 由 app 独占管理，CLI 无法增删 bundle，只能按目录布局落文件 |

**注意**：desktop profile（桌面 app 的 `profiles/desktop`）不是 `dsh plugin add` 的目标——它是 Electron 进程独占启动的，`dsh --profile desktop` 的多数子命令会拒绝。给桌面版装插件走本地部署。

## 本地部署（无 tarball、本机任意 dsh home）

`scripts/deploy-local.mjs` 完成「构建产物 → `<dshHome>/plugins/` → profile 接线」的全过程，macOS / Windows 通用（Windows 上 profile 的 node_modules 链接用 junction，无需管理员权限）：

```bash
# 部署到日常实例（默认 --home 取 $DSH_HOME，否则 ~/.dsh）
node scripts/deploy-local.mjs --home ~/.dsh --profile web

# 部署到桌面版
node scripts/deploy-local.mjs --home ~/.dsh-desktop --profile desktop

# 常用开关
node scripts/deploy-local.mjs --home <home> --profile <p> \
  [--plugins dsh-nano-notepad,dsh-nano-explorer-extra] \  # 只发部分插件
  [--no-build] \   # 已有 lib/ 产物，跳过构建
  [--dry-run]      # 只打印将做的事
```

它做的事（与手工部署一致）：

1. 对每个插件跑 `node scripts/build-client.mjs`（`--no-build` 跳过；要求先 `npm ci`）；
2. 把 `package.json` 的 `files` 条目逐个拷到 `<dshHome>/plugins/<pkg>/`（`lib/`、`locale/` 整目录覆盖，源符号链接解引用成真实文件）；
3. 部署出的 `package.json` 重写：`dependencies` 清空、`devDependencies` 删除——构建期 `file:` 依赖已打进 `lib/`，相对路径在 dsh home 里解析不到；
4. profile 接线：`<dshHome>/profiles/<profile>/package.json` 补 `file:../../plugins/<pkg>` 依赖与 `dsh.profile.bundles` 条目；`profiles/<profile>/node_modules/<pkg>` 建指向插件目录的符号链接（Windows 为 junction）；
5. 自检：每个 `files` 条目都已落盘、部署出的 dependencies 为空，否则报错退出。

部署完成后**重启服务该 profile 的宿主进程**再刷新页面——插件代码在宿主启动时加载，只刷新页面不会换宿主路由。

## 信任链总览

```
git tag（源代码可信根）
  └─ GitHub Actions 构建（OIDC 身份绑定这次 tag 的这次 job）
       ├─ 产物（单文件 tarball 或 npm 包）
       ├─ SHA256SUMS.txt（产物哈希清单）
       └─ 签名/attestation（证明"这个清单是我的 CI 构建产出的"）
            ↓ 发布到 GitHub Release / npm registry
安装侧（校验发生在包外，不在包内）
  → 验证签名或 attestation → 确认哈希清单可信
  → sha256sum -c SHA256SUMS.txt → 确认产物未被篡改
  → dsh plugin --profile web add
```

三条原则：

1. **用 SHA-256，不用 MD5。** MD5 抗碰撞已被攻破，防篡改场景无效。所有指纹一律 SHA-256。
2. **校验必须在包外。** 包内放"自我校验远端 tag"的逻辑没有意义——篡改者把校验代码一起改掉即可。真正有效的校验由安装工具、CI 或安装脚本执行。
3. **哈希清单必须经独立信道保护。** 产物和 checksum 文件放在同一个 Release 里，攻击者两个都能改；可信性靠签名（cosign）或 attestation 把清单绑到 CI 身份上，而不是靠清单本身。

## CI/CD：GitHub Actions（推荐主流程）

`.github/workflows/release.yml`，push `v*` tag 触发：

```yaml
name: release
on:
  push:
    tags: ['v*']

permissions:
  contents: write
  id-token: write       # attestations / cosign keyless 需要
  attestations: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      # 版本号必须与 tag 一致
      - name: Assert tag matches package version
        run: |
          PKG_VER=$(node -p "require('./dsh-nano-notepad/package.json').version")
          TAG_VER="${GITHUB_REF_NAME#v}"
          test "$PKG_VER" = "$TAG_VER"
      - name: Build and pack
        run: |
          cd dsh-nano-notepad
          npm ci
          npm run build
          npm pack
      - name: Checksums
        run: |
          cd dsh-nano-notepad
          shasum -a 256 *.tgz > SHA256SUMS.txt
      # GitHub 原生 attestation：把产物绑到本仓库本次 job，免私钥
      - name: Attest
        uses: actions/attest-build-provenance@v2
        with:
          subject-path: 'dsh-nano-notepad/*.tgz'
      - name: GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            dsh-nano-notepad/*.tgz
            dsh-nano-notepad/SHA256SUMS.txt
```

多插件时把 build/pack/checksum 三步抽成 matrix（`plugin: [dsh-nano-notepad, dsh-nano-model-selector, dsh-nano-explorer-extra, dsh-nano-shared-workspace]`），每个插件一个 tarball。各包的构建入口都是 `npm run build`，见各包 AGENTS.md 的「构建」。构建脚本跨平台，`runs-on` 可以是 `ubuntu-latest`、`macos-latest` 或 `windows-latest`，产物一致。

### attestation 与 cosign 二选一

- **`actions/attest-build-provenance`（首选）**：零私钥管理，签名身份 = `github.com/<org>/<repo>` 的 CI job。安装侧一条命令验证。
- **`cosign sign-blob`（需要发布到非 GitHub 渠道时用）**：同样 keyless，用 OIDC 身份签 `SHA256SUMS.txt`，产出 `SHA256SUMS.sigstore.json` 一起进 Release。

```yaml
      - name: Cosign sign checksums
        run: |
          cosign sign-blob dsh-nano-notepad/SHA256SUMS.txt \
            --bundle dsh-nano-notepad/SHA256SUMS.sigstore.json
```

## 安装侧校验

### 方案 A：GitHub Release + attestation（默认）

```bash
TAG=v0.1.0
REPO=seanz/dsh-plugins

gh release download "$TAG" -R "$REPO" \
  -p 'dsh-nano-notepad-*.tgz' -p 'SHA256SUMS.txt'

# 1. 验 attestation：产物确实是该仓库 CI 构建的
gh attestation verify dsh-nano-notepad-*.tgz -R "$REPO"

# 2. 验哈希：文件未被篡改
sha256sum -c SHA256SUMS.txt   # Windows 上用 certutil -hashfile <tgz> SHA256 对照，或 Git Bash 里同一命令

# 3. 安装。profile 与重启规则见该包 AGENTS.md 的「安装」
dsh plugin --profile web add ./dsh-nano-notepad-*.tgz
```

### 方案 B：cosign

```bash
cosign verify-blob SHA256SUMS.txt --bundle SHA256SUMS.sigstore.json \
  --certificate-identity-regexp 'github.com/seanz/dsh-plugins' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
sha256sum -c SHA256SUMS.txt
```

### 方案 C：npm registry（若公开发布）

`npm publish --provenance`（从 GitHub Actions 发布）自动生成 Sigstore provenance，把包绑到具体 commit 和 CI job：

```bash
npm audit signatures        # 验证已装包的 registry 签名与 provenance
npm install dsh-nano-notepad
dsh plugin --profile web add dsh-nano-notepad
```

## 插件安装注意

- `cordis.patch.yml` 的 `name` 已经是包名。不要改回绝对路径再发布。开发启动器只在本机重写这一行。
- `dsh plugin --profile web add` 写入 profile 的 `dependencies` 和 `dsh.profile.bundles`。没有 HMR 时，重启服务该 profile 的宿主，再刷新页面。只刷新页面不会换宿主路由。细节在各包 AGENTS.md 的「安装」，母版在 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)。
- 卸载不删各包「配置与状态」里写明的残留。[notepad](dsh-nano-notepad/AGENTS.md) 的 IndexedDB `dsh-nano-notepad` 还在；[explorer](dsh-nano-explorer-extra/AGENTS.md) 的 `localStorage` 键 `dsh-nano-explorer-extra:prefs.v2` 还在；[model-selector](dsh-nano-model-selector/AGENTS.md) 的 `plugins/nano-model-selector/media-engine.json` 还在。这不是「各插件 spec」里的同一句话。

## 不做的事

- 不发布 MD5/SHA-1 指纹。
- 不在插件包内做自校验逻辑（无效且给攻击者留下可删改的入口）。
- 不手动上传 Release 产物——所有产物必须出自 CI，本地 `npm pack` 只用于验证打包内容。
- 不忽略 `Cargo.lock` / lockfile——可复现构建依赖锁定版本。
- 不通过 `node_modules/.bin/<tool>` 调构建工具——`.bin` 入口是 POSIX shim，Windows 上 spawn 不了。锁定工具一律经其 JS API 调用（见「构建环境」）。
