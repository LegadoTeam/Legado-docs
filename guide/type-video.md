# 视频书源

视频书源需要在元数据中标记 `// @type video`。

## 关键差异

- 必须标记 `// @type video`
- `chapterContent()` 返回播放地址（纯 URL 或 JSON 字符串）
- `author` 可填导演/主演
- 电影类返回单条目录记录，电视剧/番剧返回多集列表
- 多线路站点使用 `group` 字段分组

## 播放地址格式

### 格式一：纯 URL 字符串

```js
async function chapterContent(chapterUrl) {
  return 'https://example.com/video.mp4';
}
```

前端根据后缀自动识别：`.m3u8` → HLS，`.mpd` → DASH，`.flv` → FLV，其他 → MP4。

### 格式二：JSON 字符串

需要自定义请求头、多清晰度、字幕等高级功能时：

```js
async function chapterContent(chapterUrl) {
  return JSON.stringify({
    url: 'https://example.com/index.m3u8',
    type: 'hls',                              // 可选: 'hls' | 'dash' | 'mp4' | 'flv'
    headers: { Referer: 'https://example.com' }, // 可选: 防盗链请求头
    qualities: [                                // 可选: 多清晰度
      { label: '1080P', url: 'https://example.com/1080.m3u8' },
      { label: '720P',  url: 'https://example.com/720.m3u8' }
    ],
    subtitles: [                                // 可选: 外挂字幕
      { label: '中文', url: 'https://example.com/zh.vtt', srclang: 'zh-CN', default: true }
    ]
  });
}
```

## 多线路分组

视频站点通常有多条播放线路，通过 `group` 字段分组：

```js
async function chapterList(tocUrl) {
  var resp = await legado.http.get(tocUrl);
  var json = JSON.parse(resp);
  var chapters = [];

  for (var r = 0; r < json.routes.length; r++) {
    var route = json.routes[r];
    for (var i = 0; i < route.episodes.length; i++) {
      chapters.push({
        name: route.episodes[i].name,
        url: route.episodes[i].url,
        group: route.name              // 线路分组名
      });
    }
  }
  return chapters;
}
```

前端效果：
- 无 `group` 字段 → 单个章节列表（向后兼容）
- 有 `group` 字段 → 标签页切换，每个标签对应一条线路

## 苹果 CMS 站点示例

很多影视站基于苹果 CMS，提供标准 JSON API：

```js
// @name        示例影视站
// @version     1.0.0
// @author      开发者
// @url         https://www.example.com
// @type        video
// @enabled     true
// @tags        免费,影视
// @description 苹果 CMS 影视站

var BASE = 'https://www.example.com';
var API = BASE + '/api.php/provide/vod/';

async function search(keyword, page) {
  var resp = await legado.http.get(API + '?ac=detail&wd=' + encodeURIComponent(keyword) + '&pg=' + page);
  var json = JSON.parse(resp);
  return (json.list || []).map(function(v) {
    return {
      name: v.vod_name,
      bookUrl: API + '?ac=detail&ids=' + v.vod_id,
      author: v.vod_director || v.vod_actor,
      coverUrl: v.vod_pic,
      kind: v.type_name
    };
  });
}

async function bookInfo(bookUrl) {
  var resp = await legado.http.get(bookUrl);
  var json = JSON.parse(resp);
  var v = json.list[0];
  return {
    name: v.vod_name,
    author: v.vod_director || v.vod_actor,
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: v.vod_pic,
    intro: v.vod_blurb || v.vod_content,
    latestChapter: v.vod_remarks,
    kind: v.type_name
  };
}

async function chapterList(tocUrl) {
  var resp = await legado.http.get(tocUrl);
  var json = JSON.parse(resp);
  var vodPlayUrl = json.list[0].vod_play_url;
  var lines = vodPlayUrl.split('$$$');  // 多线路按 $$$ 分隔
  var chapters = [];

  for (var r = 0; r < lines.length; r++) {
    var routeName = '线路' + (r + 1);
    var episodes = lines[r].split('#');
    for (var i = 0; i < episodes.length; i++) {
      var parts = episodes[i].split('$');
      if (parts.length >= 2 && parts[1]) {
        chapters.push({ name: parts[0], url: parts[1], group: routeName });
      }
    }
  }
  return chapters;
}

async function chapterContent(chapterUrl) {
  // 苹果 CMS 的播放 URL 通常就是直链
  return chapterUrl;
}
```
