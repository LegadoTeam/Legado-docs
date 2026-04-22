# HTML 交互发现页

`explore()` 除了返回标准数据，还支持返回 HTML 页面，在沙箱 iframe 中渲染，实现丰富的用户交互。

## 返回格式

```js
async function explore(page, category) {
  if (category === '设置') {
    return {
      type: 'html',
      html: '<h3>书源设置</h3><p>自定义内容...</p>',
      title: '设置'  // 可选，标签页标题
    };
  }
  // 标准分类返回 BookItem[]
  // ...
}
```

## Bridge API（window.legado）

HTML 页面渲染在 `sandbox="allow-scripts"` 的 iframe 中，无直接网络访问。所有外部操作通过 `window.legado` 桥接：

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `legado.http.get(url, headers?)` | HTTP GET | `Promise<string>` |
| `legado.http.post(url, body, headers?)` | HTTP POST | `Promise<string>` |
| `legado.config.read(key)` | 读取配置 | `Promise<string>` |
| `legado.config.write(key, value)` | 写入配置 | `Promise<void>` |
| `legado.callSource(fnName, ...args)` | 调用书源函数 | `Promise<any>` |
| `legado.explore(category, page?)` | 切换分类 | `Promise<void>` |
| `legado.toast(msg, type?)` | 显示通知 | `void` |
| `legado.openBook(bookUrl)` | 打开书籍详情 | `void` |
| `legado.search(keyword)` | 触发全局搜索 | `void` |
| `legado.log(msg)` | 日志 | `void` |

::: info Bridge 与 Boa API 的区别
Bridge API 运行在 iframe 中（浏览器环境），所有方法返回 **Promise**（异步）。Boa 书源中的 HTTP / 哈希 / 加密宿主 API 现在也统一返回 `Promise`。
:::

## 完整示例

```js
async function explore(page, category) {
  if (category === 'GETALL') {
    return ['玄幻', '仙侠', '设置'];
  }

  if (category === '设置') {
    return {
      type: 'html',
      html: `
        <h3>书源设置</h3>
        <div class="card mt-sm">
          <label>偏好：</label>
          <select id="pref">
            <option value="male">男生</option>
            <option value="female">女生</option>
          </select>
          <button class="primary mt-sm" onclick="savePref()">保存</button>
        </div>
        <script>
          async function savePref() {
            var val = document.getElementById('pref').value;
            await legado.config.write('preference', val);
            legado.toast('已保存', 'success');
          }
          // 初始化时读取已保存的配置
          legado.config.read('preference').then(function(v) {
            if (v) document.getElementById('pref').value = v;
          });
        <\/script>
      `
    };
  }

  // 标准分类
  var resp = await legado.http.get(BASE + '/api/books?cat=' + encodeURIComponent(category) + '&page=' + page);
  var data = JSON.parse(resp);
  return data.books.map(function(b) {
    return { name: b.title, author: b.author, bookUrl: b.url, coverUrl: b.cover, kind: category };
  });
}
```

## 安全约束

- iframe 使用 `sandbox="allow-scripts"`，禁止 same-origin、表单提交、弹窗、导航
- 所有 HTTP 请求通过 Tauri 后端代理
- `callSource` 仅限调用当前书源的函数
- Bridge 请求超时 60 秒
- 注入基础 CSS 样式，支持暗色/亮色主题适配
