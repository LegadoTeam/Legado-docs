# VIP 章节购买 (purchaseChapter)

`purchaseChapter()` 是可选函数。章节目录中某章返回 `vip: true` 后，应用在读取该章节失败时会提示用户确认购买；用户确认后，应用调用 `purchaseChapter()` 完成站点侧购买，再重新调用 `chapterContent()` 读取正文。

## 函数签名

```js
async function purchaseChapter(chapterUrl, chapter) → Promise<boolean | PurchaseChapterResult>
```

| 参数         | 类型          | 说明                                                        |
| ------------ | ------------- | ----------------------------------------------------------- |
| `chapterUrl` | `string`      | 章节 URL（来自 `chapterList()` 返回的 `url`）               |
| `chapter`    | `ChapterInfo` | 章节对象，包含 `name / url / vip / price / currency` 等字段 |

返回值：

| 类型              | 说明                                                        |
| ----------------- | ----------------------------------------------------------- |
| `true`            | 购买成功，应用会重试 `chapterContent()`                     |
| `false`           | 购买失败或用户态不可购买                                    |
| `{ ok, message }` | 推荐格式，`ok` 表示是否成功，`message` 会展示在日志或提示中 |

## 基本示例

```js
async function purchaseChapter(chapterUrl, chapter) {
  var payload = JSON.stringify({ chapterUrl: chapterUrl });
  var text = await legado.http.post(
    "https://example.com/api/chapter/buy",
    payload,
    { "Content-Type": "application/json" },
  );
  var json = JSON.parse(text);

  if (json.code === 401) {
    throw new Error("请先在浏览器探测页登录账号");
  }
  if (json.code !== 0) {
    return { ok: false, message: json.message || "购买失败" };
  }
  return { ok: true, message: chapter.name + " 已购买" };
}
```

## 与 chapterContent 配合

`purchaseChapter()` 只负责购买，不负责返回正文。购买成功后，应用会自动清理本章运行时缓存，并再次调用 `chapterContent(chapterUrl)`。

```js
async function chapterContent(chapterUrl) {
  var text = await legado.http.get(chapterUrl);
  var json = JSON.parse(text);

  if (json.code === "NEED_BUY") {
    throw new Error("VIP 章节未购买");
  }
  return json.data.content || "";
}
```

## 实现建议

- 购买接口通常依赖 Cookie、登录态、CSRF token 或设备标识，先用 `legado.browser.acquire()` 完成登录和 token 探测。
- 购买函数应尽量幂等：章节已购买时直接返回 `{ ok: true, message: '已购买' }`。
- 不要在 `chapterList()` 或 `chapterContent()` 中自动购买；购买只应发生在应用提示用户确认之后。
- 批量缓存、静默预加载和自动目录更新不会触发购买。

::: warning 真实扣费
`purchaseChapter()` 可能调用真实站点的扣费接口。书源作者应在说明中明确账号、余额、订阅和登录要求，并确保失败时返回清晰错误。
:::
