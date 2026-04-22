# 脚本配置持久化

书源和扩展可以通过 `legado.config.*` API 持久化自定义配置数据，实现用户偏好、登录态、缓存等场景。

## 与 app_config 的区别

| | script_config | app_config |
|---|---|---|
| **定位** | 脚本级键值持久化 | 应用级全局设置 |
| **存储** | 按 scope 隔离 `<scope>.json` | 单文件 `app_config.json` |
| **调用方** | 书源/扩展脚本 | Rust 后端 / 前端 composable |
| **典型场景** | 用户偏好、Token、选项 | HTTP UA、超时、UI 开关 |

## API

### 基本读写

```js
// 写入
legado.config.set('token', 'abc123');
legado.config.set('preference', JSON.stringify({ theme: 'dark', sort: 'latest' }));

// 读取
var token = legado.config.get('token');
var pref = JSON.parse(legado.config.get('preference') || '{}');
```

### 字节数据

支持存储二进制数据（Base64 编码的字节数组）：

```js
// 写入字节数据
legado.config.setBytes('cert', base64CertData);

// 读取字节数据
var certData = legado.config.getBytes('cert');
```

## Scope 隔离

每个书源的配置存储在独立的 scope 文件中，互不影响：

```
<AppDataDir>/
  script_config/
    my-novel-source.json     # "我的小说网"的配置
    comic-source-a.json      # "漫画A"的配置
```

## 实际用例

### 用户偏好设置

结合 HTML 交互发现页，提供可视化设置：

```js
async function explore(page, category) {
  if (category === 'GETALL') {
    return ['热门', '最新', '⚙️ 设置'];
  }

  if (category === '⚙️ 设置') {
    return {
      type: 'html',
      html: buildSettingsPage()
    };
  }

  var sortBy = legado.config.get('sort') || 'hot';
  var resp = await legado.http.get(BASE + '/api/list?sort=' + sortBy + '&page=' + page);
  // ...
}
```

### 缓存 Token

```js
var TOKEN_KEY = 'api_token';

function getToken() {
  var token = legado.config.get(TOKEN_KEY);
  if (token) return token;

  // 登录获取新 token
  var resp = await legado.http.post(BASE + '/api/login', 'user=guest&pass=guest');
  token = JSON.parse(resp).token;
  legado.config.set(TOKEN_KEY, token);
  return token;
}

async function search(keyword, page) {
  var token = getToken();
  var resp = await legado.http.get(BASE + '/api/search?q=' + encodeURIComponent(keyword), {
    'Authorization': 'Bearer ' + token
  });
  // ...
}
```

## 注意事项

- 配置数据持久化在应用数据目录，卸载应用后会清除
- 不适合存储大量数据，建议单个 key 的 value 控制在合理范围内
- key 名称建议使用有意义的英文标识，避免冲突
