// @name        YYDS漫画
// @version     1.0.1
// @author      Legado Tauri
// @url         https://www.yydsmh.com
// @logo        https://www.yydsmh.com/favicon.ico
// @type        comic
// @enabled     true
// @tags        漫画,国漫,韩漫,日漫,免费漫画
// @description YYDS漫画（yydsmh.com），免费在线漫画平台，提供国漫、韩漫、日漫等多种类型漫画。

// ─── 内置测试 ────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    var found = false;
    for (var i = 0; i < results.length; i++) {
      if (results[i].name && results[i].name.indexOf('斗破苍穹') !== -1) { found = true; break; }
    }
    if (!found) return { passed: false, message: '搜索结果中未找到"斗破苍穹"' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '排行榜');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [排行榜] 返回为空' };
    return { passed: true, message: '发现页 [排行榜]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────
var BASE = 'https://www.yydsmh.com';
var API_SEARCH = '/api/front/index/search';

// 发现页分类：使用排行页和更新页（服务端渲染，无需 API）
var EXPLORE_CATEGORIES = {
  '排行榜': '/toplist/alldj.html',
  '最新更新': '/manga-update/4.html'
};

// ─── 工具 ────────────────────────────────────────────────────────
function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

/**
 * 处理反爬验证：检测响应中的 ge_js_validator cookie 设置脚本，
 * 若包含则提取 cookie 并通过手动设置 header 重试原始请求。
 * @param {string} resp - HTTP 响应体
 * @param {string} url - 原始请求 URL
 * @param {object} [headers] - 额外 headers
 * @returns {string} 最终响应体
 */
async function handleAntiCrawl(resp, url, headers) {
  if (!resp || resp.indexOf('ge_js_validator') === -1) return resp;
  var m = resp.match(/document\.cookie\s*=\s*"([^"]+)"/);
  if (!m) return resp;
  var cookie = m[1].split(';')[0];
  legado.log('[antiCrawl] cookie=' + cookie);
  var h = headers || {};
  h['Cookie'] = cookie;
  return await legado.http.get(url, h);
}

/**
 * 调用搜索 API：POST /api/front/index/search，body = key=<keyword>
 * @param {string} keyword
 * @returns {Array} 书籍列表
 */
async function apiSearch(keyword) {
  var body = 'key=' + encodeURIComponent(keyword);
  var headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': BASE + '/'
  };
  var resp = await legado.http.post(BASE + API_SEARCH, body, headers);
  var respStr = '' + resp;
  legado.log('[apiSearch] resp length=' + respStr.length);

  // 反爬检测（POST 也可能触发）
  if (respStr.indexOf('ge_js_validator') !== -1) {
    var m = respStr.match(/document\.cookie\s*=\s*"([^"]+)"/);
    if (m) {
      headers['Cookie'] = m[1].split(';')[0];
      resp = await legado.http.post(BASE + API_SEARCH, body, headers);
      respStr = '' + resp;
    }
  }

  if (!respStr || respStr.length === 0) return [];

  var obj = JSON.parse(respStr);
  if (!obj || obj.code !== 0) return [];
  var data = obj.data || [];
  var books = [];
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    books.push({
      name: item.name || '',
      author: (item.author || '').replace(/\\/g, ''),
      bookUrl: toAbs(item.info_url || ('/manga/' + item.id + '/')),
      coverUrl: item.cover || '',
      kind: (item.tags && item.tags.length > 0) ? item.tags.join(',') : '漫画',
      intro: item.content || item.intro || ''
    });
  }
  return books;
}

/**
 * 解析排行/更新页 HTML 中的漫画卡片（li.acgn-item）
 * 排行页结构：li.acgn-item > a.acgn-thumbnail(href, img.cover) + div.acgn-info > h3.comic-name > a
 * 更新页结构：li.acgn-item > div.__left > a.acgn-thumbnail(href, img.cover) + div.__right > div.acgn-info
 * @param {string} html
 * @returns {Array}
 */
function parseListHtml(html) {
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, 'li.acgn-item');
  var books = [];
  var seenUrls = {};

  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var a = legado.dom.select(el, 'a.acgn-thumbnail');
    if (!a) continue;
    var href = legado.dom.attr(a, 'href') || '';
    if (!href || href.indexOf('/manga/') === -1) continue;

    var url = toAbs(href);
    if (seenUrls[url]) continue;
    seenUrls[url] = true;

    var img = legado.dom.select(el, 'img.cover');
    var coverUrl = img ? (legado.dom.attr(img, 'src') || '') : '';

    // 标题：从 h3 或 a 的 title 中取
    var titleEl = legado.dom.select(el, 'h3.comic-name a') || legado.dom.select(el, 'h3 a');
    var name = '';
    if (titleEl) {
      name = (legado.dom.text(titleEl) || '').trim();
      // 排行页标题前有 "NO.1" 等序号，去掉
      name = name.replace(/^NO\.\d+\s*/i, '');
    }
    if (!name) {
      // fallback：从 a.acgn-thumbnail 的 title 取
      var titleStr = legado.dom.attr(a, 'title') || '';
      name = titleStr.split(',')[0].trim();
    }
    if (!name) continue;

    books.push({
      name: name,
      author: '',
      bookUrl: url,
      coverUrl: coverUrl.trim(),
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
  // 搜索 API 不支持分页，只返回一页结果
  if (page > 1) return [];
  var books = await apiSearch(keyword);
  legado.log('[search] found=' + books.length);
  return books;
}

// ─── 书籍详情 ────────────────────────────────────────────────────
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  // 从 OG meta 提取
  var name = legado.dom.selectAttr(doc, 'meta[property="og:novel:book_name"]', 'content')
          || legado.dom.selectText(doc, '#js_comic-title')
          || '';
  var author = legado.dom.selectAttr(doc, 'meta[property="og:novel:author"]', 'content')
            || legado.dom.selectText(doc, '.author')
            || '';
  var coverUrl = legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content') || '';
  var intro = legado.dom.selectAttr(doc, 'meta[property="og:description"]', 'content')
           || legado.dom.selectText(doc, '#js_desc_content')
           || '';
  var kind = legado.dom.selectAttr(doc, 'meta[property="og:novel:category"]', 'content') || '漫画';
  var status = legado.dom.selectAttr(doc, 'meta[property="og:novel:status"]', 'content') || '';
  var lastChapter = legado.dom.selectAttr(doc, 'meta[property="og:novel:latest_chapter_name"]', 'content') || '';

  // 清理
  name = name.replace(/~$/, '').trim();
  author = author.replace(/\\/g, '').trim();
  kind = kind.replace(/,$/, '').trim();

  legado.dom.free(doc);
  legado.log('[bookInfo] name=' + name + ' author=' + author);

  return {
    name: name,
    author: author,
    coverUrl: coverUrl,
    intro: intro,
    kind: kind,
    status: status,
    lastChapter: lastChapter,
    tocUrl: bookUrl
  };
}

// ─── 章节列表 ────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);

  var html = await legado.http.get(tocUrl);

  // 反爬处理
  var htmlStr = '' + html;
  if (htmlStr.indexOf('ge_js_validator') !== -1) {
    html = await handleAntiCrawl(htmlStr, tocUrl);
  }

  var doc = legado.dom.parse(html);

  // 章节在 #detail-chapter 区域，链接格式 /episode/{id}/{chapterId}.html
  // 选择器：.chapter-list .item a（排除 header 里的"开始阅读"和"最新章节"链接）
  var links = legado.dom.selectAll(doc, '#detail-chapter .chapter-list .item a');
  legado.log('[chapterList] raw links=' + links.length);

  var chapters = [];
  var seenUrls = {};

  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    var name = (legado.dom.text(a) || '').trim();
    var href = legado.dom.attr(a, 'href') || '';

    if (!href || href.indexOf('javascript') !== -1) continue;
    var url = toAbs(href);

    if (!name) continue;
    if (seenUrls[url]) continue;
    seenUrls[url] = true;

    chapters.push({ name: name, url: url });
  }

  legado.dom.free(doc);
  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ────────────────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);

  // 反爬处理
  var htmlStr = '' + html;
  if (htmlStr.indexOf('ge_js_validator') !== -1) {
    html = await handleAntiCrawl(htmlStr, chapterUrl);
  }

  var doc = legado.dom.parse(html);

  // 图片在 #imgsec figure.item img 中，使用 data-src
  var imgEls = legado.dom.selectAll(doc, '#imgsec img');
  if (!imgEls || imgEls.length === 0) {
    imgEls = legado.dom.selectAll(doc, '.acgn-reader-chapter__item-box img');
  }

  var urls = [];
  for (var i = 0; i < imgEls.length; i++) {
    var src = legado.dom.attr(imgEls[i], 'data-src')
           || legado.dom.attr(imgEls[i], 'src')
           || '';
    src = src.trim();
    if (src && src.indexOf('http') === 0 && src.indexOf('load.gif') === -1) {
      urls.push(src);
    }
  }

  legado.dom.free(doc);
  legado.log('[content] images=' + urls.length);
  return JSON.stringify(urls);
}

// ─── 发现页 ────────────────────────────────────────────────────
async function explore(page, category) {
  if (!page || page < 1) page = 1;
  // 排行/更新页无分页，仅返回第一页
  if (page > 1) return [];

  // 未匹配分类 → 返回分类名列表
  var path = null;
  if (category) {
    for (var key in EXPLORE_CATEGORIES) {
      if (EXPLORE_CATEGORIES.hasOwnProperty(key) && key === category) {
        path = EXPLORE_CATEGORIES[key];
        break;
      }
    }
  }

  if (!path) {
    legado.log('[explore] returning category list');
    var cats = [];
    for (var k in EXPLORE_CATEGORIES) {
      if (EXPLORE_CATEGORIES.hasOwnProperty(k)) cats.push(k);
    }
    return cats;
  }

  legado.log('[explore] category=' + category + ' url=' + path);

  var url = BASE + path;
  var html = await legado.http.get(url);
  html = '' + html;

  // 反爬处理
  if (html.indexOf('ge_js_validator') !== -1) {
    html = await handleAntiCrawl(html, url);
    html = '' + html;
  }

  if (!html || html.length === 0) return [];
  var books = parseListHtml(html);
  legado.log('[explore] found=' + books.length);
  return books;
}
