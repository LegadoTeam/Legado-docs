---
layout: home

hero:
  name: Legado Tauri
  text: 书源开发文档
  tagline: 基于 Boa 引擎的开源阅读桌面版 — 用 JavaScript 为你喜爱的网站编写书源
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/LegadoTeam/Legado-Tauri
    - theme: alt
      text: QQ 交流群：645815655
      # link: https://qm.qq.com/q/xxxxxx
features:
  - icon: 📖
    title: 纯 JavaScript 书源
    details: 使用保守的 JavaScript 风格编写书源，配合 async/await 调用宿主 API，无需额外框架。
  - icon: 🔍
    title: 强大的 DOM 解析
    details: 内置 legado.dom.* API，基于 CSS 选择器的 HTML 解析，句柄机制高效安全。
  - icon: 🌐
    title: 浏览器探测
    details: legado.browser.* 提供独立 WebView 探测，轻松处理 JS 渲染页面、登录验证和 Cookie。
  - icon: 🖼️
    title: 图片处理
    details: legado.image.* 支持图片解码、裁剪、拼接，为漫画书源提供图片还原能力。
  - icon: 🎬
    title: 多类型支持
    details: 支持小说、漫画、视频三种书源类型，统一的开发模式，灵活的返回格式。
  - icon: 🛠️
    title: CLI 测试工具
    details: 命令行模式逐模块测试书源，无需启动 GUI，快速验证搜索、详情、目录、正文。
---
