import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Legado Tauri",
  description: "开源阅读 Tauri 版 — 书源开发文档",
  lang: "zh-CN",
  base: "/",

  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }]],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Legado Tauri",

    nav: [
      { text: "指南", link: "/guide/introduction", activeMatch: "/guide/" },
      { text: "API 参考", link: "/api/", activeMatch: "/api/" },
      {
        text: "进阶",
        link: "/advanced/browser-probe",
        activeMatch: "/advanced/",
      },
      { text: "AI 提示词", link: "/prompt/", activeMatch: "/prompt/" },
      {
        text: "相关链接",
        items: [
          {
            text: "GitHub docs 仓库",
            link: "https://github.com/LegadoTeam/Legado-docs",
          },
          {
            text: "GitHub Tauri Release 仓库 (下载地址)",
            link: "https://github.com/LegadoTeam/Legado-Tauri-Release",
          },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "入门",
          items: [
            { text: "简介", link: "/guide/introduction" },
            { text: "快速开始", link: "/guide/getting-started" },
            { text: "书源文件结构", link: "/guide/file-structure" },
          ],
        },
        {
          text: "五大核心函数",
          items: [
            { text: "search — 搜索", link: "/guide/search" },
            { text: "bookInfo — 书籍详情", link: "/guide/book-info" },
            { text: "chapterList — 章节目录", link: "/guide/chapter-list" },
            {
              text: "purchaseChapter — VIP 购买",
              link: "/guide/purchase-chapter",
            },
            {
              text: "chapterContent — 章节正文",
              link: "/guide/chapter-content",
            },
            { text: "段评接口", link: "/guide/paragraph-comments" },
            { text: "explore — 发现页", link: "/guide/explore" },
          ],
        },
        {
          text: "书源类型",
          items: [
            { text: "小说书源", link: "/guide/type-novel" },
            { text: "漫画书源", link: "/guide/type-comic" },
            { text: "视频书源", link: "/guide/type-video" },
            { text: "音乐 / 有声书源", link: "/guide/type-music" },
            { text: "网页书源（webpage）", link: "/guide/type-webpage" },
          ],
        },
        {
          text: "测试与调试",
          items: [
            { text: "命令行参考", link: "/guide/cli-testing" },
            { text: "调试技巧", link: "/guide/debugging" },
          ],
        },
        {
          text: "发布与分享",
          items: [
            {
              text: "社区书源仓库规范",
              link: "/guide/community-booksource-repository",
            },
            { text: "在线书源仓库", link: "/guide/online-booksources" },
            { text: "深链接（Deep Link）", link: "/guide/deep-link" },
          ],
        },
        {
          text: "更新日志",
          items: [{ text: "API 更新日志", link: "/guide/changelog" }],
        },
      ],

      "/api/": [
        {
          text: "API 总览",
          items: [{ text: "索引", link: "/api/" }],
        },
        {
          text: "HTTP 请求",
          items: [
            { text: "http.get", link: "/api/http-get" },
            { text: "http.post", link: "/api/http-post" },
            { text: "http.postBinary", link: "/api/http-post-binary" },
            { text: "http.batchGet", link: "/api/http-batch-get" },
            { text: "http.request（高级）", link: "/api/http-request" },
            { text: "fetch / Headers / FormData", link: "/api/http-fetch" },
          ],
        },
        {
          text: "DOM 解析",
          items: [
            { text: "dom2（推荐，对象风格）", link: "/api/dom2" },
            { text: "dom.parse / free", link: "/api/dom-parse" },
            { text: "dom.select / selectAll", link: "/api/dom-select" },
            { text: "dom.text / html / attr", link: "/api/dom-text" },
            { text: "dom 快捷方法", link: "/api/dom-shortcuts" },
            { text: "dom 工具方法", link: "/api/dom-utils" },
          ],
        },
        {
          text: "浏览器探测",
          items: [
            {
              text: "会话管理（acquire / create）",
              link: "/api/browser-session",
            },
            { text: "导航与 eval", link: "/api/browser-navigate" },
            { text: "页面读取与 Cookie", link: "/api/browser-page" },
            { text: "Boa 双向通信", link: "/api/browser-bridge" },
          ],
        },
        {
          text: "编码 / 加密 / 哈希",
          items: [
            { text: "编码函数", link: "/api/encoding" },
            { text: "哈希函数", link: "/api/hash" },
            { text: "加密 / 解密", link: "/api/crypto" },
            { text: "wasm.*", link: "/api/wasm" },
          ],
        },
        {
          text: "图片处理",
          items: [{ text: "image.*", link: "/api/image" }],
        },
        {
          text: "工具 / 其他",
          items: [
            { text: "log / toast", link: "/api/log" },
            { text: "config.*", link: "/api/config" },
            { text: "ui.emit", link: "/api/ui-emit" },
            { text: "设备标识", link: "/api/device-id" },
          ],
        },
        {
          text: "数据结构",
          items: [
            { text: "BookItem", link: "/api/types-book-item" },
            { text: "ChapterInfo", link: "/api/types-chapter" },
            {
              text: "PurchaseChapterResult",
              link: "/api/types-purchase-result",
            },
            { text: "书源元数据字段", link: "/api/types-meta" },
          ],
        },
      ],

      "/advanced/": [
        {
          text: "浏览器探测",
          items: [
            { text: "浏览器探测实战", link: "/advanced/browser-probe" },
            {
              text: "Cloudflare 挑战绕过",
              link: "/advanced/cloudflare-bypass",
            },
          ],
        },
        {
          text: "功能扩展",
          items: [
            { text: "HTML 交互发现页", link: "/advanced/html-explore" },
            {
              text: "图片处理 (processImage)",
              link: "/advanced/process-image",
            },
            { text: "脚本配置持久化", link: "/advanced/script-config" },
            { text: "内置单元测试 (TEST)", link: "/advanced/unit-test" },
          ],
        },
        {
          text: "平台兼容",
          items: [
            { text: "鸿蒙兼容性与异步语义", link: "/advanced/harmony-async" },
          ],
        },
        {
          text: "规范",
          items: [{ text: "最佳实践", link: "/advanced/best-practices" }],
        },
      ],

      "/prompt/": [
        {
          text: "AI 提示词",
          items: [
            { text: "总览", link: "/prompt/" },
            { text: "如何使用 AI 编程工具", link: "/prompt/ai-workflow" },
            { text: "书源制作提示词", link: "/prompt/booksource" },
            {
              text: "书源交付智能体提示词",
              link: "/prompt/booksource-delivery-agent",
            },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/LegadoTeam/Legado-Tauri" },
    ],

    search: {
      provider: "local",
    },

    outline: {
      level: [2, 3],
      label: "本页目录",
    },

    lastUpdated: {
      text: "最后更新于",
    },

    docFooter: {
      prev: "上一篇",
      next: "下一篇",
    },

    // editLink: {
    //   pattern: 'https://github.com/LegadoTeam/Legado-Tauri/edit/main/public-docs/:path',
    //   text: '在 GitHub 上编辑此页',
    // },

    footer: {
      message: "基于 MIT 许可发布",
      copyright: "Copyright © 2024-present Legado Tauri",
    },
  },
});
