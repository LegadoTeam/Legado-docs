# legado.log / toast

## legado.log

打印日志，输出到 stderr 和调试面板（通过 `script:log` 事件推送到前端）。

```js
legado.log(msg) → void
```

| 参数  | 类型  | 说明                       |
| ----- | ----- | -------------------------- |
| `msg` | `any` | 任意类型，对象会自动序列化 |

### 示例

```js
legado.log("开始搜索: " + keyword);
legado.log(42);
legado.log({ status: "ok", count: 5 });

// 函数入口日志（推荐）
legado.log("[search] keyword=" + keyword + " page=" + page);
legado.log("[bookInfo] url=" + bookUrl);
legado.log("[chapterList] url=" + tocUrl);
legado.log("[chapterContent] url=" + chapterUrl);
```

## legado.toast

向前端发送通知提示。

```js
legado.toast(msg) → void
```

### 示例

```js
legado.toast("登录成功");
legado.toast("搜索完成，共找到 " + count + " 条结果");
```

## console.\*

标准 `console` 方法也可使用，输出到 stderr：

```js
console.log("info message");
console.info("info");
console.warn("warning");
console.error("error");
console.debug("debug");
```

::: tip 日志规范
每个书源函数入口建议添加日志，记录关键参数。调试完成后保留入口日志，删除临时调试日志。
:::

## legado.sleep

同步阻塞延迟，暂停执行指定毫秒数。

```js
legado.sleep(ms) → void
```

| 参数 | 类型     | 说明                            |
| ---- | -------- | ------------------------------- |
| `ms` | `number` | 延迟毫秒数，最大 60000（60 秒） |

::: warning 同步阻塞
`legado.sleep` 是**同步**调用，会直接阻塞当前引擎线程，**无需也不能 `await`**。这与浏览器环境中基于 `Promise` 的 `sleep` 不同。
:::

::: tip 与 @minDelay 的区别

- `legado.sleep(ms)`：书源脚本**内部**主动延迟，例如多步操作之间防止触发风控。
- `@minDelay`：书源头部注解，控制相邻两次**引擎调用**之间的最小间隔，由引擎自动执行。两者可配合使用。
  :::

### 示例

```js
// 登录后等待 2 秒再继续，防止被风控
async function login() {
  var resp = await legado.http.post(LOGIN_URL, params);
  legado.sleep(2000); // 同步等待 2 秒，无需 await
  return JSON.parse(resp);
}

// 翻页时人工延迟
async function chapterList(bookUrl) {
  var result = [];
  for (var page = 1; page <= totalPages; page++) {
    var html = await legado.http.get(tocUrl + "?page=" + page);
    result = result.concat(parsePage(html));
    if (page < totalPages) legado.sleep(500); // 翻页间隔 500ms
  }
  return result;
}
```
