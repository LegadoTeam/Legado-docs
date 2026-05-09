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
