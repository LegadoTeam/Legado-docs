# 调试技巧

## 日志调试

每个函数入口和关键节点都应添加日志：

```js
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  var url = BASE + '/search?q=' + encodeURIComponent(keyword);
  legado.log('[search] url=' + url);

  var html = await legado.http.get(url);
  legado.log('[search] html.length=' + html.length);

  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  legado.log('[search] found=' + items.length + ' items');

  // ...
}
```

## 常见问题诊断

| 现象 | 可能原因 | 解决方案 |
|------|---------|---------|
| `found=0` | 选择器不匹配 | 打印 HTML 片段检查实际结构 |
| 字段为空 | 属性名不对 | 尝试 `data-src` / `data-original` 等变体 |
| 目录倒序 | 网站默认倒序 | 添加 `chapters.reverse()` |
| 目录混入杂链 | 选择器过宽 | 缩窄选择器范围或添加 URL 过滤 |
| 搜索乱码 | 编码问题 | 使用 `legado.urlEncodeCharset(keyword, 'gbk')` |
| 请求超时 | 网站响应慢 | 检查 URL 是否可访问 |

## 打印局部 HTML

当选择器不工作时，打印容器的 HTML 帮助分析：

```js
var container = legado.dom.select(doc, '#main');
if (container) {
  legado.log('[debug] container html=' + legado.dom.html(container).substring(0, 500));
} else {
  legado.log('[debug] #main not found, trying body...');
  legado.log('[debug] body html=' + legado.dom.html(doc).substring(0, 500));
}
```

## GUI 调试面板

在应用内，进入「书源管理 → 调试」标签页，可以：

- 执行任意 JS 代码片段
- 查看实时日志输出
- 可视化查看请求和响应

## 浏览器探测调试

在「设置 → 网络 → 浏览器探测」中开启「调试：强制显示隐藏窗口」，可以看到探测 WebView 的实际页面内容，便于观察 JS 渲染、跳转和验证码流程。

## HTTP 请求调试

```js
function debugGet(url) {
  legado.log('[GET] ' + url);
  try {
    var resp = await legado.http.get(url);
    legado.log('[RSP] length=' + resp.length + ' preview=' + resp.substring(0, 200));
    return resp;
  } catch (e) {
    legado.log('[ERR] ' + e.message);
    throw e;
  }
}
```
