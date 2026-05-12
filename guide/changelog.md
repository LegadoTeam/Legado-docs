# API 更新日志

记录书源引擎对外 API 的新增与变更。版本号对应应用发版，日期为合并时间。

---

## 浏览器探测

### `legado.browser.acquire` 成为推荐入口

- `acquire(role, options?)` 会自动将 `reuseKey` 设置为 `"书源名:role"`，引擎在书源执行期间内部管理会话生命周期，**脚本无需手动 `close()`**。
- `create(options?)` 仍保留，但属于底层 API，非必要不使用。
- 参见：[会话管理](/api/browser-session)

### 新增 `legado.browser.offMessage`

```js
legado.browser.offMessage(id) → void
```

移除 Boa 侧通过 `onMessage` 注册的消息 handler。`BrowserSession.offMessage()` 是同名实例方法。

### 新增 `legado.browser2.fromId`

```js
legado.browser2.fromId(id) → BrowserSession
```

从底层句柄 ID 包装成 `BrowserSession` 对象，供需要混用句柄风格与对象风格的场景使用。

### 新增 `legado.browser.onRequest` 过滤选项

`onRequest(id, handler, options?)` 的 `options` 新增以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `captureBody` | `boolean` | 是否捕获响应体。Windows 上仅对 m3u8/video/audio 类型生效 |
| `url` / `urlRegex` / `urlPattern` | `string \| RegExp` | 只捕获匹配该正则的 URL |
| `contentType` / `contentTypeRegex` | `string \| RegExp` | 按 Content-Type 过滤 |

**重要行为**：handler 不是实时触发，而是 `navigate()` 返回后批量执行。`navigate()` 调用返回时所有事件已处理完毕。

`BrowserSession.onRequest(handler, options?)` 同步支持上述字段。

---

## Cookie

### 新增 `legado.browser.getCookie`

```js
legado.browser.getCookie(domain, name) → string | undefined
```

从 HTTP CookieStore 读取单个 Cookie 值，适合轻量场景，无需创建探测会话。

---

## 对象风格封装（`legado.browser2`）

`legado.browser2` 命名空间提供与 `legado.browser` 句柄风格等价的对象风格封装，所有新 API 在两种风格中同步可用。

| `legado.browser2` 工厂方法 | 说明 |
|------|------|
| `acquire(role, options?)` | **推荐**：按角色获取/复用，返回 `BrowserSession` |
| `create(options?)` | 新建独立会话，返回 `BrowserSession` |
| `run(url, code, options?)` | 一次性导航 + eval |
| `fromId(id)` | 从底层 ID 包装 `BrowserSession` |

参见：[导航与执行](/api/browser-navigate)
