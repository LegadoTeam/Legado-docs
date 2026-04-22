// @name        P5韩漫
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.4p5mha.work
// @logo        https://stpic.se8manhua.club/static/images/favicon.ico
// @type        comic
// @enabled     true
// @tags        漫画,韩漫,日漫,免费漫画
// @description P5韩漫（4p5mha.work），免费韩漫、日漫在线阅读平台。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('老师', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"老师"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '最新更新');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [最新更新] 返回为空' };
    return { passed: true, message: '发现页 [最新更新]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ─────────────────────────────────────────────────────────────────

var BASE = 'https://www.4p5mha.work';
var MOBILE_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
var HEADERS = { 'User-Agent': MOBILE_UA };

var EXPLORE_CATEGORIES = {
  '最新更新': '/update',
  '热门漫画': '/rank',
  '完结漫画': '/booklist?end=1'
};

// ─── 工具函数 ──────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

function trim(s) {
  if (!s) return '';
  return s.replace(/^\s+|\s+$/g, '');
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  var url = BASE + '/search?q=' + encodeURIComponent(keyword);
  legado.log('[search] url=' + url);

  var html = await legado.http.get(url, HEADERS);
  legado.log('[search] html长度=' + html.length);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, 'ul.book-list li');
  legado.log('[search] 找到 ' + items.length + ' 条结果');

  var results = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      var aEl = legado.dom.select(item, 'div.book-list-cover a');
      var href = aEl ? legado.dom.attr(aEl, 'href') : '';
      var bookUrl = toAbs(href);

      var imgEl = legado.dom.select(item, 'img.book-list-cover-img');
      var cover = imgEl ? legado.dom.attr(imgEl, 'data-original') : '';
      if (!cover && imgEl) cover = legado.dom.attr(imgEl, 'src');

      var titleEl = legado.dom.select(item, 'p.book-list-info-title');
      var name = titleEl ? trim(legado.dom.text(titleEl)) : '';
      if (!name && aEl) name = trim(legado.dom.attr(aEl, 'title'));

      if (!bookUrl || !name) continue;

      results.push({
        name: name,
        bookUrl: bookUrl,
        coverUrl: cover || '',
        author: '',
        intro: '',
        kind: '漫画',
        lastChapter: ''
      });
      legado.log('[search] [' + i + '] name=' + name + ' url=' + bookUrl);
    } catch (e) {
      legado.log('[search] item ' + i + ' error: ' + e);
    }
  }

  legado.dom.free(doc);
  legado.log('[search] 返回 ' + results.length + ' 条');
  return results;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl, HEADERS);
  legado.log('[bookInfo] html长度=' + html.length);
  var doc = legado.dom.parse(html);
  legado.log('[bookInfo] dom解析完成');

  // 书名
  var titleEl = legado.dom.select(doc, 'p.detail-main-info-title');
  var name = titleEl ? trim(legado.dom.text(titleEl)) : '';
  legado.log('[bookInfo] name=' + name);

  // 封面
  var coverEl = legado.dom.select(doc, 'div.detail-main-cover img');
  var cover = coverEl ? legado.dom.attr(coverEl, 'data-original') : '';
  if (!cover && coverEl) cover = legado.dom.attr(coverEl, 'src');
  legado.log('[bookInfo] cover=' + (cover ? cover.substring(0, 50) : ''));

  // 作者 - 简单正则从 html 中提取
  var authorMatch = html.match(/作者[：:]\s*<a[^>]*>([^<]*)<\/a>/);
  var author = authorMatch ? trim(authorMatch[1]) : '';
  legado.log('[bookInfo] author=' + author);

  // 简介
  var descEl = legado.dom.select(doc, 'p.detail-desc');
  var intro = descEl ? trim(legado.dom.text(descEl)) : '';
  legado.log('[bookInfo] intro长度=' + intro.length);

  // 最新章节 - 只取最后一个 a.chapteritem
  var lastChapEl = legado.dom.select(doc, 'ul.detail-list-1 li:last-child a');
  var latestChapter = lastChapEl ? trim(legado.dom.text(lastChapEl)) : '';
  legado.log('[bookInfo] latestChapter=' + latestChapter);

  legado.dom.free(doc);

  return {
    name: name || '',
    author: author || '',
    coverUrl: cover || '',
    intro: intro || '',
    kind: '漫画',
    lastChapter: latestChapter,
    tocUrl: bookUrl
  };
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);

  var html = await legado.http.get(tocUrl, HEADERS);
  var doc = legado.dom.parse(html);

  var chapterEls = legado.dom.selectAll(doc, 'a.chapteritem');
  legado.log('[chapterList] 找到 ' + chapterEls.length + ' 个章节');

  var seen = {};
  var chapters = [];
  for (var i = 0; i < chapterEls.length; i++) {
    var a = chapterEls[i];
    var href = legado.dom.attr(a, 'href');
    if (!href || href.indexOf('/chapter/') === -1) continue;
    var url = toAbs(href);
    if (seen[url]) continue;
    seen[url] = true;
    var title = trim(legado.dom.text(a));
    chapters.push({ name: title || ('第' + (i + 1) + '章'), url: url });
  }

  legado.dom.free(doc);
  legado.log('[chapterList] 去重后 ' + chapters.length + ' 章');
  return chapters;
}

// ─── 章节正文（漫画图片）────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl, HEADERS);
  var doc = legado.dom.parse(html);

  var imgEls = legado.dom.selectAll(doc, 'img.lazy');
  legado.log('[chapterContent] img.lazy 找到 ' + imgEls.length + ' 张');

  var urls = [];
  for (var i = 0; i < imgEls.length; i++) {
    var img = imgEls[i];
    var src = legado.dom.attr(img, 'data-original');
    if (!src) src = legado.dom.attr(img, 'data-fallback');
    if (!src) src = legado.dom.attr(img, 'src');
    if (!src) continue;
    // 过滤 logo/icon/placeholder 等非漫画图片
    if (src.indexOf('static') !== -1) continue;
    if (src.indexOf('logo') !== -1) continue;
    if (src.indexOf('mrtx') !== -1) continue;
    if (src.indexOf('zhihu.com') !== -1) continue;
    if (src.indexOf('onerro') !== -1) continue;
    urls.push(src);
  }

  legado.dom.free(doc);
  legado.log('[chapterContent] 有效图片 ' + urls.length + ' 张，样本：' + (urls[0] || '无'));
  return JSON.stringify(urls);
}

// ─── 发现页 ───────────────────────────────────────────────────────────────

async function explore(page, category) {
  legado.log('[explore] page=' + page + ' category=' + (category || ''));

  // 未指定分类时返回分类名列表
  if (!category) {
    var cats = [];
    for (var k in EXPLORE_CATEGORIES) {
      cats.push(k);
    }
    return cats;
  }

  var path = EXPLORE_CATEGORIES[category];
  if (!path) {
    var cats2 = [];
    for (var k2 in EXPLORE_CATEGORIES) {
      cats2.push(k2);
    }
    return cats2;
  }

  var p = page || 1;
  var url = BASE + path;
  if (p > 1) url = url + (url.indexOf('?') !== -1 ? '&' : '?') + 'page=' + p;
  legado.log('[explore] url=' + url);

  var html = await legado.http.get(url, HEADERS);
  var doc = legado.dom.parse(html);
  var results = [];

  // 结构一：manga-list-2（/update、/booklist 等页面）
  var items = legado.dom.selectAll(doc, 'ul.manga-list-2 li');
  if (items && items.length > 0) {
    legado.log('[explore] manga-list-2 结构，共 ' + items.length + ' 条');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      try {
        var aEl = legado.dom.select(item, 'div.manga-list-2-cover a');
        if (!aEl) aEl = legado.dom.select(item, 'a');
        if (!aEl) continue;
        var href = legado.dom.attr(aEl, 'href');
        if (!href || href.indexOf('/book/') === -1) continue;
        var bookUrl = toAbs(href);

        var imgEl = legado.dom.select(item, 'img.manga-list-2-cover-img');
        var cover = imgEl ? legado.dom.attr(imgEl, 'data-original') : '';
        if (!cover && imgEl) cover = legado.dom.attr(imgEl, 'src');

        var nameEl = legado.dom.select(item, 'p.manga-list-2-title a');
        var name = nameEl ? trim(legado.dom.text(nameEl)) : '';
        if (!name) name = trim(legado.dom.attr(aEl, 'title'));
        if (!name || !bookUrl) continue;

        results.push({
          name: name,
          bookUrl: bookUrl,
          coverUrl: cover || '',
          author: '',
          intro: '',
          kind: '漫画',
          lastChapter: ''
        });
      } catch (e) {
        legado.log('[explore] item ' + i + ' error: ' + e);
      }
    }
  } else {
    // 结构二：rank-list（/rank 页面，<a href> 直接包裹 <li>）
    var rankLinks = legado.dom.selectAll(doc, 'ul.rank-list a[href]');
    legado.log('[explore] rank-list 结构，共 ' + (rankLinks ? rankLinks.length : 0) + ' 条');
    if (rankLinks) {
      for (var j = 0; j < rankLinks.length; j++) {
        var a = rankLinks[j];
        try {
          var href2 = legado.dom.attr(a, 'href');
          if (!href2 || href2.indexOf('/book/') === -1) continue;
          var bookUrl2 = toAbs(href2);

          var imgEl2 = legado.dom.select(a, 'img.rank-list-cover-img');
          var cover2 = imgEl2 ? legado.dom.attr(imgEl2, 'data-original') : '';
          if (!cover2 && imgEl2) cover2 = legado.dom.attr(imgEl2, 'src');

          var nameEl2 = legado.dom.select(a, 'p.rank-list-info-right-title');
          var name2 = nameEl2 ? trim(legado.dom.text(nameEl2)) : '';
          if (!name2) name2 = trim(legado.dom.attr(a, 'title'));
          if (!name2 || !bookUrl2) continue;

          results.push({
            name: name2,
            bookUrl: bookUrl2,
            coverUrl: cover2 || '',
            author: '',
            intro: '',
            kind: '漫画',
            lastChapter: ''
          });
        } catch (e2) {
          legado.log('[explore] rank item ' + j + ' error: ' + e2);
        }
      }
    }
  }

  legado.dom.free(doc);
  legado.log('[explore] 返回 ' + results.length + ' 条');
  return results;
}
