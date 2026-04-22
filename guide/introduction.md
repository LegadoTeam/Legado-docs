# 简介

Legado Tauri 是基于 [Tauri v2](https://tauri.app/) 构建的开源阅读桌面应用。书源系统是其核心功能 —— 通过编写 JavaScript 脚本，你可以为任意网站/API 创建内容适配器，让应用能够搜索、浏览和阅读来自不同来源的书籍、漫画和视频。

## 什么是书源？

书源是一个 `.js` 文件，它定义了如何从特定网站抓取内容。每个书源实现以下核心函数：

| 函数 | 作用 | 是否必须 |
|------|------|---------|
| `search(keyword, page)` | 搜索书籍 | ⚡ 可选  |
| `bookInfo(bookUrl)` | 获取书籍详情 | ✅ 必须 |
| `chapterList(tocUrl)` | 获取章节目录 | ✅ 必须 |
| `chapterContent(chapterUrl)` | 获取章节正文 | ✅ 必须 |
| `explore(page, category)` | 发现页推荐 | ⚡ 可选 |

## 运行环境

书源运行在 **Boa JS 引擎** 上，这意味着：

- **语法风格**：仍建议使用 `var` 和传统函数写法，避免箭头函数、`class` 等高阶语法
- **浏览器兼容层**：没有真实 DOM，但会把 `fetch` / `Headers` / `Request` / `Response` / `URLSearchParams` / `FormData` 作为全局对象注入，并同步挂到 `legado.http.*`
- **异步宿主 API**：HTTP、哈希、加解密等宿主能力都会返回 `Promise`，应使用 `async`/`await`
- **宿主 API**：通过 `legado.*` 命名空间提供 HTTP、DOM、加密等能力

::: tip 关于 ES5 限制
书源仍建议维持保守写法，但宿主 I/O 已统一异步。最稳妥的模式是继续使用 `var` / 普通函数结构，并在入口函数上加 `async`。
:::

## 推荐使用顺序

- HTTP 优先用 `fetch` / `Headers` / `Request` / `Response` / `URLSearchParams` / `FormData`
- 兼容旧书源时使用 `legado.http.get/post/request/postBinary/batchGet`
- DOM 优先用 `legado.dom.selectText` / `selectAttr` / `selectAllTexts` / `selectAllAttrs`
- 动态页优先用 `legado.browser.run()`，需要长会话时再组合 `acquire()` / `navigate()` / `eval()`

## 书源类型

| 类型 | 元数据标记 | `chapterContent` 返回值 |
|------|-----------|------------------------|
| 小说 | （默认） | 纯文本字符串 |
| 漫画 | `// @type comic` | `JSON.stringify(imageUrls)` |
| 视频 | `// @type video` | 播放地址（URL 或 JSON） |

## 下一步

- [快速开始](/guide/getting-started) — 5 分钟创建你的第一个书源
- [API 参考](/api/) — 完整的宿主 API 文档
