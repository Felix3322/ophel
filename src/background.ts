import { APP_DISPLAY_NAME } from "~utils/config"
import {
  MSG_CHECK_CLAUDE_GENERATING,
  MSG_CHECK_PERMISSION,
  MSG_CHECK_PERMISSIONS,
  MSG_FOCUS_TAB,
  MSG_GET_CLAUDE_SESSION_KEY,
  MSG_OPEN_OPTIONS_PAGE,
  MSG_OPEN_URL,
  MSG_PROXY_FETCH,
  MSG_REQUEST_PERMISSIONS,
  MSG_REVOKE_PERMISSIONS,
  MSG_SET_CLAUDE_SESSION_KEY,
  MSG_SHOW_NOTIFICATION,
  MSG_SWITCH_NEXT_CLAUDE_KEY,
  MSG_TEST_CLAUDE_TOKEN,
  MSG_WEBDAV_REQUEST,
  type ExtensionMessage,
} from "~utils/messaging"
import { localStorage, type Settings } from "~utils/storage"

/**
 * Ophel - Background Service Worker
 *
 * 后台服务，处理：
 * - 桌面通知
 * - 标签页管理
 * - 跨标签页消息
 * - 代理请求（图片 Base64 转换等）
 */

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(() => {
  setupDynamicRules()
})

// 监听权限移除
chrome.permissions.onRemoved.addListener(async (removed) => {
  if (removed.origins && removed.origins.includes("<all_urls>")) {
    // 获取当前设置
    const settings = await localStorage.get<Settings>("settings")
    if (settings && settings.content?.watermarkRemoval) {
      // 关闭去水印
      settings.content.watermarkRemoval = false
      await localStorage.set("settings", settings)
    }
  }
})

// 监听全局快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-global-url") {
    const settings = await localStorage.get<Settings>("settings")
    const url = settings?.shortcuts?.globalUrl || "https://gemini.google.com"
    chrome.tabs.create({ url, active: true })
  }
})

// 设置动态规则以支持CORS + Credentials（去水印功能）
// 使用 declarativeNetRequestWithHostAccess 权限 + 必需 host_permissions (*.googleusercontent.com)
async function setupDynamicRules() {
  // *.googleusercontent.com 已在 manifest host_permissions 中声明，无需额外权限检查

  const extensionOrigin = chrome.runtime.getURL("").slice(0, -1) // 移除末尾的 /

  // 移除旧规则
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules()
  const oldRuleIds = oldRules.map((rule) => rule.id)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
  })

  // 定义Header修改动作
  const headerActionHeaders = {
    requestHeaders: [
      {
        header: "Referer",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "https://gemini.google.com/",
      },
      {
        header: "Origin",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "https://gemini.google.com",
      },
    ],
    responseHeaders: [
      {
        header: "Access-Control-Allow-Origin",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: extensionOrigin,
      },
      {
        header: "Access-Control-Allow-Credentials",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "true",
      },
    ],
  }

  // 添加新规则
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1001,
        priority: 2, // 高优先级
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: headerActionHeaders.requestHeaders,
          responseHeaders: headerActionHeaders.responseHeaders,
        },
        condition: {
          // 排除页面本身发起的请求，主要针对扩展的后台请求
          excludedInitiatorDomains: ["google.com", "gemini.google.com"],
          urlFilter: "*://*.googleusercontent.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
          ],
        },
      },
      {
        id: 1002,
        priority: 2,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: headerActionHeaders.requestHeaders,
          responseHeaders: headerActionHeaders.responseHeaders,
        },
        condition: {
          // 排除页面本身发起的请求
          excludedInitiatorDomains: ["google.com", "gemini.google.com"],
          urlFilter: "*://*.google.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
          ],
        },
      },
    ],
  })
}

// 消息监听 - 与 Content Script 通信
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.type) {
    case MSG_SHOW_NOTIFICATION:
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon.png"),
        title: message.title || APP_DISPLAY_NAME,
        message: message.body || "",
        silent: true, // 禁用系统默认通知声音，由扩展自行播放自定义声音
      })
      sendResponse({ success: true })
      break

    case MSG_FOCUS_TAB:
      if (sender.tab?.id) {
        chrome.tabs.update(sender.tab.id, { active: true })
        if (sender.tab.windowId) {
          chrome.windows.update(sender.tab.windowId, { focused: true })
        }
      }
      sendResponse({ success: true })
      break

    case MSG_PROXY_FETCH:
      ;(async () => {
        try {
          // 确保规则已设置
          const rules = await chrome.declarativeNetRequest.getDynamicRules()
          if (!rules || rules.length === 0 || !rules.find((r) => r.id === 1001)) {
            await setupDynamicRules()
          }

          // 携带credentials以便访问需要认证的图片资源
          // Dynamic Rules会自动处理 Referer/Origin 和 Access-Control-Allow-Origin
          const response = await fetch(message.url, {
            credentials: "include",
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const blob = await response.blob()
          const reader = new FileReader()
          reader.onloadend = () => {
            sendResponse({ success: true, data: reader.result })
          }
          reader.onerror = () => {
            sendResponse({ success: false, error: "Failed to read blob" })
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.error("Proxy fetch failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_WEBDAV_REQUEST:
      ;(async () => {
        try {
          const { method, url, body, headers, auth } = message as any
          const fetchHeaders: Record<string, string> = { ...headers }

          // 添加 Basic Auth
          if (auth?.username && auth?.password) {
            const credentials = btoa(`${auth.username}:${auth.password}`)
            fetchHeaders["Authorization"] = `Basic ${credentials}`
          }

          const response = await fetch(url, {
            method,
            headers: fetchHeaders,
            body: body || undefined,
          })

          // 获取响应文本
          const responseText = await response.text()

          sendResponse({
            success: true,
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            headers: Object.fromEntries(response.headers.entries()),
          })
        } catch (err) {
          console.error("WebDAV request failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_CHECK_PERMISSION:
      ;(async () => {
        try {
          const { origin } = message as any
          const hasPermission = await chrome.permissions.contains({
            origins: [origin],
          })
          sendResponse({ success: true, hasPermission })
        } catch (err) {
          console.error("Permission check failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    // 检查多个权限
    case MSG_CHECK_PERMISSIONS:
      ;(async () => {
        try {
          const { origins, permissions } = message as any
          const hasPermission = await chrome.permissions.contains({
            origins,
            permissions,
          })
          sendResponse({ success: true, hasPermission })
        } catch (err) {
          console.error("Permissions check failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    // 撤销权限
    case MSG_REVOKE_PERMISSIONS:
      ;(async () => {
        try {
          const { origins, permissions } = message as any
          const removed = await chrome.permissions.remove({
            origins,
            permissions,
          })
          sendResponse({ success: true, removed })
        } catch (err) {
          console.error("Permissions revoke failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    // 请求权限：打开最小化权限请求页面
    case MSG_REQUEST_PERMISSIONS:
      ;(async () => {
        try {
          // 从消息中获取权限类型，默认为 allUrls
          const permType = (message as any).permType || "allUrls"
          const url = chrome.runtime.getURL(`tabs/perm-request.html?type=${permType}`)

          // 获取当前窗口信息以计算居中位置
          const currentWindow = await chrome.windows.getCurrent()
          const width = 450
          const height = 380
          const left = currentWindow.left! + Math.round((currentWindow.width! - width) / 2)
          const top = currentWindow.top! + Math.round((currentWindow.height! - height) / 2)

          // 最小化弹窗，居中显示
          await chrome.windows.create({
            url,
            type: "popup",
            width,
            height,
            left,
            top,
            focused: true,
          })

          sendResponse({ success: true })
        } catch (err) {
          console.error("Request permissions flow failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_OPEN_OPTIONS_PAGE:
      ;(async () => {
        try {
          const optionsUrl = chrome.runtime.getURL("tabs/options.html")
          // 直接创建新标签页（不需要 tabs 权限）
          await chrome.tabs.create({
            url: optionsUrl,
            active: true,
          })
          sendResponse({ success: true })
        } catch (err) {
          console.error("Open options page failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_OPEN_URL:
      ;(async () => {
        try {
          const { url } = message as any
          await chrome.tabs.create({
            url,
            active: true,
          })
          sendResponse({ success: true })
        } catch (err) {
          console.error("Open URL failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_SET_CLAUDE_SESSION_KEY:
      ;(async () => {
        try {
          const { key } = message as any

          if (key) {
            // 设置cookie
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: key,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          } else {
            // 移除cookie(使用默认)
            await chrome.cookies.remove({
              url: "https://claude.ai",
              name: "sessionKey",
            })
          }

          // 查找并刷新所有 claude.ai 标签页（而非发送消息的页面）
          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })
          for (const tab of claudeTabs) {
            if (tab.id) {
              await chrome.tabs.reload(tab.id)
            }
          }

          sendResponse({ success: true, reloadedTabs: claudeTabs.length })
        } catch (err) {
          console.error("Set Claude SessionKey failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_SWITCH_NEXT_CLAUDE_KEY:
      ;(async () => {
        try {
          // 1. 获取所有 keys 和当前 ID
          // Zustand persist 存储结构: { state: { keys: [], currentKeyId: "" }, version: 0 }
          const storageData = await localStorage.get<any>("claudeSessionKeys")
          const keys = storageData?.state?.keys || []

          if (keys.length === 0) {
            sendResponse({ success: false, error: "No keys found" })
            return
          }

          const currentId = storageData?.state?.currentKeyId

          // 2. 找到下一个 Key
          let nextIndex = 0
          if (currentId) {
            const currentIndex = keys.findIndex((k: any) => k.id === currentId)
            if (currentIndex !== -1) {
              nextIndex = (currentIndex + 1) % keys.length
            }
          }

          const nextKey = keys[nextIndex]
          if (!nextKey) {
            sendResponse({ success: false, error: "Next key not found" })
            return
          }

          // 3. 设置 Cookie
          if (nextKey.key) {
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: nextKey.key,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          }

          // 4. 更新存储中的当前 Key ID (以保持状态一致)
          if (storageData?.state) {
            storageData.state.currentKeyId = nextKey.id
            await localStorage.set("claudeSessionKeys", storageData)
          }

          // 5. 刷新标签页
          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })
          for (const tab of claudeTabs) {
            if (tab.id) {
              await chrome.tabs.reload(tab.id)
            }
          }

          sendResponse({ success: true, keyName: nextKey.name })
        } catch (err) {
          console.error("Switch Claude SessionKey failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_TEST_CLAUDE_TOKEN:
      // 测试Claude Token有效性
      // 由于浏览器 fetch API 无法手动设置 Cookie header，需要临时设置 cookie 后使用 credentials: include
      ;(async () => {
        let originalCookie: chrome.cookies.Cookie | null = null

        try {
          const { sessionKey } = message as any

          // 1. 备份当前的 sessionKey cookie
          const existingCookies = await chrome.cookies.getAll({
            url: "https://claude.ai",
            name: "sessionKey",
          })
          originalCookie = existingCookies.length > 0 ? existingCookies[0] : null

          // 2. 临时设置待测试的 sessionKey cookie
          await chrome.cookies.set({
            url: "https://claude.ai",
            name: "sessionKey",
            value: sessionKey,
            domain: ".claude.ai",
            path: "/",
            secure: true,
            sameSite: "lax",
          })

          // 3. 发起请求（使用 credentials: include 让浏览器自动携带 cookie）
          const response = await fetch("https://claude.ai/api/organizations", {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
            credentials: "include",
          })

          // 4. 恢复原来的 cookie
          if (originalCookie) {
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: originalCookie.value,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          } else {
            // 原来没有 cookie，删除临时设置的
            await chrome.cookies.remove({
              url: "https://claude.ai",
              name: "sessionKey",
            })
          }

          // 5. 处理响应
          if (!response.ok) {
            sendResponse({
              success: true,
              isValid: false,
              error: `HTTP ${response.status}`,
            })
            return
          }

          const responseText = await response.text()

          // 检查 unauthorized
          if (responseText.toLowerCase().includes("unauthorized")) {
            sendResponse({
              success: true,
              isValid: false,
              error: "Unauthorized",
            })
            return
          }

          // 检查空响应
          if (!responseText.trim()) {
            sendResponse({
              success: true,
              isValid: false,
              error: "Empty response",
            })
            return
          }

          // 解析 JSON
          let orgs
          try {
            orgs = JSON.parse(responseText)
          } catch {
            sendResponse({
              success: true,
              isValid: false,
              error: "Invalid JSON",
            })
            return
          }

          if (!orgs || !Array.isArray(orgs) || orgs.length === 0) {
            sendResponse({
              success: true,
              isValid: false,
              error: "No organizations",
            })
            return
          }

          // 识别账号类型（参考油猴脚本的逻辑）
          const org = orgs[0]
          const tier = org?.rate_limit_tier
          const capabilities = org?.capabilities || []
          const apiDisabledReason = org?.api_disabled_reason

          let accountType = "Unknown"
          if (tier === "default_claude_max_5x") {
            accountType = "Max(5x)"
          } else if (tier === "default_claude_max_20x") {
            accountType = "Max(20x)"
          } else if (tier === "default_claude_ai") {
            accountType = "Free"
          } else if (tier === "auto_api_evaluation") {
            accountType = apiDisabledReason === "out_of_credits" ? "API(无额度)" : "API"
          } else if (capabilities.includes("claude_max")) {
            accountType = "Max"
          } else if (capabilities.includes("api")) {
            accountType = "API"
          } else if (capabilities.includes("chat")) {
            accountType = "Free"
          }

          sendResponse({
            success: true,
            isValid: true,
            accountType,
          })
        } catch (err) {
          // 确保即使出错也恢复原 cookie
          try {
            if (originalCookie) {
              await chrome.cookies.set({
                url: "https://claude.ai",
                name: "sessionKey",
                value: originalCookie.value,
                domain: ".claude.ai",
                path: "/",
                secure: true,
                sameSite: "lax",
              })
            }
          } catch {
            // 忽略恢复失败
          }

          console.error("Test Claude Token failed:", err)
          sendResponse({
            success: true,
            isValid: false,
            error: (err as Error).message,
          })
        }
      })()
      break

    case MSG_GET_CLAUDE_SESSION_KEY:
      // 获取Claude SessionKey Cookie
      ;(async () => {
        try {
          const cookies = await chrome.cookies.getAll({
            url: "https://claude.ai",
            name: "sessionKey",
          })

          if (cookies && cookies.length > 0) {
            sendResponse({
              success: true,
              sessionKey: cookies[0].value,
            })
          } else {
            sendResponse({
              success: false,
              error: "未找到sessionKey Cookie",
            })
          }
        } catch (err) {
          console.error("Get Claude SessionKey failed:", err)
          sendResponse({
            success: false,
            error: (err as Error).message,
          })
        }
      })()
      break

    case MSG_CHECK_CLAUDE_GENERATING:
      // 检测 claude.ai 页面是否正在生成（向所有 claude.ai 标签页查询）
      ;(async () => {
        try {
          // 查找所有 claude.ai 标签页
          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })

          if (claudeTabs.length === 0) {
            // 没有打开 claude.ai，安全
            sendResponse({ success: true, isGenerating: false })
            return
          }

          // 向每个标签页发送查询消息
          // 只要有一个正在生成，就返回 true
          let isGenerating = false

          for (const tab of claudeTabs) {
            if (!tab.id) continue
            try {
              const result = await chrome.tabs.sendMessage(tab.id, {
                type: "CHECK_IS_GENERATING",
              })
              if (result?.isGenerating) {
                isGenerating = true
                break
              }
            } catch {
              // 标签页可能没有内容脚本，忽略
            }
          }

          sendResponse({ success: true, isGenerating })
        } catch (err) {
          console.error("Check Claude generating failed:", err)
          // 出错时返回不确定，默认允许
          sendResponse({ success: true, isGenerating: false })
        }
      })()
      break

    default:
      sendResponse({ success: false, error: "Unknown message type" })
  }

  return true // 保持消息通道打开
})

export {}
