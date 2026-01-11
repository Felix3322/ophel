import cssText from "data-text:~style.css"
import conversationsCssText from "data-text:~styles/conversations.css"
import settingsCssText from "data-text:~styles/settings.css"
import type { PlasmoCSConfig, PlasmoMountShadowHost } from "plasmo"
import React from "react"

import { App } from "~components/App"

export const config: PlasmoCSConfig = {
  matches: [
    "https://gemini.google.com/*",
    "https://business.gemini.google/*",
    "https://aistudio.google.com/*",
    "https://grok.com/*",
    "https://x.com/i/grok/*",
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
  ],
}

export const getStyle = () => {
  const style = document.createElement("style")
  // 合并所有 CSS 样式
  style.textContent = cssText + "\n" + conversationsCssText + "\n" + settingsCssText
  return style
}

/**
 * 自定义 Shadow Host 挂载位置
 *
 * 默认挂载到 document.body（大多数站点）
 * ChatGPT 特殊处理：延迟挂载 + MutationObserver 监控重挂载
 * 因为 ChatGPT 的 React Hydration 会清除 body 下的非预期元素
 */
export const mountShadowHost: PlasmoMountShadowHost = ({ shadowHost, anchor, mountState }) => {
  const isChatGPT =
    window.location.hostname.includes("chatgpt.com") ||
    window.location.hostname.includes("chat.openai.com")

  const doMount = () => {
    if (!shadowHost.parentElement) {
      document.body.appendChild(shadowHost)
    }
  }

  if (isChatGPT) {
    // ChatGPT 需要延迟挂载，等待 React Hydration 完成
    // 使用多次延迟尝试，确保挂载成功
    const delays = [500, 1000, 2000, 3000]
    delays.forEach((delay) => {
      setTimeout(doMount, delay)
    })

    // 使用 MutationObserver 持续监控，如果被移除则重新挂载
    const observer = new MutationObserver(() => {
      if (!shadowHost.parentElement) {
        doMount()
      }
    })
    observer.observe(document.body, { childList: true, subtree: false })
  } else {
    // 其他站点直接挂载到 body
    doMount()
  }
}

const PlasmoApp = () => {
  return <App />
}

export default PlasmoApp
