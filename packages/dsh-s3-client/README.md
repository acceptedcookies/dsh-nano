# dsh-s3-client

宿主侧 S3 客户端，供 dsh-nano 系列插件共享。**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。各插件在宿主 `index.js` 直接 import（`file:../packages/dsh-s3-client`），或打进 `lib/host.js`。

## 导出

| 子路径 | 导出 | 用途 |
|---|---|---|
| `dsh-s3-client/client` | `createS3Client`, `S3Error` | 签名 + 限速 + 账本的完整客户端 |
| `dsh-s3-client/sign` | `signRequest`, `sha256Hex` | 纯 SigV4 签名（官方 test suite 向量验证） |
| `dsh-s3-client/rate` | `createRateLimiter` | 令牌桶（rps/burst + 上传 KB/s + 并发） |
| `dsh-s3-client/ledger` | `createLedger` | JSON 用量账本（原子写） |

## 客户端 API

```js
import { createS3Client } from 'dsh-s3-client/client'

const s3 = createS3Client({
  endpoint: 'https://s3.us-east-1.amazonaws.com',
  region: 'us-east-1',              // R2 用 'auto'
  bucket: 'my-bucket',
  prefix: 'nano-notepad/',          // key() 自动拼接
  accessKeyId, secretAccessKey,     // 宿主侧持有，绝不进浏览器
  sessionToken,                     // 可选
  pathStyle: false,                 // MinIO/OSS 设 true
  limits: { rps: 10, burst: 20, kbps: 512, concurrency: 2 },
  ledgerFile: '/path/to/s3-ledger.json',
})

await s3.putObject('manifest.json', bytes, { contentType: 'application/json', ifMatch: prevEtag })
const obj = await s3.getObject('a.md')          // null on 404
const head = await s3.headObject('a.md')        // null on 404
await s3.deleteObject('a.md')
const { objects } = await s3.listObjects()      // 自动分页
await s3.test()                                 // 连通性自检
s3.status()                                     // 限速水位 + 账本快照
```

## 语义边界

- **包内**：请求签名、虚拟主机/路径两种寻址、ListObjectsV2 分页、`If-Match` 条件写、ETag、限速、op 记账。
- **包外（插件负责）**：manifest/墓碑/key 布局、同步游标、冲突策略、凭据来源（env/Config/宿主落盘）。
- 兼容面：AWS S3、Cloudflare R2、MinIO（`pathStyle:true`）。`If-Match` 在不支持的兼容服务上会被忽略，调用方按「写后重读」兜底。

## 测试

```bash
npm test
```

含 AWS 官方 `aws-sig-v4-test-suite` 向量（`get-vanilla-query-order-key-case`，`b97d918c…`）。
