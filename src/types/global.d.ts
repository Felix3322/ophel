/**
 * 全局类型声明
 * 为 window 对象上的自定义属性提供类型支持
 */

import type { ThemeManager } from "~core/theme-manager"

declare global {
  interface Window {
    /** Chat Helper 初始化标记 */
    chatHelperInitialized?: boolean
    /** 全局 ThemeManager 实例 */
    __ghThemeManager?: ThemeManager
    /** 滚动锁定初始化标记 */
    __chatHelperScrollLockInitialized?: boolean
    /** 滚动锁定是否启用 */
    __chatHelperScrollLockEnabled?: boolean
    /** 原始滚动 API 备份 */
    __chatHelperOriginalApis?: {
      scrollIntoView: typeof Element.prototype.scrollIntoView
      scrollTo: typeof window.scrollTo
    }
    /** iframe 滚动初始化标记 */
    __chatHelperIframeScrollInitialized?: boolean
  }
}

export {}
