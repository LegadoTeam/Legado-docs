# legado.log / toast

## legado.log

打印日志，输出到 stderr 和调试面板（通过 `script:log` 事件推送到前端）。

```js
legado.log(msg) → void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `msg` | `any` | 任意类型，对象会自动序列化 |

### 示例

```js
legado.log('开始搜索: ' + keyword);
legado.log(42);
legado.log({ status: 'ok', count: 5 });

// 函数入口日志（推荐）
legado.log('[search] keyword=' + keyword + ' page=' + page);
legado.log('[bookInfo] url=' + bookUrl);
legado.log('[chapterList] url=' + tocUrl);
legado.log('[chapterContent] url=' + chapterUrl);
```

## legado.toast

向前端发送通知提示。

```js
legado.toast(msg) → void
```

### 示例

```js
legado.toast('登录成功');
legado.toast('搜索完成，共找到 ' + count + ' 条结果');
```

## console.*

标准 `console` 方法也可使用，输出到 stderr：

```js
console.log('info message');
console.info('info');
console.warn('warning');
console.error('error');
console.debug('debug');
```

::: tip 日志规范
每个书源函数入口建议添加日志，记录关键参数。调试完成后保留入口日志，删除临时调试日志。
:::
