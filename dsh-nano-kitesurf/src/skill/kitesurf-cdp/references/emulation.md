# emulation — `/settings` 浏览器伪装

全部字段可选，`null` 清除该项。值只在内存，下一次导航前生效；`GET /status` 把这组字段**平铺**在顶层（`viewport/userAgent/media/extraHeaders/locale/geolocation/colorScheme/cookies`），能力差距在 `capabilities.unsupported`，不存在 `emulation` 键。完整键集 7 个：`viewport, userAgent, media, extraHeaders, locale, geolocation, colorScheme`（第 8 个 `cookies` 是状态面不是仿真面）。

```bash
POST /nano-local-sandbox/settings {
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",   # ≤400 字符单行；"" 清除
  "viewport": { "width": 1024, "height": 768, "mobile": false, "deviceScaleFactor": 1 },
  "media": "print",                        # "screen" | "print" | null
  "extraHeaders": { "X-Debug": "1" },     # ≤20 项，键 1..64 字符值 ≤200；禁 cookie/authorization/host 等
  "locale": "zh-CN",                       # BCP-47；影响 navigator.language/accept-language
  "geolocation": { "latitude": 31.2, "longitude": 121.5, "accuracy": 20 }, # 数值键 latitude/longitude/accuracy?
  "colorScheme": "dark"                    # "light" | "dark" | null
}
POST /nano-local-sandbox/settings { "viewport": null, "media": null, "extraHeaders": null }
# 状态面（非仿真）：种 cookie 给当前页 origin——本地 dev 站的登录态必须显式种，
# 宿主浏览器 cookie 不会跨 hostGateway 域跟过来：
POST /nano-local-sandbox/settings { "cookies": [ { "name":"sid","value":"…","domain":"<hostGateway>","path":"/" } ] }
```

`viewport.width` 任意 320..3840 整数；只给 `width` 按预设补 height 与 mobile 默认。`height` 240..2160。

**缩约（G19）**：pin 无法真实改变 `devicePixelRatio` 与移动端输入特征，因此 `deviceScaleFactor` 只接受 `1`，`mobile` 只接受 `false`；其他值返回 **400 `kitesurf.settings.unsupported`**，不写入设置、不返回 `ok:true`。`capabilities.unsupported` 继续声明 `deviceScaleFactor`、`mobile`——不要把这些值当已支持。

改视口改变画面身份，pane 漂移检测含 `viewport` 维。`POST /evaluate {"expression":"matchMedia('print').matches"}` 可验 media 是否生效。

事务性：引擎 down 时 `POST /settings` 返回 502 且**内存态回滚**，不要按「已写入」处理。
