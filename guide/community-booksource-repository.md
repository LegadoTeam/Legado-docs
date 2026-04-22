# 社区书源仓库规范

本文档用于说明如何为 Legado Tauri 维护一个可分发的社区书源仓库，以及仓库中 `repository.json` 的数据结构约定。

## 目标

社区仓库的目标不是直接存放项目源码，而是提供一个可被客户端远程拉取的公开镜像目录。客户端只关心两类文件：

- `*.js`：实际书源脚本文件
- `repository.json`：仓库索引清单

## 标准目录结构

公开仓库根目录应保持扁平结构，只放发布产物：

```text
repository/
  repository.json
  示例书源A.js
  示例书源B.js
  示例书源C.js
```

不要在公开仓库根目录放以下内容：

- 源码脚本目录说明文件
- 草稿、测试脚本、临时备份
- 子目录形式的分类结构
- 与客户端无关的构建文件

## 仓库来源与发布方式

本项目推荐使用以下流程生成公开仓库镜像：

1. 维护真实书源文件于主仓库 `booksources/`
2. 运行 `scripts/prepare_public_repository.py`
3. 脚本会把 `booksources/*.js` 复制到 `repository/`
4. 同时基于公开下载前缀生成 `repository/repository.json`
5. 再将 `repository/` 推送到公开仓库

项目内默认公开下载前缀固定为：

```text
https://raw.githubusercontent.com/LegadoTeam/repository/main
```

如果你维护自己的社区仓库，需要把该前缀替换成你自己的公开仓库 raw 地址。

## 书源脚本元数据要求

`repository.json` 的多数信息来自书源 JS 文件头部注释。当前生成脚本会在前 60 行内解析以下标签：

- `@name`
- `@version`
- `@author`
- `@url`
- `@logo`
- `@enabled`
- `@description`
- `@tags`

最小可用示例：

```js
// @name 示例书源
// @version 1.0.0
// @author your-name
// @url https://example.com
// @description 一个最小可用的社区书源示例
// @tags 示例,小说

async function search(key) {
  return [];
}
```

说明：

- `@url` 可出现多次；第一条会作为主 `url`
- `@description` 可出现多次；生成时会按换行拼接
- `@tags` 使用英文逗号分隔
- `group` 不直接从注释读取，生成脚本会默认回退到 `tags[0]`
- 文件名会进入 `repository.json` 的 `fileName`

## repository.json 结构

生成后的 `repository.json` 顶层结构如下：

```json
{
  "name": "Legado Tauri 书源仓库",
  "version": "1.0.0",
  "updatedAt": "2026-04-20T00:00:00Z",
  "sources": [
    {
      "name": "示例书源",
      "version": "1.0.0",
      "author": "your-name",
      "url": "https://example.com",
      "group": "示例",
      "logo": "",
      "description": "一个最小可用的社区书源示例",
      "tags": ["示例", "小说"],
      "enabled": true,
      "fileName": "示例书源.js",
      "downloadUrl": "https://raw.githubusercontent.com/your/repo/main/%E7%A4%BA%E4%BE%8B%E4%B9%A6%E6%BA%90.js",
      "fileSize": 1234,
      "updatedAt": "2026-04-20T00:00:00Z"
    }
  ]
}
```

字段说明：

- `name`：仓库名称
- `version`：仓库版本号，不等同于单个书源版本
- `updatedAt`：仓库索引生成时间，UTC ISO 格式
- `sources`：全部书源清单

单个 `source` 字段说明：

- `name`：书源展示名称
- `version`：书源版本号
- `author`：作者
- `url`：主站点地址
- `group`：分组名，当前默认取第一个标签
- `logo`：图标 URL，可为空
- `description`：简介
- `tags`：标签数组
- `enabled`：是否默认启用
- `fileName`：书源文件名
- `downloadUrl`：客户端下载地址
- `fileSize`：文件字节数
- `updatedAt`：该脚本文件修改时间，UTC ISO 格式

## 发布前校验建议

发布前至少检查以下内容：

- `repository/` 根目录只包含 `*.js` 与 `repository.json`
- 每个书源文件都能以 UTF-8 正常读取
- 每个文件名在仓库内唯一
- `repository.json` 能被正常解析为合法 JSON
- 每个 `downloadUrl` 都能直接下载到对应 `.js` 文件
- `fileName` 与公开仓库实际文件名完全一致
- `@name`、`@url`、`@tags` 至少填写到可识别状态
- 不要把草稿、测试站点、失效文件一起发布

## 常见错误

### 1. 把源码目录直接公开

错误做法：

- 直接把整个 `booksources/` 仓库结构暴露出去
- 根目录混入脚本、文档、批处理、临时文件

正确做法：

- 只发布镜像后的 `repository/` 产物目录

### 2. downloadUrl 前缀错误

错误做法：

- `downloadUrl` 仍指向本地路径
- 指向 GitHub 页面地址而不是 raw 地址
- 目录层级和实际公开仓库不一致

正确做法：

- 保证 `downloadUrl` 指向浏览器可直接下载 `.js` 原文的地址

### 3. 书源头部标签缺失或写法不一致

错误做法：

- `@tags` 使用中文逗号
- `@url` 写在 60 行之后
- 标签值写空，导致仓库索引缺少关键信息

正确做法：

- 把核心元数据集中写在文件开头前 60 行内

### 4. 仓库索引与实际文件不同步

错误做法：

- 修改了 `*.js` 但没有重新生成 `repository.json`
- 重命名文件后，索引仍保留旧文件名

正确做法：

- 每次发布前重新生成一遍索引文件

## 推荐命令

生成公开镜像：

```bash
python scripts/prepare_public_repository.py
```

仅生成索引：

```bash
python scripts/generate_repository.py \
  --dir ./repository \
  --base-url https://raw.githubusercontent.com/your/repo/main \
  --output ./repository/repository.json \
  --name "我的社区书源仓库"
```

## 兼容性约定

为了保证客户端兼容：

- `repository.json` 顶层结构不要随意改名
- `sources` 必须是数组
- 每个条目都必须保留 `fileName` 与 `downloadUrl`
- 即使某些字段为空，也应保持字段语义稳定

新增字段可以逐步扩展，但不要删除现有客户端已经依赖的字段。
