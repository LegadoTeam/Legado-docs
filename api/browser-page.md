# 浏览器探测 — 页面读取与 Cookie

## 页面内容读取

### legado.browser.html

获取当前页面的 HTML。

```js
legado.browser.html(id) → string
```

### legado.browser.text

获取当前页面的纯文本。

```js
legado.browser.text(id) → string
```

### legado.browser.url

获取当前页面的 URL（可能因跳转而与导航时不同）。

```js
legado.browser.url(id) → string
```

### 示例

```js
var id = legado.browser.create({ visible: false });
legado.browser.navigate(id, 'https://example.com', { waitUntil: 'load' });

var html = legado.browser.html(id);    // 获取渲染后的 HTML
var text = legado.browser.text(id);    // 纯文本
var currentUrl = legado.browser.url(id); // 当前 URL

// 可以将 HTML 传给 legado.dom 解析
var doc = legado.dom.parse(html);
var title = legado.dom.selectText(doc, 'h1');
legado.dom.free(doc);

legado.browser.close(id);
```

## Cookie 操作

### legado.browser.cookies

读取探测 WebView 的 Cookie（含平台可获取的 HttpOnly Cookie）。传入 `url` 时返回该 URL 可携带的 Cookie；不传时返回当前探测 profile 可枚举的全部 Cookie。

```js
legado.browser.cookies(url?) → CookieObject[]
```

返回 Cookie 对象数组，每个对象包含 `name`、`value` 等字段；支持的平台还会返回 `domain`、`path`、`expires`、`httpOnly`、`secure`、`sameSite`。

```js
var cookies = legado.browser.cookies('https://example.com');
for (var i = 0; i < cookies.length; i++) {
  legado.log(cookies[i].name + '=' + cookies[i].value);
}
```

### legado.browser.setCookie

向探测 WebView 写入 Cookie。

```js
legado.browser.setCookie(url, cookie) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | Cookie 对应的 URL |
| `cookie` | `object` | Cookie 对象 `{ name, value, ... }` |

### legado.browser.getCookie

从 HTTP CookieStore（不是探测 WebView）中读取单个 Cookie 值。

```js
legado.browser.getCookie(domain, name) → string
```

::: tip Cookie 同步
书源 HTTP 请求会自动携带对应域名的 Cookie。Tauri 侧通过 HTTP CookieStore 同步；鸿蒙侧通过 ArkWeb `WebCookieManager` 同步，HTTP 响应里的 `Set-Cookie` 也会写回浏览器 Cookie。
:::

### 登录后复用 Cookie

```js
function ensureLogin() {
  var id = legado.browser.acquire('login', { visible: true });
  legado.browser.navigate(id, BASE + '/login', { waitUntil: 'load' });

  var cookies = legado.browser.cookies(BASE);
  legado.log('cookies=' + cookies.map(function(c) { return c.name; }).join(','));
  legado.browser.hide(id);
}
```

---

## 网络请求回调

监听探测会话内所有出站请求与响应，可用于抓取 API 接口数据、捕获 m3u8 播放地址、提取加密参数等。

::: warning 回调时机：navigate 返回后批量触发
`handler` **不是**实时触发的。引擎在 `navigate()` 等待页面加载完成后，将本次导航期间所有捕获到的事件批量取出，再逐条同步调用 `handler`。因此 `navigate()` 调用返回即意味着 handler 已执行完毕。

```js
legado.browser.onRequest(id, handler, options); // 注册
legado.browser.navigate(id, url, { waitUntil: 'networkidle' }); // 导航完成 + handler 全部执行
// 此处 handler 已全部执行完毕
```
:::

### legado.browser.onRequest

```js
legado.browser.onRequest(id, handler, options?) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID |
| `handler` | `function(event)` | 每条事件触发一次，接收 `RequestEvent` 对象 |
| `options` | `object` | 可选，过滤与捕获选项，见下表 |

#### options 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `captureBody` | `boolean` | `false` | 是否捕获响应体。Windows 上仅对 m3u8 / video / audio 类型生效（见平台说明） |
| `url` / `urlRegex` / `urlPattern` | `string \| RegExp` | — | 只捕获匹配该正则的 URL；字符串作为正则模式处理 |
| `contentType` / `contentTypeRegex` / `contentTypePattern` | `string \| RegExp` | — | 按响应 Content-Type 过滤 |

#### RequestEvent 结构

```ts
interface RequestEvent {
  type: 'response'              // Windows/WebView2 只有响应阶段事件
  url: string                   // 请求 URL
  method: string                // HTTP 方法，如 'GET' / 'POST'
  resourceType: string          // Windows 上固定为 'native'
  requestHeaders: Record<string, string>  // 请求头（key 已转为小写）
  status: number                // HTTP 状态码
  responseHeaders: Record<string, string> // 响应头（key 已转为小写）
  responseBody: string | null   // 响应体文本；captureBody:false 或非文本类型时为 null
}
```

::: tip responseBody 的限制
Windows WebView2 上，即使设置 `captureBody: true`，也**仅对以下类型**异步读取响应体：
- URL 含 `m3u8`
- Content-Type 含 `mpegurl`、以 `video/` 或 `audio/` 开头

其他类型（JSON、HTML 等）的 `responseBody` 始终为 `null`。读取完成后 `navigate()` 才返回（最长等待 5 秒）。
:::

### legado.browser.offRequest

移除会话的网络请求监听。

```js
legado.browser.offRequest(id) → void
```

::: tip 何时调用 offRequest
使用 `acquire` 模式时，会话会在书源执行结束后自动清理。但如果需要在同一次 `acquire` 会话内切换监听状态，仍可手动调用 `offRequest` 停止捕获。
:::

### 示例：捕获 m3u8 播放地址

```js
async function chapterContent(chapterUrl) {
  var id = legado.browser.acquire('content', { muted: true });
  var playUrl = '';

  legado.browser.onRequest(id, function(event) {
    if (!playUrl && event.url.toLowerCase().indexOf('m3u8') !== -1
        && event.status === 200 && event.responseBody
        && event.responseBody.replace(/^\s+/, '').indexOf('#EXTM3U') === 0) {
      playUrl = event.url;
    }
  }, { captureBody: true });

  legado.browser.navigate(id, chapterUrl, { waitUntil: 'networkidle', timeoutSecs: 12 });
  // navigate 返回时 handler 已执行完毕，playUrl 已赋值

  if (!playUrl) throw new Error('未能捕获播放地址');
  return playUrl;
}
```

### 示例：按 URL 模式过滤接口

```js
legado.browser.onRequest(id, function(event) {
  if (event.responseBody) {
    var data = JSON.parse(event.responseBody);
    legado.log('[api] ' + JSON.stringify(data));
  }
}, { url: /\/api\/chapter\/\d+/, captureBody: false });

legado.browser.navigate(id, pageUrl, { waitUntil: 'networkidle' });
legado.browser.offRequest(id);
```

::: info 平台兼容性
| 平台 | 实现机制 | 响应体 | 请求体 |
|------|----------|--------|--------|
| Tauri/Windows (WebView2) | `WebResourceResponseReceived` COM 事件 | ✅（m3u8/video/audio；异步，最长等 5s） | ❌ |
| Tauri/Android (WebView) | `shouldInterceptRequest` 原生拦截 | ✅（文本类型；二进制为 null） | ❌（Android WebView API 不暴露请求体） |
| Tauri/macOS、Linux (WebKit) | 暂不支持 | ❌ | ❌ |
| 鸿蒙 (ArkWeb) | `onInterceptRequest` | ✅ | ✅ |
:::


::: warning 注意
回调在书源 JS 上下文同步触发。不要在 handler 内执行阻塞性 IO 或死循环，避免影响页面加载超时计算。
:::
