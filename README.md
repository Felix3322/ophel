# Ophel

<p align="center">
  <img src="./assets/icon.png" width="120" height="120" alt="Ophel Logo">
</p>

<p align="center">
  <strong>✨ AI 之益，触手可及 ✨</strong><br/>
  <em>AI's Benefit, Within Reach.</em>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg" alt="License"></a>
  <img src="https://img.shields.io/github/package-json/v/urzeye/ophel?color=blue" alt="Version">
  <a href="https://github.com/urzeye/ophel/stargazers"><img src="https://img.shields.io/github/stars/urzeye/ophel?style=social" alt="Stars"></a>
</p>

<p align="center">
  🌐 <a href="./README_EN.md">English</a> | <strong>简体中文</strong>
</p>

---

👋 **Ophel** 是一款浏览器扩展，旨在为您提供更加流畅、高效的 AI 交互体验。它深度集成了 **Gemini**、**Gemini Enterprise**、**AI Studio**、**ChatGPT**、**Grok**、**Claude** 等主流 AI 平台，为您带来统一的大纲导航、会话管理、提示词助手以及极致的个性化定制功能。

## 📹 功能演示

|                                                        大纲 Outline                                                        |                                                     会话 Conversations                                                     |                                                       功能 Features                                                        |
| :------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: |
| <video src="https://github.com/user-attachments/assets/a40eb655-295e-4f9c-b432-9313c9242c9d" width="280" controls></video> | <video src="https://github.com/user-attachments/assets/a249baeb-2e82-4677-847c-2ff584c3f56b" width="280" controls></video> | <video src="https://github.com/user-attachments/assets/4f0628cc-32f2-4b1a-97a3-0188013bd3c0" width="280" controls></video> |

## ✨ 核心功能

### 1. 🧠 智能大纲 (Smart Outline)

- **多层级导航**：自动解析用户问题与 H1-H6 标题，生成清晰的对话结构树。
- **智能过滤**：
  - **用户视角**：支持只显示用户问题，快速回顾对话脉络。
  - **一键复制**：在节点上点击即可复制用户原始问题。
- **智能跟随**：
  - **当前位置**：滚动时自动高亮当前阅读章节。
  - **智能跳转**：点击大纲瞬间平滑定位到对应内容。
  - **最新消息**：对话生成时自动锁定底部。
- **深度整合**：
  - 支持 Shadow DOM 内容解析。
  - 支持渲染用户提问 Markdown，使其在大纲中更易读。

### 2. 💬 会话管理 (Conversation Manager)

- **增强侧边栏**：无限滚动加载历史会话，实时搜索标题。
- **分类与标签**：
  - **标签系统**：为会话添加自定义标签，灵活管理。
  - **多彩文件夹**：使用彩色文件夹整理不同类型的会话。
- **数据导出**：
  - **多格式支持**：将单个会话导出为 **Markdown**、**JSON** 或 **TXT**。
  - **批量操作**：批量选择会话进行管理。
- **同步优化**：支持 WebDAV 同步。

### 3. ⌨️ 提示词助手 (Prompt Manager)

- **高级特性**：
  - **变量支持**：支持定义的 `{{topic}}` 变量，使用时自动弹窗填空。
  - **Markdown 预览**：实时预览提示词的渲染效果。
  - **分类管理**：自定义分类并自动分配色彩，不再是枯燥的列表。
- **数据管理**：
  - **快捷访问**：支持置顶常用提示词、查看最近使用记录。
  - **数据迁移**：独立的导入/导出功能JSON。

### 4. 🛠️ 体验增强 (UX Enhancements)

- **Claude 增强**：

  - **Session Key 管理**：一键切换 Session Key，支持多账号轮询，方便管理身份凭证。

- **界面定制**：
  - **宽屏模式**：自定义页面最大宽度（% 或 px），适配超宽屏。
  - **气泡调整**：独立设置用户提问气泡的宽度。
  - **侧边栏布局**：AI Studio 自动折叠导航栏、设置面板等。
- **阅读辅助**：
  - **滚动锁定**：防止生成时页面乱跳。
  - **阅读历史**：自动记录并恢复上次阅读位置。
  - **Markdown 优化**：
    - 修复 Gemini 响应中的 Markdown 渲染（加粗/代码块）。
    - 实时渲染用户输入框中的 Markdown 源码。
- **内容交互**：
  - **公式复制**：双击 LaTeX 公式直接复制。
  - **表格转换**：一键将表格复制为 Markdown 格式。
  - **水印移除**：自动移除 Gemini/AI Studio 生成图片中的隐形水印。
- **模型锁定**：自动为各平台锁定默认模型。
- **标签页管理**：
  - **自动命名**：根据对话内容自动重命名标签页。
  - **隐私模式**：一键模糊网页标题，保护隐私。
  - **通知提醒**：AI 回复完成时发送桌面通知或播放提示音。
- **自定义快捷键**：支持自定义快捷键，兼容 Windows/macOS 双系统。

### 5. 🎨 外观与主题 (Appearance)

- **多主题支持**：内置多款精心调配的深色/浅色主题。
- **智能切换**：跟随系统或手动切换日夜模式。
- **自定义 CSS**：内置代码高亮编辑器，编写并保存专属样式。

### 6. 🔒 隐私与数据 (Data & Privacy)

- **本地优先**：所有配置和数据默认存储在本地浏览器中。
- **权限管理**：独立的权限管理面板，按需授权，保护隐私。
- **多端同步**：支持 **WebDAV** 协议同步备份（含 Claude Session Key 等敏感数据，安全自掌）。
- **全量备份**：支持导出完整数据或模块化导出（如仅提示词、仅设置）。

## 📦 安装

### 应用商店

🚧 **正在审核中...**

- [Chrome Web Store](#) (Coming Soon)
- [Edge Add-ons](#) (Coming Soon)

### 手动安装

1. 前往 [Releases](https://github.com/urzeye/ophel/releases) 页面下载最新的安装包 (`ophel-vX.Y.Z.zip`)。
2. 解压文件到本地文件夹。
3. 打开浏览器的扩展管理页面 (Chrome: `chrome://extensions`, Edge: `edge://extensions`)。
4. 开启右上角的 **"开发者模式" (Developer mode)**。
5. 点击 **"加载已解压的扩展程序" (Load unpacked)**，选择刚才解压的文件夹。

## 🐛 反馈问题

如有问题或建议，欢迎在 [GitHub Issues](https://github.com/urzeye/ophel/issues) 反馈。

## 🛠️ 技术栈

本项目基于现代化的前端技术栈构建：

- **Core**: [Plasmo](https://docs.plasmo.com/) (Browser Extension Framework)
- **UI**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **Build**: [Vite](https://vitejs.dev/)

## ⭐ Star History

<a href="https://star-history.com/#urzeye/ophel&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date" />
 </picture>
</a>

## 📜 许可证

本项目采用 **CC BY-NC-SA 4.0** (署名-非商业性使用-相同方式共享 4.0 国际) 协议进行许可。
详情请参阅 [LICENSE](./LICENSE) 文件。

> ⚠️ **禁止任何形式的商业打包、倒卖、或未经授权的集成。**
> 若需商业授权，请联系：**<igodu.love@gmail.com>**

---

<p align="center">
  <em>"一个人可以走得很快，但一群人可以走得更远。"</em>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/urzeye">urzeye</a>
</p>
