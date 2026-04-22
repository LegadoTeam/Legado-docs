# 元数据字段 (BookSourceMeta)

书源 `.js` 文件头部注释中的元数据，由 Rust `parse_meta` 从前 60 行解析。

## 字段列表

| 注释标记 | 字段名 | 类型 | 必填 | 说明 |
|---------|--------|------|------|------|
| `@name` | `name` | `string` | ✅ | 书源名称 |
| `@url` | `url` / `urls` | `string` / `string[]` | ✅ | 主 URL / 所有镜像 URL |
| `@version` | `version` | `string` | 推荐 | 版本号 |
| `@author` | `author` | `string?` | 推荐 | 书源作者 |
| `@logo` | `logo` | `string?` | 否 | 图标 URL |
| `@group` | `group` | `string?` | 否 | 分组 |
| `@type` | — | `string` | 否 | 类型：`comic` / `video`，默认小说 |
| `@enabled` | `enabled` | `boolean` | 否 | 启用状态，默认 `true` |
| `@tags` | — | `string` | 否 | 标签（逗号分隔），第一个值作 UI 分组 |
| `@description` | `description` | `string?` | 否 | 多行简介 |
| — | `fileName` | `string` | 自动 | 磁盘文件名 |

## 多行字段

`@url` 和 `@description` 支持多行，每行写一个：

```js
// @url         https://www.example.com
// @url         https://mirror.example.com
// @description 这是第一行描述
// @description 这是第二行描述
```

- `@url`：第一个为主 URL（`url` 字段），全部存入 `urls` 数组
- `@description`：多行以 `\n` 拼接为一个字符串

## 示例

```js
// @name        22笔趣阁
// @version     1.2.0
// @author      开发者
// @url         https://www.22biqu.com
// @url         https://m.22biqu.net
// @logo        https://www.22biqu.com/favicon.ico
// @type        comic
// @enabled     true
// @tags        免费,漫画,热门
// @description 22笔趣阁漫画站
// @description 支持搜索、分类浏览
```
