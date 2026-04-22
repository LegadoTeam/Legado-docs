// @name        天悦小说
// @version     1.0.0
// @author      Cursor
// @url         https://www.xtyxsw.org
// @logo        https://www.xtyxsw.org/favicon.ico
// @enabled     true
// @tags        小说,天悦,xtyxsw
// @description 天悦小说网

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore', 'flow'];

  if (type === 'search') {
    var r = await search('跳龙门', 1);
    if (!r || !r.length) return { passed: false, message: '搜索无结果（若服务端拦截自动化请求，请在设置中打开浏览器探测调试）' };
    return { passed: true, message: '搜索返回 ' + r.length + ' 条' };
  }

  if (type === 'explore') {
    var b = await explore(1, '玄幻');
    if (!b || !b.length) return { passed: false, message: '分类页为空' };
    return { passed: true, message: '分类「玄幻」' + b.length + ' 本' };
  }

  if (type === 'flow') {
    var list = await search('跳龙门', 1);
    if (!list || !list.length) return { passed: false, message: '搜索为空' };
    var info = await bookInfo(list[0].bookUrl);
    if (!info || !info.name) return { passed: false, message: '详情失败' };
    var ch = await chapterList(info.tocUrl);
    if (!ch || !ch.length) return { passed: false, message: '目录为空' };
    var txt = await chapterContent(ch[0].url);
    if (!txt || txt.length < 30) return { passed: false, message: '正文过短，可能需探测模式' };
    return { passed: true, message: info.name + ' / ' + ch.length + ' 章 / 正文 ' + txt.length + ' 字' };
  }

  return { passed: false, message: '未知测试: ' + type };
}

var PC_BASE = 'https://www.xtyxsw.org';

var HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

var EXPLORE_META = [
  { name: '玄幻', path: '/sort/1_' },
  { name: '奇幻', path: '/sort/2_' },
  { name: '武侠', path: '/sort/3_' },
  { name: '都市', path: '/sort/4_' },
  { name: '历史', path: '/sort/5_' },
  { name: '军事', path: '/sort/6_' },
  { name: '悬疑', path: '/sort/7_' },
  { name: '游戏', path: '/sort/8_' },
  { name: '科幻', path: '/sort/9_' },
  { name: '体育', path: '/sort/10_' },
  { name: '古言', path: '/sort/11_' },
  { name: '现言', path: '/sort/12_' },
  { name: '幻言', path: '/sort/13_' },
  { name: '仙侠', path: '/sort/14_' },
  { name: '青春', path: '/sort/15_' },
  { name: '穿越', path: '/sort/16_' },
  { name: '女生', path: '/sort/17_' },
  { name: '其他', path: '/sort/18_' },
  { name: '点击榜', path: '/allvisit/' },
  { name: '推荐榜', path: '/allvote/' },
  { name: '收藏榜', path: '/goodnum/' },
  { name: '新书入库', path: '/postdate/' },
];

function absUrl(href, base) {
  if (!href) return '';
  if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) return href;
  if (href.charAt(0) === '/') return base + href;
  return base + '/' + href;
}

function bookIdFromUrl(url) {
  var m = url.match(/\/(?:book|read)\/(\d+)/);
  return m ? m[1] : '';
}

function pcBookUrl(id) {
  return PC_BASE + '/book/' + id + '.html';
}

function readTocUrl(id) {
  return PC_BASE + '/read/' + id + '/';
}

async function httpGetSafe(url) {
  try {
    return await legado.http.get(url, HTTP_HEADERS);
  } catch (e) {
    legado.log('[http] GET failed ' + url + ' : ' + e);
    return '';
  }
}

async function httpPostSafe(url, body, headers) {
  try {
    return await legado.http.post(url, body, headers);
  } catch (e) {
    legado.log('[http] POST failed ' + url + ' : ' + e);
    return '';
  }
}

function parseListLiBooks(html, kindLabel) {
  if (!html || html.indexOf('找不到您要搜索的内容') !== -1) return [];
  var doc = legado.dom.parse(html);
  var lis = legado.dom.selectAll(doc, 'ul.list li');
  var books = [];
  var seen = {};
  for (var i = 0; i < lis.length; i++) {
    var li = lis[i];
    var name = legado.dom.selectText(li, 'p.bookname a');
    var readHref = legado.dom.selectAttr(li, 'p.bookname a', 'href');
    if (!name || !readHref) continue;
    var id = bookIdFromUrl(absUrl(readHref, PC_BASE));
    if (!id || seen[id]) continue;
    seen[id] = true;
    var author = legado.dom.selectText(li, 'p.data a.layui-btn');
    var cover = legado.dom.selectAttr(li, 'a img', 'src') || legado.dom.selectAttr(li, 'img', 'src');
    var latest = legado.dom.selectText(li, 'p.data a');
    if (latest === author) latest = '';
    books.push({
      name: name,
      author: author || '',
      bookUrl: pcBookUrl(id),
      coverUrl: absUrl(cover, PC_BASE),
      intro: '',
      latestChapter: latest || '',
      kind: kindLabel || '',
    });
  }
  legado.dom.free(doc);
  return books;
}

function parsePcExploreBooks(html, kindLabel) {
  if (!html) return [];
  var doc = legado.dom.parse(html);
  var boxes = legado.dom.selectAll(doc, 'div[id=alistbox]');
  var books = [];
  var seen = {};
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    var name = legado.dom.selectText(box, 'div.info div.title h2 a');
    var readHref = legado.dom.selectAttr(box, 'div.info div.title h2 a', 'href');
    if (!readHref) readHref = legado.dom.selectAttr(box, 'div.pic a', 'href');
    if (!name || !readHref) continue;
    var id = bookIdFromUrl(absUrl(readHref, PC_BASE));
    if (!id || seen[id]) continue;
    seen[id] = true;
    var author = legado.dom.selectText(box, 'div.info span a');
    if (!author) author = legado.dom.selectText(box, 'div.info span');
    author = (author || '').replace(/^作者[：:]\s*/, '').trim();
    var cover = legado.dom.selectAttr(box, 'div.pic a img', 'src') || legado.dom.selectAttr(box, 'div.pic img', 'src');
    var latest = legado.dom.selectText(box, 'div.sys a');
    books.push({
      name: name,
      author: author || '',
      bookUrl: pcBookUrl(id),
      coverUrl: absUrl(cover, PC_BASE),
      intro: legado.dom.selectText(box, 'div.intro') || '',
      latestChapter: latest || '',
      kind: kindLabel || '',
    });
  }
  legado.dom.free(doc);
  return books;
}

function parseExploreOrSearchHtml(html, kindLabel) {
  var a = parseListLiBooks(html, kindLabel);
  if (a.length) return a;
  return parsePcExploreBooks(html, kindLabel);
}

async function searchHttp(keyword, page) {
  var body = 'searchkey=' + encodeURIComponent(keyword);
  var postHeaders = {
    'User-Agent': HTTP_HEADERS['User-Agent'],
    'Accept': HTTP_HEADERS['Accept'],
    'Accept-Language': HTTP_HEADERS['Accept-Language'],
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Origin': PC_BASE,
    'Referer': PC_BASE + '/',
  };
  var html = await httpPostSafe(PC_BASE + '/search.html', body, postHeaders);
  if (!html) return [];
  return parseExploreOrSearchHtml(html, '');
}

function searchBrowserFetch(keyword) {
  var kw = JSON.stringify(keyword);
  var code = [
    '(function(){',
    '  var kw = ' + kw + ';',
    '  var xhr = new XMLHttpRequest();',
    '  xhr.open("POST", "/search.html", false);',
    "  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');",
    "  xhr.send('searchkey=' + encodeURIComponent(kw));",
    '  var html = xhr.responseText || "";',
    '  try {',
    '    var p = new DOMParser();',
    '    var doc = p.parseFromString(html, "text/html");',
    '    var lis = doc.querySelectorAll("ul.list li");',
    '    var books = [];',
    '    var seen = {};',
    '    for (var i = 0; i < lis.length; i++) {',
    '      var li = lis[i];',
    '      var na = li.querySelector("p.bookname a");',
    '      if (!na) continue;',
    '      var name = (na.textContent || "").trim();',
    '      var readHref = na.getAttribute("href") || "";',
    '      var idm = readHref.match(/\\/read\\/(\\d+)/);',
    '      if (!idm) continue;',
    '      var id = idm[1];',
    '      if (seen[id]) continue;',
    '      seen[id] = true;',
    '      var authEl = li.querySelector("p.data a.layui-btn");',
    '      var author = authEl ? (authEl.textContent || "").trim() : "";',
    '      var img = li.querySelector("a img");',
    '      var cover = img ? (img.getAttribute("src") || "") : "";',
    '      var latest = "";',
    '      var pdata = li.querySelectorAll("p.data");',
    '      if (pdata.length > 1) {',
    '        var la = pdata[pdata.length - 1].querySelector("a");',
    '        if (la) latest = (la.textContent || "").trim();',
    '      }',
    '      books.push({ name: name, author: author, id: id, coverUrl: cover, latestChapter: latest });',
    '    }',
    '    return JSON.stringify(books);',
    '  } catch (e) { return "[]"; }',
    '})()',
  ].join('\n');

  try {
    var ret = legado.browser.run(PC_BASE + '/', code, {
      visible: false,
      waitUntil: 'load',
      timeoutSecs: 60,
    });
    var arr = JSON.parse(ret || '[]');
    var out = [];
    for (var j = 0; j < arr.length; j++) {
      var b = arr[j];
      if (!b.id) continue;
      out.push({
        name: b.name,
        author: b.author || '',
        bookUrl: pcBookUrl(b.id),
        coverUrl: absUrl(b.coverUrl || '', PC_BASE),
        intro: '',
        latestChapter: b.latestChapter || '',
        kind: '',
      });
    }
    return out;
  } catch (e2) {
    legado.log('[search] browser fetch failed: ' + e2);
    return [];
  }
}

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);
  if (!keyword) return [];
  var books = await searchHttp(keyword, page);
  if (!books.length) books = searchBrowserFetch(keyword);
  legado.log('[search] total=' + books.length);
  return books;
}

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);
  var id = bookIdFromUrl(bookUrl);
  if (!id) return { name: '', author: '', bookUrl: bookUrl, tocUrl: bookUrl, coverUrl: '', intro: '', latestChapter: '', kind: '' };

  var fetchUrl = bookUrl.indexOf('/book/') !== -1 ? bookUrl : pcBookUrl(id);
  var html = await httpGetSafe(fetchUrl);
  if (!html) {
    return {
      name: '',
      author: '',
      bookUrl: pcBookUrl(id),
      tocUrl: readTocUrl(id),
      coverUrl: '',
      intro: '',
      latestChapter: '',
      kind: '',
    };
  }
  var doc = legado.dom.parse(html);

  var name = legado.dom.selectText(doc, 'div.bookname h1');
  if (name) {
    name = name.replace(/作者：[\s\S]*$/, '').replace(/作者:.*/, '').trim();
  }
  if (!name) name = legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content');

  var author = legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content');
  if (!author) {
    var em = legado.dom.selectText(doc, 'div.bookname h1 em');
    if (em) {
      var am = em.match(/作者[：:]\s*(\S+)/);
      author = am ? am[1] : em.replace(/^作者[：:]\s*/, '').trim();
    }
  }

  var coverUrl = legado.dom.selectAttr(doc, 'div.box_intro div.pic img', 'src');
  if (!coverUrl) coverUrl = legado.dom.selectAttr(doc, '[property="og:image"]', 'content');

  var intro = legado.dom.selectText(doc, 'div.box_info div.intro');
  if (!intro) intro = legado.dom.selectAttr(doc, '[property="og:description"]', 'content');

  var latestChapter = legado.dom.selectAttr(doc, '[property="og:novel:latest_chapter_name"]', 'content');
  if (!latestChapter) {
    latestChapter = legado.dom.selectText(doc, 'div.book_newchap div.con p.ti a');
  }

  var kind = legado.dom.selectAttr(doc, '[property="og:novel:category"]', 'content');
  if (!kind) {
    var tb = legado.dom.selectText(doc, 'div.box_info table');
    if (tb && tb.indexOf('小说分类') !== -1) {
      var km = tb.match(/小说分类[：:]\s*([^<\s]+)/);
      if (km) kind = km[1];
    }
  }

  legado.dom.free(doc);

  return {
    name: name || '',
    author: author || '',
    bookUrl: pcBookUrl(id),
    tocUrl: readTocUrl(id),
    coverUrl: coverUrl || '',
    intro: intro || '',
    latestChapter: latestChapter || '',
    kind: kind || '',
  };
}

async function parseChaptersFromReadIndex(html, bookId) {
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, 'div.link_14 dd a');
  var hrefs = legado.dom.selectAllAttrs(doc, 'div.link_14 dd a', 'href');
  if (!names || names.length === 0) {
    names = legado.dom.selectAllTexts(doc, 'ul.read li a');
    hrefs = legado.dom.selectAllAttrs(doc, 'ul.read li a', 'href');
  }
  var chapters = [];
  var seen = {};
  for (var i = 0; i < names.length; i++) {
    var u = absUrl(hrefs[i], PC_BASE);
    if (!u || seen[u]) continue;
    if (u.indexOf('/read/' + bookId + '/') === -1) continue;
    if (!/\.html$/.test(u)) continue;
    seen[u] = true;
    u = u.replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE);
    chapters.push({ name: names[i], url: u });
  }
  legado.dom.free(doc);

  if (chapters.length === 0) {
    var doc2 = legado.dom.parse(html);
    var vals = legado.dom.selectAllAttrs(doc2, 'div.pagelist select option', 'value');
    legado.dom.free(doc2);
    if (vals && vals.length) {
      var pageUrls = [];
      for (var vi = 0; vi < vals.length; vi++) {
        pageUrls.push(absUrl(vals[vi], PC_BASE));
      }
      var results = [];
      try {
        results = await legado.http.batchGet(pageUrls);
      } catch (eBatch) {
        legado.log('[chapterList] batchGet: ' + eBatch);
      }
      for (var p = 0; p < results.length; p++) {
        if (!results[p].ok) continue;
        var sub = parseChaptersFromMobileTocOnly(results[p].data, bookId);
        for (var j = 0; j < sub.length; j++) {
          if (!seen[sub[j].url]) {
            seen[sub[j].url] = true;
            chapters.push(sub[j]);
          }
        }
      }
    }
  }
  return chapters;
}

function parseChaptersFromMobileTocOnly(html, bookId) {
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, 'ul.read li a');
  var hrefs = legado.dom.selectAllAttrs(doc, 'ul.read li a', 'href');
  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    var u = absUrl(hrefs[i], PC_BASE).replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE);
    if (!u || u.indexOf('/read/' + bookId + '/') === -1) continue;
    if (!/\.html$/.test(u)) continue;
    chapters.push({ name: names[i], url: u });
  }
  legado.dom.free(doc);
  return chapters;
}

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var id = bookIdFromUrl(tocUrl);
  if (!id) return [];

  var indexUrl = readTocUrl(id);
  if (tocUrl.indexOf('/read/') !== -1 && tocUrl.indexOf('.html') === -1) {
    indexUrl = tocUrl.split('?')[0];
    if (indexUrl.charAt(indexUrl.length - 1) !== '/') indexUrl += '/';
    indexUrl = indexUrl.replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE);
  }

  var html0 = await httpGetSafe(indexUrl);
  if (!html0) return [];
  var all = await parseChaptersFromReadIndex(html0, id);
  legado.log('[chapterList] count=' + all.length);
  return all;
}

function stripNoiseLine(s) {
  if (!s) return '';
  var noise = /天悦小说网|手机阅读|无弹窗|小主，这个章节后面还有哦|请点击下一页继续阅读|请大家收藏：|更新速度全网最快|章节报错|加入书签/g;
  if (noise.test(s)) return '';
  return s;
}

function parseChapterBodyParagraphs(html, isM) {
  if (!html) return '';
  var doc = legado.dom.parse(html);
  var lines = legado.dom.selectAllTexts(doc, isM ? 'div.content p' : '#content p') || [];
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var t = (lines[i] || '').replace(/^\s+|\s+$/g, '');
    t = stripNoiseLine(t);
    if (t) out.push(t);
  }
  legado.dom.free(doc);
  return out.join('\n\n');
}

function chapterTailBaseAndPage(tail) {
  if (!tail) return { base: '', page: 1 };
  var ix = tail.lastIndexOf('_');
  if (ix <= 0 || ix >= tail.length - 1) {
    return { base: tail, page: 1 };
  }
  var suf = tail.substring(ix + 1);
  if (!/^\d+$/.test(suf)) {
    return { base: tail, page: 1 };
  }
  return { base: tail.substring(0, ix), page: parseInt(suf, 10) || 1 };
}

function findNextChapterContentPageUrl(html, currentUrl) {
  if (!html || !currentUrl) return '';
  var u = currentUrl.replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE);
  u = u.split('?')[0].split('#')[0];
  var m = u.match(/\/read\/(\d+)\/([^/?#]+)\.html$/);
  if (!m) return '';
  var bookId = m[1];
  var tail = m[2];
  var fp = chapterTailBaseAndPage(tail);
  var nextPath = '/read/' + bookId + '/' + fp.base + '_' + (fp.page + 1) + '.html';
  if (html.indexOf(nextPath) !== -1) {
    return PC_BASE + nextPath;
  }
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, '#thumb a') || [];
  var hrefs = legado.dom.selectAllAttrs(doc, '#thumb a', 'href') || [];
  if (!hrefs || hrefs.length === 0) {
    names = legado.dom.selectAllTexts(doc, 'div.pager a, .pager a') || [];
    hrefs = legado.dom.selectAllAttrs(doc, 'div.pager a, .pager a', 'href') || [];
  }
  var nextUrl = '';
  for (var i = 0; i < hrefs.length; i++) {
    var label = (names[i] || '').replace(/\s+/g, '');
    if (label.indexOf('下一页') !== -1 && label.indexOf('下一章') === -1) {
      nextUrl = absUrl(hrefs[i], PC_BASE).replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE);
      break;
    }
  }
  legado.dom.free(doc);
  if (!nextUrl || nextUrl === u) return '';
  return nextUrl;
}

async function chapterContentHttp(chapterUrl) {
  var start = chapterUrl.replace(/^https?:\/\/m\.xtyxsw\.org/i, PC_BASE).split('?')[0].split('#')[0];
  var parts = [];
  var visited = {};
  var url = start;
  var maxPages = 120;
  for (var step = 0; step < maxPages; step++) {
    if (visited[url]) break;
    visited[url] = true;
    var html = await httpGetSafe(url);
    if (!html) break;
    var isM = url.indexOf('m.xtyxsw.org') !== -1;
    var block = parseChapterBodyParagraphs(html, isM);
    if (block) parts.push(block);
    legado.log('[chapterContent] HTTP 分页 ' + (step + 1) + ' url=' + url + ' len=' + block.length);
    var nextU = findNextChapterContentPageUrl(html, url);
    if (!nextU) break;
    url = nextU;
  }
  return parts.join('\n\n');
}

function needsContentProbe(text, html) {
  if (!text || text.length < 40) return true;
  if (html && (html.indexOf('eval(') !== -1 || html.indexOf('unescape(') !== -1 || html.indexOf('document.write') !== -1))
    return true;
  return false;
}

function chapterContentMultiBrowser(startUrl) {
  var parts = [];
  var url = startUrl;
  for (var step = 0; step < 120; step++) {
    var chunk = legado.browser.run(url, [
      'function abs(h){ if(!h)return""; try{return new URL(h,location.href).href}catch(e){return"";} }',
      'function tailBasePage(t){',
      '  if(!t)return{base:"",page:1};',
      '  var ix=t.lastIndexOf("_");',
      '  if(ix<=0||ix>=t.length-1)return{base:t,page:1};',
      '  var suf=t.slice(ix+1);',
      '  if(!/^\\d+$/.test(suf))return{base:t,page:1};',
      '  return{base:t.slice(0,ix),page:parseInt(suf,10)||1};',
      '}',
      'var noise=/天悦小说网|小主，这个章节后面还有哦|请点击下一页|请大家收藏：|更新速度全网最快/;',
      'var root=document.querySelector("div.content")||document.querySelector("#content");',
      'if(!root)return JSON.stringify({text:"",next:""});',
      'var ps=root.querySelectorAll("p");var out=[];',
      'for(var i=0;i<ps.length;i++){var t=(ps[i].textContent||"").trim();if(t&&!noise.test(t))out.push(t);}',
      'var next="";',
      'var pm=location.pathname.match(/^\\/read\\/(\\d+)\\/([^/]+)\\.html$/);',
      'if(pm){',
      '  var fp=tailBasePage(pm[2]);',
      '  var np="/read/"+pm[1]+"/"+fp.base+"_"+(fp.page+1)+".html";',
      '  if(document.documentElement.innerHTML.indexOf(np)!==-1)next=abs(np);',
      '}',
      'if(!next){',
      '  var as=document.querySelectorAll("#thumb a, .pager a, div.pager a");',
      '  for(var j=0;j<as.length;j++){var tx=((as[j].textContent||"").replace(/\\s+/g,""));if(tx.indexOf("下一页")!==-1&&tx.indexOf("下一章")===-1){next=abs(as[j].getAttribute("href"));break;}}',
      '}',
      'return JSON.stringify({text:out.join("\\n\\n"),next:next});',
    ].join(''), { visible: false, waitUntil: 'load', timeoutSecs: 40 });
    var data = JSON.parse(chunk || '{"text":"","next":""}');
    if (data.text) parts.push(data.text);
    if (!data.next || data.next === url) break;
    url = data.next;
  }
  return parts.join('\n\n');
}

async function chapterContent(chapterUrl) {
  legado.log('[chapterContent] url=' + chapterUrl);
  var htmlQuick = '';
  try {
    htmlQuick = await httpGetSafe(chapterUrl);
  } catch (e0) {
    legado.log('[chapterContent] http get failed: ' + e0);
  }

  var text = await chapterContentHttp(chapterUrl);
  if (needsContentProbe(text, htmlQuick)) {
    legado.log('[chapterContent] switch to browser probe');
    var bt = chapterContentMultiBrowser(chapterUrl);
    if (bt && bt.length > text.length) text = bt;
    else if (!text) text = bt || '';
  }
  return text;
}

async function explore(page, category) {
  if (!category || category === 'GETALL') {
    var names = [];
    for (var i = 0; i < EXPLORE_META.length; i++) names.push(EXPLORE_META[i].name);
    return names;
  }

  var meta = null;
  for (var j = 0; j < EXPLORE_META.length; j++) {
    if (EXPLORE_META[j].name === category) {
      meta = EXPLORE_META[j];
      break;
    }
  }
  if (!meta) return [];

  var p = page || 1;
  var url;
  if (meta.path.indexOf('/sort/') === 0) {
    url = PC_BASE + meta.path + p + '/';
  } else {
    url = p === 1 ? PC_BASE + meta.path : PC_BASE + meta.path.replace(/\/$/, '') + '/' + p + '.html';
  }

  legado.log('[explore] category=' + category + ' page=' + p + ' url=' + url);
  var html = await httpGetSafe(url);
  return parseExploreOrSearchHtml(html, category);
}
