# emulation — `/settings` 浏览器伪装

全部字段可选，`null` 清除该项。值只在内存，下一次导航前生效；`GET /status` → `emulation` 回显整组。

```bash
POST /nano-local-sandbox/settings {
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",   # ≤400 字符单行；"" 清除
  "viewport": { "width": 1024, "height": 768, "mobile": false, "deviceScaleFactor": 2 },
  "media": "print",                        # "screen" | "print" | null
  "extraHeaders": { "X-Debug": "1" }      # ≤20 项，键 1..64 字符值 ≤200；禁 cookie/authorization/host 等
}
POST /nano-local-sandbox/settings { "viewport": null, "media": null, "extraHeaders": null }
```

`viewport.width` 任意 320..3840 整数（不再只有 390/768/1280 三档）；只给 `width` 按预设补 height 与 mobile 默认。`height` 240..2160；`deviceScaleFactor` 只许 1/2/3。改视口改变画面身份，pane 漂移检测含 `viewport` 维。`POST /evaluate {"expression":"matchMedia('print').matches"}` 可验 media 是否生效。

事务性：引擎 down 时 `POST /settings` 返回 `502 kitesurf.engine.connect` 且**内存态回滚**，不要按「已写入」处理。
