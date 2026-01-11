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
 * 将容器挂载到 document.documentElement 而非 document.body
 * 这样可以避免被 ChatGPT 等页面的 React Hydration 清除
 */
export const mountShadowHost: PlasmoMountShadowHost = ({ shadowHost, anchor, mountState }) => {
  const isChatGPT = window.location.hostname.includes("chatgpt.com")

  const doMount = () => {
    // 挂载到 html 元素，而非 body
    if (!shadowHost.parentElement) {
      document.documentElement.appendChild(shadowHost)
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
    observer.observe(document.documentElement, { childList: true, subtree: true })
  } else {
    // 其他站点直接挂载
    doMount()
  }
}

const PlasmoApp = () => {
  return <App />
}

export default PlasmoApp
