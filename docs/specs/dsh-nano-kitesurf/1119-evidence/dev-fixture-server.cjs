// Consolidated reproduction fixture for the 1119 review.
// Run only inside kitesurf-dev through DNLS createAppleBackend().execOutput().
// It binds container loopback, writes no files, and exits within 120 seconds.
// The original slow-page experiment used the same endpoints with a 20-minute
// cap; this retained version shortens its lifetime and includes emulation data.
const http = require('node:http')
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:9919')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Delivery-Fixture', '1119')
  if (url.pathname === '/stop') {
    res.end('stopped')
    clearTimeout(expiry)
    server.close()
    return
  }
  if (url.pathname === '/api') {
    let body = ''
    for await (const chunk of req) body += chunk
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, received: body, ua: req.headers['user-agent'], language: req.headers['accept-language'], cookie: req.headers.cookie || null, trace: req.headers['x-delivery-review'] || null }))
    return
  }
  if (url.pathname === '/broken.js') {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/javascript')
    res.end('/* missing entry */')
    return
  }
  if (url.pathname === '/slow.js') {
    await new Promise(resolve => setTimeout(resolve, 12000))
    res.setHeader('Content-Type', 'application/javascript')
    res.end('document.querySelector("#root").textContent="SLOW_APP_READY";')
    return
  }
  if (url.pathname === '/app.js') {
    res.setHeader('Content-Type', 'application/javascript')
    res.end('console.info("DELIVERY_INFO");console.warn("DELIVERY_WARN");console.error("DELIVERY_ERROR");setTimeout(()=>{document.querySelector("#root").textContent="SPA_READY_1119";console.log("DELIVERY_LATE_LOG")},2500);setTimeout(()=>{throw new Error("DELIVERY_UNCAUGHT")},3200);fetch("/api",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fixture:"1119"})}).then(r=>r.json()).then(d=>{document.querySelector("#net").textContent=JSON.stringify(d)});')
    return
  }
  res.setHeader('Content-Type', 'text/html')
  if (['/spa', '/broken', '/slow'].includes(url.pathname)) {
    const source = url.pathname === '/spa' ? '/app.js' : url.pathname === '/broken' ? '/broken.js' : '/slow.js'
    res.end('<html><head><title>Delivery ' + url.pathname + '</title></head><body><div id="root"></div><pre id="net"></pre><script type="module" src="' + source + '"></script></body></html>')
    return
  }
  if (url.pathname === '/emulation') {
    const observe = 'JSON.stringify({language:navigator.language,languages:navigator.languages,ua:navigator.userAgent,dark:matchMedia("(prefers-color-scheme: dark)").matches,dpr:devicePixelRatio,cookie:document.cookie})'
    res.end('<html><head><title>Emulation audit</title></head><body><pre id="initial"></pre><pre id="late"></pre><script>document.querySelector("#initial").textContent=' + observe + ';setTimeout(()=>{document.querySelector("#late").textContent=' + observe + '},1800)</script></body></html>')
    return
  }
  res.end('<html><head><title>Delivery Basic 1119</title></head><body><h1 id="title">BASIC_READY_1119</h1><a href="/spa">SPA next</a><button id="action" onclick="this.textContent=\'CLICKED_1119\'">Click test</button><input id="name"><p id="root">STATIC_CONTENT</p><script>console.log("DELIVERY_BASIC_LOG")</script></body></html>')
})
server.listen(9919, '127.0.0.1')
const expiry = setTimeout(() => server.close(), 120000)
