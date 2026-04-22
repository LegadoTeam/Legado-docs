# 浏览器探测 — 会话管理

浏览器探测用于处理普通 HTTP 客户端难以应对的网站（JS 渲染、登录验证、HttpOnly Cookie）。探测 WebView 使用独立 profile，与主程序 UI 隔离。

::: info CLI 兼容性
CLI 测试模式会启动隐藏的 Tauri 后端，浏览器探测 API 使用与 GUI 一致的 WebView 宿主。需要人工登录或验证时，`open/show` 仍可能弹出探测窗口。
:::

## legado.browser.open

打开可见的探测窗口，供用户手动登录或完成验证。

```js
legado.browser.open(url) → boolean
```

用户完成操作并关闭窗口后返回 `true`。

## legado.browser.create

创建探测会话，返回 sessionId。

```js
legado.browser.create(options?) → string
```

### options

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示窗口 |
| `reuseKey` | `string` | — | 复用标识，相同 key 复用窗口 |
| `timeout` | `number` | — | 超时秒数 |

## legado.browser.acquire

获取书源内存级命名会话。同一书源同一 `role` 复用窗口。

```js
legado.browser.acquire(role, options?) → string
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `role` | `string` | 会话角色名（如 `'search'`、`'content'`） |
| `options` | `object` | 同 `create` 的 options |

### 会话复用示例

```js
// init() 在书源加载时自动调用一次
function init() {
  // 预创建一个隐藏的探测会话
  globalThis.browserId = legado.browser.acquire('main', { visible: false });
}

async function chapterContent(chapterUrl) {
  var id = globalThis.browserId;
  legado.browser.navigate(id, chapterUrl, { waitUntil: 'load' });
  return legado.browser.eval(id, 'return document.querySelector("#content").innerText');
}
```

## legado.browser.show / hide / close

```js
legado.browser.show(id)   // 显示探测窗口
legado.browser.hide(id)   // 隐藏探测窗口
legado.browser.close(id)  // 关闭并销毁会话
```

## legado.browser.setUserAgent

设置探测 WebView 的默认 UA，新创建的会话生效。

```js
legado.browser.setUserAgent(ua)
```
