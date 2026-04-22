// @name        包子漫画
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.baozimh.com
// @logo        https://static-tw.baozimh.com/static/bzmh/img/apple-icon-57x57.png
// @type        comic
// @enabled     true
// @tags        漫画,国漫,日漫,韩漫,港台漫画,包子漫画
// @description 包子漫画（baozimh.com），综合漫画平台，提供国漫、日漫、韩漫等海量漫画阅读。

// ─── 内置测试 ────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '國漫');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [國漫] 返回为空' };
    return { passed: true, message: '发现页 [國漫]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────
var BASE = 'https://www.baozimh.com';

var EXPLORE_CATEGORIES = {
  '國漫': '/classify?type=all&region=cn&state=all&filter=*',
  '日本': '/classify?type=all&region=jp&state=all&filter=*',
  '韓國': '/classify?type=all&region=kr&state=all&filter=*',
  '戀愛': '/classify?type=lianai&region=all&state=all&filter=*',
  '熱血': '/classify?type=rexie&region=all&state=all&filter=*',
  '玄幻': '/classify?type=xuanhuan&region=all&state=all&filter=*',
  '冒險': '/classify?type=mouxian&region=all&state=all&filter=*',
  '搞笑': '/classify?type=gaoxiao&region=all&state=all&filter=*'
};

// ─── 工具 ────────────────────────────────────────────────────────
function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

/**
 * 解码 HTML 实体（&amp; → &, &lt; → < 等）
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * 从搜索/分类/首页解析漫画卡片
 * 结构：div.comics-card > a.comics-card__poster[href, title] > amp-img[src]
 *        + a.comics-card__info > div.comics-card__title > h3
 *        + small.tags
 */
function parseComicsCards(html) {
  var doc = legado.dom.parse(html);
  var cards = legado.dom.selectAll(doc, 'div.comics-card');
  var books = [];
  var seenUrls = {};

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];

    // 链接和标题
    var posterLink = legado.dom.select(card, 'a.comics-card__poster');
    if (!posterLink) continue;
    var href = legado.dom.attr(posterLink, 'href') || '';
    if (!href || href.indexOf('/comic/') !== 0) continue;

    var url = toAbs(href);
    if (seenUrls[url]) continue;
    seenUrls[url] = true;

    var title = legado.dom.attr(posterLink, 'title') || '';

    // 封面图（amp-img 标签的 src）
    var ampImg = legado.dom.select(card, 'amp-img[src]');
    var coverUrl = '';
    if (ampImg) {
      coverUrl = legado.dom.attr(ampImg, 'src') || '';
    }

    // 标题 fallback
    if (!title) {
      var h3 = legado.dom.select(card, 'h3');
      if (h3) title = (legado.dom.text(h3) || '').trim();
    }
    if (!title) continue;

    // 作者
    var authorEl = legado.dom.select(card, 'small.tags');
    var author = '';
    if (authorEl) {
      author = (legado.dom.text(authorEl) || '').trim();
    }

    // 标签
    var tags = [];
    var tabEls = legado.dom.selectAll(card, '.tab');
    for (var j = 0; j < tabEls.length; j++) {
      var tag = (legado.dom.text(tabEls[j]) || '').trim();
      if (tag) tags.push(tag);
    }

    books.push({
      name: title,
      author: author,
      bookUrl: url,
      coverUrl: coverUrl,
      kind: tags.length > 0 ? tags.join(',') : '漫画',
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

  var url = BASE + '/search?q=' + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  var books = parseComicsCards(html);
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
  var name = legado.dom.selectAttr(doc, 'meta[name="og:novel:book_name"]', 'content')
          || legado.dom.selectAttr(doc, 'meta[property="og:novel:book_name"]', 'content')
          || '';
  var author = legado.dom.selectAttr(doc, 'meta[name="og:novel:author"]', 'content')
            || legado.dom.selectAttr(doc, 'meta[property="og:novel:author"]', 'content')
            || '';
  var coverUrl = legado.dom.selectAttr(doc, 'meta[name="og:image"]', 'content')
              || legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content')
              || '';
  var intro = legado.dom.selectAttr(doc, 'meta[name="og:description"]', 'content')
           || legado.dom.selectAttr(doc, 'meta[property="og:description"]', 'content')
           || '';
  var kind = legado.dom.selectAttr(doc, 'meta[name="og:novel:category"]', 'content')
          || legado.dom.selectAttr(doc, 'meta[property="og:novel:category"]', 'content')
          || '漫画';
  var status = legado.dom.selectAttr(doc, 'meta[name="og:novel:status"]', 'content')
            || legado.dom.selectAttr(doc, 'meta[property="og:novel:status"]', 'content')
            || '';
  var lastChapter = legado.dom.selectAttr(doc, 'meta[name="og:novel:latest_chapter_name"]', 'content')
                 || legado.dom.selectAttr(doc, 'meta[property="og:novel:latest_chapter_name"]', 'content')
                 || '';

  // 清理 title 后缀
  if (!name) {
    name = legado.dom.selectText(doc, 'title') || '';
  }
  // 去掉 " - 包子漫畫" 后缀
  var baoziIdx = name.indexOf(' - ');
  if (baoziIdx > 0) {
    name = name.substring(0, baoziIdx);
  }
  // 去掉 emoji 前缀
  name = name.replace(/^[^a-zA-Z\u4e00-\u9fff]+/, '').trim();

  // 从 URL 中提取 slug，用于构建 tocUrl
  // bookUrl = https://www.baozimh.com/comic/slug 或 /comic/slug
  var slug = '';
  var m = bookUrl.match(/\/comic\/([^\/\?#]+)/);
  if (m) {
    slug = m[1];
  }

  // 检查是否有 redirect slug（URL 可能被重定向添加后缀，比如 _hsvfkb）
  // 从页面中的 page_direct 链接提取真实 comic_id
  var comicIdMatch = htmlStr.match(/comic_id=([^&"]+)/);
  var realSlug = '';
  if (comicIdMatch) {
    realSlug = comicIdMatch[1];
  }

  legado.dom.free(doc);
  legado.log('[bookInfo] name=' + name + ' author=' + author + ' slug=' + slug + ' realSlug=' + realSlug);

  // tocUrl 编码 realSlug（带后缀的），用于章节列表构建章节URL
  var tocUrl = bookUrl;
  if (realSlug && realSlug !== slug) {
    tocUrl = bookUrl + '|' + realSlug;
  }

  return {
    name: name,
    author: author,
    coverUrl: coverUrl,
    intro: intro,
    kind: kind,
    status: status,
    lastChapter: lastChapter,
    tocUrl: tocUrl
  };
}

// ─── 章节列表 ────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  legado.log('[chapterList] tocUrl=' + tocUrl);

  // 解析 tocUrl
  var bookUrl = tocUrl;
  var realSlug = '';
  var barIdx = tocUrl.indexOf('|');
  if (barIdx !== -1) {
    bookUrl = tocUrl.substring(0, barIdx);
    realSlug = tocUrl.substring(barIdx + 1);
  }

  // 从 bookUrl 提取 slug
  var slug = '';
  var slugMatch = bookUrl.match(/\/comic\/([^\/\?#|]+)/);
  if (slugMatch) {
    slug = slugMatch[1];
  }
  if (realSlug) {
    slug = realSlug;
  }

  // 获取详情页 HTML
  var html = await legado.http.get(bookUrl);
  var htmlStr = '' + html;

  // 如果还没有 realSlug，从页面中获取
  if (!slug || slug.indexOf('_') === -1) {
    var comicIdMatch = htmlStr.match(/comic_id=([^&"]+)/);
    if (comicIdMatch) {
      slug = comicIdMatch[1];
    }
  }

  // 使用字符串正则提取章节数据（HTML 可能很大，DOM 解析可能受限）
  // 定位 #chapter-items 区域
  var chapterStart = htmlStr.indexOf('id="chapter-items"');
  if (chapterStart === -1) {
    legado.log('[chapterList] ERROR: 未找到 #chapter-items');
    return [];
  }

  var chapterSection = htmlStr.substring(chapterStart);

  // 提取所有章节链接：section_slot=X&amp;chapter_slot=Y ... <span>标题</span>
  var pattern = /section_slot=(\d+)&amp;chapter_slot=(\d+)[^>]*>[^<]*<div[^>]*>[^<]*<span[^>]*>([^<]+)<\/span>/g;
  var chapters = [];
  var seenKeys = {};
  var match;

  while ((match = pattern.exec(chapterSection)) !== null) {
    var sectionSlot = match[1];
    var chapterSlot = match[2];
    var name = match[3].trim();

    var key = sectionSlot + '_' + chapterSlot;
    if (seenKeys[key]) continue;
    seenKeys[key] = true;

    if (!name) continue;

    var chUrl = BASE + '/comic/chapter/' + slug + '/' + sectionSlot + '_' + chapterSlot + '.html';
    chapters.push({
      name: name,
      url: chUrl
    });
  }

  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文（图片列表）────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse('' + html);

  // 图片在 amp-img.comic-contain__item 或 noscript > img 中
  // 优先从 amp-img 取 src
  var ampImgs = legado.dom.selectAll(doc, 'amp-img.comic-contain__item');
  var urls = [];

  if (ampImgs && ampImgs.length > 0) {
    for (var i = 0; i < ampImgs.length; i++) {
      var src = legado.dom.attr(ampImgs[i], 'src') || '';
      if (src && src.indexOf('http') === 0 && src.indexOf('default_cover') === -1) {
        urls.push(src);
      }
    }
  }

  // fallback: 从 noscript > img 中获取（在 .comic-contain 容器内）
  if (urls.length === 0) {
    var imgs = legado.dom.selectAll(doc, '.comic-contain img');
    for (var j = 0; j < imgs.length; j++) {
      var imgSrc = legado.dom.attr(imgs[j], 'src') || '';
      if (imgSrc && imgSrc.indexOf('http') === 0 && imgSrc.indexOf('default_cover') === -1) {
        urls.push(imgSrc);
      }
    }
  }

  legado.dom.free(doc);
  legado.log('[content] images=' + urls.length);
  return JSON.stringify(urls);
}

// ─── 发现页 ────────────────────────────────────────────────────
async function explore(page, category) {
  if (!page || page < 1) page = 1;
  if (page > 1) return [];

  // 未匹配分类 → 返回分类名列表
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
  var books = parseComicsCards(html);
  legado.log('[explore] found=' + books.length);
  return books;
}
