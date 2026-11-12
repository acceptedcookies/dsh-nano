# 发布与安全信任链

本仓库插件的发布流程、打包方式和完整性校验规范。所有插件共用这一套流程，不随单个插件变化。

## 适用的包

下面的命令用 `dsh-nano-notepad` 做例子。另外两个已经对齐 onboarding 的 overlay 插件，把包名换掉即可。`dsh-nano-shared-workspace` 还没有包内 AGENTS.md，尚未纳入这条发布示例。状态汇总在仓库根 [AGENTS.md](AGENTS.md) 的「A2A onboarding 状态」。安装合同以各包 AGENTS.md 的「安装」和 [母版](docs/agents/TEMPLATE.md) 为准，命令是 `dsh plugin --profile web add <spec>`。

| 包 | 接入 | 规格 | tarball 必须含有 |
|---|---|---|---|
| `dsh-nano-notepad` | [AGENTS.md](dsh-nano-notepad/AGENTS.md) | [规格](docs/specs/dsh-nano-notepad/README.md) | `index.js`、`lib/client.js`、`cordis.patch.yml`、`AGENTS.md` |
| `dsh-nano-model-selector` | [AGENTS.md](dsh-nano-model-selector/AGENTS.md) | [规格](docs/specs/dsh-nano-model-selector/README.md) | 同上，另加 `lib/host-media.js`（`index.js` 直接 import） |
| `dsh-nano-explorer-extra` | [AGENTS.md](dsh-nano-explorer-extra/AGENTS.md) | [规格](docs/specs/dsh-nano-explorer-extra/README.md) | `index.js`、`lib/host.js`、`lib/client.js`、`cordis.patch.yml`、`AGENTS.md` |

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

## 打包方法

插件的对外分发单位是 `npm pack` 产出的单文件 tarball：

```bash
cd dsh-nano-notepad
npm run build      # 重建 lib/client.js 等构建产物
npm pack           # 产出 dsh-nano-notepad-<version>.tgz
```

`package.json` 的 `files` 字段决定 tarball 内容。各包必须带上的运行时文件见上面的表，也见各包 AGENTS.md 的「交付物」。共同规则：

- 构建产物必须在 `files` 里：三个包都有 `lib/client.js`；explorer 另有 `lib/host.js`；model-selector 另有 `lib/host-media.js`。源文件（`src/`）不进包。
- `AGENTS.md` 必须在 `files` 里。安装方拿到的是包内这一份，不是仓库根的 [AGENTS.md](AGENTS.md)，也不是 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)。
- 版本号与 git tag 对齐：`package.json` 的 `version` = tag 去掉 `v` 前缀，CI 里断言一致（见 workflow）。
- `cordis.patch.yml` 的 `name` 必须是包名。开发启动器会在本机把它改写成这份副本的 `index.js`；不要把绝对路径提交进仓库。见各包 `cordis.patch.yml` 文件头，以及母版「安装」一节。

将来如果某个插件包含 wasm，`npm pack` 同样适用——把 `.wasm` 列入 `files`，或者用 base64 内联进 `lib/client.js` 保持单 JS 文件。**安全链作用在最外层 tarball 上，与内部格式无关，不需要为完整性目的转 wasm。**

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

多插件时把 build/pack/checksum 三步抽成 matrix（`plugin: [dsh-nano-notepad, dsh-nano-model-selector, dsh-nano-explorer-extra]`），每个插件一个 tarball。各包的构建入口都是 `npm run build`，见各包 AGENTS.md 的「构建」。

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
sha256sum -c SHA256SUMS.txt

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
