# 命令行参考

Legado Tauri 提供三类命令行入口：默认 GUI 启动、隐藏 Tauri 后端的书源 CLI、独立 Web 服务器 `serve`。书源 CLI 会复用 GUI 同款宿主环境，因此 `legado.http.*`、`legado.browser.*`、`legado.config.*`、图片处理、Cookie、代理、DoH 等行为与应用内调试更接近。

## 前置条件

```bash
cd src-tauri
cargo build
# 或 cargo build --release
```

Windows Debug 可执行文件通常位于：

```text
src-tauri/target/debug/legado_tauri.exe
```

Release 可执行文件通常位于：

```text
src-tauri/target/release/legado_tauri.exe
```

开发时也可以直接使用 `cargo run -- ...`。下面示例统一写成 `legado_tauri ...`，使用 `cargo run` 时把可执行文件名替换为 `cargo run --` 即可。

## 总览

| 模式          | 命令                                                                                                         | 说明                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| GUI           | `legado_tauri [--verbose]`                                                                                   | 正常启动桌面应用                                            |
| GUI Headless  | `LEGADO_HEADLESS=1 legado_tauri [--verbose]`                                                                 | 初始化 GUI 后端但不显示主窗口，主要用于自动化或排查启动流程 |
| CLI 帮助      | `legado_tauri [--verbose] cli [help\|--help\|-h]`                                                            | 查看 CLI 子命令                                             |
| 书源测试      | `legado_tauri [--verbose] cli booksource-test <文件> [--cookie <domain> <name> <value>]... <操作> [参数...]` | 按模块测试书源                                              |
| JS 求值       | `legado_tauri [--verbose] cli booksource-eval <文件> [--cookie <domain> <name> <value>]... <代码>`           | 装载书源后执行一段 JS                                       |
| 独立 Web 服务 | `legado_tauri [--verbose] serve [--port <端口>] [--web-dist <目录>]`                                         | 不启动 GUI，只启动 HTTP/WS 服务                             |
| 短入口        | `legado_tauri [--verbose] booksource-test ...`                                                               | 兼容入口，等价于 `cli booksource-test ...`                  |
| 短入口        | `legado_tauri [--verbose] booksource-eval ...`                                                               | 兼容入口，等价于 `cli booksource-eval ...`                  |

`--verbose` 是全局选项，程序会在分发子命令前移除它。建议把它放在可执行文件后面，便于阅读：

```bash
legado_tauri --verbose cli booksource-eval ./booksources/我的书源.js "typeof search"
```

启用后会输出启动计时、Cookie、HTTP 头等更详细日志。默认只输出测试结果、书源脚本日志和错误信息。

`LEGADO_HEADLESS=1` 是环境变量，不是命令行参数。Windows PowerShell 可以这样启动：

```powershell
$env:LEGADO_HEADLESS = "1"
legado_tauri --verbose
```

## 帮助入口

| 命令                               | 说明                  |
| ---------------------------------- | --------------------- |
| `legado_tauri cli`                 | 显示 CLI 子命令帮助   |
| `legado_tauri cli help`            | 显示 CLI 子命令帮助   |
| `legado_tauri cli --help`          | 显示 CLI 子命令帮助   |
| `legado_tauri cli -h`              | 显示 CLI 子命令帮助   |
| `legado_tauri cli booksource-test` | 显示书源测试帮助      |
| `legado_tauri cli booksource-eval` | 显示 JS 求值帮助      |
| `legado_tauri serve --help`        | 显示独立 Web 服务帮助 |
| `legado_tauri serve -h`            | 显示独立 Web 服务帮助 |

## 文件参数

`booksource-test` 和 `booksource-eval` 的 `<文件>` 使用同一套解析规则。

| 形式         | 示例                         | 说明                                      |
| ------------ | ---------------------------- | ----------------------------------------- |
| 绝对路径     | `D:/booksources/22笔趣阁.js` | 直接使用该文件                            |
| 相对路径     | `./booksources/22笔趣阁.js`  | 相对当前工作目录解析                      |
| 仅文件名     | `22笔趣阁.js`                | 在应用数据目录的 `booksources` 子目录查找 |
| 无后缀文件名 | `22笔趣阁`                   | 先按原名查找，找不到时自动补 `.js`        |

应用数据目录与 Tauri 默认路径保持一致：Windows 为 `%APPDATA%/com.legado-tauri`，macOS 为 `~/Library/Application Support/com.legado-tauri`，Linux 为 `~/.local/share/com.legado-tauri`。

## Cookie 注入

书源测试和 JS 求值都支持 `--cookie`，用于临时注入需要认证或 Cloudflare 验证的站点 Cookie。

```bash
legado_tauri cli booksource-test 问年小说 \
  --cookie wnian001.com cf_clearance <cf_clearance值> \
  --cookie wnian001.com __cf_bm <__cf_bm值> \
  search 斗破苍穹
```

| 选项       | 参数                      | 可重复 | 位置                                   | 说明                                     |
| ---------- | ------------------------- | ------ | -------------------------------------- | ---------------------------------------- |
| `--cookie` | `<domain> <name> <value>` | 是     | 必须位于 `<文件>` 之后、操作或代码之前 | 注入到 Cookie Store，HTTP 请求会自动携带 |

注意事项：

- `domain` 不需要写协议，例如 `wnian001.com`。
- 注入时内部按 `https://<domain>/` 写入 Cookie。
- 该选项没有短别名。
- 放在操作名、`--code` 或 `--code-file` 后面不会再被当作 Cookie 选项解析。

## booksource-test

`booksource-test` 用于逐项调用书源函数，适合验证搜索、详情、目录、正文、发现页和完整流程。

```bash
legado_tauri cli booksource-test <文件> [--cookie <domain> <name> <value>]... <操作> [参数...]
```

### 操作与参数

| 操作      | 参数                          | 默认值                      | 调用书源函数              | 说明                                                                       |
| --------- | ----------------------------- | --------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `search`  | `[关键词] [页码]`             | 关键词 `斗破苍穹`，页码 `1` | `search(keyword, page)`   | 输出搜索结果预览                                                           |
| `info`    | `<书籍URL>`                   | 无                          | `bookInfo(url)`           | 输出书籍名称、作者、封面、简介等                                           |
| `toc`     | `<书籍URL>`                   | 无                          | `chapterList(url)`        | 输出章节列表预览                                                           |
| `content` | `<章节URL>`                   | 无                          | `chapterContent(url)`     | 自动合并多页正文，预览前 300 字                                            |
| `explore` | `[分类名] [页码]` 或 `[页码]` | 分类为空，页码 `1`          | `explore(page, category)` | 不传分类时测试全部发现分类；首个参数是数字时视为页码                       |
| `all`     | `[关键词] [页码]`             | 关键词 `斗破苍穹`，页码 `1` | 依次调用核心函数          | 完整流程：`search -> bookInfo -> chapterList -> chapterContent -> explore` |

`info`、`toc`、`content` 缺少 URL 时会报错并退出。未知操作会打印帮助信息。

### 示例

```bash
# 搜索第一页
legado_tauri cli booksource-test ./booksources/我的书源.js search 斗破苍穹

# 搜索第二页
legado_tauri cli booksource-test ./booksources/我的书源.js search 斗破苍穹 2

# 发现页：测试全部分类
legado_tauri cli booksource-test ./booksources/我的书源.js explore

# 发现页：只测试指定分类第一页
legado_tauri cli booksource-test ./booksources/我的书源.js explore 玄幻 1

# 发现页：不指定分类，直接测试第 2 页
legado_tauri cli booksource-test ./booksources/我的书源.js explore 2

# 书籍详情
legado_tauri cli booksource-test ./booksources/我的书源.js info https://example.com/book/123

# 章节目录
legado_tauri cli booksource-test ./booksources/我的书源.js toc https://example.com/book/123

# 章节正文
legado_tauri cli booksource-test ./booksources/我的书源.js content https://example.com/chapter/456

# 全流程
legado_tauri cli booksource-test ./booksources/我的书源.js all 斗破苍穹 1
```

开发环境短入口示例：

```bash
cd src-tauri
cargo run -- booksource-test ./booksources/我的书源.js all 斗破苍穹
```

## booksource-eval

`booksource-eval` 会先装载书源并执行无参 `init()`，再在同一个书源上下文中执行指定 JS，最后把返回值输出到控制台。

```bash
legado_tauri cli booksource-eval <文件> [--cookie <domain> <name> <value>]... <代码>
legado_tauri cli booksource-eval <文件> [--cookie <domain> <name> <value>]... --code <代码>
legado_tauri cli booksource-eval <文件> [--cookie <domain> <name> <value>]... --code-file <代码文件>
```

### 代码参数

| 写法          | 参数         | 说明                                                                 |
| ------------- | ------------ | -------------------------------------------------------------------- |
| 直接代码      | `<代码...>`  | 从当前位置开始把剩余参数用空格拼接成 JS 代码，建议用引号包住整段代码 |
| `--code`      | `<代码>`     | 只读取 `--code` 后面的一个参数作为 JS 代码，适合明确区分选项和代码   |
| `--code-file` | `<代码文件>` | 读取文件内容作为 JS 代码，代码文件路径按当前工作目录解析             |

返回值输出规则：

| 返回值类型                 | 输出                          |
| -------------------------- | ----------------------------- |
| `undefined`                | 输出 `undefined`              |
| 字符串                     | 原样输出字符串内容            |
| 函数                       | 输出 `String(function)`       |
| 可 JSON 序列化的对象或数组 | 格式化为 JSON                 |
| JS 抛错                    | 输出错误名称、消息和 JS Stack |

### 示例

```bash
# 查看当前书源上下文中的全局字段
legado_tauri cli booksource-eval ./booksources/我的书源.js "Object.keys(this).slice(0, 5)"

# 调用书源函数并返回结果数量
legado_tauri cli booksource-eval ./booksources/我的书源.js "search('斗破苍穹', 1).then(function(list){ return list.length; })"

# 用 --code 明确传入代码
legado_tauri cli booksource-eval ./booksources/我的书源.js --code "typeof search"

# 从文件读取调试代码
legado_tauri cli booksource-eval ./booksources/我的书源.js --code-file ./tmp/debug.js

# 带 Cookie 调试浏览器探测或 HTTP 请求
legado_tauri cli booksource-eval ./booksources/我的书源.js \
  --cookie example.com cf_clearance <值> \
  "legado.http.get('https://example.com/')"
```

直接验证浏览器探测：

```bash
legado_tauri cli booksource-eval ./booksources/我的书源.js "legado.browser.run('https://example.com', 'return document.title', { waitUntil: 'load', timeoutSecs: 20 })"
```

## serve

`serve` 是独立 Web 服务器模式，不启动 Tauri GUI。它适合服务器、容器、局域网调试或只需要 HTTP/WS 后端的场景。

```bash
legado_tauri serve [--port <端口>] [--web-dist <目录>]
```

### 选项

| 选项         | 参数     | 默认值                                            | 说明                                                |
| ------------ | -------- | ------------------------------------------------- | --------------------------------------------------- |
| `--port`     | `<端口>` | 应用配置 `web_server_port`，配置不可用时为 `7688` | 监听端口                                            |
| `-p`         | `<端口>` | 同 `--port`                                       | `--port` 的短别名                                   |
| `--web-dist` | `<目录>` | 不提供 SPA 静态文件服务                           | 指定 Vue 构建产物目录，目录存在时作为静态文件根目录 |
| `--help`     | 无       | 无                                                | 显示帮助并退出                                      |
| `-h`         | 无       | 无                                                | `--help` 的短别名                                   |

`serve` 会从应用数据目录加载应用配置、Cookie、TLS 忽略证书设置、代理和 DoH 配置。未指定 `--web-dist` 时仍提供 `/ws`、`/health`、`/tester`、`/asset/*` 和书源调试 API，但不会把 Vue SPA 作为根路径静态站点托管。

### 端点

| 端点                                     | 说明                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| `ws://0.0.0.0:<端口>/ws`                 | WebSocket 事件与命令通道                             |
| `http://0.0.0.0:<端口>/health`           | 健康检查，返回 `status`、版本和 `mode: "web-server"` |
| `http://0.0.0.0:<端口>/tester`           | 内置书源测试页面                                     |
| `http://0.0.0.0:<端口>/api/booksource/*` | 书源调试 API                                         |

### 示例

```bash
# 使用配置中的端口启动独立服务
legado_tauri serve

# 指定端口
legado_tauri serve --port 9000
legado_tauri serve -p 9000

# 指定前端构建产物目录
legado_tauri serve --port 9000 --web-dist ../dist

# 开启详细日志
legado_tauri --verbose serve -p 9000 --web-dist ../dist
```

## 运行环境差异

| 场景                                          | 主窗口 | Tauri 后端        | 浏览器探测                                                        | Web/WS 服务                             | 典型用途                      |
| --------------------------------------------- | ------ | ----------------- | ----------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| GUI 默认启动                                  | 显示   | 完整              | 完整                                                              | 按应用设置决定                          | 日常使用                      |
| `LEGADO_HEADLESS=1`                           | 隐藏   | 完整              | 完整                                                              | 按应用设置决定                          | 自动化启动、启动流程排查      |
| `cli booksource-test` / `cli booksource-eval` | 隐藏   | 完整              | 完整，`visible: true` 或 `legado.browser.show(id)` 可显示探测窗口 | 忽略 `web_server_enabled`，不会自动启动 | 真实宿主下测试书源            |
| `serve`                                       | 不启动 | 独立 HTTP/WS 后端 | 桌面专属能力在 Web 服务模式下可能不完全可用                       | 总是启动                                | B/S、服务器、容器、局域网调试 |
| Node 模拟环境                                 | 不启动 | 不启动 Rust       | 轻量模拟                                                          | 不启动                                  | 快速验证解析逻辑              |

CLI 模式每次命令都会创建本次测试使用的书源上下文，并自动调用无参 `init()`。如果需要人工登录、验证码或 Cloudflare 页面，可以让书源在浏览器探测选项中传入 `visible: true`，或在 eval 中调用 `legado.browser.show(id)`。

## 纯 Node.js 模拟环境

快速开发时可以使用纯 Node.js 书源宿主模拟器。它不启动 Tauri，也不调用 Rust 主程序，因此速度更快，但不能完全等价真实 WebView。

```bash
pnpm booksource:node:test <文件> search 斗破苍穹 1
pnpm booksource:node:test <文件> all 斗破苍穹
pnpm booksource:node:eval <文件> "await search('斗破苍穹', 1)"
node scripts/booksource-node-runtime.mjs --watch eval <文件> --code-file ./tmp/debug.js
```

该模拟器会注入 `legado.http/config/browser/dom/dom2/image/runtime/ui`、`btoa/atob/html`、`fetch/Request/Response/Headers/FormData/URLSearchParams` 等接口，调用约定与 CLI 的 `init/search/bookInfo/chapterList/chapterContent/explore` 对齐。HTTP、Cookie、配置、基础 DOM、哈希/AES 等能力由 Node 原生实现；浏览器探测用 `fetch + document` 轻量模拟。最终发布前仍建议用 Tauri CLI 复核。

## 推荐测试流程

按模块顺序逐步验证，每个模块通过后再进入下一个：

```bash
# 1. 测试发现页
legado_tauri cli booksource-test ./booksources/我的书源.js explore

# 2. 测试书籍详情，使用发现页或搜索结果中的 bookUrl
legado_tauri cli booksource-test ./booksources/我的书源.js info https://example.com/book/123

# 3. 测试章节目录
legado_tauri cli booksource-test ./booksources/我的书源.js toc https://example.com/book/123

# 4. 测试正文，使用目录中的某个章节 URL
legado_tauri cli booksource-test ./booksources/我的书源.js content https://example.com/chapter/456

# 5. 测试搜索
legado_tauri cli booksource-test ./booksources/我的书源.js search 斗破苍穹

# 6. 全流程测试
legado_tauri cli booksource-test ./booksources/我的书源.js all 斗破苍穹
```

## 输出格式

每个步骤用框线标注，结果为结构化文本和 JSON 预览：

```text
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

## 常见问题

### 中文输出乱码

Windows CLI 入口会尝试把控制台编码切到 UTF-8。若输出被 PowerShell 管道处理后仍乱码，可先设置：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### `--cookie` 没生效

确认 `--cookie` 位于 `<文件>` 之后、操作名或代码之前：

```bash
# 正确
legado_tauri cli booksource-test 书源名 --cookie example.com session <值> search 斗破苍穹

# 错误：search 之后不会再解析 --cookie
legado_tauri cli booksource-test 书源名 search 斗破苍穹 --cookie example.com session <值>
```

### `serve` 启动后打不开首页

未指定 `--web-dist` 时，`serve` 不会托管 Vue SPA 根路径。先构建前端，再把构建产物目录传给 `--web-dist`：

```bash
legado_tauri serve --web-dist ../dist
```

仍可直接访问 `http://127.0.0.1:<端口>/tester` 和 `/health`。

### 不知道该用 Node 模拟还是 Tauri CLI

优先用 Node 模拟环境快速检查解析逻辑；涉及 Cookie、代理、DoH、浏览器探测、登录、验证码、Cloudflare、图片处理或发布前验收时，使用 Tauri CLI。
