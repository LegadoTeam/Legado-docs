# legado.ui.emit

向前端推送自定义事件。GUI 模式下前端通过 `listen('script:ui')` 接收。

## 签名

```js
legado.ui.emit(eventName, data) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `eventName` | `string` | 事件名称 |
| `data` | `any` | 事件数据（可为任意 JSON 可序列化的值） |

## 示例

### 推送加载进度

```js
async function chapterList(tocUrl) {
  var chapters = [];
  var totalPages = 5;

  for (var p = 1; p <= totalPages; p++) {
    legado.ui.emit('progress', {
      current: p,
      total: totalPages,
      hint: '正在加载目录第 ' + p + ' 页...'
    });

    var resp = await legado.http.get(tocUrl + '?page=' + p);
    var list = JSON.parse(resp).list || [];
    for (var i = 0; i < list.length; i++) {
      chapters.push({ name: list[i].title, url: list[i].url });
    }
  }

  legado.ui.emit('progress', {
    current: totalPages,
    total: totalPages,
    hint: '目录加载完成，共 ' + chapters.length + ' 章'
  });

  return chapters;
}
```

### 自定义业务事件

```js
legado.ui.emit('custom:login-required', { redirectUrl: BASE + '/login' });
legado.ui.emit('custom:vip-content', { chapterUrl: url, price: 2 });
```

### 前端监听（Vue 组件中）

```js
import { listen } from '@tauri-apps/api/event'

const unlisten = await listen('script:ui', (event) => {
  const { event: evtName, data } = event.payload
  if (evtName === 'progress') {
    console.log('进度:', data.current, '/', data.total, data.hint)
  }
})
```
