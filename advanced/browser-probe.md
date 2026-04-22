# 浏览器探测实战

浏览器探测用于处理以下场景：

- 页面依赖前端 JavaScript 渲染（SPA / 动态加载）
- 需要用户完成登录或验证（验证码、Cloudflare 防护）
- 登录态由 HttpOnly Cookie 维护
- 需要执行页面内置的解密逻辑

## 架构概述

```
书源 JS (Boa)
    ↓ legado.browser.*
Rust 后端
    ↓ 管理 WebView 生命周期
探测 WebView (独立 profile)
    ↓ JS eval
网页上下文 (document, window)
```

- 探测 WebView 使用 `<AppDataDir>/browser_probe_profile/` 独立存储
- 与主程序 UI WebView 完全隔离
- 所有书源和扩展共享探测 profile（Cookie、LocalStorage 等共享）

## init() 自动调用

GUI 模式下，每个书源维护一个独立的长期 Boa Context。书源加载后如果存在无参 `init()` 函数，引擎会自动调用一次：

```js
var browserId = '';

function init() {
  // 预创建探测会话
  browserId = legado.browser.acquire('main', { visible: false });
  legado.log('[init] browserId=' + browserId);
}

async function search(keyword, page) {
  // 复用 init 中创建的会话
  var url = BASE + '/search?q=' + encodeURIComponent(keyword);
  legado.browser.navigate(browserId, url, { waitUntil: 'networkidle' });
  return legado.browser.eval(browserId, '...');
}
```

书源文件修改后会自动重建 Context 并重新执行 `init()`。

## 场景一：动态渲染页面

页面内容由 JS 动态填充，普通 HTTP GET 只能获取空壳 HTML：

```js
async function chapterContent(chapterUrl) {
  // 使用 run() 一次性完成
  return legado.browser.run(chapterUrl, `
    // 等待内容加载
    await new Promise(function(resolve) { setTimeout(resolve, 1000); });
    return document.querySelector('#content')?.innerText || '';
  `, { visible: false, waitUntil: 'load' });
}
```

## 场景二：登录后复用 Cookie

部分站点需要登录才能访问：

```js
function ensureLogin() {
  // 检查是否已有有效 Cookie
  var cookies = legado.browser.cookies(BASE);
  var hasToken = false;
  for (var i = 0; i < cookies.length; i++) {
    if (cookies[i].name === 'auth_token') { hasToken = true; break; }
  }

  if (!hasToken) {
    // 弹出窗口让用户手动登录
    var ok = legado.browser.open(BASE + '/login');
    if (!ok) throw new Error('登录未完成');
  }
}
```

## 场景三：多步骤会话（保持状态）

需要在多个页面间保持会话（如翻页、表单提交）：

```js
async function chapterContent(chapterUrl) {
  if (!globalThis.contentBrowserId) {
    globalThis.contentBrowserId = legado.browser.create({ visible: false });
  }
  var id = globalThis.contentBrowserId;

  try {
    legado.browser.navigate(id, chapterUrl, { waitUntil: 'load' });
    return legado.browser.eval(id, `
      await new Promise(r => setTimeout(r, 500));
      return document.querySelector('#content')?.innerText || '';
    `);
  } catch (e) {
    // 出错时清理会话
    legado.browser.close(id);
    globalThis.contentBrowserId = '';
    throw e;
  }
}
```

## waitUntil 选择指南

| 值 | 适用场景 |
|----|---------|
| `'load'` | 大多数情况，页面 `onload` 后内容已就绪 |
| `'domcontentloaded'` | 只需 DOM 结构，不等待图片等资源 |
| `'networkidle'` | SPA 页面，需等待 AJAX 请求完成 |

## 调试技巧

在「设置 → 网络 → 浏览器探测」中开启：

- **调试：强制显示隐藏窗口**：即使 `visible: false`，窗口也会显示
- 一次性 `legado.browser.run()` 的窗口会保留不关闭
- 便于观察页面跳转、验证码、JS 执行过程
