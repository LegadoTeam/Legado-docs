// @name        禁漫天堂
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.cdnhth.club
// @logo        https://cdn-msp.jmapiproxy1.cc/media/logo/round_logo.png
// @type        comic
// @enabled     true
// @tags        漫画,18禁,禁漫,JM
// @description 禁漫天堂（JMComic）移动端 API，提供漫画搜索、详情、目录及图片阅读。图片经服务端分割打乱，阅读时需解密还原。

// ─── 内置测试 ────────────────────────────────────────────────────
async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('MANA', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"MANA"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var cats = await explore(1, '');
    if (!cats || cats.length < 1) return { passed: false, message: '发现页分类为空' };
    var books = await explore(1, cats[0]);
    if (!books || books.length < 1) return { passed: false, message: '发现页 [' + cats[0] + '] 返回为空' };
    return { passed: true, message: '发现页 [' + cats[0] + ']: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 / 常量 ──────────────────────────────────────────────────
var API_DOMAINS = [
  'www.cdnhth.club',
  'www.cdngwc.cc',
  'www.cdngwc.net',
  'www.cdngwc.club',
  'www.cdnhjk.cc'
];
var IMAGE_DOMAINS = [
  'cdn-msp.jmapiproxy1.cc',
  'cdn-msp.jmapiproxy2.cc',
  'cdn-msp2.jmapiproxy2.cc',
  'cdn-msp3.jmapiproxy2.cc',
  'cdn-msp.jmapinodeudzn.net'
];

var APP_VERSION = '2.0.19';
var APP_TOKEN_SECRET = '18comicAPP';
var APP_TOKEN_SECRET_2 = '18comicAPPContent';
var APP_DATA_SECRET = '185Hcomic3PAPP7R';

var SCRAMBLE_220980 = 220980;
var SCRAMBLE_268850 = 268850;
var SCRAMBLE_421926 = 421926;

var UA = 'Mozilla/5.0 (Linux; Android 9; V1938CT Build/PQ3A.190705.11211812; wv) '
       + 'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Safari/537.36';

// ─── 工具函数 ──────────────────────────────────────────────────────

/** 当前 Unix 时间戳（秒） */
function timeStamp() {
  return String(Math.floor(Date.now() / 1000));
}

/** 生成请求 headers（含 token） */
async function apiHeaders(secret) {
  var ts = timeStamp();
  var s = secret || APP_TOKEN_SECRET;
  var token = await legado.md5(ts + s);
  var tokenparam = ts + ',' + APP_VERSION;
  return {
    'Accept-Encoding': 'gzip, deflate',
    'user-agent': UA,
    'token': token,
    'tokenparam': tokenparam
  };
}

/** 图片请求 headers */
function imageHeaders() {
  return {
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'X-Requested-With': 'com.JMComic3.app',
    'Referer': 'https://' + API_DOMAINS[0],
    'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'user-agent': UA
  };
}

/** 解密 API 返回数据（AES-256-ECB） */
async function decryptData(data, ts) {
  var key = await legado.md5(ts + APP_DATA_SECRET);
  return await legado.aesDecrypt(data, key, '', 'ECB');
}

/** 调用 API 并解密返回 JSON 对象 */
async function apiGet(path, params) {
  var ts = timeStamp();
  var token = await legado.md5(ts + APP_TOKEN_SECRET);
  var tokenparam = ts + ',' + APP_VERSION;
  var headers = {
    'Accept-Encoding': 'gzip, deflate',
    'user-agent': UA,
    'token': token,
    'tokenparam': tokenparam
  };

  var url = 'https://' + API_DOMAINS[0] + path;
  if (params) {
    var parts = [];
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
      parts.push(encodeURIComponent(keys[i]) + '=' + encodeURIComponent(params[keys[i]]));
    }
    if (parts.length > 0) url += '?' + parts.join('&');
  }

  legado.log('[apiGet] url=' + url);
  var resp = await legado.http.get(url, headers);

  // 解析 JSON 外壳
  var json;
  try {
    json = JSON.parse(resp);
  } catch (e) {
    legado.log('[apiGet] JSON解析失败: ' + String(e) + ' resp=' + String(resp).substring(0, 200));
    return null;
  }

  if (!json || !json.data) {
    legado.log('[apiGet] 无data字段, code=' + (json ? json.code : 'null'));
    return null;
  }

  // 解密 data 字段
  var decrypted;
  try {
    decrypted = await decryptData(json.data, ts);
  } catch (e) {
    legado.log('[apiGet] 解密失败: ' + String(e));
    return null;
  }

  try {
    return JSON.parse(decrypted);
  } catch (e) {
    legado.log('[apiGet] 解密后JSON解析失败: ' + String(e) + ' text=' + String(decrypted).substring(0, 200));
    return null;
  }
}

/** 获取封面 URL */
function coverUrl(albumId) {
  return 'https://' + IMAGE_DOMAINS[0] + '/media/albums/' + albumId + '_3x4.jpg';
}

/** 获取图片下载域名 */
function imageDomain() {
  return IMAGE_DOMAINS[0];
}

// ─── 搜索 ──────────────────────────────────────────────────────────
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);
  var data = await apiGet('/search', {
    search_query: keyword,
    main_tag: '0',
    page: String(page),
    o: 'mr',
    t: 'a'
  });

  if (!data) return [];

  // 处理直接搜索车号时的重定向
  if (data.redirect_aid) {
    legado.log('[search] 重定向到 album: ' + data.redirect_aid);
    var info = await apiGet('/album', { id: data.redirect_aid });
    if (!info) return [];
    return [{
      name: info.name || '',
      author: (info.author && info.author.length > 0) ? info.author.join(', ') : '',
      coverUrl: coverUrl(data.redirect_aid),
      bookUrl: 'jm://' + data.redirect_aid,
      description: (info.description || '').substring(0, 100)
    }];
  }

  var content = data.content || [];
  legado.log('[search] 结果数: ' + content.length + ' / 总数: ' + (data.total || 0));

  var results = [];
  for (var i = 0; i < content.length; i++) {
    var item = content[i];
    var aid = String(item.id || '');
    if (!aid) continue;
    results.push({
      name: item.name || '',
      author: item.author || '',
      coverUrl: coverUrl(aid),
      bookUrl: 'jm://' + aid,
      description: ''
    });
  }
  return results;
}

// ─── 详情 ──────────────────────────────────────────────────────────
async function bookInfo(bookUrl) {
  var aid = bookUrl.replace('jm://', '');
  legado.log('[bookInfo] aid=' + aid);

  var data = await apiGet('/album', { id: aid });
  if (!data) {
    return { name: '', author: '', coverUrl: '', description: '', tocUrl: bookUrl };
  }

  var authors = '';
  if (data.author) {
    if (typeof data.author === 'string') {
      authors = data.author;
    } else if (data.author.length) {
      authors = data.author.join(', ');
    }
  }

  var tagList = data.tags || [];
  if (typeof tagList === 'string') {
    tagList = tagList.split(/[,\s]+/);
  }

  var actors = data.actors || [];
  var works = data.works || [];
  var desc = (data.description || '').replace(/<[^>]+>/g, '').trim();
  if (tagList.length > 0) desc = '标签: ' + tagList.join(', ') + '\n' + desc;
  if (actors.length > 0) desc = '角色: ' + actors.join(', ') + '\n' + desc;
  if (works.length > 0) desc = '作品: ' + works.join(', ') + '\n' + desc;

  legado.log('[bookInfo] name=' + data.name + ' author=' + authors + ' episodes=' + ((data.series || []).length || '单章'));

  return {
    name: data.name || '',
    author: authors,
    coverUrl: coverUrl(aid),
    description: desc,
    tocUrl: bookUrl,
    latestChapter: ''
  };
}

// ─── 目录 ──────────────────────────────────────────────────────────
async function chapterList(tocUrl) {
  var aid = tocUrl.replace('jm://', '');
  legado.log('[chapterList] aid=' + aid);

  var data = await apiGet('/album', { id: aid });
  if (!data) return [];

  var series = data.series || [];
  var chapters = [];

  if (series.length === 0) {
    // 单章本子
    chapters.push({
      name: data.name || '正篇',
      url: 'jmphoto://' + aid + '/' + aid
    });
  } else {
    // 按 sort 正序排列
    series.sort(function(a, b) { return parseInt(a.sort) - parseInt(b.sort); });
    for (var i = 0; i < series.length; i++) {
      var ep = series[i];
      chapters.push({
        name: ep.name || ('第' + ep.sort + '话'),
        url: 'jmphoto://' + aid + '/' + ep.id
      });
    }
  }

  legado.log('[chapterList] 共 ' + chapters.length + ' 章');
  return chapters;
}

// ─── 正文（图片列表） ──────────────────────────────────────────────
async function chapterContent(chapterUrl) {
  // chapterUrl: jmphoto://albumId/photoId
  var parts = chapterUrl.replace('jmphoto://', '').split('/');
  var albumId = parts[0];
  var photoId = parts[1] || albumId;
  legado.log('[chapterContent] albumId=' + albumId + ' photoId=' + photoId);

  var data = await apiGet('/chapter', { id: photoId });
  if (!data) return JSON.stringify([]);

  var images = data.images || [];
  legado.log('[chapterContent] 图片数: ' + images.length);

  // 获取 scramble_id（从 /chapter_view_template）
  var scrambleId = await fetchScrambleId(photoId);
  legado.log('[chapterContent] scramble_id=' + scrambleId);

  var domain = imageDomain();
  var urls = [];
  for (var i = 0; i < images.length; i++) {
    var imgName = images[i]; // e.g. "00001.webp"
    var imgUrl = 'https://' + domain + '/media/photos/' + photoId + '/' + imgName;

    // 计算分割数，编码到 URL fragment 供 processImage 使用
    // 注意：JM 算法使用 photoId（章节ID）而非 albumId 参与 md5 计算
    var num = await getScrambleNum(scrambleId, photoId, imgName);
    if (num > 0) {
      imgUrl += '#jm_scramble=' + num;
    }

    urls.push(imgUrl);
  }

  return JSON.stringify(urls);
}

// ─── 图片处理回调（每张图片下载后由引擎自动调用） ───────────────────
/**
 * 对下载完成的图片进行解密还原。
 * JM 的图片经过水平分割打乱，需要根据分割数 (num) 将条带重新排列。
 *
 * @param {string} srcHandle - Rust 预解码的图片句柄（如 "I0"）
 * @param {number} pageIndex - 0-based 页码
 * @param {string} imageUrl  - 原始 URL（含 #jm_scramble=num fragment）
 * @returns {string|null} 处理后的图片句柄，返回 null 表示无需处理
 */
function processImage(srcHandle, pageIndex, imageUrl) {
  // 从 URL fragment 提取分割数
  var num = 0;
  var hashIdx = imageUrl.indexOf('#jm_scramble=');
  if (hashIdx !== -1) {
    num = parseInt(imageUrl.substring(hashIdx + 13));
  }

  if (!num || num <= 0) {
    return null; // 无需解密
  }

  legado.log('[processImage] page=' + pageIndex + ' scramble=' + num);

  var w = legado.image.width(srcHandle);
  var h = legado.image.height(srcHandle);

  // 创建目标图片
  var dest = legado.image.create(w, h);

  // JM 解密算法：将打乱的水平条带还原到正确位置
  // 参考 JMComic-Crawler-Python JmImageTool.decode_and_save()
  var over = h % num; // 余数像素
  for (var i = 0; i < num; i++) {
    var move_h = Math.floor(h / num);
    var y_src = h - (move_h * (i + 1)) - over;
    var y_dst = move_h * i;

    if (i === 0) {
      move_h += over;
    } else {
      y_dst += over;
    }

    // 直接区域复制（无需临时句柄，比 crop+paste+free 更快）
    legado.image.copyRegion(srcHandle, dest, 0, y_src, w, move_h, 0, y_dst);
  }

  // 释放源句柄，返回结果句柄（Rust 端直接编码为 JPEG）
  legado.image.free(srcHandle);
  return dest;
}

/** 获取 scramble_id */
async function fetchScrambleId(photoId) {
  var ts = timeStamp();
  var token = await legado.md5(ts + APP_TOKEN_SECRET_2);
  var tokenparam = ts + ',' + APP_VERSION;
  var headers = {
    'Accept-Encoding': 'gzip, deflate',
    'user-agent': UA,
    'token': token,
    'tokenparam': tokenparam
  };

  var url = 'https://' + API_DOMAINS[0] + '/chapter_view_template'
    + '?id=' + photoId
    + '&mode=vertical&page=0&app_img_shunt=1&express=off'
    + '&v=' + ts;

  legado.log('[fetchScrambleId] url=' + url);
  var resp;
  try {
    resp = await legado.http.get(url, headers);
  } catch (e) {
    legado.log('[fetchScrambleId] 请求失败############' );
    legado.log('[fetchScrambleId] 请求失败############' );
    legado.log('[fetchScrambleId] 请求失败############' );
    legado.log('[fetchScrambleId] 请求失败############' );
    legado.log('[fetchScrambleId] 请求失败############' );
    legado.log('[fetchScrambleId] 请求失败: ' + String(e));
    return String(SCRAMBLE_220980);
  }

  var match = /var scramble_id = (\d+);/.exec(resp);
  if (match) {
    return match[1];
  }
  legado.log('[fetchScrambleId] 未匹配到 scramble_id，使用默认值');
  legado.log('[fetchScrambleId] 未匹配到 scramble_id，使用默认值');
  legado.log('[fetchScrambleId] 未匹配到 scramble_id，使用默认值');
  legado.log('[fetchScrambleId] 未匹配到 scramble_id，使用默认值');
  legado.log('[fetchScrambleId] 未匹配到 scramble_id，使用默认值');
  return String(SCRAMBLE_220980);
}

/**
 * 计算图片分割数
 * 参考: JMComic-Crawler-Python JmImageTool.get_num()
 * 注意: 第二个参数为章节 photoId，不是专辑 albumId
 */
async function getScrambleNum(scrambleId, photoId, filename) {
  scrambleId = parseInt(scrambleId);
  photoId = parseInt(photoId);

  // 去掉文件后缀获取纯文件名
  var dotIdx = filename.lastIndexOf('.');
  var fname = dotIdx > 0 ? filename.substring(0, dotIdx) : filename;

  if (photoId < scrambleId) {
    return 0;
  }
  if (photoId < SCRAMBLE_268850) {
    return 10;
  }

  var x = (photoId < SCRAMBLE_421926) ? 10 : 8;
  var s = String(photoId) + fname;
  var md5hex = await legado.md5(s);
  var lastChar = md5hex.charCodeAt(md5hex.length - 1);
  var num = lastChar % x;
  num = num * 2 + 2;
  return num;
}

// ─── 发现页 ────────────────────────────────────────────────────────
var EXPLORE_CATEGORIES = {
  '同人': 'doujin',
  '单本': 'single',
  '短篇': 'short',
  '其他': 'another',
  '韩漫': 'hanman',
  '美漫': 'meiman',
  'Cosplay': 'doujin_cosplay',
  '3D': '3D'
};

async function explore(page, category) {
  legado.log('[explore] page=' + page + ' category=' + (category || '(empty)'));

  // 无分类或未匹配时返回分类名列表
  var catCode = category ? EXPLORE_CATEGORIES[category] : null;
  if (!catCode) {
    var cats = [];
    for (var k in EXPLORE_CATEGORIES) {
      cats.push(k);
    }
    return cats;
  }

  var data = await apiGet('/categories/filter', {
    page: String(page),
    order: '',
    c: catCode,
    o: 'mv'
  });

  if (!data) return [];

  var content = data.content || [];
  legado.log('[explore] ' + category + ' 结果数: ' + content.length);

  var results = [];
  for (var i = 0; i < content.length; i++) {
    var item = content[i];
    var aid = String(item.id || '');
    if (!aid) continue;
    results.push({
      name: item.name || '',
      author: item.author || '',
      coverUrl: coverUrl(aid),
      bookUrl: 'jm://' + aid,
      description: ''
    });
  }
  return results;
}
