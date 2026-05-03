# 书源文件结构

每个书源是一个独立的 `.js` 文件，由**元数据注释**和**函数实现**两部分组成。

## 元数据注释

文件头部的注释块（前 60 行内）定义书源的基本信息：

```js
// @name        书源名称
// @version     1.0.0
// @author      作者名
// @url         https://主镜像.com
// @url         https://备用镜像.com
// @updateUrl   https://cdn.example.com/booksources/my-source.js
// @require     https://cdn.example.com/libs/utils.js
// @require     https://cdn.example.com/libs/decoder.js
// @group       分类
// @logo        https://example.com/favicon.ico
// @type        comic
// @enabled     true
// @minDelay    500
// @tags        免费,漫画,热门
// @description 简介第一行
// @description 简介第二行
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `@name` | `string` | ✅ | 书源名称，在列表中显示 |
| `@version` | `string` | 推荐 | 版本号，用于更新检测 |
| `@author` | `string` | 推荐 | 书源作者 |
| `@url` | `string` | ✅ | 主站 URL，可多行（第一个为主 URL） |
| `@updateUrl` | `string` | 否 | 自动更新地址，指向远程 `.js` 文件 |
| `@require` | `string` | 否 | 依赖 JS 的 URL，可多行，书源加载前依序 eval |
| `@group` | `string` | 否 | 分组归类 |
| `@logo` | `string` | 否 | 图标 URL，在书源卡片中显示 |
| `@type` | `string` | 否 | 书源类型：`comic`（漫画）/ `video`（视频），默认为小说 |
| `@enabled` | `boolean` | 否 | 是否启用，默认 `true` |
| `@minDelay` | `number` | 否 | 最小请求间隔（毫秒），防止频率过高被封 |
| `@tags` | `string` | 否 | 标签列表（逗号分隔），第一个值作为 UI 分组 |
| `@description` | `string` | 否 | 简介，多行自动拼接 |

::: tip
`@url` 可以写多行，每行一个镜像地址。第一个会作为主 URL，其余为备用镜像。
:::

## @updateUrl — 自动更新

`@updateUrl` 指向远程 `.js` 原始文件地址。客户端检查更新时：

1. 发送带 `Range: bytes=0-1023` 头的 GET 请求，只获取文件**前 1KB** 的内容
2. 解析远程文件头部的 `@version` 字段
3. 与本地版本号比较，有差异则提示更新
4. 确认更新时再发完整下载请求

请求 URL 会自动附加 `?action=check`（检查）或 `?action=download`（下载）查询参数；如果 URL 已有参数，会使用 `&` 连接，不会破坏原有参数。

::: warning 版本号必须位于前 1KB
`@version` 字段**必须出现在文件的前 1KB 以内**（约前 60 行）。更新检查只读取前 1KB，超出部分会被截断，导致无法正确比对版本。
:::

**示例：**
```js
// @name        22笔趣阁
// @version     1.3.0
// @updateUrl   https://cdn.example.com/booksources/22biqu.js
```

## @require — 依赖 JS

`@require` 允许书源在加载前先引入共用的工具库，避免重复编写解密、工具函数等代码。

**格式**：每行一个 `@require`，每条指向一个 **http/https 绝对 URL**：

```js
// @require     https://cdn.example.com/libs/crypto-utils.js
// @require     https://cdn.example.com/libs/manga-decoder.js
```

**加载机制：**

- 书源被首次调用时，引擎会按声明顺序依次下载并 `eval` 所有依赖
- 每个 URL **带进程级内存缓存**：同一运行期内相同 URL 不会重复下载
- 依赖在**宿主 API（`legado.*`）注入完成后**、主脚本 eval 之前执行，因此依赖中可调用 `legado.http`、`legado.dom` 等所有宿主 API
- 任意依赖下载失败或执行出错，书源加载立即失败并报错

::: warning
- 只支持 `http://` 或 `https://` 绝对 URL，相对路径无效
- 依赖不应与主脚本函数名冲突（会被主脚本覆盖）
- 进程重启后缓存清空，下次首次调用会重新下载
:::

## 完整文件骨架

```js
// ─── 元数据 ─────────────────────────────────────
// @name        书源名称
// @version     1.0.0
// @author      作者名
// @url         https://example.com
// @logo        https://example.com/favicon.ico
// @enabled     true
// @tags        免费,小说
// @description 站点描述

// ─── 配置 / 常量 ───────────────────────────────
var BASE = 'https://example.com';

// ─── 工具函数（按需） ─────────────────────────
function absUrl(path) {
  if (path.indexOf('http') === 0) return path;
  return BASE + path;
}

// ─── 内置测试 ─────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];
  // ...
}

// ─── 搜索 ────────────────────────────────────
async function search(keyword, page) { /* ... */ }

// ─── 详情 ────────────────────────────────────
async function bookInfo(bookUrl) { /* ... */ }

// ─── 目录 ────────────────────────────────────
async function chapterList(tocUrl) { /* ... */ }

// ─── 正文 ────────────────────────────────────
async function chapterContent(chapterUrl) { /* ... */ }

// ─── 发现页（可选） ──────────────────────────
async function explore(page, category) { /* ... */ }
```

## 函数签名一览

| 函数 | 参数 | 返回值 |
|------|------|--------|
| `search(keyword, page)` | 搜索词, 页码(从1开始) | `BookItem[]` |
| `bookInfo(bookUrl)` | 书籍页 URL | `BookItem` |
| `chapterList(tocUrl)` | 目录页 URL | `ChapterInfo[]` |
| `chapterContent(chapterUrl)` | 章节 URL | `string` |
| `explore(page, category)` | 页码, 分类名 | `string[]` 或 `BookItem[]` |

`BookItem` 详见 [数据结构 → BookItem](/api/types-book-item)。`search()`、`explore()` 和 `bookInfo()` 都可以返回 `latestChapter`、`latestChapterUrl`、`wordCount`、`chapterCount`、`updateTime`、`status` 等可选元数据。搜索和发现列表只提取当前列表页已有信息，不要逐本请求详情页补齐这些字段。

::: warning 空结果处理
所有函数应返回有效值，空结果返回 `[]`，不要返回 `null` 或 `undefined`。
:::
