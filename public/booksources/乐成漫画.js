// @name        乐成漫画
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.lcmhx.cc
// @logo        https://www.lcmhx.cc/favicon.png
// @type        comic
// @enabled     true
// @tags        漫画,韩漫,同人志,免费漫画
// @description 乐成漫画（lcmhx.cc），专属韩漫/单行本/同人志漫画站，图片直链、免登录。

// ─── 内置测试 ────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('女神', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"女神"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '韩漫');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [韩漫] 返回为空' };
    return { passed: true, message: '发现页 [韩漫]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────
var BASE = 'https://www.lcmhx.cc';

// 分类 ID 映射
var CATEGORIES = {
  '韩漫':   '1',
  '单行本': '2',
  '同人志': '3',
  'Cosplay': '4'
};

// ─── 工具 ────────────────────────────────────────────────────────
function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

function extractCover(el, selector) {
  return legado.dom.selectAttr(el, selector, 'data-src')
      || legado.dom.selectAttr(el, selector, 'data-original')
      || legado.dom.selectAttr(el, selector, 'src')
      || '';
}

// ─── 搜索 ────────────────────────────────────────────────────────
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  // 仅第1页（搜索无分页）
  var url = BASE + '/mcsearch/-------/?wd=' + encodeURIComponent(keyword);
  legado.log('[search] url=' + url);

  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);

  var items = legado.dom.selectAll(doc, '.search-result a');
  legado.log('[search] found=' + items.length);

  var books = [];
  for (var i = 0; i < items.length; i++) {
    var a = items[i];
    var href = legado.dom.attr(a, 'href') || '';
    if (!href || href.indexOf('/mc-') === -1) continue;

    var name = legado.dom.selectText(a, '.search-result__item__title') || legado.dom.text(a) || '';
    name = name.trim();
    var cover = extractCover(a, 'img');
    var bookUrl = toAbs(href);

    if (name) {
      books.push({
        name: name,
        author: '',
        bookUrl: bookUrl,
        coverUrl: cover,
        kind: '漫画'
      });
    }
  }

  legado.dom.free(doc);
  legado.log('[search] result=' + books.length);
  return books;
}

// ─── 书籍详情 ────────────────────────────────────────────────────
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  // 书名
  var name = (legado.dom.selectText(doc, '.page-location-text') || '').trim();

  // 封面：搜索结果缩略图与具体 book id 对应，此处用第1张正文图代替
  var coverUrl = extractCover(doc, '.page img') || extractCover(doc, '.general img') || '';

  // 最新章节（目录最后一项）
  var chapterLinks = legado.dom.selectAll(doc, '.listmh li a');
  var lastChapter = '';
  if (chapterLinks.length > 0) {
    lastChapter = (legado.dom.text(chapterLinks[chapterLinks.length - 1]) || '').trim();
  }

  // 分类标签
  var kind = '漫画';
  var typeLink = legado.dom.selectAttr(doc, '.list a[href^="/mctype/"]', 'href') || '';
  if (typeLink.indexOf('/mctype/1') !== -1) kind = '韩漫';
  else if (typeLink.indexOf('/mctype/2') !== -1) kind = '单行本';
  else if (typeLink.indexOf('/mctype/3') !== -1) kind = '同人志';
  else if (typeLink.indexOf('/mctype/4') !== -1) kind = 'Cosplay';

  // 简介：用正则从原始 HTML 中提取 "简介 : ..." 内容
  var intro = '';
  var introMatch = html.match(/简介\s*[：:]\s*([\s\S]*?)<\/span>/);
  if (introMatch) {
    intro = introMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  legado.dom.free(doc);
  legado.log('[bookInfo] name=' + name + ' intro=' + intro + ' chapters=' + chapterLinks.length);

  return {
    name: name,
    author: '',
    coverUrl: coverUrl,
    intro: intro || name,
    lastChapter: lastChapter,
    kind: kind,
    tocUrl: bookUrl
  };
}

// ─── 章节列表 ────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);

  // 从 tocUrl 中提取 bookId，格式：/mc-{bookId}/ 或 /mc-{bookId}-{chap}/
  var bookIdMatch = tocUrl.match(/\/mc-(\d+)/);
  if (!bookIdMatch) {
    legado.log('[chapterList] 无法从 URL 解析 bookId: ' + tocUrl);
    return [];
  }
  var bookId = bookIdMatch[1];
  legado.log('[chapterList] bookId=' + bookId);

  // 用极大页码请求尾部，获取真实最后一章的章节号
  var tailUrl = BASE + '/mc-' + bookId + '-9999/';
  legado.log('[chapterList] fetching tail url=' + tailUrl);

  var html = await legado.http.get(tailUrl);
  var doc = legado.dom.parse(html);

  // .listmh 存在且包含章节链接时，提取其中最大章节号
  var links = legado.dom.selectAll(doc, '.listmh li a');
  legado.dom.free(doc);

  if (!links || links.length === 0) {
    // 单章漫画：没有导航列表，唯一一章就是第1话
    legado.log('[chapterList] single-chapter book');
    return [{ name: '第1话', url: BASE + '/mc-' + bookId + '-1/' }];
  }

  // 找出章节链接中最大的章节号
  var lastChap = 0;
  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    // href 格式：/mc-{bookId}-{chap}/ 或 javascript:;（代表当前章）
    var m = href.match(/\/mc-\d+-(\d+)\//);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > lastChap) lastChap = n;
    }
  }

  // 若链接全为 javascript:; 则说明只有一话
  if (lastChap < 1) lastChap = 1;

  legado.log('[chapterList] lastChap=' + lastChap + '，生成全部章节');

  // 生成第1话 ~ 第lastChap话的完整章节列表
  var chapters = [];
  for (var j = 1; j <= lastChap; j++) {
    chapters.push({
      name: '第' + j + '话',
      url:  BASE + '/mc-' + bookId + '-' + j + '/'
    });
  }

  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ────────────────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  // 优先 .page，备选 .general
  var imgEls = legado.dom.selectAll(doc, '.page img');
  if (!imgEls || imgEls.length === 0) {
    imgEls = legado.dom.selectAll(doc, '.general img');
  }

  var urls = [];
  for (var i = 0; i < imgEls.length; i++) {
    var src = legado.dom.attr(imgEls[i], 'src')
           || legado.dom.attr(imgEls[i], 'data-src')
           || legado.dom.attr(imgEls[i], 'data-original')
           || '';
    src = src.trim();
    if (src && src.indexOf('http') === 0) {
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

  // 确定分类 typeId；若分类未匹配则返回分类名列表
  var typeId = null;
  if (category) {
    for (var key in CATEGORIES) {
      if (CATEGORIES.hasOwnProperty(key) && (key === category || CATEGORIES[key] === String(category))) {
        typeId = CATEGORIES[key];
        break;
      }
    }
  }

  if (!typeId) {
    legado.log('[explore] returning category list');
    var cats = [];
    for (var k in CATEGORIES) {
      if (CATEGORIES.hasOwnProperty(k)) cats.push(k);
    }
    return cats;
  }

  var url = BASE + '/mctype/' + typeId + '-' + page + '/';
  legado.log('[explore] category=' + category + ' page=' + page + ' url=' + url);

  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);

  var itemLinks = legado.dom.selectAll(doc, '.item a');
  legado.log('[explore] items=' + itemLinks.length);

  var books = [];
  for (var i = 0; i < itemLinks.length; i++) {
    var a = itemLinks[i];
    var href = legado.dom.attr(a, 'href') || '';
    if (!href || href.indexOf('/mc-') === -1) continue;

    var name = legado.dom.selectText(a, '.hv-title') || legado.dom.text(a) || '';
    name = name.trim();
    var cover = extractCover(a, 'img');
    var bookUrl = toAbs(href);

    if (name) {
      books.push({
        name: name,
        author: '',
        bookUrl: bookUrl,
        coverUrl: cover,
        kind: category || '漫画'
      });
    }
  }

  legado.dom.free(doc);
  legado.log('[explore] result=' + books.length);
  return books;
}
