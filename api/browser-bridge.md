# 浏览器探测 — Boa 双向通信

探测页面会注入 `window.legadoBridge`。书源 Boa 侧通过 `legado.browser.*` 与页面实时交换 JSON 数据；页面侧可以注册异步 handler，也可以主动向 Boa 发送消息并等待响应。

## Boa → 浏览器页面

### legado.browser.postMessage

向页面发送一条消息，不等待页面 handler 返回。

```js
legado.browser.postMessage(id, type, data?) → void
```

页面侧接收：

```js
window.legadoBridge.on('need-url', function(data, event) {
  console.log(data, event.sessionId);
});

window.legadoBridge.onMessage(function(data, event) {
  console.log(event.type, data);
});
```

### legado.browser.request

向页面发送请求，并等待页面 handler 的同步或异步返回值。

```js
legado.browser.request(id, type, data?, options?) → any
```

```js
var token = legado.browser.request(id, 'read-token', { selector: '#token' }, { timeoutSecs: 10 });
```

页面 handler 可以返回普通值或 `Promise`：

```js
window.legadoBridge.on('read-token', async function(data) {
  await new Promise(function(resolve) { setTimeout(resolve, 100); });
  return document.querySelector(data.selector)?.textContent || '';
});
```

## 浏览器页面 → Boa

### window.legadoBridge.postMessage

页面向 Boa 发送消息。Boa 侧可用 `drainMessages` 批量读取，或用 `waitMessage` 阻塞等待下一条。

```js
window.legadoBridge.postMessage('player-ready', { duration: 120 });
```

```js
var event = legado.browser.waitMessage(id, { timeoutSecs: 30 });
if (event && event.type === 'player-ready') {
  legado.log('duration=' + event.data.duration);
}
```

### window.legadoBridge.request

页面向 Boa 发起请求并等待 Boa 回复。Boa 可以手动 `respondMessage`，也可以注册 `onMessage` 后用 `handleNextMessage` / `pumpMessages` 自动调用回调。

```js
// 页面上下文
var value = await window.legadoBridge.request('sign', { text: location.href });
```

`requestHost` 是同一个方法的兼容别名。

```js
// Boa 书源上下文
legado.browser.onMessage(id, async function(event) {
  if (event.type === 'sign') return await legado.md5(event.data.text);
});

await legado.browser.handleNextMessage(id, { timeoutSecs: 30 });
```

## Boa 侧消息 API

| API | 说明 |
|-----|------|
| `postMessage(id, type, data?)` | Boa 向页面发送消息 |
| `request(id, type, data?, options?)` | Boa 向页面发送请求并等待返回值 |
| `drainMessages(id)` | 取走页面发来的所有消息 |
| `waitMessage(id, options?)` | 等待页面发来的下一条消息，超时返回 `null` |
| `respondMessage(id, requestId, value?)` | 回复页面 `requestHost` |
| `respondMessageError(id, requestId, error)` | 以错误回复页面 `requestHost` |
| `onMessage(id, handler)` | 注册 Boa 侧消息 handler |
| `pumpMessages(id)` | 读取当前队列并逐条调用 handler |
| `handleNextMessage(id, options?)` | 等待一条消息并调用 handler |

`legado.browser2` 的 `BrowserSession` 对象提供同名实例方法。

::: warning 避免互相等待
`legado.browser.request` 会阻塞当前 Boa 调用直到页面返回；不要在它触发的页面 handler 内再调用 `requestHost` 等待同一个 Boa 调用回复。需要页面主动请求 Boa 时，先让页面事件进入队列，再在书源函数中调用 `waitMessage` / `handleNextMessage` 处理。
:::