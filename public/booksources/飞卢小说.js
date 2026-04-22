// @name        飞卢小说
// @version     1.0.0
// @author      Copilot
// @url         https://b.faloo.com
// @logo        https://b.faloo.com/favicon.ico
// @enabled     true
// @tags        付费,小说,同人,玄幻
// @description 飞卢小说网（b.faloo.com），原创付费小说平台，免费章节可阅读。

// ─── 内置测试 ─────────────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') {
    return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];
  }
  if (type === 'search') {
    var r = await search('斗破', 1);
    if (r && r.length > 0) return { passed: true, message: '搜索返回 ' + r.length + ' 条 ✓' };
    return { passed: false, message: '搜索结果为空' };
  }
  if (type === 'explore') {
    var r = await explore(1, '玄幻奇幻');
    if (r && r.length > 0) return { passed: true, message: '发现返回 ' + r.length + ' 条 ✓' };
    return { passed: false, message: '发现结果为空' };
  }
  if (type === 'bookInfo') {
    var r = await bookInfo('https://b.faloo.com/1236995.html');
    var nm = (r && (r.name || r.title)) || '';
    if (nm) return { passed: true, message: 'bookInfo name=' + nm + ' ✓' };
    return { passed: false, message: 'bookInfo 返回空: ' + JSON.stringify(r) };
  }
  if (type === 'chapterList') {
    var r = await chapterList('https://b.faloo.com/1236995.html');
    if (r && r.length > 0) return { passed: true, message: '章节列表 ' + r.length + ' 章 ✓' };
    return { passed: false, message: '章节列表为空' };
  }
  if (type === 'chapterContent') {
    var r = await chapterContent('https://b.faloo.com/1236995_1.html');
    if (r && r.length > 50) return { passed: true, message: '正文长度 ' + r.length + ' ✓' };
    return { passed: false, message: '正文太短或为空: ' + (r ? r.length : 0) };
  }
  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 常量 ─────────────────────────────────────────────────────────────────
var BASE = 'https://b.faloo.com';

var CATEGORIES = [
  { name: '同人小说',  id: '44' },
  { name: '玄幻奇幻',  id: '1'  },
  { name: '武侠仙侠',  id: '6'  },
  { name: '都市言情',  id: '4'  },
  { name: '军事历史',  id: '3'  },
  { name: '科幻网游',  id: '2'  },
  { name: '恐怖灵异',  id: '5'  },
  { name: '青春校园',  id: '7'  },
  { name: '轻小说',   id: '97' },
  { name: '女生小说',  id: '54' }
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────
function absUrl(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  if (href.indexOf('//') === 0) return 'https:' + href;
  return BASE + (href.indexOf('/') === 0 ? '' : '/') + href;
}

function trim(s) {
  return s ? s.replace(/^\s+|\s+$/g, '') : '';
}

function getBookId(url) {
  // 从 /1236995.html 或 /html_1236_1236995/ 等 URL 提取 bookId
  // 先尝试 /bookId. 或 /bookId_ 格式（书籍详情/章节页）
  var m = url.match(/\/(\d{6,})(?:[_.]|\/)/);
  if (m) return m[1];
  // 处理 html_{prefix}_{bookId}/ 格式（TOC URL），取最后一段数字
  m = url.match(/_(\d{6,})(?:\/|$)/);
  if (m) return m[1];
  m = url.match(/\/(\d{6,})$/);
  if (m) return m[1];
  return '';
}

// 从 bookId 派生目录 URL: html_{floor(bookId/1000)}_{bookId}/
function tocUrlFromBookId(bookId) {
  if (!bookId) return '';
  var prefix = Math.floor(parseInt(bookId, 10) / 1000);
  return BASE + '/html_' + prefix + '_' + bookId + '/';
}

// 解析书库/搜索列表页，提取 BookItem[]
function parseBookList(doc, category) {
  var books = [];

  // 书名链接在 h1.fontSize17andHei > a (书库/搜索结果页)
  var titleLinks = legado.dom.selectAll(doc, 'h1.fontSize17andHei a');
  legado.log('[parseBookList] h1.fontSize17andHei a: ' + (titleLinks ? titleLinks.length : 0));

  if (!titleLinks || titleLinks.length === 0) {
    legado.log('[parseBookList] 未找到书名链接');
    return books;
  }

  for (var k = 0; k < titleLinks.length; k++) {
    var a = titleLinks[k];
    var href = legado.dom.attr(a, 'href');
    var title = trim(legado.dom.text(a));
    if (!href || !href.match(/\/\d+\.html/)) continue;
    if (!title || title.length < 2) continue;

    var bookUrl = absUrl(href);
    var bookId = getBookId(bookUrl);
    if (!bookId) continue;

    books.push({
      title: title,
      author: '',
      bookUrl: bookUrl,
      coverUrl: '',
      description: '',
      category: category || ''
    });
  }

  legado.log('[parseBookList] total: ' + books.length);
  return books;
}

// ─── 发现页 ───────────────────────────────────────────────────────────────
async function explore(page, category) {
  legado.log('[explore] page=' + page + ' category=' + category);

  // CLI 传 'GETALL' 或无参数时 → 返回分类名列表
  if (category === 'GETALL' || !category) {
    var names = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      names.push(CATEGORIES[i].name);
    }
    return names;
  }

  // 找到 catId
  var catId = null;
  for (var j = 0; j < CATEGORIES.length; j++) {
    if (CATEGORIES[j].name === category) {
      catId = CATEGORIES[j].id;
      break;
    }
  }

  if (!catId) {
    legado.log('[explore] 未知分类: ' + category);
    return [];
  }

  var pageNum = page || 1;
  var listUrl = BASE + '/y_' + catId + '_' + pageNum + '.html';
  legado.log('[explore] URL: ' + listUrl);

  var html = await legado.http.get(listUrl);
  var doc = legado.dom.parse(html);

  return parseBookList(doc, category);
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] URL: ' + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  // 书名: h1#novelName
  var titleEl = legado.dom.select(doc, 'h1#novelName');
  if (!titleEl) titleEl = legado.dom.select(doc, 'h1.fs23');
  var title = titleEl ? trim(legado.dom.text(titleEl)) : '';
  legado.log('[bookInfo] title: ' + title);

  // 作者: .T-L-O-Z-Box1 中的 a[href*="t=2"]
  var authorEl = legado.dom.select(doc, '.T-L-O-Z-Box1 a[href*="t=2"]');
  if (!authorEl) authorEl = legado.dom.select(doc, 'a[href*="t=2&k="]');
  var author = authorEl ? trim(legado.dom.text(authorEl)) : '';
  legado.log('[bookInfo] author: ' + author);

  // 封面: img.imgcss
  var coverEl = legado.dom.select(doc, 'img.imgcss');
  var cover = coverEl ? absUrl(legado.dom.attr(coverEl, 'src')) : '';
  legado.log('[bookInfo] cover: ' + cover);

  // 简介: .T-L-T-C-Box1 内的 p 标签合并（过滤广告段落）
  var descEl = legado.dom.select(doc, '.T-L-T-C-Box1');
  var desc = '';
  if (descEl) {
    var pEls = legado.dom.selectAll(descEl, 'p');
    var lines = [];
    if (pEls) {
      for (var i = 0; i < pEls.length; i++) {
        var t = trim(legado.dom.text(pEls[i]));
        if (t && t.indexOf('飞卢小说网') === -1 && t.indexOf('纯属虚构') === -1) {
          lines.push(t);
        }
      }
    }
    desc = lines.join('\n');
  }
  legado.log('[bookInfo] desc length: ' + desc.length);

  // 分类: 面包屑中的 /m_XX_index.html 链接
  var catEl = legado.dom.select(doc, 'a[href*="/m_"][href*="_index"]');
  var category = catEl ? trim(legado.dom.text(catEl)) : '';

  // 最新章节: .T-L-Th-Box1 中的链接
  var latestEl = legado.dom.select(doc, '.T-L-Th-Box1 a');
  var latestChapter = latestEl ? trim(legado.dom.text(latestEl)) : '';
  // 标题格式为 "《书名》第X章 章节名"，提取章节名部分
  if (latestChapter && latestChapter.indexOf('》') !== -1) {
    latestChapter = trim(latestChapter.split('》')[1]);
  }
  legado.log('[bookInfo] latestChapter: ' + latestChapter);

  // 目录 URL: 从 bookId 派生
  var bookId = getBookId(bookUrl);
  var tocUrl = tocUrlFromBookId(bookId);
  legado.log('[bookInfo] tocUrl: ' + tocUrl);

  return {
    title: title,
    author: author,
    coverUrl: cover,
    description: desc,
    category: category,
    lastChapter: latestChapter,
    tocUrl: tocUrl
  };
}

// ─── 目录 ─────────────────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  var bookId = getBookId(tocUrl);
  if (!bookId) {
    legado.log('[chapterList] 无法提取 bookId from: ' + tocUrl);
    return [];
  }

  // 如果传入的是书籍详情URL，先转为TOC URL
  if (tocUrl.indexOf('/html_') === -1) {
    tocUrl = tocUrlFromBookId(bookId);
  }
  legado.log('[chapterList] TOC URL: ' + tocUrl);

  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 免费章节: .c_con_li_detail_p a
  // VIP 章节: a.c_con_li_detail
  var freeLinks = legado.dom.selectAll(doc, '.c_con_li_detail_p a');
  var vipLinks  = legado.dom.selectAll(doc, 'a.c_con_li_detail');
  legado.log('[chapterList] free: ' + (freeLinks ? freeLinks.length : 0) + ' vip: ' + (vipLinks ? vipLinks.length : 0));

  // 合并两个列表
  var allLinks = [];
  if (freeLinks) {
    for (var fi = 0; fi < freeLinks.length; fi++) allLinks.push(freeLinks[fi]);
  }
  if (vipLinks) {
    for (var vi = 0; vi < vipLinks.length; vi++) allLinks.push(vipLinks[vi]);
  }

  // 若两种选择器均无结果则回退到宽泛选择器
  if (allLinks.length === 0) {
    var fallback = legado.dom.selectAll(doc, '.c_con_list a[href]');
    if (fallback) {
      for (var bi = 0; bi < fallback.length; bi++) allLinks.push(fallback[bi]);
    }
    legado.log('[chapterList] fallback: ' + allLinks.length);
  }

  var chapters = [];
  var seen = {};

  for (var i = 0; i < allLinks.length; i++) {
    var a = allLinks[i];
    var href = legado.dom.attr(a, 'href');
    if (!href) continue;
    // 只取 /{bookId}_{chapterId}.html 格式
    if (!href.match(/\/\d+_\d+\.html/)) continue;
    if (href.indexOf('/' + bookId + '_') === -1) continue;
    var url = absUrl(href);
    if (seen[url]) continue;
    seen[url] = true;
    var title = trim(legado.dom.text(a));
    if (!title || title.length < 2) continue;
    chapters.push({ title: title, url: url });
  }

  legado.log('[chapterList] chapters count: ' + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] URL: ' + chapterUrl);
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  // 章节内容在 div.noveContent（注意拼写：noveContent 非 novelContent）
  var contentEl = legado.dom.select(doc, 'div.noveContent');
  if (!contentEl) {
    legado.log('[chapterContent] div.noveContent 未找到，尝试备用');
    contentEl = legado.dom.select(doc, '.c_l_infoLine + div');
  }

  if (!contentEl) {
    legado.log('[chapterContent] 未找到内容容器');
    return '';
  }

  // 提取所有 p 标签内容
  var pEls = legado.dom.selectAll(contentEl, 'p');
  if (!pEls || pEls.length === 0) {
    return trim(legado.dom.text(contentEl));
  }

  var lines = [];
  for (var i = 0; i < pEls.length; i++) {
    var t = trim(legado.dom.text(pEls[i]));
    if (t) lines.push(t);
  }
  return lines.join('\n\n');
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────
async function search(keyword, page) {
  page = page || 1;
  // 书名搜索 t=1；关键词需 GBK 编码
  var encoded = legado.urlEncodeCharset(keyword, 'gbk');
  var searchUrl = BASE + '/l_0_' + page + '.html?t=1&k=' + encoded;
  legado.log('[search] URL: ' + searchUrl);

  var html = await legado.http.get(searchUrl);
  var doc = legado.dom.parse(html);

  var books = parseBookList(doc, '');
  legado.log('[search] results: ' + books.length);
  return books;
}
