# PurchaseChapterResult

`purchaseChapter()` 的推荐返回结构。也可以直接返回 `true` 或 `false`。

## 字段

| 字段        | 类型      | 必填 | 说明                           |
| ----------- | --------- | ---- | ------------------------------ |
| `ok`        | `boolean` | 否   | 是否购买成功，推荐使用         |
| `success`   | `boolean` | 否   | `ok` 的兼容别名                |
| `purchased` | `boolean` | 否   | `ok` 的兼容别名                |
| `message`   | `string`  | 否   | 展示给用户或写入日志的结果说明 |

## 示例

```js
return { ok: true, message: "购买成功" };
```

```js
return { ok: false, message: "余额不足，请先充值" };
```

::: tip 成功判定
应用按 `ok → success → purchased` 的顺序读取布尔字段。对象中没有这些字段时，会视为购买流程已完成。
:::
