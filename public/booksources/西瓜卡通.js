// @name        西瓜卡通
// @version     1.0.0
// @author      Legado Tauri
// @url         https://cn.xgcartoon.com
// @logo        https://cn.xgcartoon.com/xgct/icon/favicon-32x32.png
// @type        video
// @enabled     true
// @tags        动画,日漫,国漫,韩漫,视频,西瓜卡通
// @description 西瓜卡通（xgcartoon.com），免费在线动画视频平台，提供日漫、国漫、韩漫等海量动画观看。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    var found = false;
    for (var i = 0; i < results.length; i++) {
      if (results[i].name && results[i].name.indexOf('斗破苍穹') !== -1) { found = true; break; }
    }
    if (!found) return { passed: false, message: '搜索结果中未找到"斗破苍穹"相关条目' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '热血');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [热血] 返回为空' };
    return { passed: true, message: '发现页 [热血]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 / 常量 ──────────────────────────────────────────────────────────

var BASE = 'https://cn.xgcartoon.com';
var PLAY_BASE = 'https://www.cnxgct.com';
var VIDEO_CDN = 'https://xgct-video.bzcdn.net';

var EXPLORE_CATEGORIES = {
  '热血': '/classify?type=rexue',
  '奇幻': '/classify?type=qihuan',
  '动作': '/classify?type=dongzuo',
  '科幻': '/classify?type=kehuan',
  '穿越': '/classify?type=chuanyue',
  '恋爱': '/classify?type=lianai',
  '搞笑': '/classify?type=gaoxiao',
  '剧情': '/classify?type=juqing',
  '日常': '/classify?type=richang',
  '冒险': '/classify?type=maoxian',
  '运动': '/classify?type=yundong',
  '悬疑': '/classify?type=xuanyi',
  '惊悚': '/classify?type=jingsong',
  '战争': '/classify?type=zhanzheng',
  '国漫': '/classify?region=cn',
  '日本': '/classify?region=jp',
  '韩国': '/classify?region=kr'
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

/**
 * 从 topic-list 页面（搜索/分类）解析卡片列表
 * 结构：.topic-list-box > a.topic-list-item[href]
 *        > .topic-list-item__cover > amp-img[src]
 *        > .topic-list-item__info > .topic-list-item--author + .h3
 */
function parseTopicCards(html) {
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, 'a.topic-list-item');
  legado.log('[parseTopicCards] found ' + items.length + ' items');
  var books = [];
  var seen = {};

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var href = legado.dom.attr(item, 'href') || '';
    var bookUrl = toAbs(href);
    if (!bookUrl || seen[bookUrl]) continue;
    seen[bookUrl] = true;

    // 封面
    var coverEl = legado.dom.select(item, 'amp-img');
    var cover = coverEl ? (legado.dom.attr(coverEl, 'src') || '') : '';

    // 标题
    var titleEl = legado.dom.select(item, '.h3');
    var name = titleEl ? (legado.dom.text(titleEl) || '').replace(/^\s+|\s+$/g, '') : '';

    // 作者（格式："天蚕土豆 [国漫]"）
    var authorEl = legado.dom.select(item, '.topic-list-item--author');
    var authorRaw = authorEl ? (legado.dom.text(authorEl) || '').replace(/^\s+|\s+$/g, '') : '';
    var author = authorRaw.replace(/\s*\[.*?\]\s*$/, '').replace(/^\s+|\s+$/g, '');

    // 标签
    var tagEls = legado.dom.selectAll(item, '.tag');
    var tags = [];
    for (var j = 0; j < tagEls.length; j++) {
      var t = (legado.dom.text(tagEls[j]) || '').replace(/^\s+|\s+$/g, '');
      if (t) tags.push(t);
    }

    books.push({
      name: name,
      author: author,
      cover: cover,
      bookUrl: bookUrl,
      kind: tags.join(',')
    });
  }

  legado.dom.free(doc);
  return books;
}

/**
 * 从 href 中提取 query 参数值
 */
function getQueryParam(url, param) {
  var idx = url.indexOf('?');
  if (idx === -1) return '';
  var query = url.substring(idx + 1);
  var pairs = query.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var kv = pairs[i].split('=');
    if (kv[0] === param) return decodeURIComponent(kv[1] || '');
  }
  return '';
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);
  if (page > 1) return [];

  var url = BASE + '/search?q=' + encodeURIComponent(keyword);
  legado.log('[search] url=' + url);
  var html = await legado.http.get(url);
  var results = parseTopicCards(html);
  legado.log('[search] results=' + results.length);
  if (results.length > 0) {
    legado.log('[search] sample: ' + results[0].name + ' | ' + results[0].author + ' | ' + results[0].bookUrl);
  }
  return results;
}

// ─── 详情 ─────────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  // 标题
  var titleEl = legado.dom.select(doc, '.detail-right__title h1');
  var name = titleEl ? (legado.dom.text(titleEl) || '').replace(/^\s+|\s+$/g, '') : '';

  // 作者（在标题下方的 div 中，格式 "岩永彰 [日本]"）
  var authorEl = legado.dom.select(doc, '.detail-right__title > div');
  var authorRaw = authorEl ? (legado.dom.text(authorEl) || '').replace(/^\s+|\s+$/g, '') : '';
  var author = authorRaw.replace(/\s*\[.*?\]\s*$/, '').replace(/^\s+|\s+$/g, '');

  // 封面
  var coverEl = legado.dom.select(doc, '.detail-sider amp-img');
  var cover = coverEl ? (legado.dom.attr(coverEl, 'src') || '') : '';

  // 标签
  var tagEls = legado.dom.selectAll(doc, '.detail-right__tags .tag');
  var tags = [];
  for (var i = 0; i < tagEls.length; i++) {
    var t = (legado.dom.text(tagEls[i]) || '').replace(/^\s+|\s+$/g, '');
    if (t) tags.push(t);
  }

  // 简介
  var descEl = legado.dom.select(doc, '.detail-right__desc p');
  var description = descEl ? (legado.dom.text(descEl) || '').replace(/^\s+|\s+$/g, '') : '';

  // 最新章节（从更新状态区域的链接中提取）
  var lastChapter = '';
  var siderLinks = legado.dom.selectAll(doc, '.detail-sider a');
  for (var j = 0; j < siderLinks.length; j++) {
    var linkText = (legado.dom.text(siderLinks[j]) || '').replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
    if (linkText.indexOf('集') !== -1 && linkText.indexOf('第') !== -1) {
      lastChapter = linkText;
      break;
    }
  }

  legado.dom.free(doc);

  var result = {
    name: name,
    author: author,
    cover: cover,
    kind: tags.join(','),
    description: description,
    lastChapter: lastChapter,
    tocUrl: bookUrl
  };

  legado.log('[bookInfo] name=' + name + ' author=' + author + ' tags=' + tags.join(','));
  legado.log('[bookInfo] desc=' + description.substring(0, 60));
  return result;
}

// ─── 目录 ─────────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 从 tocUrl 提取 slug（/detail/{slug}）
  var slug = '';
  var detailMatch = tocUrl.match(/\/detail\/([^\/\?#]+)/);
  if (detailMatch) {
    slug = detailMatch[1];
  }

  var links = legado.dom.selectAll(doc, 'a.goto-chapter');
  legado.log('[chapterList] found ' + links.length + ' chapter links, slug=' + slug);

  var chapters = [];
  var seen = {};

  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var href = legado.dom.attr(link, 'href') || '';
    var title = legado.dom.attr(link, 'title') || '';
    if (!title) {
      var spanEl = legado.dom.select(link, 'span');
      title = spanEl ? (legado.dom.text(spanEl) || '').replace(/^\s+|\s+$/g, '') : '';
    }

    // 提取 chapter_id
    var chapterId = getQueryParam(href, 'chapter_id');
    var cartoonId = getQueryParam(href, 'cartoon_id');
    if (!cartoonId) cartoonId = slug;

    if (!chapterId || seen[chapterId]) continue;
    seen[chapterId] = true;

    // 构建播放页 URL
    var playUrl = PLAY_BASE + '/video/' + cartoonId + '/' + chapterId + '.html';

    chapters.push({
      name: title,
      url: playUrl
    });
  }

  legado.dom.free(doc);
  legado.log('[chapterList] chapters=' + chapters.length);
  if (chapters.length > 0) {
    legado.log('[chapterList] first: ' + chapters[0].name + ' → ' + chapters[0].url);
    legado.log('[chapterList] last: ' + chapters[chapters.length - 1].name + ' → ' + chapters[chapters.length - 1].url);
  }
  return chapters;
}

// ─── 正文（视频播放地址） ─────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);
  var html = await legado.http.get(chapterUrl);

  // 解析 iframe src 提取 vid
  var doc = legado.dom.parse(html);
  var iframe = legado.dom.select(doc, 'iframe');
  var iframeSrc = iframe ? (legado.dom.attr(iframe, 'src') || '') : '';
  legado.dom.free(doc);

  legado.log('[chapterContent] iframe src=' + iframeSrc);

  if (!iframeSrc) {
    // 降级：用正则从 HTML 中提取 iframe src
    var match = html.match(/iframe[^>]*src=["']([^"']*pframe[^"']*)/i);
    if (match) {
      iframeSrc = match[1].replace(/&amp;/g, '&');
      legado.log('[chapterContent] regex iframe src=' + iframeSrc);
    }
  }

  // 从 iframe src 中提取 vid
  var vid = '';
  var vidMatch = iframeSrc.match(/vid=([a-f0-9\-]+)/i);
  if (vidMatch) {
    vid = vidMatch[1];
  }

  if (!vid) {
    legado.log('[chapterContent] ERROR: vid not found');
    return '';
  }

  var m3u8Url = VIDEO_CDN + '/' + vid + '/playlist.m3u8';
  legado.log('[chapterContent] m3u8=' + m3u8Url);

  return JSON.stringify({
    url: m3u8Url,
    type: 'hls'
  });
}

// ─── 发现页 ───────────────────────────────────────────────────────────────

async function explore(page, category) {
  legado.log('[explore] page=' + page + ' category=' + category);

  // 未指定分类时返回分类列表
  var categoryNames = [];
  for (var key in EXPLORE_CATEGORIES) {
    if (EXPLORE_CATEGORIES.hasOwnProperty(key)) {
      categoryNames.push(key);
    }
  }

  if (!category || !EXPLORE_CATEGORIES[category]) {
    legado.log('[explore] returning category list: ' + categoryNames.join(', '));
    return categoryNames;
  }

  var path = EXPLORE_CATEGORIES[category];
  // 添加分页支持
  if (path.indexOf('?') !== -1) {
    path = path + '&page=' + page;
  } else {
    path = path + '?page=' + page;
  }

  var url = BASE + path;
  legado.log('[explore] url=' + url);
  var html = await legado.http.get(url);
  var results = parseTopicCards(html);
  legado.log('[explore] results=' + results.length);
  return results;
}
