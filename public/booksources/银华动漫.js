// @name        银华动漫
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.yinhuadm.cc
// @logo        https://www.yinhuadm.cc/favicon.ico
// @type        video
// @enabled     true
// @tags        免费,动漫,番剧,国产动漫,日本动漫,视频
// @description 银华动漫（yinhuadm.cc），樱花动漫系列站点，提供国产/日本/欧美动漫在线观看。多线路播放源，支持线路切换。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['explore', 'bookInfo', 'chapterList', 'chapterContent', 'search'];

  if (type === 'explore') {
    var cats = await explore(1, '__invalid__');
    if (!cats || cats.length < 2) return { passed: false, message: '分类列表异常' };
    var books = await explore(1, cats[0]);
    if (!books || books.length < 1) return { passed: false, message: '发现页 [' + cats[0] + '] 返回为空' };
    return { passed: true, message: '发现页 [' + cats[0] + ']: ' + books.length + ' 条结果 ✓' };
  }

  if (type === 'bookInfo') {
    var info = await bookInfo(BASE + '/v/10288.html');
    if (!info || !info.name) return { passed: false, message: 'bookInfo 返回为空' };
    return { passed: true, message: 'name=' + info.name + ' ✓' };
  }

  if (type === 'chapterList') {
    var chs = await chapterList(BASE + '/v/10288.html');
    if (!chs || chs.length < 1) return { passed: false, message: '章节列表为空' };
    // 检查是否有 group 字段
    var hasGroup = false;
    for (var i = 0; i < chs.length; i++) {
      if (chs[i].group) { hasGroup = true; break; }
    }
    return {
      passed: true,
      message: '共 ' + chs.length + ' 集' + (hasGroup ? '（含分组）' : '') + ' ✓'
    };
  }

  if (type === 'chapterContent') {
    var url = chapterContent(BASE + '/p/10288-2-1.html');
    if (!url) return { passed: false, message: '播放地址为空' };
    return { passed: true, message: '播放地址获取成功 ✓' };
  }

  if (type === 'search') {
    var results = await search('神印王座', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索返回 ' + results.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ─────────────────────────────────────────────────────────────────

var BASE = 'https://www.yinhuadm.cc';

var CATEGORIES = [
  { name: '国产动漫', path: '/w/9.html' },
  { name: '日本动漫', path: '/w/10.html' },
  { name: '欧美动漫', path: '/w/11.html' }
];

// ─── 工具函数 ──────────────────────────────────────────────────────────────

/**
 * 将相对 URL 转换为绝对 URL
 */
function absUrl(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  if (href.indexOf('//') === 0) return 'https:' + href;
  if (href.indexOf('/') === 0) return BASE + href;
  return BASE + '/' + href;
}

// ─── explore ──────────────────────────────────────────────────────────────

async function explore(page, category) {
  var catNames = [];
  for (var c = 0; c < CATEGORIES.length; c++) {
    catNames.push(CATEGORIES[c].name);
  }

  var cat = null;
  for (var c = 0; c < CATEGORIES.length; c++) {
    if (CATEGORIES[c].name === category) {
      cat = CATEGORIES[c];
      break;
    }
  }
  if (!cat) return catNames;

  var url = BASE + cat.path;
  if (page > 1) {
    url = BASE + cat.path.replace('.html', '/page/' + page + '.html');
  }

  legado.log('[explore] url=' + url);
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);

  var items = legado.dom.selectAll(doc, 'a.module-poster-item');
  legado.log('[explore] found=' + items.length);
  if (!items.length) {
    items = legado.dom.selectAll(doc, 'a.module-item');
    legado.log('[explore] fallback found=' + items.length);
  }

  var books = [];
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var href = legado.dom.attr(el, 'href') || '';
    if (href.indexOf('/v/') === -1) continue;

    var title = legado.dom.attr(el, 'title') || legado.dom.selectText(el, '.module-item-title') || legado.dom.text(el) || '';
    title = title.replace(/^\s+|\s+$/g, '');

    var coverUrl = legado.dom.selectAttr(el, 'img', 'data-original')
                || legado.dom.selectAttr(el, 'img', 'data-src')
                || legado.dom.selectAttr(el, 'img', 'src') || '';

    var lastChapter = legado.dom.selectText(el, '.module-item-note') || legado.dom.selectText(el, '.module-item-caption') || '';

    books.push({
      name: title,
      bookUrl: absUrl(href),
      coverUrl: absUrl(coverUrl),
      lastChapter: lastChapter
    });
  }

  legado.dom.free(doc);
  legado.log('[explore] books=' + books.length);
  return books;
}

// ─── bookInfo ──────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var name = legado.dom.selectAttr(doc, 'meta[property="og:title"]', 'content')
          || legado.dom.selectText(doc, 'h1')
          || legado.dom.selectText(doc, '.myui-content__detail .title') || '';

  var coverUrl = legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content')
              || legado.dom.selectAttr(doc, '.myui-content__thumb img', 'data-original')
              || legado.dom.selectAttr(doc, '.myui-content__thumb img', 'data-src')
              || legado.dom.selectAttr(doc, '.myui-content__thumb img', 'src') || '';

  var intro = legado.dom.selectAttr(doc, 'meta[property="og:description"]', 'content')
           || legado.dom.selectText(doc, '.sketch')
           || legado.dom.selectText(doc, '.myui-content__desc') || '';

  // 从详情区提取作者/类型/更新集数
  var author = '';
  var kind = '';
  var lastChapter = '';

  var dataItems = legado.dom.selectAll(doc, '.myui-content__detail .data');
  for (var i = 0; i < dataItems.length; i++) {
    var text = legado.dom.text(dataItems[i]) || '';
    if (text.indexOf('导演') !== -1 || text.indexOf('主演') !== -1) {
      var names = legado.dom.selectAllTexts(dataItems[i], 'a');
      if (names.length) author = names.join(' / ');
    }
    if (text.indexOf('类型') !== -1 || text.indexOf('分类') !== -1) {
      var kinds = legado.dom.selectAllTexts(dataItems[i], 'a');
      if (kinds.length) kind = kinds.join(',');
    }
    if (text.indexOf('更新') !== -1 || text.indexOf('集') !== -1) {
      lastChapter = text.replace(/^[^\d]*/, '').replace(/^\s+|\s+$/g, '');
      if (!lastChapter) lastChapter = text.replace(/^\s+|\s+$/g, '');
    }
  }

  if (!kind) {
    var kindLinks = legado.dom.selectAllTexts(doc, '.myui-content__detail a[href*="/class/"]');
    if (kindLinks.length) kind = kindLinks.join(',');
  }

  if (!lastChapter) {
    lastChapter = legado.dom.selectText(doc, '.pic-text') || legado.dom.selectText(doc, '.text-right') || '';
  }

  legado.dom.free(doc);
  legado.log('[bookInfo] name=' + name + ', author=' + author);
  return {
    name: name.replace(/^\s+|\s+$/g, ''),
    author: author,
    coverUrl: absUrl(coverUrl),
    intro: intro.replace(/^\s+|\s+$/g, ''),
    kind: kind,
    lastChapter: lastChapter,
    tocUrl: bookUrl
  };
}

// ─── chapterList ───────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] tocUrl=' + tocUrl);
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 线路标签页：.module-tab-item，文本如 "Laoz207"，去掉末尾数字
  var tabEls = legado.dom.selectAll(doc, '.module-tab-item');
  var routeNames = [];
  for (var i = 0; i < tabEls.length; i++) {
    var tabText = (legado.dom.text(tabEls[i]) || '').replace(/^\s+|\s+$/g, '');
    var routeName = tabText.replace(/\s*\d+\s*$/, '').replace(/^\s+|\s+$/g, '');
    if (routeName) routeNames.push(routeName);
  }
  legado.log('[chapterList] routes=' + JSON.stringify(routeNames));

  // 集数列表容器：.module-play-list
  var listContainers = legado.dom.selectAll(doc, '.module-play-list');
  legado.log('[chapterList] containers=' + listContainers.length);

  var idMatch = tocUrl.match(/\/v\/(\d+)\.html/);
  var animeId = idMatch ? idMatch[1] : '';

  var chapters = [];
  var seenUrls = {};

  if (listContainers.length > 0 && routeNames.length > 0) {
    for (var r = 0; r < listContainers.length && r < routeNames.length; r++) {
      var links = legado.dom.selectAll(listContainers[r], 'a');
      for (var i = 0; i < links.length; i++) {
        var href = legado.dom.attr(links[i], 'href') || '';
        if (!href || href === 'javascript:;' || href === '#') continue;
        var fullUrl = absUrl(href);
        if (seenUrls[fullUrl]) continue;
        seenUrls[fullUrl] = true;
        var episodeName = (legado.dom.text(links[i]) || '').replace(/^\s+|\s+$/g, '');
        if (!episodeName) episodeName = '第' + (i + 1) + '集';
        chapters.push({ name: episodeName, url: fullUrl, group: routeNames[r] });
      }
    }
  } else {
    var allLinks = legado.dom.selectAll(doc, '.module-play-list a');
    if (!allLinks.length) allLinks = legado.dom.selectAll(doc, '#playlist a');
    for (var i = 0; i < allLinks.length; i++) {
      var href = legado.dom.attr(allLinks[i], 'href') || '';
      if (!href || href === 'javascript:;' || href === '#') continue;
      if (href.indexOf('/p/') === -1 && animeId && href.indexOf(animeId) === -1) continue;
      var fullUrl = absUrl(href);
      if (seenUrls[fullUrl]) continue;
      seenUrls[fullUrl] = true;
      var episodeName = (legado.dom.text(allLinks[i]) || '').replace(/^\s+|\s+$/g, '');
      if (!episodeName) episodeName = '第' + (i + 1) + '集';
      chapters.push({ name: episodeName, url: fullUrl });
    }
  }

  legado.dom.free(doc);
  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── chapterContent ────────────────────────────────────────────────────────

function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  // 使用浏览器探测提取视频播放地址
  // 该站点通常将视频数据写入 JS 变量（如 player_aaaa），需要执行页面 JS 才能获取
  var result = legado.browser.run(chapterUrl, [
    // 等待视频播放器加载
    'var maxWait = 15000;',
    'var interval = 300;',
    'var elapsed = 0;',
    '',
    'while (elapsed < maxWait) {',
    '  // 检查常见播放器数据变量',
    '  if (typeof player_aaaa !== "undefined" && player_aaaa && player_aaaa.url) {',
    '    return JSON.stringify({ url: player_aaaa.url, from: player_aaaa.from || "" });',
    '  }',
    '  // 检查 MacPlayer 变量',
    '  if (typeof MacPlayer !== "undefined" && MacPlayer && MacPlayer.PlayUrl) {',
    '    return JSON.stringify({ url: MacPlayer.PlayUrl, from: MacPlayer.From || "" });',
    '  }',
    '  // 检查 iframe 播放器',
    '  var iframe = document.querySelector(".player-box iframe, #playleft iframe, #player iframe");',
    '  if (iframe && iframe.src && iframe.src.indexOf("http") === 0) {',
    '    return JSON.stringify({ iframe: iframe.src });',
    '  }',
    '  // 检查 video 标签',
    '  var video = document.querySelector("video");',
    '  if (video && video.src && video.src.indexOf("http") === 0) {',
    '    return video.src;',
    '  }',
    '  // 检查 source 标签',
    '  var source = document.querySelector("video source");',
    '  if (source && source.src && source.src.indexOf("http") === 0) {',
    '    return source.src;',
    '  }',
    '  await new Promise(function(r) { setTimeout(r, interval); });',
    '  elapsed += interval;',
    '}',
    '',
    '// 最后尝试从页面脚本中正则匹配',
    'var scripts = document.querySelectorAll("script");',
    'for (var i = 0; i < scripts.length; i++) {',
    '  var text = scripts[i].textContent || "";',
    '  // 匹配常见的 URL 模式',
    '  var m3u8 = text.match(/["\']?(https?:\\/\\/[^"\'\\s]+\\.m3u8[^"\'\\s]*)["\']?/);',
    '  if (m3u8) return m3u8[1];',
    '  var mp4 = text.match(/["\']?(https?:\\/\\/[^"\'\\s]+\\.mp4[^"\'\\s]*)["\']?/);',
    '  if (mp4) return mp4[1];',
    '}',
    'return null;'
  ].join('\n'));

  legado.log('[content] raw result=' + (result ? result.substring(0, 200) : 'null'));

  if (!result) return '';

  // 尝试解析 JSON 结果
  try {
    var data = JSON.parse(result);
    if (data.url) {
      var videoUrl = data.url;
      // 处理 URL 编码
      if (videoUrl.indexOf('%') !== -1) {
        try { videoUrl = decodeURIComponent(videoUrl); } catch (e) { /* ignore */ }
      }
      legado.log('[content] video url=' + videoUrl);
      return videoUrl;
    }
    if (data.iframe) {
      // iframe 嵌套，需进一步解析
      legado.log('[content] iframe detected=' + data.iframe);
      return extractFromIframe(data.iframe);
    }
  } catch (e) {
    // 非 JSON，可能是直接的 URL
    var url = result.trim();
    if (url.indexOf('http') === 0) {
      legado.log('[content] direct url=' + url);
      return url;
    }
  }

  return '';
}

/**
 * 从 iframe URL 中提取真实视频地址
 */
function extractFromIframe(iframeUrl) {
  legado.log('[iframe] url=' + iframeUrl);
  var result = legado.browser.run(iframeUrl, [
    'var maxWait = 10000;',
    'var interval = 300;',
    'var elapsed = 0;',
    'while (elapsed < maxWait) {',
    '  var video = document.querySelector("video");',
    '  if (video && video.src && video.src.indexOf("http") === 0) return video.src;',
    '  var source = document.querySelector("video source");',
    '  if (source && source.src && source.src.indexOf("http") === 0) return source.src;',
    '  // 检查 JS 变量中的 m3u8/mp4',
    '  var scripts = document.querySelectorAll("script");',
    '  for (var i = 0; i < scripts.length; i++) {',
    '    var text = scripts[i].textContent || "";',
    '    var m3u8 = text.match(/["\']?(https?:\\/\\/[^"\'\\s]+\\.m3u8[^"\'\\s]*)["\']?/);',
    '    if (m3u8) return m3u8[1];',
    '    var mp4 = text.match(/["\']?(https?:\\/\\/[^"\'\\s]+\\.mp4[^"\'\\s]*)["\']?/);',
    '    if (mp4) return mp4[1];',
    '  }',
    '  await new Promise(function(r) { setTimeout(r, interval); });',
    '  elapsed += interval;',
    '}',
    'return null;'
  ].join('\n'));

  if (result && result.indexOf('http') === 0) {
    legado.log('[iframe] extracted=' + result);
    return result;
  }
  return '';
}

// ─── search ────────────────────────────────────────────────────────────────

function search(keyword, page) {
  if (page > 1) return [];

  legado.log('[search] keyword=' + keyword);

  // 搜索URL格式：/vch/{keyword}.html
  var searchUrl = BASE + '/vch/' + encodeURIComponent(keyword).replace(/%20/g, '+') + '.html';
  legado.log('[search] url=' + searchUrl);

  return legado.http.get(searchUrl).then(function(html) {
    var doc = legado.dom.parse(html);
    var items = legado.dom.selectAll(doc, 'div.module-card-item');
    legado.log('[search] found=' + items.length);
    var results = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var href = legado.dom.selectAttr(item, 'a.module-card-item-poster', 'href') || '';
      if (!href) continue;
      var name = legado.dom.selectText(item, '.module-card-item-title strong')
              || legado.dom.selectText(item, '.module-card-item-title a')
              || legado.dom.selectAttr(item, 'img', 'alt')
              || '';
      var coverUrl = legado.dom.selectAttr(item, 'img', 'data-original')
                   || legado.dom.selectAttr(item, 'img', 'data-src')
                   || legado.dom.selectAttr(item, 'img', 'src')
                   || '';
      var lastChapter = legado.dom.selectText(item, '.module-item-note') || '';
      var bookUrl = href.indexOf('http') === 0 ? href : BASE + href;
      results.push({ name: name, bookUrl: bookUrl, coverUrl: coverUrl, lastChapter: lastChapter });
    }
    return results;
  });
}
