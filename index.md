---
layout: home

hero:
  name: Legado Tauri
  text: 书源开发与阅读扩展文档
  tagline: 面向小说、漫画、视频与有声内容的开源阅读桌面版，用 JavaScript 将网站规则沉淀成可维护的书源能力。
  image:
    src: /logo.png
    alt: Legado Tauri
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: GitHub 主仓库
      link: https://github.com/LegadoTeam/Legado-Tauri
    - theme: alt
      text: GitHub docs 仓库
      link: https://github.com/LegadoTeam/Legado-docs
    - theme: alt
      text: GitHub Tauri （下载地址）
      link: https://github.com/LegadoTeam/Legado-Tauri/release/latest
    - theme: alt
      text: QQ 交流群
      link: "#qq-group"
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
    title: 命令行参考
    details: 覆盖 GUI、书源 CLI、JS 求值和独立 Web 服务模式，便于调试书源与部署后端。
---

<section id="qq-group" class="home-community">
  <div class="home-community-panel">
    <div>
      <div class="home-section-kicker">社区交流</div>
      <h2>书源交流 QQ 群</h2>
      <p>用于获取社区书源、查看群公告、反馈书源可用性问题。三群已开放，可优先加入新群。</p>
    </div>
    <div class="qq-group-grid" aria-label="Legado Tauri QQ 交流群">
      <article class="qq-group-card">
        <div>
          <div class="qq-group-label">
            <span>一群</span>
            <span class="qq-group-status">已满</span>
          </div>
          <div class="qq-group-number">645815655</div>
        </div>
        <div class="qq-group-note">历史交流群，保留用于查阅既有公告。</div>
      </article>
      <article class="qq-group-card is-active">
        <div>
          <div class="qq-group-label">
            <span>二群</span>
            <span class="qq-group-status">可加入</span>
          </div>
          <div class="qq-group-number">949235656</div>
        </div>
        <div class="qq-group-note">当前常用交流入口。</div>
      </article>
      <article class="qq-group-card is-new">
        <div>
          <div class="qq-group-label">
            <span>三群</span>
            <span class="qq-group-status">新增</span>
          </div>
          <div class="qq-group-number">1107448928</div>
        </div>
        <div class="qq-group-note">新增群号，适合新用户加入。</div>
      </article>
    </div>
  </div>
</section>

<section class="home-workflow">
  <div class="home-workflow-panel">
    <div>
      <div class="home-section-kicker">开发路径</div>
      <h2>从规则到可用书源</h2>
      <p>文档按实际开发流程组织，先理解结构，再编写核心函数，最后用调试工具定位网络、解析与内容问题。</p>
    </div>
    <ol class="home-workflow-list">
      <li>
        <strong>认识结构</strong>
        <span>从书源元数据、文件结构和类型差异开始，明确规则边界。</span>
      </li>
      <li>
        <strong>编写规则</strong>
        <span>围绕搜索、详情、目录、正文与发现页逐步完成能力。</span>
      </li>
      <li>
        <strong>调试发布</strong>
        <span>使用 CLI、浏览器探测和日志工具验证稳定性后再分享。</span>
      </li>
    </ol>
  </div>
</section>
