浏览器探测 — 双向桥接（legadoBridge）使用说明

概述
- 本文档说明 `browser_probe` 在宿主（Rust/Tauri/Android）与页面（JS/书源/Boa）之间的双向通讯约定和示例。
- 当前实现已支持：事件订阅、单向 postMessage、带 requestId 的请求/响应（支持 Promise/异步返回）。

核心接口（页面端 / JS）
- `window.legadoBridge.on(type, handler)`：注册消息处理器。handler 可返回值或 Promise；若返回非 undefined 的值，则作为处理结果被上游取到。
- `window.legadoBridge.onMessage(handler)`：注册通配符 `'*'` 处理器，接收所有类型消息。
- `window.legadoBridge.off(type, handler)`：移除处理器。
- `window.legadoBridge.postMessage(type, data)`：向宿主发送单向消息（不等待返回），返回一个 Promise（内部使用 Tauri invoke）。
- `window.legadoBridge.request(type, data, options)`：向宿主发送请求，期待返回值。`options` 支持 `timeoutSecs`/`timeoutMs`。返回 Promise，解析为响应值或 reject 错误。

核心接口（宿主 / Rust）
- 已导出的 Tauri command（见 `src-tauri/src/browser_probe_tauri.rs`）：
  - `browser_probe_post_message`：向指定 session 投递单向消息。
  - `browser_probe_request_message`：发起 request（会生成 requestId），同步/异步返回 JSON 值。
  - `browser_probe_respond_message`：用于将页面对带 requestId 的请求做出响应（ok/value 或 err）。
  - `browser_probe_wait_message` / `browser_probe_drain_messages`：在 Rust 端轮询或清空挂起的页面消息队列。

双向通讯使用示例

页面端（书源 / Boa）示例：
```js
// 注册处理器
const off = window.legadoBridge.on('my-event', async (data, raw) => {
  // 可以返回值或 Promise，宿主会等待（若请求带 expectsResponse=true）
  return { reply: 'ok', echo: data };
});

// 发起带返回值的请求到宿主
try {
  const result = await window.legadoBridge.request('do-something', { foo: 1 }, { timeoutSecs: 10 });
  console.log('host replied', result);
} catch (err) {
  console.error('request failed', err);
}

// 发单向消息（不等待返回）
window.legadoBridge.postMessage('notify', { x: 1 });
```

宿主（Rust）示例：发起 request 并等待响应
```rust
// 使用导出的 command 或内部 bridge helper 发起请求
let resp = browser_request_message_sync(app, session_id, "some-type".into(), json!("payload"), Default::default())?;
// resp 为 serde_json::Value
```

关于回调/异步返回
- 页面端的 handler 可以返回同步值或 Promise；若请求含 `expectsResponse=true`，宿主端会等待 JS handler 的返回并将其作为响应值。
- 对于 Windows + WebView2 的同步评估路径，存在原生限制（某些同步 Eval API 无法返回 Promise 的异步结果），代码中对该平台做了降级处理并可能返回 `AsyncUnsupported` 错误。若需可靠的异步响应，请使用 `browser_probe_page_message` + request/response path（通常基于 Tauri invoke），或使用非同步 Eval + 专门的请求/响应桥。

拆分与模块化建议
- 当前实现已经按平台与功能拆分为多个模块（`browser_probe_tauri/*`）。如需进一步保证单文件小于 500 行，请按 "平台（android/windows/desktop）" 与 "功能（bridge/commands/eval/navigation/intercept/state）" 继续拆分成独立文件或子目录。

兼容性说明
- Android: 通过 JNI 与宿主 `BrowserProbeHost` 双向通信，支持将 JS Promise 返回值序列化回 Rust。
- Windows: 对 WebView2 的同步 eval 有额外处理，异步结果可能无法通过某些同步路径传回；桥接 API 提供替代的 request/response 路径来支持异步。

参考
- 源码位置：`src-tauri/src/browser_probe_tauri.rs`
- 页面运行时代码：`src-tauri/src/browser_probe/probe_script.rs`

如需我把某个超长文件按功能拆成独立模块（并附带编译验证），请指定要拆分的目标文件或允许我自动拆分并运行一次构建检查。
