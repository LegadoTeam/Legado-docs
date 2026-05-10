# Cloudflare 挑战绕过

适用于受 Cloudflare 5 秒盾、Turnstile 人机验证、JS Challenge 保护的站点。核心思路：用浏览器探测 API 完成 CF 验证，之后将 `cf_clearance` Cookie 同步到 HTTP 请求层，后续普通 `legado.http.*` 请求即可正常访问。

> 参考实现：`booksource-platform/booksources/万年漫画.js`

---

## 检测 CF 拦截

```js
function isCfBlocked(html) {
  if (!html || html.length < 200) return true;

  // 仅匹配 CF 挑战/拦截页特有标记，排除正常页面也会出现的通用词
  var markers = [
    "Just a moment",
    "cf-browser-verification",
    "Checking your browser",
    "cf-challenge-running",
    "managed_checking_msg",
    "cf-please-wait",
    "cf-turnstile-wrapper",
    "正在进行安全验证",
  ];
  for (var i = 0; i < markers.length; i++) {
    if (html.indexOf(markers[i]) !== -1) {
      legado.log("[CF:detect] blocked: matched '" + markers[i] + "'");
      return true;
    }
  }
  return false;
}
```

**为什么不用 `html.length < 500` 直接判断？**
CF 拦截页本身也可能较长（Turnstile 页面含大量内联 JS），所以必须靠关键词匹配而不是长度。

---

## 完成验证并返回真实 HTML

```js
function ensureCfPassed(url, html) {
  if (!isCfBlocked(html)) return html;

  legado.log("[CF] 检测到 CF 拦截，启动浏览器探测...");

  // ① 初始隐藏会话，检测到真实挑战后才弹出，避免已清除时无谓弹窗
  var sessionId = legado.browser.acquire("cf", { visible: false });

  // ② waitFor: "load"，不要用 "networkidle"
  //    CF 验证跳转会中断 networkidle 检测，导致 navigate() 挂死 30 秒
  legado.browser.navigate(sessionId, url, { waitFor: "load" });

  // ③ 轮询等待真实页面（CF 验证 + 跳转通常需 1–10 秒）
  var maxAttempts = 60;
  var passed = false;
  var realHtml = null;
  var browserShown = false;

  for (var i = 0; i < maxAttempts; i++) {
    var pageHtml = legado.browser.html(sessionId);

    if (pageHtml && pageHtml.length > 500 && !isCfBlocked(pageHtml)) {
      passed = true;
      realHtml = pageHtml;
      legado.log("[CF] 验证通过（第 " + (i + 1) + " 次轮询）");
      break;
    }

    // ④ 首次检测到挑战才显示窗口，让用户完成 Turnstile / CAPTCHA
    if (!browserShown) {
      legado.toast("需要完成 Cloudflare 验证，请在弹出窗口中操作");
      legado.browser.show(sessionId);
      browserShown = true;
    }

    legado.sleep(1000);
  }

  if (!passed) {
    legado.log("[CF] 验证超时，隐藏窗口，返回原始 HTML");
    legado.browser.hide(sessionId);
    return html;
  }

  // ⑤ 将 cf_clearance 等 Cookie 同步到 HTTP 层，后续 legado.http.* 自动携带
  legado.browser.cookies(url);
  legado.browser.hide(sessionId);

  // ⑥ 直接返回浏览器已渲染的真实 HTML，无需额外 HTTP 重试
  return realHtml;
}
```

---

## 在各模块中使用

每次 `legado.http.get()` 之后立即调用 `ensureCfPassed`：

```js
async function search(keyword, page) {
  var url = BASE + "/?s=" + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  html = ensureCfPassed(url, html);          // ← CF 拦截时自动走浏览器
  var doc = legado.dom.parse(html);
  // ... 正常解析
}

async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  html = ensureCfPassed(bookUrl, html);
  // ...
}
```

首次触发验证后，`cf_clearance` Cookie 被同步到 HTTP 层，后续请求不再触发挑战。

---

## 关键设计决策

| 决策 | 原因 |
|------|------|
| `waitFor: "load"` 而非 `"networkidle"` | CF 验证跳转会中断 networkidle 检测，导致 `navigate()` 挂死到超时 |
| 初始 `visible: false`，验证时才 `show` | 已有有效 Cookie 时无需弹窗，体验更好 |
| `legado.browser.html()` 轮询而非 `eval` | CF 挑战期间页面频繁重定向，`eval` 容易拿到空值 |
| 直接返回浏览器 HTML，不再补一次 HTTP | 避免 HTTP Cookie jar 与浏览器 Cookie 的时序冲突 |
| `acquire("cf", ...)` 而非 `create` | 同一书源多个函数复用同一会话，Cookie 自动保持 |

---

## 完整书源模板（CF 场景）

```js
// @name        示例CF站
// @uuid        随机UUID
// @version     1.0.0
// @type        novel

var BASE = "https://example.com";

function isCfBlocked(html) {
  if (!html || html.length < 200) return true;
  var markers = ["Just a moment","cf-browser-verification","Checking your browser",
    "cf-challenge-running","managed_checking_msg","cf-please-wait",
    "cf-turnstile-wrapper","正在进行安全验证"];
  for (var i = 0; i < markers.length; i++) {
    if (html.indexOf(markers[i]) !== -1) return true;
  }
  return false;
}

function ensureCfPassed(url, html) {
  if (!isCfBlocked(html)) return html;
  var sessionId = legado.browser.acquire("cf", { visible: false });
  legado.browser.navigate(sessionId, url, { waitFor: "load" });
  var maxAttempts = 60;
  var passed = false;
  var realHtml = null;
  var browserShown = false;
  for (var i = 0; i < maxAttempts; i++) {
    var pageHtml = legado.browser.html(sessionId);
    if (pageHtml && pageHtml.length > 500 && !isCfBlocked(pageHtml)) {
      passed = true; realHtml = pageHtml; break;
    }
    if (!browserShown) {
      legado.toast("需要完成 Cloudflare 验证，请在弹出窗口中操作");
      legado.browser.show(sessionId);
      browserShown = true;
    }
    legado.sleep(1000);
  }
  if (!passed) { legado.browser.hide(sessionId); return html; }
  legado.browser.cookies(url);
  legado.browser.hide(sessionId);
  return realHtml;
}

async function search(keyword, page) {
  var url = BASE + "/search?q=" + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  html = ensureCfPassed(url, html);
  // ... 解析
}
```
