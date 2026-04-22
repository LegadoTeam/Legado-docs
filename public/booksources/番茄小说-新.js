// @name        番茄小说-新
// @version     1.1.0
// @author      Legado Tauri
// @url         https://fanqienovel.com
// @logo        https://fanqienovel.com/favicon.ico
// @enabled     true
// @tags        免费,小说,免费小说,书架同步,浏览器
// @description 番茄小说账号书架版。通过浏览器探测登录账号并同步书架；搜索/分类发现/正文通过签名 API 获取。
//              发现页：📚 我的书架、🔑 账号管理、玄幻/仙侠/都市/… 分类榜单、⚙ 设置

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '玄幻');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [玄幻] 返回为空' };
    return { passed: true, message: '发现页 [玄幻]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ─────────────────────────────────────────────────────────────────

var FANQIE_HOST = "https://fanqienovel.com";
var API_HOST = "https://reading.snssdk.com";
var SIGN_HOST = "https://sg.mgz.la";
var SIGN_USER = "fq0329";
var SIGN_AUTH = "1337b73b7ddf1ed88d0d31a6bd6b2ee6db15f2b8";
var CONTENT_URLS = ["https://gofq.52dns.cc", "https://pyfq.52dns.cc"];

// ─── 设置管理 ─────────────────────────────────────────────────────────────

var DEFAULT_SETTINGS = {
  gender: "",     // 偏好: '' = 不限, '1' = 男生, '0' = 女生
  algo: "204",    // 榜单: 204=新书榜, 101=推荐榜, 100=完本榜, 200=巅峰榜, 103=热搜榜, 601=短篇榜, 156=抖音榜
  limit: "30",    // 每页数量
  contentProxy: "0", // 内容代理: '0'=gofq优先, '1'=pyfq优先
};

function loadSettings() {
  var raw = legado.config.read("booksource", "fanqie_settings");
  if (!raw) return DEFAULT_SETTINGS;
  try {
    var s = JSON.parse(raw);
    return {
      gender: s.gender !== undefined ? s.gender : DEFAULT_SETTINGS.gender,
      algo: s.algo || DEFAULT_SETTINGS.algo,
      limit: s.limit || DEFAULT_SETTINGS.limit,
      contentProxy: s.contentProxy !== undefined ? s.contentProxy : DEFAULT_SETTINGS.contentProxy,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * 浏览器探测会话 role：同书源内所有调用复用同一个持久 WebView 窗口，
 * 确保登录 cookie 在各次 explore/fetch 调用间保持有效。
 */
var BROWSER_ROLE = "fanqie_web";

// ─── 设备管理（签名 API 专用） ─────────────────────────────────────────────

function randomHex(n) {
  var chars = "0123456789abcdef";
  var result = "";
  for (var i = 0; i < n; i++) {
    result += chars.charAt(Math.floor(Math.random() * 16));
  }
  return result;
}

function formatTimestamp(ts) {
  var d = new Date(ts);
  var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
  );
}

function loadDevice() {
  var raw = legado.config.read("booksource", "fanqie_device");
  if (!raw) return null;
  try {
    var dev = JSON.parse(raw);
    if (dev && dev.time && Date.now() - dev.time < 30 * 24 * 60 * 60 * 1000) return dev;
  } catch (e) {}
  return null;
}

function saveDevice(dev) {
  legado.config.write("booksource", "fanqie_device", JSON.stringify(dev));
}

function formatVersion(code) {
  var s = String(code);
  // 63932 → "6.39.3.2"
  var parts = [
    s.substring(0, 1),
    s.substring(1, 3),
    s.substring(3, 4),
    s.substring(4),
  ];
  var result = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(parseInt(parts[i], 10));
  }
  return result.join(".");
}

async function registerDevice() {
  legado.log("[registerDevice] 开始设备注册...");
  var oaid = randomHex(16);
  var udid = randomHex(16);

  var regDevice = {
    oaid: oaid,
    openudid: udid,
    device_brand: "Xiaomi",
    device_model: "MI 9",
    os_api: 30,
    os_version: "11",
    rom_version: "V12.5.7.0.RFACNXM",
    version: "63932",
    version_str: formatVersion("63932"),
    aid: "1967",
    channel: "oppo_1967_64",
    display_name: "番茄免费小说",
    package: "com.dragon.read",
    app_name: "novelapp",
  };

  var buildBody = JSON.stringify({ user: SIGN_USER, auth: SIGN_AUTH, device: regDevice });
  var buildResp = await legado.http.post(
    SIGN_HOST + "/api/device/build-register",
    buildBody,
    { "Content-Type": "application/json" }
  );
  var buildData = JSON.parse(buildResp);
  if (!buildData || !buildData.data) {
    legado.log("[registerDevice] build-register 失败");
    return null;
  }

  var regUrl = buildData.data.url;
  var regBody = buildData.data.options.body;
  var regHeaders = buildData.data.options.headers;
  var device = buildData.data.device;

  var regResp = await legado.http.postBinary(regUrl, regBody, regHeaders);
  var regResult = JSON.parse(regResp);
  if (!regResult || !regResult.device_id_str) {
    legado.log("[registerDevice] device_register 失败: " + regResp);
    return null;
  }

  device.iid = regResult.install_id_str;
  device.device_id = regResult.device_id_str;
  device.device_token = regResult.device_token || "";
  device.klink_egdi = regResult.klink_egdi || "";
  device.time = Date.now();

  var actBody = JSON.stringify({ user: SIGN_USER, auth: SIGN_AUTH, device: device });
  var actResp = await legado.http.post(
    SIGN_HOST + "/api/device/build-activate",
    actBody,
    { "Content-Type": "application/json" }
  );
  var actData = JSON.parse(actResp);
  if (actData && actData.data && actData.data.url) {
    var actHeaders = actData.data.options && actData.data.options.headers
      ? actData.data.options.headers : {};
    await legado.http.get(actData.data.url, actHeaders);
  }

  saveDevice(device);
  legado.log("[registerDevice] 注册完成, device_id=" + device.device_id);
  return device;
}

async function getDevice() {
  var dev = loadDevice();
  if (dev) return dev;
  return await registerDevice();
}

// ─── 签名请求（APP API 使用） ─────────────────────────────────────────────

async function signedApiGet(path, params) {
  var device = await getDevice();
  if (!device) {
    legado.log("[signedApiGet] 无法获取设备信息");
    return null;
  }

  var fullUrl = API_HOST + path + (params || "");
  var paramsObj = {};
  if (params) {
    var pairs = params.split("&");
    for (var i = 0; i < pairs.length; i++) {
      var eqIdx = pairs[i].indexOf("=");
      if (eqIdx > 0) {
        var key = pairs[i].substring(0, eqIdx);
        var val = pairs[i].substring(eqIdx + 1);
        try { paramsObj[key] = decodeURIComponent(val); } catch (e) { paramsObj[key] = val; }
      }
    }
  }

  var signBody = JSON.stringify({
    user: SIGN_USER,
    auth: SIGN_AUTH,
    url: fullUrl,
    params: paramsObj,
    device: device,
    body: null,
    cookie: "",
    header: null,
  });
  var signResp = await legado.http.post(
    SIGN_HOST + "/api/sign",
    signBody,
    { "Content-Type": "application/json" }
  );
  var signData = JSON.parse(signResp);
  if (!signData || !signData.data) {
    legado.log("[signedApiGet] 签名失败: " + signResp);
    return null;
  }

  var resp = await legado.http.get(signData.data.url, signData.data.options.headers || {});
  return JSON.parse(resp);
}

// ─── 浏览器探测辅助 ────────────────────────────────────────────────────────

/**
 * 获取（或复用）持久 WebView 会话。
 * 同一 BROWSER_ROLE 在同一书源内始终复用同一个窗口，cookie 持久有效。
 */
function getSession(visible) {
  return legado.browser.acquire(BROWSER_ROLE, { visible: visible === true });
}

/**
 * 确保 WebView 当前页面在 fanqienovel.com 域内。
 * 如果不是则导航到首页，避免 fetch 因同源限制或 cookie 丢失而失败。
 */
function ensureOnFanqie(session) {
  var curUrl = "";
  try { curUrl = legado.browser.url(session); } catch (e) {}
  if (curUrl.indexOf("fanqienovel.com") < 0) {
    legado.browser.navigate(session, FANQIE_HOST, { timeout: 20 });
  }
}

// ─── 书架获取 ─────────────────────────────────────────────────────────────

/**
 * 通过浏览器探测同步用户书架。
 * 流程：
 *   1. 调用 /api/reader/book/progress 获取书架中所有 book_id
 *   2. 分批 POST 到 /api/book/simple/info 获取书籍详情
 * 返回标准 BookItem 数组，bookUrl 格式兼容 bookInfo / chapterList。
 */
function fetchBookshelf() {
  legado.log("[fetchBookshelf] 开始获取书架...");

  var session;
  try {
    session = getSession(false);
    ensureOnFanqie(session);
  } catch (e) {
    legado.log("[fetchBookshelf] 浏览器会话失败: " + e);
    return [];
  }

  // Step 1: 获取阅读进度（包含所有 book_id）
  var progressStr;
  try {
    progressStr = legado.browser.eval(
      session,
      "return JSON.stringify(await (await fetch('/api/reader/book/progress', {credentials:'include'})).json())",
      { timeout: 25 }
    );
  } catch (e) {
    legado.log("[fetchBookshelf] 获取进度失败: " + e);
    return [];
  }

  if (!progressStr) {
    legado.log("[fetchBookshelf] progress API 无响应，可能未登录");
    return [];
  }

  var progress;
  try {
    progress = JSON.parse(progressStr);
  } catch (e) {
    legado.log("[fetchBookshelf] progress JSON 解析失败: " + progressStr.substring(0, 200));
    return [];
  }

  if (!progress || progress.code !== 0) {
    var code = progress ? String(progress.code) : "null";
    legado.log("[fetchBookshelf] 未登录或 API 错误, code=" + code);
    return [];
  }

  var items = progress.data || [];
  if (!items.length) {
    legado.log("[fetchBookshelf] 书架为空");
    return [];
  }

  // 提取 book_id，去重
  var bookIds = [];
  var seenIds = {};
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item && item.book_id && !seenIds[item.book_id]) {
      seenIds[item.book_id] = true;
      bookIds.push(String(item.book_id));
    }
  }
  if (!bookIds.length) return [];

  legado.log("[fetchBookshelf] 共 " + bookIds.length + " 本书，批量获取详情...");

  // Step 2: 分批获取书籍详情（每批最多 100 本）
  // 注意：body 使用 btoa 编码传递，避免引号转义导致 eval 语法错误
  var allBooks = [];
  var batchSize = 100;

  for (var start = 0; start < bookIds.length; start += batchSize) {
    var batch = [];
    for (var bi = start; bi < bookIds.length && bi < start + batchSize; bi++) {
      batch.push(bookIds[bi]);
    }

    var bodyStr = JSON.stringify({ book_ids: batch });
    var encoded = btoa(bodyStr);
    var evalCode = "var b=atob('" + encoded + "');return JSON.stringify(await (await fetch('/api/book/simple/info',{method:'POST',headers:{'Content-Type':'application/json'},body:b})).json())";

    var infoStr;
    try {
      infoStr = legado.browser.eval(session, evalCode, { timeout: 30 });
    } catch (e) {
      legado.log("[fetchBookshelf] 批次 " + start + " eval 失败: " + e);
      continue;
    }
    if (!infoStr) continue;

    var info;
    try {
      info = JSON.parse(infoStr);
    } catch (e) {
      legado.log("[fetchBookshelf] 批次 " + start + " JSON 解析失败");
      continue;
    }

    if (!info || info.code !== 0) {
      legado.log("[fetchBookshelf] 批次 " + start + " API 错误, code=" + (info ? info.code : "null"));
      continue;
    }

    // 实际响应结构：{ data: { bookList: [...] }, code: 0 }
    var bookList = info.data && info.data.bookList ? info.data.bookList : null;
    if (!bookList || !bookList.length) {
      legado.log("[fetchBookshelf] 批次 " + start + " bookList 为空");
      continue;
    }

    for (var j = 0; j < bookList.length; j++) {
      var b = bookList[j];
      if (!b || !b.book_id) continue;

      allBooks.push({
        name: b.book_name || "",
        author: b.author || "",
        bookUrl: API_HOST + "/reading/bookapi/detail/v/?book_id=" + b.book_id,
        coverUrl: b.thumb_url || "",
        lastChapter: "",
        kind: b.genre || "",
      });
    }
  }

  legado.log("[fetchBookshelf] 返回 " + allBooks.length + " 本书");
  return allBooks;
}

// ─── 登录管理回调（HTML 页通过 legado.callSource 调用） ────────────────────

/**
 * 检测当前浏览器探测会话的登录状态。
 * 调用书架进度 API：code=0 且有 data 即为已登录。
 * @returns {string} JSON 字符串 { loggedIn, bookCount, message }
 */
function checkLoginStatus() {
  legado.log("[checkLoginStatus] 检测登录状态...");

  var session;
  try {
    session = getSession(false);
    ensureOnFanqie(session);
  } catch (e) {
    return JSON.stringify({ loggedIn: false, message: "浏览器探测不可用: " + String(e) });
  }

  var resultStr;
  try {
    resultStr = legado.browser.eval(
      session,
      "return JSON.stringify(await (await fetch('/api/reader/book/progress', {credentials:'include'})).json())",
      { timeout: 20 }
    );
  } catch (e) {
    return JSON.stringify({ loggedIn: false, message: "检测请求失败: " + String(e) });
  }

  if (!resultStr) {
    return JSON.stringify({ loggedIn: false, message: "API 无响应，请先打开登录窗口完成登录" });
  }

  try {
    var result = JSON.parse(resultStr);
    var loggedIn = result && result.code === 0;
    var bookCount = loggedIn && result.data ? result.data.length : 0;
    return JSON.stringify({
      loggedIn: loggedIn,
      bookCount: bookCount,
      message: loggedIn
        ? "✅ 已登录，书架共 " + bookCount + " 本书"
        : "❌ 未登录（code=" + (result ? result.code : "null") + "），请打开登录窗口完成登录",
    });
  } catch (e) {
    return JSON.stringify({ loggedIn: false, message: "解析失败: " + String(e) });
  }
}

/**
 * 打开可见浏览器窗口并导航到番茄小说首页，供用户手动登录。
 * @returns {string} 操作结果描述
 */
function openLoginBrowser() {
  legado.log("[openLoginBrowser] 打开登录窗口...");
  try {
    // 先以隐藏模式获取（复用）会话，再显式 show —— 确保无论会话是新建还是复用都一定可见
    var session = legado.browser.acquire(BROWSER_ROLE, { visible: false });
    legado.browser.navigate(session, FANQIE_HOST, { timeout: 20 });
    legado.browser.show(session);
    return "已打开登录窗口，请在弹出的浏览器中完成登录后点击\"关闭浏览器\"";
  } catch (e) {
    return "打开失败（浏览器探测可能已禁用）: " + String(e);
  }
}

/**
 * 隐藏浏览器探测窗口（登录完成后使用）。
 * @returns {string} 操作结果描述
 */
function closeLoginBrowser() {
  try {
    var session = getSession(false);
    legado.browser.hide(session);
    return "已隐藏浏览器窗口";
  } catch (e) {
    return "操作失败: " + String(e);
  }
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log("[search] keyword=" + keyword + " page=" + page);

  var offset = ((page || 1) - 1) * 30;
  var encodedKw = encodeURIComponent(keyword);
  var params = "tab_type=3&query=" + encodedKw + "&passback=" + offset;

  var data = await signedApiGet("/reading/bookapi/search/tab/v/?", params);
  if (!data || data.code !== 0) {
    legado.log("[search] API 返回错误: " + (data ? data.code : "null"));
    return [];
  }

  var tabs = data.search_tabs || [];
  var books = [];
  var seenIds = {};

  for (var t = 0; t < tabs.length; t++) {
    var tab = tabs[t];
    if (tab.title !== "书籍" && tab.title !== "综合") continue;
    var items = tab.data || tab.book_data || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var bd = item.book_data;
      var b = bd && bd.length > 0 ? bd[0] : item;
      if (!b || !b.book_id || seenIds[b.book_id]) continue;
      seenIds[b.book_id] = true;

      var bookName = (b.book_name || "").replace(/<\/?em>/g, "");
      var author = (b.author || "").replace(/<\/?em>/g, "");
      if (!bookName) continue;

      books.push({
        name: bookName,
        author: author,
        bookUrl: API_HOST + "/reading/bookapi/detail/v/?book_id=" + b.book_id,
        coverUrl: b.thumb_url || "",
        lastChapter: "",
        kind: b.category || "",
      });
    }
  }

  legado.log("[search] found=" + books.length);
  return books;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log("[bookInfo] url=" + bookUrl);

  var m = bookUrl.match(/book_id=(\d+)/);
  if (!m) {
    legado.log("[bookInfo] 无法提取 book_id");
    return { name: "", author: "", coverUrl: "", intro: "", lastChapter: "", kind: "", tocUrl: bookUrl };
  }
  var bookId = m[1];

  var data = await signedApiGet("/reading/bookapi/detail/v/?", "book_id=" + bookId);
  if (!data || data.code !== 0 || !data.data) {
    legado.log("[bookInfo] API 返回错误");
    return { name: "", author: "", coverUrl: "", intro: "", lastChapter: "", kind: "", tocUrl: bookUrl };
  }

  var d = data.data;
  var kindParts = [];
  if (d.creation_status === 0) kindParts.push("连载");
  else if (d.creation_status === 1) kindParts.push("完结");
  if (d.category) kindParts.push(d.category);
  if (d.tags) kindParts.push(d.tags);
  if (d.score && d.score > 0) kindParts.push(d.score + "分");

  return {
    name: d.book_name || "",
    author: d.author || "",
    coverUrl: d.thumb_url || "",
    intro: d.abstract || "",
    lastChapter: d.last_chapter_title || "",
    kind: kindParts.join(","),
    tocUrl: FANQIE_HOST + "/api/reader/directory/detail?bookId=" + bookId,
  };
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);

  // 兼容：若传入的是 detail API URL（含 book_id=），重定向到目录接口
  var bookIdInUrl = tocUrl.match(/book_id=(\d+)/);
  if (bookIdInUrl) {
    tocUrl = FANQIE_HOST + "/api/reader/directory/detail?bookId=" + bookIdInUrl[1];
    legado.log("[chapterList] 重定向到目录接口: " + tocUrl);
  }

  var resp = await legado.http.get(tocUrl, {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  var data = JSON.parse(resp);

  if (!data || !data.data) {
    legado.log("[chapterList] API 返回空数据");
    return [];
  }

  var chapters = [];
  var volumeList = data.data.chapterListWithVolume;

  if (volumeList && volumeList.length > 0) {
    for (var vi = 0; vi < volumeList.length; vi++) {
      var vol = volumeList[vi];
      for (var ci = 0; ci < vol.length; ci++) {
        var ch = vol[ci];
        chapters.push({
          name: ch.title || "第" + (chapters.length + 1) + "章",
          url: ch.itemId || "",
        });
      }
    }
  } else {
    var ids = data.data.allItemIds || [];
    for (var i = 0; i < ids.length; i++) {
      chapters.push({ name: "第" + (i + 1) + "章", url: ids[i] });
    }
  }

  legado.log("[chapterList] total=" + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log("[chapterContent] itemId=" + chapterUrl);

  var itemId = chapterUrl;
  var content = "";

  // 根据设置决定代理服务器顺序
  var settings = loadSettings();
  var urls = CONTENT_URLS.slice();
  if (settings.contentProxy === "1" && urls.length >= 2) {
    var tmp = urls[0]; urls[0] = urls[1]; urls[1] = tmp;
  }

  for (var ci = 0; ci < urls.length; ci++) {
    try {
      var url = urls[ci] + "/content?item_id=" + itemId;
      var resp = await legado.http.get(url);
      var data = JSON.parse(resp);
      if (data && data.data && data.data.content) {
        content = data.data.content;
        break;
      }
    } catch (e) {
      legado.log("[chapterContent] 代理 " + ci + " 失败: " + e);
    }
  }

  if (!content) {
    legado.log("[chapterContent] 所有代理均失败");
    return "";
  }

  return extractContent(content);
}

/**
 * 从 XHTML 格式的章节内容中提取纯文本段落
 */
function extractContent(html) {
  var text = html
    .replace(/<\?xml[^?]*\?>\s*/g, "")
    .replace(/<!DOCTYPE[^>]*>\s*/g, "")
    .replace(/<\/?html[^>]*>/g, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/g, "")
    .replace(/<\/?body[^>]*>/g, "");

  text = text.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, "");
  text = text.replace(/<tt_keyword_ad[\s\S]*?<\/tt_keyword_ad>/g, "");

  var paragraphs = [];
  var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  var match;
  while ((match = pRegex.exec(text)) !== null) {
    var pText = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim();
    if (pText) paragraphs.push(pText);
  }

  if (paragraphs.length === 0) {
    text = text.replace(/<[^>]+>/g, "").trim();
    if (text) paragraphs.push(text);
  }

  return paragraphs.join("\n\n");
}

// ─── 发现页 ───────────────────────────────────────────────────────────────

var GENDER_MAP = {
  "玄幻": 1, "仙侠": 1, "都市": 1, "历史": 1, "科幻": 1,
  "悬疑": 1, "游戏": 1, "女频": 0, "现言": 0, "古言": 0,
  "幻想": 0, "短篇": 1, "出版": 2,
};

var FEMALE_ONLY = { "女频": 1, "现言": 1, "古言": 1, "幻想": 1 };

async function explore(page, category) {
  legado.log("[explore] page=" + page + " category=" + (category || ""));

  if (!category || category === "GETALL") {
    return [
      "📚 我的书架",
      "🔑 账号管理",
      "玄幻", "仙侠", "都市", "历史", "科幻", "悬疑", "游戏",
      "女频", "现言", "古言", "幻想", "短篇", "出版",
      "⚙ 设置",
    ];
  }

  if (category === "📚 我的书架") {
    if ((page || 1) > 1) return [];
    return fetchBookshelf();
  }

  if (category === "🔑 账号管理") {
    return buildLoginHtml();
  }

  if (category === "⚙ 设置") {
    return buildSettingsHtml();
  }

  // ── 标准分类榜单 ────────────────────────────────────────────────────────
  var settings = loadSettings();
  var gender = GENDER_MAP[category] !== undefined ? GENDER_MAP[category] : 1;
  if (settings.gender && !FEMALE_ONLY[category] && category !== "出版") {
    gender = parseInt(settings.gender, 10);
  }

  var limit = parseInt(settings.limit, 10) || 30;
  var offset = ((page || 1) - 1) * limit;
  var algo = settings.algo || "204";

  var params = [
    "gender_list_type=" + gender,
    "algo_type=" + algo,
    "change_type=1",
    "cell_id=7098235271900037133",
    "limit=" + limit,
    "gender=" + gender,
    "offset=" + offset,
  ].join("&");

  var data = await signedApiGet("/reading/bookapi/bookmall/cell/change/v1/?", params);
  if (!data || data.code !== 0 || !data.data) {
    legado.log("[explore] API 返回错误");
    return [];
  }

  var cellView = data.data.cell_view || {};
  var items = cellView.book_data || [];
  var books = [];

  for (var i = 0; i < items.length; i++) {
    var b = items[i];
    if (!b.book_id) continue;
    books.push({
      name: b.book_name || "",
      author: b.author || "",
      bookUrl: API_HOST + "/reading/bookapi/detail/v/?book_id=" + b.book_id,
      coverUrl: b.thumb_url || "",
      lastChapter: "",
      kind: b.category || "",
    });
  }

  legado.log("[explore] found=" + books.length);
  return books;
}

// ─── 设置页 HTML ──────────────────────────────────────────────────────────

function buildSettingsHtml() {
  var defaultsJson = JSON.stringify(DEFAULT_SETTINGS);

  var content = html`
<div class="settings-root">

  <div class="card mb-sm">
    <label class="card-title">阅读偏好</label>
    <div class="flex flex-wrap gap-sm">
      <button class="pref-btn" data-key="gender" data-val="">不限</button>
      <button class="pref-btn" data-key="gender" data-val="1">男生</button>
      <button class="pref-btn" data-key="gender" data-val="0">女生</button>
    </div>
    <p class="text-sm text-secondary mt-sm">影响混合分类（玄幻/仙侠/都市等）的推荐内容</p>
  </div>

  <div class="card mb-sm">
    <label class="card-title">推荐榜单</label>
    <div class="flex flex-wrap gap-sm">
      <button class="pref-btn" data-key="algo" data-val="101">推荐榜</button>
      <button class="pref-btn" data-key="algo" data-val="100">完本榜</button>
      <button class="pref-btn" data-key="algo" data-val="200">巅峰榜</button>
      <button class="pref-btn" data-key="algo" data-val="103">热搜榜</button>
      <button class="pref-btn" data-key="algo" data-val="204">新书榜</button>
      <button class="pref-btn" data-key="algo" data-val="601">短篇榜</button>
      <button class="pref-btn" data-key="algo" data-val="156">抖音榜</button>
    </div>
    <p class="text-sm text-secondary mt-sm">决定各分类下展示的排行方式</p>
  </div>

  <div class="card mb-sm">
    <label class="card-title">每页数量</label>
    <div class="flex flex-wrap gap-sm">
      <button class="pref-btn" data-key="limit" data-val="20">20</button>
      <button class="pref-btn" data-key="limit" data-val="30">30</button>
      <button class="pref-btn" data-key="limit" data-val="50">50</button>
    </div>
  </div>

  <div class="card mb-sm">
    <label class="card-title">正文代理服务器</label>
    <div class="flex flex-wrap gap-sm">
      <button class="pref-btn" data-key="contentProxy" data-val="0">gofq 优先</button>
      <button class="pref-btn" data-key="contentProxy" data-val="1">pyfq 优先</button>
    </div>
    <p class="text-sm text-secondary mt-sm">章节正文获取服务器的优先顺序</p>
  </div>

  <div class="card mb-sm">
    <label class="card-title">设备与缓存</label>
    <div class="flex gap-sm">
      <button onclick="resetDevice()" style="flex:1;">重新注册设备</button>
      <button onclick="showDeviceInfo()" style="flex:1;">查看设备信息</button>
    </div>
  </div>

  <div id="device-info" class="card mb-sm" style="display:none; grid-column:1/-1;">
    <pre id="device-info-content" class="text-sm" style="white-space:pre-wrap; word-break:break-all;"></pre>
  </div>

</div>

<style>
  .settings-root {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }
  @media (min-width: 560px) {
    .settings-root {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .settings-root > h2 { grid-column: 1 / -1; }
  }
  .card-title {
    font-weight: 600;
    display: block;
    margin-bottom: 6px;
  }
  .pref-btn { transition: all 0.15s; }
  .pref-btn.active {
    background: var(--primary) !important;
    border-color: var(--primary) !important;
    color: #fff !important;
  }
</style>

<script>
var currentSettings = {};
var DEFAULTS = ${defaultsJson};

async function init() {
  try {
    var raw = await legado.callSource("getSettings");
    currentSettings = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch(e) {
    currentSettings = Object.assign({}, DEFAULTS);
  }
  updateUI();
}

function updateUI() {
  document.querySelectorAll(".pref-btn").forEach(function(btn) {
    var key = btn.getAttribute("data-key");
    var val = btn.getAttribute("data-val");
    var current = currentSettings[key] !== undefined ? String(currentSettings[key]) : (DEFAULTS[key] || "");
    btn.classList.toggle("active", val === current);
  });
}

document.addEventListener("click", async function(e) {
  var btn = e.target.closest(".pref-btn");
  if (!btn) return;
  var key = btn.getAttribute("data-key");
  var val = btn.getAttribute("data-val");
  currentSettings[key] = val;
  updateUI();
  try {
    await legado.callSource("saveSettings", JSON.stringify(currentSettings));
    legado.toast("已保存: " + btn.textContent.trim(), "success");
  } catch(e) {
    legado.toast("保存失败: " + e.message, "error");
  }
});

async function resetDevice() {
  var btn = document.querySelector("[onclick*=resetDevice]");
  if (!btn._confirm) {
    btn._confirm = true;
    btn.textContent = "⚠ 确定重置？再次点击确认";
    btn.style.borderColor = "var(--primary)";
    setTimeout(function() { btn._confirm = false; btn.textContent = "重新注册设备"; btn.style.borderColor = ""; }, 3000);
    return;
  }
  btn._confirm = false;
  btn.textContent = "重新注册设备";
  btn.style.borderColor = "";
  try {
    await legado.callSource("resetDeviceInfo");
    legado.toast("设备信息已清除，下次请求时将自动重新注册", "success");
  } catch(e) {
    legado.toast("清除失败: " + e.message, "error");
  }
}

async function showDeviceInfo() {
  var el = document.getElementById("device-info");
  var content = document.getElementById("device-info-content");
  if (el.style.display !== "none") { el.style.display = "none"; return; }
  try {
    var raw = await legado.callSource("getDeviceInfo");
    content.textContent = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  } catch(e) {
    content.textContent = "无法获取设备信息: " + e.message;
  }
  el.style.display = "block";
}

init();
</script>`;

  return { type: "html", html: content, title: "番茄小说设置" };
}

// ─── 设置页回调函数（HTML 页面通过 legado.callSource 调用） ────────────────

function getSettings() {
  legado.log("[getSettings] 获取设置");
  return JSON.stringify(loadSettings());
}

function saveSettings(settingsJson) {
  legado.log("[saveSettings] 保存设置: " + settingsJson);
  legado.config.write("booksource", "fanqie_settings", settingsJson);
  return "ok";
}

function resetDeviceInfo() {
  legado.log("[resetDeviceInfo] 清除设备信息");
  legado.config.write("booksource", "fanqie_device", "");
  return "ok";
}

function getDeviceInfo() {
  legado.log("[getDeviceInfo] 获取设备信息");
  var raw = legado.config.read("booksource", "fanqie_device");
  if (!raw) return JSON.stringify({ status: "未注册" });
  try {
    var dev = JSON.parse(raw);
    return JSON.stringify({
      device_id: dev.device_id || "无",
      iid: dev.iid || "无",
      device_brand: dev.device_brand || "无",
      device_model: dev.device_model || "无",
      version: dev.version_str || dev.version || "无",
      registered: dev.time ? formatTimestamp(dev.time) : "无",
      expires: dev.time ? formatTimestamp(dev.time + 30 * 24 * 60 * 60 * 1000) : "无",
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ error: "解析失败", detail: String(e) });
  }
}

// ─── 账号管理 HTML ─────────────────────────────────────────────────────────

function buildLoginHtml() {
  var content = html`<div class="acct-root">

  <div class="card mb-sm">
    <label class="card-title">账号状态</label>
    <div id="status-text" class="text-secondary text-sm mt-sm">检测中...</div>
    <div style="margin-top:10px;">
      <button onclick="doCheck()">🔄 刷新状态</button>
    </div>
  </div>

  <div class="card mb-sm">
    <label class="card-title">登录操作</label>
    <p class="text-sm text-secondary mb-sm">
      点击「打开登录窗口」在弹出的浏览器中完成登录（支持手机验证码、第三方登录等）。<br>
      登录完成后点击「关闭浏览器」，再点击「刷新状态」确认登录成功。
    </p>
    <div class="flex gap-sm">
      <button onclick="doLogin()" style="flex:1;">🌐 打开登录窗口</button>
      <button onclick="doClose()" style="flex:1;">❌ 关闭浏览器</button>
    </div>
  </div>

  <div class="card mb-sm">
    <label class="card-title">使用说明</label>
    <ol class="text-sm text-secondary" style="margin:0;padding-left:1.2em;line-height:1.8;">
      <li>首次使用需点击「打开登录窗口」完成登录</li>
      <li>登录成功后关闭浏览器窗口并刷新状态</li>
      <li>状态确认后返回「📚 我的书架」即可查看书架</li>
      <li>登录 Cookie 会持久保存，通常 30 天内无需重新登录</li>
    </ol>
  </div>

</div>

<style>
  .acct-root { max-width: 600px; margin: 0 auto; }
  .card-title { font-weight: 600; display: block; margin-bottom: 4px; }
</style>

<script>
async function doCheck() {
  var el = document.getElementById("status-text");
  el.textContent = "检测中...";
  el.style.color = "";
  try {
    var raw = await legado.callSource("checkLoginStatus");
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    el.textContent = data.message || JSON.stringify(data);
    el.style.color = data.loggedIn ? "#22c55e" : "#ef4444";
  } catch(e) {
    el.textContent = "检测失败: " + e.message;
    el.style.color = "#ef4444";
  }
}

async function doLogin() {
  try {
    var msg = await legado.callSource("openLoginBrowser");
    legado.toast(typeof msg === "string" ? msg : "已打开登录窗口", "info");
  } catch(e) {
    legado.toast("操作失败: " + e.message, "error");
  }
}

async function doClose() {
  try {
    var msg = await legado.callSource("closeLoginBrowser");
    legado.toast(typeof msg === "string" ? msg : "已关闭", "info");
  } catch(e) {
    legado.toast("操作失败: " + e.message, "error");
  }
}

doCheck();
</script>`;

  return { type: "html", html: content, title: "番茄小说账号管理" };
}
