# 如何使用 AI 编程工具编写书源

本页教你把 Cursor、GitHub Copilot、Windsurf、Claude Code 等主流 AI 编程工具用在 Legado Tauri 书源开发中。核心思路不是让 AI 一次性“猜完整书源”，而是让它按模块探测、实现、测试、修正。

## 适合使用的工具形态

| 工具形态 | 典型工具 | 适合做什么 |
|---------|----------|------------|
| AI IDE / 编辑器 Agent | Cursor、Windsurf | 让 AI 直接读写书源文件、根据测试结果修改代码 |
| VS Code 助手 | GitHub Copilot Chat / Agent | 在现有 VS Code 工作区中辅助补函数、解释报错、重构选择器 |
| 终端 Agent | Claude Code 等 | 适合会使用命令行的用户，能按步骤运行测试并修改文件 |
| 普通聊天 AI | ChatGPT、Claude、Gemini 等 | 适合先分析页面结构、生成单个函数，再手动粘贴到书源文件 |

无论使用哪一种工具，都要把 AI 当成“会写代码但不了解目标站点”的助手：你负责给它目标 URL、页面 HTML、报错日志和测试结果，它负责写代码和修复。

## 准备工作

1. 新建一个空目录，例如 `my-booksources/`，专门放正在制作的 `.js` 书源。
2. 打开 Legado Tauri，确认可以使用“书源管理”和“调试/测试”功能。
3. 准备目标站点的几个页面：
   - 首页或分类页
   - 搜索结果页
   - 书籍详情页
   - 章节目录页
   - 章节正文页
4. 打开 [书源制作提示词](/prompt/booksource)，复制给 AI 作为项目规则或系统提示词。
5. 让 AI 优先阅读这些文档：
   - [BookItem 数据结构](/api/types-book-item)
   - [搜索 search](/guide/search)
   - [书籍详情 bookInfo](/guide/book-info)
   - [章节目录 chapterList](/guide/chapter-list)
   - [章节正文 chapterContent](/guide/chapter-content)
   - [发现页 explore](/guide/explore)

## 推荐工作流

### 1. 先让 AI 判断书源类型

把目标站点 URL 发给 AI，并明确告诉它输出类型：

```text
我要为 Legado Tauri 写一个书源。
目标站点：https://example.com
请先判断它是 novel、comic 还是 video，并说明需要实现哪些函数。
不要开始写完整代码，先列出探测计划。
```

如果站点是小说，通常实现 `search / bookInfo / chapterList / chapterContent / explore`。漫画和视频的差异主要在 `chapterContent()` 返回值和目录分组。

### 2. 让 AI 逐页探测，不要直接写完整书源

先让 AI 分析一个页面的 HTML 或接口返回。你可以用浏览器开发者工具复制关键 DOM，也可以用 Legado Tauri 的 `booksource-eval` / 调试面板请求页面。

````text
这是搜索结果页的一条结果 HTML：
```html
...粘贴一条 book item...
```
请只设计 search() 的选择器和返回字段。
返回 BookItem 时尽量包含：
name、author、bookUrl、coverUrl、kind、latestChapter、latestChapterUrl、wordCount、chapterCount、updateTime、status。
如果列表页没有某个字段，就留空字符串，不要为了补字段请求详情页。
````

### 3. 按模块生成代码

让 AI 一次只写一个函数，顺序建议：

1. `search(keyword, page)`
2. `bookInfo(bookUrl)`
3. `chapterList(tocUrl)`
4. `chapterContent(chapterUrl)`
5. `explore(page, category)`

每个函数写完后立即测试。不要等五个函数都写完再测。

### 4. 用测试结果驱动修复

把完整错误贴给 AI，不要只说“不能用”。

````text
运行 search 后报错：
```text
...粘贴完整错误...
```
当前 search() 代码：
```js
...粘贴函数...
```
请只修复 search()。不要改其它函数。说明错误原因，并给出完整替换后的 search()。
````

如果返回为空，把实际 HTML 片段也贴给 AI，让它修选择器。

### 5. 最后做整体验收

完成后要求 AI 按清单自查：

```text
请检查这个书源是否满足：
- search 返回 BookItem[]，至少有 name、bookUrl
- bookInfo 返回 tocUrl
- chapterList 正序返回章节
- chapterContent 返回正确内容类型
- explore 的 GETALL 返回分类数组，分类页返回 BookItem[]
- search/explore 不逐本请求详情页补元数据
- BookItem 可选字段 latestChapter、wordCount、chapterCount、updateTime、status 的语义正确
```

## 在不同工具里怎么放提示词

### Cursor / Windsurf

1. 打开书源目录。
2. 新建规则文件，把 [书源制作提示词](/prompt/booksource) 放进去。
3. 把目标书源文件、测试日志和相关文档作为上下文交给 Agent。
4. 要求 Agent 每次只改当前书源文件，不要改应用源码。

建议提示：

```text
你正在这个目录中编写 Legado Tauri 书源。
只允许修改 当前书源.js。
每次修改后说明应该运行哪个测试命令。
不要新增依赖，不要把浏览器代码写进普通 Boa 函数，除非明确使用 browser API。
```

### GitHub Copilot / VS Code

1. 把提示词放到 `.github/copilot-instructions.md`。
2. 打开书源 `.js` 文件。
3. 用 Chat 让 Copilot 只补一个函数，或者选中函数后让它修复。
4. 把调试面板或 CLI 报错粘贴回 Chat。

建议把问题写得具体：

```text
根据这个 HTML 片段重写 search()，要求返回 BookItem[]。
不要修改 chapterList 和 chapterContent。
```

### Claude Code / 终端 Agent

1. 在书源目录放一个 `AGENTS.md` 或项目说明，写明 Legado Tauri 书源规范。
2. 让 Agent 读取书源文件和测试输出。
3. 允许它运行 CLI 测试，但要限制改动范围。

建议提示：

```text
只修改 booksources/example.js。
先运行 search 测试，失败后根据错误修复。
每轮只修复一个函数，直到 search、bookInfo、chapterList、chapterContent、explore 通过。
```

## 常用提示词模板

### 生成搜索函数

````text
请根据下面的搜索结果 HTML 编写 Legado Tauri 的 search(keyword, page)。
要求：
- 使用 async/await
- 返回 BookItem[]
- 必填 name、bookUrl
- 推荐 author、coverUrl、kind
- 如果页面已有，返回 latestChapter、latestChapterUrl、wordCount、chapterCount、updateTime、status
- 不要逐本请求详情页

HTML：
```html
...
```
````

### 生成详情函数

````text
请根据下面的详情页 HTML 编写 bookInfo(bookUrl)。
要求：
- 返回 BookItem
- 必须返回 tocUrl
- 优先提取 OGP meta
- 兼容 latest / lastest 拼写
- 返回 latestChapter、latestChapterUrl、wordCount、chapterCount、updateTime、status（页面有就填）

HTML：
```html
...
```
````

### 修复选择器

````text
当前函数返回空数组。请根据实际 HTML 修复选择器。
不要改变返回字段结构。

当前代码：
```js
...
```

实际 HTML：
```html
...
```
````

## 最容易犯的错

- 让 AI 一次写完整书源，结果每个函数都半对半错。
- 没给真实 HTML，只给站点首页 URL，AI 会猜选择器。
- 在 `search()` 或 `explore()` 中逐本请求详情页，导致发现页非常慢。
- 忘记 `chapterList()` 必须正序。
- 把 `chapterContent()` 的返回类型写错：小说是文本，漫画是图片数组 JSON，视频是播放地址。
- 只看 AI 生成代码，不跑 CLI 或调试面板测试。
- 把登录 Cookie、账号、Token 粘贴给在线 AI。

## 安全与版权注意

- 不要让 AI 帮你绕过付费、登录、反爬或 DRM。
- 不要把私人 Cookie、账号密码、Token 发给在线 AI。
- 书源只描述如何从目标站点读取公开页面，不存储内容。
- 遇到站点限制访问时，优先停止制作或改用公开 API，不要尝试规避。

## 完成标准

一个可交付书源至少应满足：

- `search()` 可搜到目标书。
- `bookInfo()` 有 `tocUrl`。
- `chapterList()` 返回正序目录。
- `chapterContent()` 能读取第一章/第一话/第一集。
- `explore()` 如果实现，`GETALL` 返回分类，分类页返回 `BookItem[]`。
- 新增元数据字段语义稳定，缺失时为空字符串。
- 使用 Legado Tauri 调试面板或 CLI 实测通过。
