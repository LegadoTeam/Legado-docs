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

监听探测会话内所有出站请求与响应，回调包含完整的请求头、响应头及响应体，可用于抓取 API 接口数据、捕获加密参数或追踪重定向链。

### legado.browser.onRequest

```js
legado.browser.onRequest(id, handler) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID |
| `handler` | `function(event)` | 每次请求/响应触发，接收 `RequestEvent` 对象 |

#### RequestEvent 结构

```ts
interface RequestEvent {
  type: 'request' | 'response'  // 请求阶段 或 响应阶段
  url: string                   // 请求 URL
  method: string                // HTTP 方法，如 'GET' / 'POST'
  resourceType: string          // 资源类型，如 'xhr' / 'fetch' / 'document' / 'script'
  requestHeaders: Record<string, string>  // 原始请求头
  requestBody?: string          // POST 请求体（文本形式）

  // 以下字段仅 type === 'response' 时存在
  status?: number               // HTTP 状态码
  responseHeaders?: Record<string, string>  // 响应头
  responseBody?: string         // 响应体（文本形式，二进制资源为 null）
}
```

### legado.browser.offRequest

移除会话的网络请求监听。

```js
legado.browser.offRequest(id) → void
```

### 示例：捕获 XHR/Fetch 接口返回

```js
async function getApiData(pageUrl) {
  var id = legado.browser.create({ visible: false, muted: true });
  var captured = null;

  legado.browser.onRequest(id, function(event) {
    if (event.type === 'response'
        && event.url.includes('/api/chapter')
        && event.responseBody) {
      captured = JSON.parse(event.responseBody);
    }
  });

  legado.browser.navigate(id, pageUrl, { waitUntil: 'networkidle' });
  legado.browser.offRequest(id);
  legado.browser.close(id);

  return captured;
}
```

### 示例：记录完整请求日志

```js
var id = legado.browser.create({ visible: false });

legado.browser.onRequest(id, function(event) {
  if (event.type === 'request') {
    legado.log('[REQ] ' + event.method + ' ' + event.url);
    legado.log('      headers=' + JSON.stringify(event.requestHeaders));
  } else {
    legado.log('[RES] ' + event.status + ' ' + event.url);
    legado.log('      headers=' + JSON.stringify(event.responseHeaders));
  }
});

legado.browser.navigate(id, 'https://example.com', { waitUntil: 'networkidle' });
legado.browser.offRequest(id);
legado.browser.close(id);
```

::: info 平台兼容性
| 平台 | 实现机制 | 响应体 | 请求体 |
|------|----------|--------|--------|
| Tauri/Windows (WebView2) | `AddWebResourceRequestedFilter` + `WebResourceResponseReceived` | ✅ | ✅ |
| Tauri/Android (WebView) | `shouldInterceptRequest` 原生拦截；GET/HEAD 由宿主代理后回填给 WebView | ✅（文本响应；二进制为 null） | 部分（Android WebView 原生 API 不暴露请求体） |
| Tauri/macOS、Linux (WebKit) | `webkit-web-view` `decide-policy` + `resource-load-finished` | 部分（text 类型）| ✅ |
| 鸿蒙 (ArkWeb) | `onInterceptRequest` + `WebResourceResponse` | ✅ | ✅ |

二进制资源（图片、视频流等）的 `responseBody` 为 `null`，仅文本类型（JSON、HTML、XML 等）会填充响应体。
:::

::: warning 注意
回调在书源 JS 上下文同步触发。不要在 handler 内执行阻塞性 IO 或死循环，避免影响页面加载超时计算。
:::
