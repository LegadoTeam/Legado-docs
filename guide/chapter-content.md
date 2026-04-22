# 章节正文 (chapterContent)

`chapterContent()` 在阅读器翻页时调用，用于获取指定章节的正文内容。

## 函数签名

```js
async function chapterContent(chapterUrl) → Promise<string>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `chapterUrl` | `string` | 章节 URL（来自 `chapterList()` 返回的 `url`） |

返回值取决于书源类型：

| 类型 | 返回值 |
|------|--------|
| 小说 | 纯文本字符串，段落间用 `\n` 分隔 |
| 漫画 | `JSON.stringify(imageUrls)` — 图片 URL 数组的 JSON 字符串 |
| 视频 | 播放地址字符串或 JSON 字符串 |

## 小说正文

```js
async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var text = legado.dom.selectText(doc, '#content');
  legado.dom.free(doc);

  return text;
}
```

## 噪声过滤

小说站点的正文中常混入广告文本，需要过滤：

```js
function cleanContent(text) {
  var noise = /本章未完|加入书签|章节报错|笔趣阁|请收藏|最快更新|手机阅读|天才一秒记住|一秒记住|最新网址|纯文字在线阅读|无弹窗/g;
  return text.replace(noise, '').replace(/\n{3,}/g, '\n\n');
}

async function chapterContent(chapterUrl) {
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var text = legado.dom.selectText(doc, '#content');
  legado.dom.free(doc);
  return cleanContent(text);
}
```

## 移除 DOM 广告元素

更彻底的方式是在 DOM 层面移除广告：

```js
async function chapterContent(chapterUrl) {
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  // 先移除广告元素
  var cleanHtml = legado.dom.remove(doc, '.ad, .sponsor, #baidu_js_push, .readinline');
  legado.dom.free(doc);

  // 重新解析清理后的 HTML
  var cleanDoc = legado.dom.parse(cleanHtml);
  var text = legado.dom.selectText(cleanDoc, '#content');
  legado.dom.free(cleanDoc);

  return text;
}
```

## 多页正文拼接

部分站点将一章分成多页：

```js
async function chapterContent(chapterUrl) {
  var allText = '';
  var currentUrl = chapterUrl;
  var MAX_PAGES = 20;

  for (var p = 0; p < MAX_PAGES; p++) {
    var html = await legado.http.get(currentUrl);
    var doc = legado.dom.parse(html);

    allText += legado.dom.selectText(doc, '#content');

    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextUrl = nextLink ? legado.dom.attr(nextLink, 'href') : null;
    legado.dom.free(doc);

    // 如果下一页链接是目录或不存在，说明当前页是最后一页
    if (!nextUrl || nextUrl.indexOf('index') !== -1) break;
    currentUrl = nextUrl;
    allText += '\n';
  }

  return allText;
}
```

## 漫画正文

漫画书源的 `chapterContent()` 返回图片 URL 数组的 JSON 字符串：

```js
async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var urls = legado.dom.selectAllAttrs(doc, '.comic-page img', 'data-src')
          || legado.dom.selectAllAttrs(doc, '.comic-page img', 'src');
  legado.dom.free(doc);

  legado.log('[chapterContent] images=' + urls.length);
  return JSON.stringify(urls);
}
```

## 视频正文

视频书源返回播放地址：

```js
// 简单直链
async function chapterContent(chapterUrl) {
  return chapterUrl; // URL 本身就是播放地址
}

// 需要从 API 获取
async function chapterContent(chapterUrl) {
  var resp = await legado.http.get(chapterUrl);
  var json = JSON.parse(resp);
  return json.data.playUrl;
}

// 带请求头的 JSON 格式
async function chapterContent(chapterUrl) {
  var resp = await legado.http.get(chapterUrl);
  var json = JSON.parse(resp);
  return JSON.stringify({
    url: json.data.url,
    type: 'hls',
    headers: { Referer: BASE }
  });
}
```
