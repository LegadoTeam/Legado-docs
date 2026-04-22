// @name        3A小说
// @version     1.1.3
// @author      Legado Tauri
// @url         https://www.aaawz.cc
// @logo        https://www.aaawz.cc/favicon.ico
// @enabled true
// @tags        免费,小说,免费小说,API
// @description 3A小说网（aaawz.cc），免费小说站，JSON API 书源，正文 AES 加密。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    var found = false;
    for (var i = 0; i < results.length; i++) {
      if (results[i].author && results[i].author.indexOf('天蚕土豆') !== -1) { found = true; break; }
    }
    if (!found) return { passed: false, message: '搜索结果中未找到作者包含"天蚕土豆"的条目' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '推荐');
    if (!books || books.length < 1) return { passed: false, message: '发现页返回为空' };
    return { passed: true, message: '发现页返回 ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'https://www.aaawz.cc';
var AES_KEY = '123#2^0@0vm@08.b5%$1[A]1&4115s((';

// ─── LZ-String Base64 解压 ─────────────────────────────────────────────

/**
 * LZ-String decompressFromBase64 的 ES5 实现。
 * 3A小说 API 返回的数据用 LZ-String 压缩后再 base64 编码。
 */
function decompressFromBase64(input) {
  if (input === null || input === undefined) return '';
  if (input === '') return null;

  var base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var lookup = {};
  for (var ci = 0; ci < base64Chars.length; ci++) {
    lookup[base64Chars.charAt(ci)] = ci;
  }

  function getValue(ch) { return lookup[ch]; }

  // 内部通用解压器
  var dictionary = [];
  var dictSize = 4;
  var bits = 3;
  var result = [];
  var data = { val: getValue(input.charAt(0)), position: 32, index: 1 };
  var length = input.length;

  // 读 n 位
  function readBits(n) {
    var res = 0;
    var maxPower = 1 << n;
    var power = 1;
    while (power !== maxPower) {
      var bit = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = 32;
        if (data.index >= length) return -1;
        data.val = getValue(input.charAt(data.index++));
      }
      res |= (bit > 0 ? 1 : 0) * power;
      power <<= 1;
    }
    return res;
  }

  // 读初始控制码
  var ctrl = readBits(2);
  var next;
  if (ctrl === 0) {
    next = String.fromCharCode(readBits(8));
  } else if (ctrl === 1) {
    next = String.fromCharCode(readBits(16));
  } else {
    return '';
  }

  dictionary[0] = '';
  dictionary[1] = '';
  dictionary[2] = '';
  dictionary[3] = next;
  var w = next;
  result.push(next);

  while (data.index <= length) {
    var code = readBits(bits);
    if (code === -1 || (data.index > length && code === 0)) break;

    var entry;
    if (code === 0) {
      // 新 8 位字符
      var ch8 = readBits(8);
      if (ch8 === -1) break;
      dictionary[dictSize++] = String.fromCharCode(ch8);
      code = dictSize - 1;
    } else if (code === 1) {
      // 新 16 位字符
      var ch16 = readBits(16);
      if (ch16 === -1) break;
      dictionary[dictSize++] = String.fromCharCode(ch16);
      code = dictSize - 1;
    } else if (code === 2) {
      // 结束
      break;
    }

    if (dictSize - 1 >= (1 << bits) - 1) bits++;

    if (dictionary[code] !== undefined) {
      entry = dictionary[code];
    } else if (code === dictSize) {
      entry = w + w.charAt(0);
    } else {
      return null;
    }

    result.push(entry);
    dictionary[dictSize++] = w + entry.charAt(0);
    w = entry;

    if (dictSize - 1 >= (1 << bits) - 1) bits++;
  }

  return result.join('');
}

/**
 * 解析 API 响应：先 LZ 解压，再 JSON.parse
 */
function parseApiResponse(raw) {
  var json = decompressFromBase64(raw);
  if (!json) return null;
  return JSON.parse(json);
}

// ─── 工具 ────────────────────────────────────────────────────────────────

function buildCoverUrl(tid, siteid) {
  if (!tid) return '';
  var tidNum = parseInt(tid, 10);
  return BASE + '/bookimg/' + siteid + '/' + (tidNum % 100) + '/' + tid + '.jpg';
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  var url = BASE + '/api-search';
  var body = 'keyword=' + encodeURIComponent(keyword) + '&page=' + (page || 1) + '&size=10';
  var raw = await legado.http.post(url, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': BASE + '/',
  });

  var resp = parseApiResponse(raw);
  if (!resp || !resp.data || !resp.data.books) return [];

  var booksArr = resp.data.books;
  var books = [];
  for (var i = 0; i < booksArr.length; i++) {
    var b = booksArr[i];
    var name = (b.articlename || '').replace(/<\/?em>/g, '');
    var author = (b.author || '').replace(/<\/?em>/g, '');
    books.push({
      name: name,
      author: author,
      bookUrl: BASE + '/api-info-' + b.tid + '-' + b.siteid,
      coverUrl: buildCoverUrl(b.tid, b.siteid),
      lastChapter: b.lastchapter || '',
      kind: '',
    });
  }

  legado.log('[search] found=' + books.length);
  return books;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var raw = await legado.http.get(bookUrl, {
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': BASE + '/',
  });

  var resp = parseApiResponse(raw);
  if (!resp) return { name: '', author: '', coverUrl: '', intro: '', lastChapter: '', kind: '', tocUrl: bookUrl };

  // 从 URL 提取 tid 和 siteid
  var urlMatch = bookUrl.match(/api-info-(\d+)-(\d+)/);
  var tid = urlMatch ? urlMatch[1] : (resp.tid || '');
  var siteid = urlMatch ? urlMatch[2] : (resp.siteid || '');

  return {
    name: resp.articlename || '',
    author: resp.author || '',
    coverUrl: resp.imgurl || buildCoverUrl(tid, siteid),
    intro: resp.intro || '',
    lastChapter: resp.lastchapter || '',
    kind: '',
    tocUrl: BASE + '/api-chapterlist-' + tid + '-' + siteid,
  };
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);

  var raw = await legado.http.get(tocUrl, {
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': BASE + '/',
  });

  var resp = parseApiResponse(raw);
  if (!resp || !Array.isArray(resp)) return [];

  // 从 URL 提取 tid 和 siteid 用于构造章节内容 URL
  var urlMatch = tocUrl.match(/api-chapterlist-(\d+)-(\d+)/);
  var tid = urlMatch ? urlMatch[1] : '';
  var siteid = urlMatch ? urlMatch[2] : '';

  var chapters = [];
  for (var i = 0; i < resp.length; i++) {
    var ch = resp[i];
    chapters.push({
      name: ch.title || '',
      url: BASE + '/api-chapter-' + tid + '-' + siteid + '-' + ch.cid,
    });
  }

  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var raw = (await legado.http.get(chapterUrl, {
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': BASE + '/',
  })).replace(/\s/g, '');

  var content = '';

  if (chapterUrl.indexOf('-chapter-') !== -1) {
    // 正文接口协议：响应为 base64( IV[0..16] || AES-CBC-PKCS7密文 )
    // 1. 用 base64ByteSlice 从二进制流中分离 IV 和密文（避免 UTF-8 截断）
    // 2. 用 aesDecryptB64Iv 以 base64 格式传入 IV 做标准 AES-CBC 解密
    // 3. 解密结果再做 LZ-String Base64 解压得到最终正文
    try {
      var ivB64     = legado.base64ByteSlice(raw, 0, 16);
      var cipherB64 = legado.base64ByteSlice(raw, 16);
      var plaintext = await legado.aesDecryptB64Iv(cipherB64, AES_KEY, ivB64, 'CBC');
      content = decompressFromBase64(plaintext.replace(/\s/g, ''));
      if (!content) throw new Error('LZ 解压结果为空');
    } catch (e) {
      legado.log('[content] 正文解密失败: ' + e);
      content = '';
    }
  } else {
    // 非章节接口（理论上不会走到这里）：直接 LZ 解压
    try {
      content = decompressFromBase64(raw) || '';
    } catch (e) {
      legado.log('[content] LZ 解压失败: ' + e);
      content = '';
    }
  }

  // 清理 HTML 标签
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<\/?p[^>]*>/gi, '\n');
  content = content.replace(/<[^>]+>/g, '');
  content = content.replace(/&nbsp;/g, ' ');

  // 按段落拆分并过滤空行
  var lines = content.split('\n');
  var paragraphs = [];
  for (var i = 0; i < lines.length; i++) {
    var text = lines[i].replace(/^\s+|\s+$/g, '');
    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join('\n\n');
}

// ─── 发现页 ──────────────────────────────────────────────────────────────
// 接口：/api-list-{page}，返回按热度排序的书籍数组，无分类过滤。

async function explore(page, category) {
  // category === 'GETALL'：返回分类名列表
  if (!category || category === 'GETALL') {
    return ['推荐'];
  }

  // category === '推荐'：返回热门排行书籍列表（无其他分类）
  var p = page || 1;
  var url = BASE + '/api-list-' + p;
  legado.log('[explore] category=' + category + ' page=' + p + ' url=' + url);

  var raw = await legado.http.get(url, {
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': BASE + '/',
  });

  var resp = parseApiResponse(raw);
  if (!Array.isArray(resp)) return [];

  var books = [];
  for (var i = 0; i < resp.length; i++) {
    var b = resp[i];
    books.push({
      name: b.articlename || '',
      author: b.author || '',
      bookUrl: BASE + '/api-info-' + b.tid + '-' + b.siteid,
      coverUrl: b.imgurl || buildCoverUrl(b.tid, b.siteid),
      lastChapter: b.lastchapter || '',
      kind: '',
    });
  }

  legado.log('[explore] found=' + books.length);
  return books;
}
