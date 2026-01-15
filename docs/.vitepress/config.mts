import { defineConfig } from "vitepress"

export default defineConfig({
  title: "Ophel",
  description: "AI 对话增强助手 - Gemini / AI Studio / Grok / ChatGPT / Claude",

  head: [["link", { rel: "icon", href: "/ophel/logo.png" }]],

  // GitHub Pages 部署配置
  base: "/ophel/",

  themeConfig: {
    logo: "/logo.png",

    nav: [
      { text: "指南", link: "/guide/getting-started" },
      {
        text: "功能",
        items: [
          { text: "功能概览", link: "/guide/features/" },
          { text: "智能大纲", link: "/guide/features/outline" },
          { text: "会话管理", link: "/guide/features/conversation" },
          { text: "提示词助手", link: "/guide/features/prompt" },
        ],
      },
      { text: "常见问题", link: "/guide/faq" },
      {
        text: "下载",
        items: [
          { text: "GitHub Releases", link: "https://github.com/urzeye/ophel/releases" },
          { text: "Chrome Web Store", link: "https://chrome.google.com/webstore" },
          { text: "Edge Add-ons", link: "https://microsoftedge.microsoft.com/addons" },
          { text: "Firefox Add-ons", link: "https://addons.mozilla.org" },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "入门",
          items: [{ text: "快速开始", link: "/guide/getting-started" }],
        },
        {
          text: "核心功能",
          items: [
            { text: "功能概览", link: "/guide/features/" },
            { text: "🧠 智能大纲", link: "/guide/features/outline" },
            { text: "💬 会话管理", link: "/guide/features/conversation" },
            { text: "⌨️ 提示词助手", link: "/guide/features/prompt" },
          ],
        },
        {
          text: "更多功能",
          items: [
            { text: "⚡ 体验增强", link: "/guide/enhancements" },
            { text: "🎨 外观定制", link: "/guide/appearance" },
            { text: "🔒 隐私与数据", link: "/guide/privacy" },
          ],
        },
        {
          text: "帮助",
          items: [{ text: "❓ 常见问题", link: "/guide/faq" }],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/urzeye/ophel" }],

    footer: {
      message: "Released under the CC BY-NC-SA 4.0 License.",
      copyright: "Copyright © 2024-present Ophel",
    },

    search: {
      provider: "local",
    },

    // 中文配置
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    outline: {
      label: "页面导航",
      level: [2, 3],
    },
    lastUpdated: {
      text: "最后更新于",
    },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",

    // 编辑链接
    editLink: {
      pattern: "https://github.com/urzeye/ophel/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页",
    },
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
  },
})
