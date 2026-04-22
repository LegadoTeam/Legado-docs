// @name        G站漫画
// @version     1.0.0
// @author      Legado Tauri
// @url         https://manhuafree.com
// @logo        https://manhuafree.com/favicon.ico
// @type        comic
// @enabled     true
// @tags        漫画,国漫,韩漫,日漫,免费漫画
// @description G站漫画（manhuafree.com），免费在线漫画平台，提供国漫、韩漫、日漫等多种类型漫画。数据源自 mgsearcher API。

// ─── 内置测试 ────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"斗破"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '近期更新');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [近期更新] 返回为空' };
    return { passed: true, message: '发现页 [近期更新]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────
var BASE = 'https://manhuafree.com';
var API_BASE = 'https://api-get-v3.mgsearcher.com';
var IMG_HOST_T = 'https://t40-1-4.g-mh.online';
var IMG_HOST_F = 'https://f40-1-4.g-mh.online';

var EXPLORE_CATEGORIES = {
  // 首页导航
  '近期更新': '/',
  '人气推荐': '/hots',
  '热门更新': '/dayup',
  '最新上架': '/newss',
  // 漫画类型
  '全部漫画': '/manga',
  '韩漫': '/manga-genre/kr',
  '热门漫画': '/manga-genre/hots',
  '国漫': '/manga-genre/cn',
  '日漫': '/manga-genre/jp',
  '欧美': '/manga-genre/ou-mei',
  '其他': '/manga-genre/qita',
  // 热门标签
  '复仇': '/manga-tag/fuchou',
  '古风': '/manga-tag/gufeng',
  '奇幻': '/manga-tag/qihuan',
  '逆袭': '/manga-tag/nixi',
  '异能': '/manga-tag/yineng',
  '宅向': '/manga-tag/zhaixiang',
  '穿越': '/manga-tag/chuanyue',
  '热血': '/manga-tag/rexue',
  '纯爱': '/manga-tag/chunai',
  '系统': '/manga-tag/xitong',
  '重生': '/manga-tag/zhongsheng',
  '冒险': '/manga-tag/maoxian',
  '灵异': '/manga-tag/lingyi',
  '大女主': '/manga-tag/danvzhu',
  '剧情': '/manga-tag/juqing',
  '恋爱': '/manga-tag/lianai',
  '玄幻': '/manga-tag/xuanhuan',
  '女神': '/manga-tag/nvshen',
  '科幻': '/manga-tag/kehuan',
  '魔幻': '/manga-tag/mohuan',
  '推理': '/manga-tag/tuili',
  '猎奇': '/manga-tag/lieqi',
  '治愈': '/manga-tag/zhiyu',
  '都市': '/manga-tag/doushi',
  '异形': '/manga-tag/yixing',
  '青春': '/manga-tag/qingchun',
  '末日': '/manga-tag/mori',
  '悬疑': '/manga-tag/xuanyi',
  '修仙': '/manga-tag/xiuxian',
  '战斗': '/manga-tag/zhandou'
};

// ─── 工具 ────────────────────────────────────────────────────────
function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

/**
 * 从详情页 HTML 中提取 manga-id（data-manga-id 属性）
 */
function extractMangaId(html) {
  // 优先从 data-manga-id 属性取
  var doc = legado.dom.parse(html);
  var el = legado.dom.select(doc, '#ChapterHistory[data-manga-id]');
  var mid = '';
  if (el) {
    mid = legado.dom.attr(el, 'data-manga-id') || '';
  }
  if (!mid) {
    // fallback: chaplistlast 的 data-mid
    var el2 = legado.dom.select(doc, '#chaplistlast[data-mid]');
    if (el2) {
      mid = legado.dom.attr(el2, 'data-mid') || '';
    }
  }
  legado.dom.free(doc);
  return mid;
}

/**
 * 从 JSON-LD 结构化数据中提取作者
 * 页面包含 <script type="application/ld+json"> {"author":[{"name":"..."}]}
 */
function extractAuthorFromJsonLd(html) {
  // 简单字符串查找，避免解析整个 DOM
  var marker = '"@type":"Person","name":"';
  var idx = html.indexOf(marker);
  if (idx === -1) return '';
  var start = idx + marker.length;
  var end = html.indexOf('"', start);
  if (end === -1 || end - start > 100) return '';
  return html.substring(start, end);
}

/**
 * 解析搜索页 / 分类页 HTML 中的漫画卡片
 * 卡片结构：a[href="/manga/slug"] > div > div > img.card(src) + h3.cardtitle
 */
function parseCardList(html) {
  var doc = legado.dom.parse(html);
  // 搜索页用 .cardlist 容器，首页用其他容器
  // 统一用 a[href^="/manga/"] + img.card 模式匹配
  var links = legado.dom.selectAll(doc, 'a[href^="/manga/"]');
  var books = [];
  var seenUrls = {};

  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    var href = legado.dom.attr(a, 'href') || '';
    if (!href || href.indexOf('/manga/') !== 0) continue;

    // 跳过章节链接（/manga/slug/chapter）
    var parts = href.split('/');
    // /manga/slug => parts = ["", "manga", "slug"]
    // /manga/slug/0 => parts = ["", "manga", "slug", "0"]
    if (parts.length > 3 && parts[3]) continue;

    var url = toAbs(href);
    if (seenUrls[url]) continue;
    seenUrls[url] = true;

    // 封面图
    var img = legado.dom.select(a, 'img');
    var coverUrl = '';
    if (img) {
      coverUrl = legado.dom.attr(img, 'src') || legado.dom.attr(img, 'data-src') || '';
    }

    // 标题
    var titleEl = legado.dom.select(a, 'h3.cardtitle');
    var name = '';
    if (titleEl) {
      name = (legado.dom.text(titleEl) || '').trim();
    }
    if (!name) {
      // fallback: h3 内任何文本
      var h3 = legado.dom.select(a, 'h3');
      if (h3) name = (legado.dom.text(h3) || '').trim();
    }
    if (!name) continue;

    books.push({
      name: name,
      author: '',
      bookUrl: url,
      coverUrl: coverUrl,
      kind: '漫画',
      intro: ''
    });
  }
  legado.dom.free(doc);
  return books;
}

// ─── 搜索 ────────────────────────────────────────────────────────
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);
  if (page > 1) return [];

  var url = BASE + '/s/?q=' + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  var books = parseCardList(html);
  legado.log('[search] found=' + books.length);
  return books;
}

// ─── 书籍详情 ────────────────────────────────────────────────────
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl);
  var htmlStr = '' + html;
  var doc = legado.dom.parse(htmlStr);

  // OG 标签提取
  var ogTitle = legado.dom.selectAttr(doc, 'meta[property="og:title"]', 'content') || '';
  var ogDesc = legado.dom.selectAttr(doc, 'meta[property="og:description"]', 'content') || '';
  var ogImage = legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content') || '';

  // 清理 ogTitle：去掉后缀 "-G站漫画..." 或 "-G站漫畫..."
  var name = ogTitle;
  var gIdx2 = name.indexOf('-G');
  if (gIdx2 > 0) {
    name = name.substring(0, gIdx2);
  }
  name = name.trim();
  if (!name) {
    // fallback: <title>
    name = legado.dom.selectText(doc, 'title') || '';
    var gIdx3 = name.indexOf('-G');
    if (gIdx3 > 0) {
      name = name.substring(0, gIdx3);
    }
    name = name.trim();
  }

  // 作者从 JSON-LD 中提取
  var author = extractAuthorFromJsonLd(htmlStr);

  // manga-id 用于章节列表
  var mid = extractMangaId(htmlStr);

  // 标签：从 JSON-LD 中 "genre" 字段提取
  var kind = '漫画';
  var genreMarker = '"genre":[';
  var gIdx = htmlStr.indexOf(genreMarker);
  if (gIdx !== -1) {
    var gStart = gIdx + genreMarker.length;
    var gEnd = htmlStr.indexOf(']', gStart);
    if (gEnd !== -1 && gEnd - gStart < 500) {
      var genreStr = htmlStr.substring(gStart, gEnd);
      // "穿越","重生行" → 穿越,重生行
      kind = genreStr.replace(/"/g, '').trim();
      if (!kind) kind = '漫画';
    }
  }

  // 状态：API 返回的 status (0=连载, 1=完结)，暂不调 API，从页面判断
  var status = '';

  legado.dom.free(doc);
  legado.log('[bookInfo] name=' + name + ' author=' + author + ' mid=' + mid);

  // tocUrl 编码 manga-id，供 chapterList 使用
  // 格式：bookUrl|mid
  var tocUrl = bookUrl;
  if (mid) {
    tocUrl = bookUrl + '|' + mid;
  }

  return {
    name: name,
    author: author,
    coverUrl: ogImage,
    intro: ogDesc,
    kind: kind,
    status: status,
    lastChapter: '',
    tocUrl: tocUrl
  };
}

// ─── 章节列表 ────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  legado.log('[chapterList] tocUrl=' + tocUrl);

  // 解析 tocUrl 中的 mid
  var mid = '';
  var bookUrl = tocUrl;
  var barIdx = tocUrl.indexOf('|');
  if (barIdx !== -1) {
    bookUrl = tocUrl.substring(0, barIdx);
    mid = tocUrl.substring(barIdx + 1);
  }

  // 如果没有 mid，需要从详情页获取
  if (!mid) {
    var html = await legado.http.get(bookUrl);
    mid = extractMangaId('' + html);
    if (!mid) {
      legado.log('[chapterList] ERROR: 无法获取 manga-id');
      return [];
    }
  }

  // 从 slug 获取（用于构建章节 URL）
  // bookUrl = https://manhuafree.com/manga/wolaiziyouxi-mokf
  var slug = '';
  var slugMatch = bookUrl.match(/\/manga\/([^\/\|]+)/);
  if (slugMatch) {
    slug = slugMatch[1];
  }

  // 调用章节列表 API
  var apiUrl = API_BASE + '/api/manga/get?mid=' + mid;
  legado.log('[chapterList] api=' + apiUrl);
  var resp = await legado.http.get(apiUrl);
  var obj = JSON.parse('' + resp);

  if (!obj || obj.code !== 200 || !obj.data) {
    legado.log('[chapterList] API 返回异常');
    return [];
  }

  var chaptersData = obj.data.chapters || [];
  // 如果 API 没返回 slug，使用 URL 中提取的
  if (!slug && obj.data.slug) {
    slug = obj.data.slug;
  }

  var chapters = [];
  for (var i = 0; i < chaptersData.length; i++) {
    var ch = chaptersData[i];
    var attrs = ch.attributes || {};
    var title = attrs.title || ('第' + (i + 1) + '话');
    var chSlug = attrs.slug || '' + i;
    var chId = ch.id || '';

    // 章节 URL：需要 mid 和 chapter_id 来调用图片 API
    // 编码为 mid|chapterId|slug 格式
    var chUrl = mid + '|' + chId + '|' + slug + '/' + chSlug;

    chapters.push({
      name: title,
      url: chUrl
    });
  }

  // 按 order 排序（API 数据可能乱序）
  // 简单冒泡排序
  for (var a = 0; a < chaptersData.length - 1; a++) {
    for (var b = a + 1; b < chaptersData.length; b++) {
      var orderA = (chaptersData[a].attributes || {}).order || 0;
      var orderB = (chaptersData[b].attributes || {}).order || 0;
      if (orderA > orderB) {
        var tmp = chapters[a];
        chapters[a] = chapters[b];
        chapters[b] = tmp;
        var tmp2 = chaptersData[a];
        chaptersData[a] = chaptersData[b];
        chaptersData[b] = tmp2;
      }
    }
  }

  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文（图片列表）────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  // chapterUrl 格式：mid|chapterId|slug/chSlug
  var parts = chapterUrl.split('|');
  if (parts.length < 3) {
    legado.log('[content] ERROR: 无效的章节 URL 格式');
    return '[]';
  }

  var mid = parts[0];
  var chId = parts[1];
  // parts[2] = "slug/chSlug" (不使用，仅保留方便调试)

  // 调用章节图片 API
  var apiUrl = API_BASE + '/api/chapter/getinfo?m=' + mid + '&c=' + chId;
  legado.log('[content] api=' + apiUrl);
  var resp = await legado.http.get(apiUrl);
  var obj = JSON.parse('' + resp);

  if (!obj || !obj.status || !obj.data || !obj.data.info) {
    legado.log('[content] API 返回异常');
    return '[]';
  }

  var info = obj.data.info;
  var imagesData = info.images || {};
  var line = imagesData.line || 1;
  var imageList = imagesData.images || [];

  // 选择图片主机：line=2 用 f40，其他用 t40
  var imgHost = (line === 2) ? IMG_HOST_F : IMG_HOST_T;

  // 按 order 排序
  for (var a = 0; a < imageList.length - 1; a++) {
    for (var b = a + 1; b < imageList.length; b++) {
      if ((imageList[a].order || 0) > (imageList[b].order || 0)) {
        var tmp = imageList[a];
        imageList[a] = imageList[b];
        imageList[b] = tmp;
      }
    }
  }

  var urls = [];
  for (var i = 0; i < imageList.length; i++) {
    var imgUrl = imageList[i].url || '';
    if (imgUrl) {
      urls.push(imgHost + imgUrl);
    }
  }

  legado.log('[content] images=' + urls.length);
  return JSON.stringify(urls);
}

// ─── 发现页 ────────────────────────────────────────────────────
async function explore(page, category) {
  if (!page || page < 1) page = 1;
  if (page > 1) return [];

  // 没传分类 → 返回分类列表
  var path = null;
  if (category) {
    for (var key in EXPLORE_CATEGORIES) {
      if (key === category) {
        path = EXPLORE_CATEGORIES[key];
        break;
      }
    }
  }

  if (!path) {
    var cats = [];
    for (var k in EXPLORE_CATEGORIES) {
      cats.push(k);
    }
    return cats;
  }

  var url = BASE + path;
  legado.log('[explore] url=' + url);
  var html = await legado.http.get(url);
  var books = parseCardList(html);
  legado.log('[explore] found=' + books.length);
  return books;
}
