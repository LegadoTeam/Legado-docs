# 视频书源（video）

视频书源需要在元数据中标记 `// @type video`。

## 关键差异

- 必须标记 `// @type video`（中文别名：`视频`）
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

### 格式三：内联 m3u8 文本内容

当书源需要**修改 m3u8 片段列表**时（如修复相对路径、替换 CDN 域名、过滤广告片段），可直接返回 m3u8 文本内容或通过 JSON 的 `m3u8Content` 字段返回，无需搭建代理中转。

**方式 A：直接返回 m3u8 文本**（以 `#EXTM3U` 开头即可识别）：

```js
async function chapterContent(chapterUrl) {
  var m3u8Text = await legado.http.get(chapterUrl);
  // 将相对路径片段补全为绝对 URL
  var base = chapterUrl.substring(0, chapterUrl.lastIndexOf('/') + 1);
  m3u8Text = m3u8Text.replace(/^(?!#)(.+\.ts.*)$/mg, base + '$1');
  return m3u8Text;  // 直接返回修改后的 m3u8 文本
}
```

**方式 B：通过 JSON 的 `m3u8Content` 字段返回**（可同时附带请求头等其他选项）：

```js
async function chapterContent(chapterUrl) {
  var m3u8Text = await legado.http.get(chapterUrl);
  // 替换 CDN 域名
  m3u8Text = m3u8Text.replace(/https:\/\/old-cdn\.com/g, 'https://new-cdn.com');
  return JSON.stringify({
    m3u8Content: m3u8Text,
    // url 可省略，App 会自动从 m3u8Content 生成 Blob URL
    headers: { Referer: 'https://example.com' }  // 其他选项照常生效
  });
}
```

> **注意**：`m3u8Content` 中的片段 URL 必须是绝对 URL（即 `http://` 或 `https://` 开头）。如果原始 m3u8 使用相对路径，需要在书源中手动拼接为绝对路径（如方式 A 示例）。

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
      kind: v.type_name,
      latestChapter: v.vod_remarks,
      updateTime: v.vod_time,
      status: v.vod_remarks
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
    updateTime: v.vod_time,
    status: v.vod_remarks,
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

## 通用分类面板（线路 / 画质 / 语言等）

`chapterContent()` 可在返回的 JSON 中携带 `categories` 字段，指示应用在播放器侧边栏（桌面）或底部条（移动端）渲染可交互的分类选择面板。用户点击某个选项后，应用会用新的 `selectedCategories` 参数再次调用 `chapterContent()`，书源根据参数返回对应播放地址。

### 返回格式

```ts
interface VideoCategoryOption {
  id: string;       // 选项唯一标识，传回给书源的值
  label: string;    // 显示文字
  badge?: string;   // 右上角小标，如 '4K'、'新'
}

interface VideoCategoryGroup {
  id: string;              // 分组唯一标识
  label: string;           // 分组标题，如 '线路'、'画质'
  options: VideoCategoryOption[];
  defaultSelected?: string; // 初始选中的 option.id（默认第一项）
}

interface VideoContentResult {
  url: string;
  type?: 'hls' | 'dash' | 'mp4' | 'flv';
  headers?: Record<string, string>;
  qualities?: { label: string; url: string }[];
  subtitles?: { label: string; url: string; srclang?: string; default?: boolean }[];
  categories?: VideoCategoryGroup[];  // 新字段
}
```

### 函数签名

```js
async function chapterContent(chapterUrl, selectedCategories) {
  //                                      ^^^^^^^^^^^^^^^^^^^
  //   第二参数：{ [groupId]: optionId }，初次调用时为 undefined
}
```

### 多线路 + 画质示例

```js
async function chapterContent(chapterUrl, selectedCategories) {
  var route   = (selectedCategories && selectedCategories.route)   || 's1';
  var quality = (selectedCategories && selectedCategories.quality) || '1080p';

  var resp = await legado.http.get(
    'https://api.example.com/play?url=' + encodeURIComponent(chapterUrl)
    + '&route=' + route + '&quality=' + quality
  );
  var json = JSON.parse(resp);

  return JSON.stringify({
    url: json.playUrl,
    type: 'hls',
    categories: [
      {
        id: 'route',
        label: '线路',
        defaultSelected: route,
        options: [
          { id: 's1', label: '主线路', badge: '推荐' },
          { id: 's2', label: '备用线路' },
          { id: 's3', label: '海外线路' }
        ]
      },
      {
        id: 'quality',
        label: '画质',
        defaultSelected: quality,
        options: [
          { id: '4k',   label: '超清', badge: '4K' },
          { id: '1080p', label: '蓝光 1080P' },
          { id: '720p',  label: '高清 720P' },
          { id: '480p',  label: '标清 480P' }
        ]
      }
    ]
  });
}
```

> **向后兼容**：`selectedCategories` 参数是可选的，不使用分类功能的书源无需修改。
