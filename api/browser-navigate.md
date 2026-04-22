# 浏览器探测 — 导航与执行

## legado.browser.navigate

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
| `timeoutSecs` | `number` | — | 超时秒数 |

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
| `options` | `object` | `{ timeoutSecs? }` |

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
| `options` | `object` | `{ visible?, waitUntil?, timeoutSecs? }` |

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
        coverUrl: el.querySelector('img')?.src || ''
      };
    });
  `, { visible: false, waitUntil: 'load', timeoutSecs: 30 });
}
```

### 示例：多步骤会话

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
