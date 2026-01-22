# 油猴脚本待解决问题 (Pending Issues)

## 功能适配问题 (Functionality & Adaptation)

1. ~~**权限管理显示问题**~~ ✅ 已解决

   - **现象**：油猴脚本环境中不应展示“权限管理”相关的菜单或页面。
   - **原因**：userscript 无法动态申请权限，也没有 extension 的权限 api。
   - **TODO**：在 features 配置或 UI 渲染中屏蔽 permissions 相关入口。
   - **解决方案**：通过 `platform.hasCapability('permissions')` 判断平台，在油猴环境隐藏菜单并跳过权限检查。

2. ~~**功能模块缺失问题**~~ ✅ 已解决

   - **现象**：加粗修复、复制功能、页面宽度管理、标签页管理、水印移除、阅读历史等功能在油猴脚本中均不生效。
   - **原因**：油猴脚本入口 `entry.tsx` 没有初始化这些功能模块，而浏览器扩展通过 `contents/main.ts` 完成初始化。
   - **解决方案**：
     - 创建 `src/core/modules-init.ts` 共享模块，抽取所有功能模块的初始化和设置监听逻辑
     - 重构 `entry.tsx` (油猴脚本) 和 `contents/main.ts` (浏览器扩展) 使用共享模块
     - 现在两端功能完全一致：ThemeManager、MarkdownFixer、LayoutManager、CopyManager、TabManager、WatermarkRemover、ReadingHistoryManager、ModelLocker、ScrollLockManager、UserQueryMarkdownRenderer

3. ~~**网络请求异常 (GM_xmlhttpRequest)**~~ ✅ 已解决

   - **现象**：水印移除功能报错 "Unknown proxy error"。
   - **原因**：水印移除功能使用 `sendToBackground` 通过 Background Script 代理获取图片，但油猴脚本没有 Background Script。
   - **解决方案**：在 `watermark-remover.ts` 中添加平台检测，油猴脚本环境下使用 `GM_xmlhttpRequest` 直接获取图片并转为 Data URL。

4. ~~**自定义 CSS 报错**~~ ⚠️ 待验证

   - **现象**：打开自定义 CSS 设置时，控制台报 `innerHTML` 相关错误。
   - **可能的追踪方向**：
     - 安全策略 (CSP) 限制？
     - React 在 Shadow DOM 或 userscript 环境下的 HTML 注入限制？
     - `dangerouslySetInnerHTML` 的使用？

5. ~~**表格复制 TrustedHTML 报错**~~ ✅ 已解决

   - **现象**：油猴脚本中复制 Markdown 表格时报错 `This document requires 'TrustedHTML' assignment`
   - **原因**：`utils/icons.ts` 的 `showCopySuccess` 函数使用 `button.innerHTML = ""` 清空内容，Gemini 的 Trusted Types CSP 策略阻止了这一操作
   - **解决方案**：将 `innerHTML = ""` 替换为 `while (button.firstChild) button.removeChild(button.firstChild)` 循环清空子元素

6. ~~**提示词预览 TrustedHTML 错误**~~ ✅ 已解决

   - **现象**：在提示词编辑界面点击预览时报错 "This document requires 'TrustedHTML' assignment"。
   - **原因**：React 的 `dangerouslySetInnerHTML` 直接设置 HTML 字符串，被页面的 Trusted Types CSP 拦截。
   - **解决方案**：创建 `src/utils/trusted-types.ts` 工具，使用 `TrustedTypes` API 创建安全的 HTML 对象。

7. **关于页面描述更新**

   - **需求**：在关于页面的描述中，将支持的平台列表从 "Gemini, ChatGPT, Claude" 更新为包含 "AI Studio" 和 "Grok"。
   - **范围**：涉及所有 10 种语言的 localization 文件及 `AboutPage.tsx` 的 fallback 文本。

8. ~~**隐私模式双击不生效**~~ ✅ 已解决

   - **现象**：油猴脚本中，双击面板标题切换隐私模式无效。
   - **原因**：`TabManager` 仅在开启“自动重命名”或“通知”时初始化，且 `stop()` 方法会移除所有事件监听器。
   - **解决方案**：
     - 修改 `modules-init.ts`: 始终初始化 `TabManager`。
     - 修改 `tab-manager.ts`: 将事件监听器的生命周期与实例生命周期绑定（即在构造函数中绑定，`destroy` 中解绑），不再受 `autoRename` 的 `start/stop` 影响。

## 其他 (Others)

1. **未验证问题**

   - 需继续排查其他潜在的兼容性问题。

2. **Claude Session Key 逻辑完全不可用** 🔴 严重

   - **现象**：在油猴脚本中，Claude Session Key 相关功能（添加、切换、测试）无法正常工作。
   - **原因**：
     - Session Key 管理逻辑可能过度依赖 Chrome Extension API（如 `chrome.cookies`, `chrome.runtime` 消息传递）。
     - Userscript 环境下的 Cookie 操作（`GM_cookie`）和网络请求（`GM_xmlhttpRequest`）与现有 Adapter/Background 逻辑不兼容。
     - `ClaudeAdapter` 或 `ClaudeSettings` 中的逻辑可能没有适配 userscript 平台。
   - **解决方案**：
     - 审查 `ClaudeSettings.tsx` 及相关 Store/Messaging 流程。
     - 确保 Cookie 操作在 Userscript 中使用 `GM_cookie` 或 `document.cookie` 正确实现。
     - 确保 Token 验证请求适配 `GM_xmlhttpRequest`。
