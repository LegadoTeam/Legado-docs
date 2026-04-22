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
// @group       分类
// @logo        https://example.com/favicon.ico
// @type        comic
// @enabled     true
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
| `@group` | `string` | 否 | 分组归类 |
| `@logo` | `string` | 否 | 图标 URL，在书源卡片中显示 |
| `@type` | `string` | 否 | 书源类型：`comic`（漫画）/ `video`（视频），默认为小说 |
| `@enabled` | `boolean` | 否 | 是否启用，默认 `true` |
| `@tags` | `string` | 否 | 标签列表（逗号分隔），第一个值作为 UI 分组 |
| `@description` | `string` | 否 | 简介，多行自动拼接 |

::: tip
`@url` 可以写多行，每行一个镜像地址。第一个会作为主 URL，其余为备用镜像。
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

::: warning 空结果处理
所有函数应返回有效值，空结果返回 `[]`，不要返回 `null` 或 `undefined`。
:::
