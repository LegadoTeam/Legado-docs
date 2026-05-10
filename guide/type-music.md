# 音乐 / 有声书源

音乐、有声书、听书书源需要在元数据中标记 `// @type music`。

## 关键差异

- 必须标记 `// @type music`（等价别名：`audio` / `音乐` / `听书` / `有声`）
- `chapterContent()` 返回**音频播放地址**（URL 字符串 或 JSON 字符串）
- `author` 可填演播者 / 播音员
- 专辑类书源返回单条目录记录，有声书返回多集列表

## chapterContent 返回格式

### 格式一：纯 URL 字符串（简单场景）

```js
async function chapterContent(chapterUrl) {
  // 直接返回可播放的音频 URL
  return 'https://example.com/audio/chapter1.mp3';
}
```

支持的音频格式：`.mp3` `.m4a` `.ogg` `.flac` `.wav` `.aac` `.opus` `.ape` `.wma`

### 格式二：JSON 字符串（防盗链 / 自定义请求头）

许多音乐站点会验证 `Referer`，直接从播放器请求会返回 403。
将 URL + `referer` / `headers` 一起返回，后端会代理下载并缓存到本地。

```js
async function chapterContent(chapterUrl) {
  // 解析出真实音频地址
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var audioUrl = legado.dom.selectAttr(doc, 'audio source', 'src');
  legado.dom.free(doc);

  // 返回 JSON，包含防盗链所需的 Referer
  return JSON.stringify({
    url: audioUrl,
    referer: chapterUrl,              // 章节页面 URL 作 Referer
    headers: {
      'User-Agent': 'Mozilla/5.0 ...'
    }
  });
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 音频文件直链 |
| `referer` | `string?` | 防盗链 Referer，通常为章节页面 URL |
| `headers` | `object?` | 附加请求头 |

::: info 音频缓存
后端收到 JSON 格式响应后，会以正确的 Referer/Headers 下载音频文件，缓存到本地（`AppDataDir/audio_cache/`），再以 `asset://` 协议返回前端播放，无需前端处理防盗链。
:::

## 完整示例

```js
// @name        示例有声书站
// @uuid        your-uuid-here
// @version     1.0.0
// @author      开发者
// @url         https://www.example.com
// @type        music
// @enabled     true
// @tags        免费,有声书
// @description 示例有声书源

var BASE = 'https://www.example.com';

async function search(keyword, page) {
  var url = BASE + '/search?q=' + encodeURIComponent(keyword) + '&p=' + page;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  var books = [];
  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.narrator'),  // 演播者
      bookUrl: toAbs(legado.dom.selectAttr(items[i], 'a', 'href')),
      coverUrl: toAbs(legado.dom.selectAttr(items[i], 'img', 'src')),
      latestChapter: legado.dom.selectText(items[i], '.latest'),
      kind: legado.dom.selectText(items[i], '.genre'),
    });
  }
  legado.dom.free(doc);
  return books;
}

async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);
  var info = {
    name: legado.dom.selectText(doc, 'h1.title'),
    author: legado.dom.selectText(doc, '.narrator'),
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: toAbs(legado.dom.selectAttr(doc, '.cover img', 'src')),
    intro: legado.dom.selectText(doc, '.intro'),
    latestChapter: legado.dom.selectText(doc, '.episode-list a:last-child'),
    chapterCount: legado.dom.selectAll(doc, '.episode-list a').length,
  };
  legado.dom.free(doc);
  return info;
}

async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);
  var links = legado.dom.selectAll(doc, '.episode-list a');
  var chapters = [];
  for (var i = 0; i < links.length; i++) {
    chapters.push({
      name: legado.dom.text(links[i]),
      url: toAbs(legado.dom.attr(links[i], 'href')),
    });
  }
  legado.dom.free(doc);
  return chapters;  // 保持正序
}

async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var audioUrl = legado.dom.selectAttr(doc, 'audio source', 'src')
               || legado.dom.selectAttr(doc, 'audio', 'src');
  legado.dom.free(doc);

  if (!audioUrl) throw new Error('未找到音频地址');

  // 携带 Referer 绕过防盗链
  return JSON.stringify({ url: toAbs(audioUrl), referer: chapterUrl });
}

async function explore(page, category) {
  if (category === 'GETALL') {
    return ['玄幻', '武侠', '都市', '历史', '科幻'];
  }
  var url = BASE + '/category/' + encodeURIComponent(category) + '?p=' + page;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  var books = [];
  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.narrator'),
      bookUrl: toAbs(legado.dom.selectAttr(items[i], 'a', 'href')),
      coverUrl: toAbs(legado.dom.selectAttr(items[i], 'img', 'src')),
    });
  }
  legado.dom.free(doc);
  return books;
}

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  if (href.indexOf('//') === 0) return 'https:' + href;
  if (href.indexOf('/') === 0) return BASE + href;
  return BASE + '/' + href;
}
```
