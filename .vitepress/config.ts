import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Legado Tauri',
  description: '开源阅读 Tauri 版 — 书源开发文档',
  lang: 'zh-CN',
  base: '/',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Legado Tauri',

    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API 参考', link: '/api/', activeMatch: '/api/' },
      { text: '进阶', link: '/advanced/browser-probe', activeMatch: '/advanced/' },
      { text: 'AI 提示词', link: '/prompt/', activeMatch: '/prompt/' },
      {
        text: '相关链接',
        items: [
          { text: 'GitHub', link: 'https://github.com/LegadoTeam/Legado-Tauri' },
          { text: '书源仓库', link: 'https://github.com/LegadoTeam/repository' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '书源文件结构', link: '/guide/file-structure' },
          ],
        },
        {
          text: '基础开发',
          items: [
            { text: '搜索 (search)', link: '/guide/search' },
            { text: '书籍详情 (bookInfo)', link: '/guide/book-info' },
            { text: '章节目录 (chapterList)', link: '/guide/chapter-list' },
            { text: '章节正文 (chapterContent)', link: '/guide/chapter-content' },
            { text: '发现页 (explore)', link: '/guide/explore' },
          ],
        },
        {
          text: '不同类型书源',
          items: [
            { text: '小说书源', link: '/guide/type-novel' },
            { text: '漫画书源', link: '/guide/type-comic' },
            { text: '视频书源', link: '/guide/type-video' },
          ],
        },
        {
          text: '测试与调试',
          items: [
            { text: 'CLI 测试工具', link: '/guide/cli-testing' },
            { text: '调试技巧', link: '/guide/debugging' },
            { text: '社区书源仓库规范', link: '/guide/community-booksource-repository' },
            { text: '在线书源仓库（临时测试）', link: '/guide/online-booksources' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API 参考',
          items: [{ text: '总览', link: '/api/' }],
        },
        {
          text: 'HTTP 请求',
          items: [
            { text: 'legado.http.get', link: '/api/http-get' },
            { text: 'legado.http.post', link: '/api/http-post' },
            { text: 'legado.http.postBinary', link: '/api/http-post-binary' },
            { text: 'legado.http.batchGet', link: '/api/http-batch-get' },
            { text: 'legado.http.request', link: '/api/http-request' },
          ],
        },
        {
          text: 'DOM 解析',
          items: [
            { text: 'legado.dom.parse', link: '/api/dom-parse' },
            { text: 'legado.dom.select / selectAll', link: '/api/dom-select' },
            { text: 'legado.dom.text / html / attr', link: '/api/dom-text' },
            { text: 'legado.dom 快捷方法', link: '/api/dom-shortcuts' },
            { text: 'legado.dom 工具方法', link: '/api/dom-utils' },
            { text: 'legado.dom2（对象风格兼容层,优先使用）', link: '/api/dom2' },
          ],
        },
        {
          text: '编码与加密',
          items: [
            { text: '编码函数', link: '/api/encoding' },
            { text: '哈希函数', link: '/api/hash' },
            { text: '加密/解密', link: '/api/crypto' },
          ],
        },
        {
          text: '浏览器探测',
          items: [
            { text: '会话管理', link: '/api/browser-session' },
            { text: '导航与执行', link: '/api/browser-navigate' },
            { text: '页面读取与 Cookie', link: '/api/browser-page' },
          ],
        },
        {
          text: '图片处理',
          items: [{ text: 'legado.image.*', link: '/api/image' }],
        },
        {
          text: '设备标识',
          items: [{ text: 'getMachineUid / getMachineUUID', link: '/api/device-id' }],
        },
        {
          text: '其他',
          items: [
            { text: 'legado.log / toast', link: '/api/log' },
            { text: 'legado.config.*', link: '/api/config' },
            { text: 'legado.ui.emit', link: '/api/ui-emit' },
          ],
        },
        {
          text: '数据结构',
          items: [
            { text: 'BookItem', link: '/api/types-book-item' },
            { text: 'ChapterInfo', link: '/api/types-chapter' },
            { text: '元数据字段', link: '/api/types-meta' },
          ],
        },
      ],

      '/advanced/': [
        {
          text: '进阶',
          items: [
            { text: '浏览器探测实战', link: '/advanced/browser-probe' },
            { text: '鸿蒙兼容性与异步语义', link: '/advanced/harmony-async' },
            { text: 'HTML 交互发现页', link: '/advanced/html-explore' },
            { text: '图片处理 (processImage)', link: '/advanced/process-image' },
            { text: '脚本配置持久化', link: '/advanced/script-config' },
            { text: '内置单元测试 (TEST)', link: '/advanced/unit-test' },
            { text: '最佳实践', link: '/advanced/best-practices' },
          ],
        },
      ],

      '/prompt/': [
        {
          text: 'AI 提示词',
          items: [
            { text: '总览', link: '/prompt/' },
            { text: '如何使用 AI 编程工具', link: '/prompt/ai-workflow' },
            { text: '书源制作提示词', link: '/prompt/booksource' },
            { text: '书源交付智能体提示词', link: '/prompt/booksource-delivery-agent' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/LegadoTeam/Legado-Tauri' }],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    // editLink: {
    //   pattern: 'https://github.com/LegadoTeam/Legado-Tauri/edit/main/public-docs/:path',
    //   text: '在 GitHub 上编辑此页',
    // },

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present Legado Tauri',
    },
  },
});
