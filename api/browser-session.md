# 浏览器探测 — 会话管理

浏览器探测用于处理普通 HTTP 客户端难以应对的网站（JS 渲染、登录验证、HttpOnly Cookie）。探测 WebView 使用独立 profile，与主程序 UI 隔离。

::: info CLI 兼容性
CLI 测试模式会启动隐藏的 Tauri 后端，浏览器探测 API 使用与 GUI 一致的 WebView 宿主，可直接通过 `booksource-test` / `booksource-eval` 调试依赖 `legado.browser.*` 的书源。需要人工登录或验证时，`show` 或 `visible: true` 仍可能弹出探测窗口。
:::

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
| `userAgent` | `string` | 跟随浏览器探测设置 | 本会话使用的 UA |
| `width` / `height` | `number` | 平台默认值 | 桌面端探测窗口尺寸 |
| `timeoutSecs` | `number` | 跟随浏览器探测设置 | 超时秒数 |
| `timeout` | `number` | — | `timeoutSecs` 的兼容别名，单位秒 |
| `timeoutMs` | `number` | — | 超时毫秒数，会向上取整为秒 |
| `muted` | `boolean` | `false` | 创建时即静音，屏蔽音频输出 |

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

---

## 静音控制

静音后探测 WebView 的音频输出被完全屏蔽，不会播放页面内嵌的视频/音频，适合后台抓包场景。

### legado.browser.mute

```js
legado.browser.mute(id) → void
```

### legado.browser.unmute

```js
legado.browser.unmute(id) → void
```

### legado.browser.setMuted

```js
legado.browser.setMuted(id, muted) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID |
| `muted` | `boolean` | `true` 静音，`false` 取消静音 |

### 示例

```js
// 创建时直接静音
var id = legado.browser.create({ visible: false, muted: true });

// 或运行时切换
legado.browser.mute(id);
legado.browser.navigate(id, url, { waitUntil: 'networkidle' });
var html = legado.browser.html(id);
legado.browser.close(id);
```

::: info 平台说明
- **Tauri/桌面**：WebView2（Windows）通过 `put_IsMuted`；WebKit（macOS/Linux）通过 `setPageMuted`。
- **鸿蒙**：ArkWeb `WebController.setAudioMuted()`。
:::
