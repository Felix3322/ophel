/**
 * 应用全局配置
 * 在此处定义应用名称、版本等全局常量
 */

// 应用名称（用于备份文件名等）
export const APP_NAME = "ophel"

// 应用显示名称
export const APP_DISPLAY_NAME = "Ophel"

// 应用版本 - 从 manifest 自动获取，与 package.json 保持同步
export const APP_VERSION = chrome.runtime.getManifest().version

// 应用图标 URL（从扩展资源获取）
export const APP_ICON_URL = chrome.runtime.getURL("assets/icon.png")
