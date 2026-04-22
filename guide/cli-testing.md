# CLI 测试工具

Legado Tauri 提供命令行工具，无需显示主窗口即可逐模块测试书源。CLI 会启动隐藏的 Tauri 后端环境，书源脚本使用与 GUI 一致的宿主 API。

## 前置条件

```bash
cd src-tauri
cargo build          # Debug 构建
# 或 cargo build --release
```

可执行文件位于 `src-tauri/target/debug/legado_tauri.exe`（Windows）。

## 基本用法

```bash
legado_tauri cli booksource-test <文件> <操作> [参数...]
legado_tauri cli booksource-eval <文件> <代码>
```

### 文件参数格式

| 形式 | 示例 | 说明 |
|------|------|------|
| 完整路径 | `./booksources/22笔趣阁.js` | 绝对或相对路径 |
| 仅文件名 | `22笔趣阁.js` | 在 AppData/booksources/ 中查找 |
| 无后缀 | `22笔趣阁` | 自动补 `.js` 后缀 |

### 操作一览

| 操作 | 参数 | 说明 |
|------|------|------|
| `search` | `<关键词> [页码]` | 测试搜索，默认第 1 页 |
| `info` | `<书籍URL>` | 测试书籍详情 |
| `toc` | `<书籍URL>` | 测试章节目录 |
| `content` | `<章节URL>` | 测试正文（预览前 300 字） |
| `explore` | `[分类名] [页码]` | 测试发现页，不传分类则测试全部 |
| `all` | `<关键词> [页码]` | 全流程：search → info → toc → content → explore |

### 直接执行 JS

`booksource-eval` 会先装载书源并执行 `init()`，再在同一个书源上下文中执行指定 JS，最后把返回值输出到控制台。字符串会原样输出，对象和数组会尽量格式化为 JSON。

```bash
# 执行一段表达式
legado_tauri cli booksource-eval ./booksources/我的书源.js "Object.keys(this).slice(0, 5)"

# 调用书源函数并输出返回值
legado_tauri cli booksource-eval ./booksources/我的书源.js "search('斗破苍穹', 1).then(function(list){ return list.length; })"

# 从文件读取要执行的 JS
legado_tauri cli booksource-eval ./booksources/我的书源.js --code-file ./tmp/debug.js
```

也可以使用短入口：

```bash
cargo run -- booksource-eval ./booksources/我的书源.js "typeof search"
```

## 推荐测试流程

按模块顺序逐步验证，每个模块通过后再进入下一个：

```bash
# 1. 测试发现页
legado_tauri cli booksource-test ./booksources/我的书源.js explore

# 2. 测试书籍详情（使用发现页中的 bookUrl）
legado_tauri cli booksource-test ./booksources/我的书源.js info https://example.com/book/123

# 3. 测试章节目录
legado_tauri cli booksource-test ./booksources/我的书源.js toc https://example.com/book/123

# 4. 测试正文（使用目录中的某个章节 URL）
legado_tauri cli booksource-test ./booksources/我的书源.js content https://example.com/chapter/456

# 5. 测试搜索
legado_tauri cli booksource-test ./booksources/我的书源.js search 斗破苍穹

# 6. 全流程测试
legado_tauri cli booksource-test ./booksources/我的书源.js all 斗破苍穹
```

## 输出格式

每个步骤用框线标注，结果为结构化文本 + JSON：

```
╔══════════════════════════════════════════════════════════╗
║  [1/5] search  keyword="斗破苍穹"  page=1               ║
╚══════════════════════════════════════════════════════════╝
  ✓  返回 18 条搜索结果

╔══════════════════════════════════════════════════════════╗
║  [2/5] bookInfo  url=https://example.com/book/123       ║
╚══════════════════════════════════════════════════════════╝
  ✓  《斗破苍穹》

──────────────────────────────────────────────────────────
  书源测试摘要
──────────────────────────────────────────────────────────
  ✓  search           18 条
  ✓  bookInfo         《斗破苍穹》
  ✓  chapterList      575 章
  ✓  chapterContent   3200 字
  ✓  explore          11/11 分类成功
──────────────────────────────────────────────────────────
  通过 5/5
──────────────────────────────────────────────────────────
```

::: info CLI 运行环境
CLI 模式会启动隐藏主窗口的 Tauri 后端，书源脚本使用与 GUI 一致的宿主环境。`legado.browser.*`、`legado.http.request`、`legado.config.readBytes/writeBytes` 等能力均按 GUI 宿主路径执行。

为避免端口冲突，CLI 测试模式会忽略 `web_server_enabled` 配置，不会自动启动 Web/WS 服务器。需要独立 Web 服务时请使用 `legado_tauri serve`。

启动日志默认静默（仅输出书源脚本的 `legado.log()`、测试结果、错误）。
加 `--verbose` 开启启动计时 / Cookie / HTTP 头等详细日志：

```bash
legado_tauri --verbose cli booksource-eval ./booksources/我的书源.js "typeof search"
```
:::
