# 浏览器探测 — 导航与执行

`legado.browser` 是句柄风格 API；`legado.browser2` 是对象风格封装，推荐优先使用。两者功能等价，可混用。

## legado.browser2（对象风格，推荐）

### 创建会话

```js
var session = legado.browser2.create(options?)   // 新建独立会话
var session = legado.browser2.acquire(role, options?)  // 按角色复用会话
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `object` | `{ visible?, reuseKey? }` |
| `role` | `string` | 会话角色标识，相同 role 复用同一会话 |

返回 `BrowserSession` 对象。

### BrowserSession 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `.navigate(url, options?)` | `void` | 导航到 URL 并等待加载 |
| `.eval(code, options?)` | `any` | 在页面执行 JS |
| `.html()` | `string` | 当前页面 HTML |
| `.text()` | `string` | 当前页面纯文本 |
| `.url()` | `string` | 当前页面 URL |
| `.cookies(cookieUrl?)` | `array` | 获取 Cookie 列表 |
| `.setCookie(cookieUrl, cookie)` | `void` | 设置 Cookie |
| `.setUserAgent(ua)` | `void` | 设置 UA |
| `.show()` | `void` | 显示探测窗口 |
| `.hide()` | `void` | 隐藏探测窗口 |
| `.mute()` | `void` | 静音 |
| `.unmute()` | `void` | 取消静音 |
| `.setMuted(muted)` | `void` | 设置静音状态 |
| `.onRequest(handler)` | `void` | 注册网络请求/响应回调 |
| `.offRequest()` | `void` | 移除网络请求回调 |
| `.close()` | `void` | 关闭会话，释放资源 |

### legado.browser2.run

一次性操作，与 `legado.browser.run` 等价：

```js
legado.browser2.run(url, code, options?) → any
```

### 示例：对象风格多步骤会话

```js
async function chapterContent(chapterUrl) {
  if (!globalThis._contentSession) {
    globalThis._contentSession = legado.browser2.create({ visible: false });
  }
  var session = globalThis._contentSession;

  try {
    session.navigate(chapterUrl, { waitUntil: 'load' });
    return session.eval(`
      await new Promise(function(resolve) { setTimeout(resolve, 500); });
      return document.querySelector('#content')?.innerText || '';
    `);
  } catch (e) {
    session.close();
    globalThis._contentSession = null;
    throw e;
  }
}
```

### 示例：acquire 角色复用

```js
async function getPageHtml(url) {
  var session = legado.browser2.acquire('main', { visible: false });
  session.navigate(url, { waitUntil: 'networkidle' });
  return session.html();
}
```

---

## legado.browser（句柄风格）

### legado.browser.navigate

导航会话到指定 URL 并等待加载完成。

```js
legado.browser.navigate(id, url, options?) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID |
| `url` | `string` | 目标 URL |
| `options` | `object` | 导航选项 |

### options

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `waitUntil` | `string` | `'load'` | 等待条件 |
| `waitFor` | `string` | — | `waitUntil` 的兼容别名 |
| `timeoutSecs` | `number` | 跟随浏览器探测设置 | 超时秒数 |
| `timeout` | `number` | — | `timeoutSecs` 的兼容别名，单位秒 |
| `timeoutMs` | `number` | — | 超时毫秒数，会向上取整为秒 |

### waitUntil 值

| 值 | 说明 |
|----|------|
| `'load'` | 等待页面加载完成事件 |
| `'domcontentloaded'` | 等待 DOMContentLoaded 事件 |
| `'networkidle'` | 等待 load 后网络空闲 500ms |

## legado.browser.eval

在页面上下文中执行 JavaScript 代码。

```js
legado.browser.eval(id, code, options?) → any
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID |
| `code` | `string` | 要执行的 JS 代码 |
| `options` | `object` | `{ timeoutSecs?, timeout?, timeoutMs? }` |

**返回值**：代码执行结果（JSON 反序列化后的值）。

::: info 代码中可使用
- `return` 语句返回值
- `await` 异步操作
- 页面上下文中的 `document`、`window` 等浏览器 API
:::

### 示例

```js
var result = legado.browser.eval(id, `
  await new Promise(function(resolve) { setTimeout(resolve, 500); });
  return document.querySelector('#content').innerText;
`);
```

## legado.browser.run

一次性操作：创建会话 → 导航到 URL → 执行 JS → 返回结果 → 关闭会话。

```js
legado.browser.run(url, code, options?) → any
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 目标页面 URL |
| `code` | `string` | 要执行的 JS 代码 |
| `options` | `object` | `{ visible?, waitUntil?, waitFor?, timeoutSecs?, timeout?, timeoutMs? }` |

### 示例：动态页面搜索

```js
async function search(keyword, page) {
  var url = BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page;
  return legado.browser.run(url, `
    await new Promise(function(resolve) { setTimeout(resolve, 800); });
    return Array.from(document.querySelectorAll('.book-item')).map(function(el) {
      return {
        name: el.querySelector('.title')?.textContent?.trim() || '',
        author: el.querySelector('.author')?.textContent?.trim() || '',
        bookUrl: el.querySelector('a')?.href || '',
        coverUrl: el.querySelector('img')?.src || '',
        latestChapter: el.querySelector('.latest a')?.textContent?.trim() || '',
        latestChapterUrl: el.querySelector('.latest a')?.href || '',
        wordCount: el.querySelector('.words')?.textContent?.trim() || '',
        updateTime: el.querySelector('.updated')?.textContent?.trim() || '',
        status: el.querySelector('.status')?.textContent?.trim() || ''
      };
    });
  `, { visible: false, waitUntil: 'load', timeoutSecs: 30 });
}
```

### 示例：多步骤会话（句柄风格）

```js
async function chapterContent(chapterUrl) {
  if (!globalThis.contentBrowserId) {
    globalThis.contentBrowserId = legado.browser.create({ visible: false });
  }
  var id = globalThis.contentBrowserId;

  try {
    legado.browser.navigate(id, chapterUrl, { waitUntil: 'load' });
    return legado.browser.eval(id, `
      await new Promise(function(resolve) { setTimeout(resolve, 500); });
      return document.querySelector('#content')?.innerText || '';
    `);
  } catch (e) {
    legado.browser.close(id);
    globalThis.contentBrowserId = '';
    throw e;
  }
}
```
