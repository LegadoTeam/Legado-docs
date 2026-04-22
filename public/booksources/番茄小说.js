// @name        番茄小说
// @version     1.0.0
// @author      Legado Tauri
// @url         https://fanqienovel.com
// @logo        https://fanqienovel.com/favicon.ico
// @enabled     true
// @tags        免费,小说,免费小说,API
// @description 番茄小说（fanqienovel.com），字节跳动旗下免费小说平台，JSON API 书源。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('斗破苍稹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"斗破苍稹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '玄幻');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [玄幻] 返回为空' };
    return { passed: true, message: '发现页 [玄幻]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var SIGN_HOST = "https://sg.mgz.la";
var SIGN_USER = "fq0329";
var SIGN_AUTH = "1337b73b7ddf1ed88d0d31a6bd6b2ee6db15f2b8";
var API_HOST = "https://reading.snssdk.com";
var WEB_HOST = "https://fanqienovel.com";
var CONTENT_URLS = ["https://gofq.52dns.cc", "https://pyfq.52dns.cc"];

// ─── 设备管理 ─────────────────────────────────────────────────────────────

/**
 * 生成 n 位随机十六进制字符串
 */
function randomHex(n) {
  var chars = "0123456789abcdef";
  var result = "";
  for (var i = 0; i < n; i++) {
    result += chars.charAt(Math.floor(Math.random() * 16));
  }
  return result;
}

/**
 * 时间戳格式化（Boa 不支持 toLocaleString）
 */
function formatTimestamp(ts) {
  var d = new Date(ts);
  var pad = function (n) {
    return n < 10 ? "0" + n : "" + n;
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

/**
 * 从 legado.config 读取已注册的设备信息，无则返回 null
 */
function loadDevice() {
  var raw = legado.config.read("booksource", "fanqie_device");
  if (!raw) return null;
  try {
    var dev = JSON.parse(raw);
    // 设备注册 30 天有效
    if (dev && dev.time && Date.now() - dev.time < 30 * 24 * 60 * 60 * 1000) {
      return dev;
    }
  } catch (e) {
    // 解析失败，重新注册
  }
  return null;
}

/**
 * 保存设备信息到 legado.config
 */
function saveDevice(dev) {
  legado.config.write("booksource", "fanqie_device", JSON.stringify(dev));
}

/**
 * 版本号格式化：63932 → "6.39.3.2"
 */
function formatVersion(code, a, b, c) {
  var s = String(code);
  if (!a) a = 1;
  if (!b) b = 2;
  if (!c) c = 3;
  var parts = [];
  var idx = 0;
  var lens = [a, b, c];
  for (var i = 0; i < lens.length; i++) {
    if (idx + lens[i] <= s.length) {
      parts.push(parseInt(s.substring(idx, idx + lens[i]), 10));
      idx += lens[i];
    }
  }
  if (idx < s.length) {
    parts.push(parseInt(s.substring(idx), 10));
  }
  return parts.join(".");
}

/**
 * 注册新设备。流程：
 * 1. 调用 sg.mgz.la/api/device/build-register 构建注册请求
 * 2. 用 legado.http.postBinary 向字节跳动发送二进制注册请求
 * 3. 调用 sg.mgz.la/api/device/build-activate 激活
 * 4. 保存设备信息
 */
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
    version_str: formatVersion("63932", 1, 2, 3),
    aid: "1967",
    channel: "oppo_1967_64",
    display_name: "番茄免费小说",
    package: "com.dragon.read",
    app_name: "novelapp",
  };

  // Step 1: build-register
  var buildBody = JSON.stringify({
    user: SIGN_USER,
    auth: SIGN_AUTH,
    device: regDevice,
  });
  var buildResp = await legado.http.post(SIGN_HOST + "/api/device/build-register", buildBody, { "Content-Type": "application/json" });
  var buildData = JSON.parse(buildResp);
  if (!buildData || !buildData.data) {
    legado.log("[registerDevice] build-register 失败");
    return null;
  }
  var regUrl = buildData.data.url;
  var regBody = buildData.data.options.body; // base64
  var regHeaders = buildData.data.options.headers;
  var device = buildData.data.device;

  // Step 2: 二进制 POST 设备注册
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
  legado.log("[registerDevice] 设备ID: " + device.device_id);

  // Step 3: build-activate
  var actBody = JSON.stringify({
    user: SIGN_USER,
    auth: SIGN_AUTH,
    device: device,
  });
  var actResp = await legado.http.post(SIGN_HOST + "/api/device/build-activate", actBody, { "Content-Type": "application/json" });
  var actData = JSON.parse(actResp);
  if (actData && actData.data && actData.data.url) {
    // Step 4: 激活
    var actHeaders = actData.data.options && actData.data.options.headers ? actData.data.options.headers : {};
    await legado.http.get(actData.data.url, actHeaders);
  }

  // 保存
  saveDevice(device);
  legado.log("[registerDevice] 注册完成");
  return device;
}

/**
 * 获取已注册设备，必要时自动注册
 */
async function getDevice() {
  var dev = loadDevice();
  if (dev) return dev;
  return await registerDevice();
}

// ─── 签名请求 ─────────────────────────────────────────────────────────────

/**
 * 通过签名服务签名并请求字节跳动 API
 * @param {string} path - API 路径（如 "/reading/bookapi/search/tab/v/?"）
 * @param {string} params - 查询参数字符串（如 "tab_type=3&query=xxx"）
 * @returns {object} 解析后的 JSON 响应
 */
async function signedApiGet(path, params) {
  var device = await getDevice();
  if (!device) {
    legado.log("[signedApiGet] 无法获取设备信息");
    return null;
  }

  var fullUrl = API_HOST + path + (params || "");

  // 解析 params 为对象
  var paramsObj = {};
  if (params) {
    var pairs = params.split("&");
    for (var i = 0; i < pairs.length; i++) {
      var eqIdx = pairs[i].indexOf("=");
      if (eqIdx > 0) {
        var key = pairs[i].substring(0, eqIdx);
        var val = pairs[i].substring(eqIdx + 1);
        try {
          paramsObj[key] = decodeURIComponent(val);
        } catch (e) {
          paramsObj[key] = val;
        }
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
  var signResp = await legado.http.post(SIGN_HOST + "/api/sign", signBody, { "Content-Type": "application/json" });
  var signData = JSON.parse(signResp);
  if (!signData || !signData.data) {
    legado.log("[signedApiGet] 签名失败: " + signResp);
    return null;
  }

  var signedUrl = signData.data.url;
  var signedHeaders = signData.data.options.headers || {};

  var resp = await legado.http.get(signedUrl, signedHeaders);
  return JSON.parse(resp);
}

// ─── 搜索 ────────────────────────────────────────────────────────────────

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

  // 从"书籍"标签中提取结果
  for (var t = 0; t < tabs.length; t++) {
    var tab = tabs[t];
    if (tab.title !== "书籍" && tab.title !== "综合") continue;
    var items = tab.data || tab.book_data || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var bd = item.book_data;
      var b = bd && bd.length > 0 ? bd[0] : item;
      if (!b || !b.book_id) continue;
      if (seenIds[b.book_id]) continue;
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

  // 从 URL 提取 book_id
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
  var status = "";
  if (d.creation_status === 0) status = "连载";
  else if (d.creation_status === 1) status = "完结";

  var kindParts = [];
  if (status) kindParts.push(status);
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
    tocUrl: WEB_HOST + "/api/reader/directory/detail?bookId=" + bookId,
  };
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);

  // 兑容：若传入的是 detail API URL（含 book_id=），说明 bookInfo 返回了 tocUrl 兑底值，
  // 此时主动提取 book_id 并构建正确的目录接口 URL
  var bookIdInUrl = tocUrl.match(/book_id=(\d+)/);
  if (bookIdInUrl) {
    var newTocUrl = WEB_HOST + "/api/reader/directory/detail?bookId=" + bookIdInUrl[1];
    legado.log("[chapterList] 检测到 detail URL，重定向到目录接口: " + newTocUrl);
    tocUrl = newTocUrl;
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
    // 分卷模式：按卷顺序遍历
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
    // 降级：使用 allItemIds
    var ids = data.data.allItemIds || [];
    for (var i = 0; i < ids.length; i++) {
      chapters.push({
        name: "第" + (i + 1) + "章",
        url: ids[i],
      });
    }
  }

  legado.log("[chapterList] total=" + chapters.length);
  return chapters;
}

// ─── 正文 ────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log("[chapterContent] itemId=" + chapterUrl);

  var itemId = chapterUrl;
  var content = "";

  // 根据设置决定代理服务器顺序
  var settings = loadSettings();
  var urls = CONTENT_URLS.slice();
  if (settings.contentProxy === "1" && urls.length >= 2) {
    // pyfq 优先：交换顺序
    var tmp = urls[0];
    urls[0] = urls[1];
    urls[1] = tmp;
  }

  // 尝试多个代理服务器
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

  // 从 XHTML 中提取正文
  return extractContent(content);
}

/**
 * 从 XHTML 格式的章节内容中提取纯文本
 * 番茄返回的内容格式为 XHTML，包含 <p> 标签
 */
function extractContent(html) {
  // 去除 XML 声明、DOCTYPE、html/head/body 标签
  var text = html
    .replace(/<\?xml[^?]*\?>\s*/g, "")
    .replace(/<!DOCTYPE[^>]*>\s*/g, "")
    .replace(/<\/?html[^>]*>/g, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/g, "")
    .replace(/<\/?body[^>]*>/g, "");

  // 去除章节标题 h1 标签
  text = text.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, "");

  // 去除广告标签
  text = text.replace(/<tt_keyword_ad[\s\S]*?<\/tt_keyword_ad>/g, "");

  // 将 <p> 标签转为段落
  var paragraphs = [];
  var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  var match;
  while ((match = pRegex.exec(text)) !== null) {
    var pText = match[1]
      .replace(/<[^>]+>/g, "") // 去除子标签
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim();
    if (pText) {
      paragraphs.push(pText);
    }
  }

  // 如果正则没匹配到 <p>，降级处理
  if (paragraphs.length === 0) {
    text = text.replace(/<[^>]+>/g, "").trim();
    if (text) paragraphs.push(text);
  }

  return paragraphs.join("\n\n");
}

// ─── 设置管理 ─────────────────────────────────────────────────────────────

var DEFAULT_SETTINGS = {
  gender: "", // 偏好: '' = 不限, '1' = 男生, '0' = 女生
  algo: "204", // 榜单: 204=新书榜, 101=推荐榜, 100=完本榜, 200=巅峰榜, 103=热搜榜, 601=短篇榜, 156=抖音榜
  limit: "30", // 每页数量
  contentProxy: "0", // 内容代理: 0=gofq优先, 1=pyfq优先
};

function loadSettings() {
  var raw = legado.config.read("booksource", "fanqie_settings");
  if (!raw) return DEFAULT_SETTINGS;
  try {
    var s = JSON.parse(raw);
    return {
      gender: s.gender || DEFAULT_SETTINGS.gender,
      algo: s.algo || DEFAULT_SETTINGS.algo,
      limit: s.limit || DEFAULT_SETTINGS.limit,
      contentProxy: s.contentProxy || DEFAULT_SETTINGS.contentProxy,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

async function explore(page, category) {
  legado.log("[explore] page=" + page + " category=" + (category || ""));

  if (!category || category === "GETALL") {
    // 返回分类列表，末尾加入设置入口
    return ["玄幻", "仙侠", "都市", "历史", "科幻", "悬疑", "游戏", "女频", "现言", "古言", "幻想", "短篇", "出版", "⚙ 设置"];
  }

  // ── 设置页：返回 HTML 交互界面 ─────────────────────────────────────────
  if (category === "⚙ 设置") {
    return buildSettingsHtml();
  }

  // ── 标准分类：使用保存的设置 ───────────────────────────────────────────
  var settings = loadSettings();

  var genderMap = {
    玄幻: 1,
    仙侠: 1,
    都市: 1,
    历史: 1,
    科幻: 1,
    悬疑: 1,
    游戏: 1,
    女频: 0,
    现言: 0,
    古言: 0,
    幻想: 0,
    短篇: 1,
    出版: 2,
  };
  var gender = genderMap[category] !== undefined ? genderMap[category] : 1;

  // 如果用户设置了偏好，且当前分类不是强制性别的，使用用户偏好
  if (settings.gender && category !== "女频" && category !== "出版") {
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

// ─── 设置页 HTML 生成 ────────────────────────────────────────────────────
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
//
// 架构说明：HTML 页面是纯 UI 层，所有数据读写都通过 callSource 回调到
// 书源内的函数来执行。页面不直接操作 config。
//

/**
 * 获取当前设置（供设置页初始化 UI 状态）
 * @returns {string} JSON 字符串
 */
function getSettings() {
  legado.log("[getSettings] 获取设置");
  var s = loadSettings();
  return JSON.stringify(s);
}

/**
 * 保存设置（设置页点击选项后回调此函数）
 * @param {string} settingsJson - JSON 字符串，包含要保存的设置
 * @returns {string} "ok"
 */
function saveSettings(settingsJson) {
  legado.log("[saveSettings] 保存设置");
  legado.config.write("booksource", "fanqie_settings", settingsJson);
  legado.log("[saveSettings] 已保存: " + settingsJson);
  return "ok";
}

/**
 * 清除已注册的设备信息，下次 API 调用时将自动重新注册
 * @returns {string} "ok"
 */
function resetDeviceInfo() {
  legado.log("[resetDeviceInfo] 清除设备信息");
  legado.config.write("booksource", "fanqie_device", "");
  legado.log("[resetDeviceInfo] 设备信息已清除");
  return "ok";
}

/**
 * 获取当前设备信息（脱敏），供设置页展示
 * @returns {string} JSON 字符串
 */
function getDeviceInfo() {
  legado.log("[getDeviceInfo] 获取设备信息");
  var raw = legado.config.read("booksource", "fanqie_device");
  legado.log("[getDeviceInfo] raw length=" + (raw ? raw.length : 0) + " content=" + (raw ? raw.substring(0, 1000) : "(empty)"));
  if (!raw) return JSON.stringify({ status: "未注册" });
  try {
    var dev = JSON.parse(raw);
    return JSON.stringify(
      {
        device_id: dev.device_id || "无",
        iid: dev.iid || "无",
        device_brand: dev.device_brand || "无",
        device_model: dev.device_model || "无",
        version: dev.version_str || dev.version || "无",
        registered: dev.time ? formatTimestamp(dev.time) : "无",
        expires: dev.time ? formatTimestamp(dev.time + 30 * 24 * 60 * 60 * 1000) : "无",
      },
      null,
      2,
    );
  } catch (e) {
    legado.log("[getDeviceInfo] 解析失败: " + e);
    return JSON.stringify({ error: "解析失败", detail: String(e), raw: raw.substring(0, 200) });
  }
}
