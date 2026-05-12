# 网页书源（webpage 类型）

`@type webpage` 是一种特殊书源类型，**只有发现（explore）功能**，没有搜索、书籍详情、目录、正文等任何阅读功能。

适用场景：
- 书源导航站、书源聚合页（如 yckceo 书源仓库、喵公子书源合集）
- 视频/漫画网站的纯浏览页
- 需要展示外部 Web 内容的任意页面

## 声明方式

在 JS 文件头部注释中加入 `@type webpage`：

```js
// @uuid        your-uuid-here
// @name        我的网页书源
// @type        webpage
// @url         https://example.com
// @author      作者名
// @version     1.0.0
// @description 简介
```

等效别名：`web`、`网页`。

## explore() 函数

网页书源**只需实现 `explore()`**，其返回值有三种模式：

### 模式一：URL 模式（直接加载外部页面）

```js
async function explore(category, page) {
  if (category === 'GETALL') {
    return ['首页', '热门', '排行'];
  }
  // 返回 URL 字符串，前端在 iframe 中直接加载
  return 'https://example.com/' + category + '?page=' + (page || 1);
}
```

或使用对象形式：

```js
return { type: 'url', url: 'https://example.com/page/' + page };
```

::: warning 注意
URL 模式依赖目标站点允许 iframe 加载（无 `X-Frame-Options: DENY` 头）。
若目标站点拒绝 iframe，请改用 HTML 模式。
:::

### 模式二：HTML 模式（自定义渲染）

```js
async function explore(category, page) {
  if (category === 'GETALL') {
    return ['全部'];
  }
  // 通过 legado.http.get 抓取页面，然后自行渲染 HTML
  var html = await legado.http.get('https://example.com/list?p=' + page, {});
  var items = parseItems(html);           // 自定义解析逻辑
  return { type: 'html', html: buildHtml(items) };
}
```

HTML 模式下可使用全部 [Bridge API](/advanced/html-explore#bridge-api-window-legado)，包括 `window.legado.installSource(url)` 安装书源。

### 模式三：单页模式（GETALL 直接返回内容）

当 `GETALL` 返回 URL 或 HTML（非字符串数组）时，前端自动创建单一"发现"分类，直接展示该内容：

```js
async function explore(category, page) {
  if (category === 'GETALL') {
    // 直接返回内容，不需要分类选择
    return { type: 'html', html: '<h1>直接展示</h1>' };
    // 或 return 'https://example.com';
  }
  // category === '发现' 时调用（通常不需要额外处理）
}
```

## 安装书源 Bridge API

网页书源的 HTML 页面可以通过 `window.legado.installSource(url)` 触发主应用的书源安装对话框：

```js
// HTML 内容中的脚本示例
function onInstallClick(downloadUrl) {
  // downloadUrl 可以是：
  //   - https://... 直链（JS 文件或 JSON 文件）
  //   - legado://?url=https://...  legado 协议链接
  window.legado.installSource(downloadUrl);
  window.legado.toast('正在打开安装对话框…', 'info');
}
```

安装流程：
1. `installSource(url)` 被调用后，主应用弹出 `BookSourceInstallDialog`
2. 预览书源信息（名称、类型、版本、作者等）
3. 用户确认后安装到本地书源列表

## 内置示例书源

项目中提供了两个可直接使用的网页书源：

| 文件 | 功能 |
|------|------|
| `booksource-platform/booksources/yckceo-书源仓库.js` | 浏览 [yckceo Legado-Tauri 书源仓库](https://www.yckceo.com/legadotauri/shuyuan/index.html)，支持按类型筛选，一键安装 |
| `booksource-platform/booksources/喵公子-书源合集.js` | 浏览 [喵公子书源合集](https://yuedu.miaogongzi.net/gx.html)，列出所有合集，一键安装 |

## 完整示例（仿 yckceo）

```js
// @name   示例书源仓库
// @type   webpage
// @url    https://example-repo.com

var BASE = 'https://example-repo.com';

async function explore(category, page) {
  if (category === 'GETALL') {
    return ['全部', '小说', '漫画', '视频'];
  }

  page = page || 1;
  var url = BASE + '/list?type=' + encodeURIComponent(category) + '&page=' + page;
  var html = await legado.http.get(url, {});
  var items = parseItems(html);

  return {
    type: 'html',
    html: renderCards(items, category, page)
  };
}

function parseItems(html) {
  // 用 regex 或 legado.dom 提取条目
  var items = [];
  var re = /href="\/source\/(\d+)"[^>]*>([^<]+)</g;
  var m;
  while ((m = re.exec(html)) !== null) {
    items.push({
      id: m[1],
      name: m[2].trim(),
      installUrl: BASE + '/api/source/' + m[1] + '.js',
    });
  }
  return items;
}

function renderCards(items, category, page) {
  var cards = items.map(function(item) {
    return '<div style="display:flex;align-items:center;padding:10px;border-bottom:1px solid var(--border);">'
      + '<span style="flex:1;">' + escHtml(item.name) + '</span>'
      + '<button onclick="doInstall(' + JSON.stringify(item.installUrl) + ')"'
      +   ' style="background:var(--primary);color:#fff;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;">'
      + '安装</button>'
      + '</div>';
  }).join('');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>'
    + '<div style="padding:8px;">' + cards + '</div>'
    + '<script>'
    + 'function escHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}'
    + 'function doInstall(url){'
    +   'window.legado.installSource(url);'
    +   'window.legado.toast("正在安装…","info");'
    + '}'
    + '<\/script></body></html>';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

## 与普通书源的区别

| 特性 | 普通书源 | 网页书源（webpage） |
|------|----------|---------------------|
| `search()` | ✅ 必须或可选 | ❌ 无 |
| `bookInfo()` | ✅ 必须 | ❌ 无 |
| `chapterList()` | ✅ 必须 | ❌ 无 |
| `chapterContent()` | ✅ 必须 | ❌ 无 |
| `explore()` | 可选 | ✅ 必须（唯一功能） |
| 出现在搜索页 | ✅ | ❌ |
| 出现在发现页 | 需有 `explore()` | ✅ 始终 |
| 能力自动检测 | 必须 | 跳过（无条件进入发现页） |
