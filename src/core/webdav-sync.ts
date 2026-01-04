/**
 * WebDAV 同步管理器
 * 支持将本地数据同步到 WebDAV 服务器（如坚果云、Nextcloud 等）
 */

import { APP_NAME } from "~utils/config"
import { MSG_WEBDAV_REQUEST } from "~utils/messaging"
import { localStorage, STORAGE_KEYS, type Settings } from "~utils/storage"

function safeDecodeURIComponent(str: string) {
  try {
    return decodeURIComponent(str)
  } catch (e) {
    return str
  }
}

// WebDAV 配置接口
export interface WebDAVConfig {
  enabled: boolean
  url: string // WebDAV 服务器地址，如 https://dav.jianguoyun.com/dav/
  username: string
  password: string // 应用专用密码
  syncMode: "manual" | "auto"
  syncInterval: number // 自动同步间隔（分钟）
  remoteDir: string // 远程备份目录，如 /backup
  lastSyncTime?: number // 上次同步时间戳
  lastSyncStatus?: "success" | "failed" | "syncing"
}

export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  enabled: false,
  url: "",
  username: "",
  password: "",
  syncMode: "manual",
  syncInterval: 30,
  remoteDir: APP_NAME,
}

/**
 * 生成备份文件名
 * 格式：{appName}_backup_{timestamp}.json
 */
function generateBackupFileName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hour = String(now.getHours()).padStart(2, "0")
  const minute = String(now.getMinutes()).padStart(2, "0")
  const second = String(now.getSeconds()).padStart(2, "0")

  const timestamp = `${year}-${month}-${day}_${hour}-${minute}-${second}`
  return `${APP_NAME}_backup_${timestamp}.json`
}

// 同步结果
export interface SyncResult {
  success: boolean
  messageKey: string // 国际化键名
  messageArgs?: Record<string, any> // 消息参数（如错误详情）
  timestamp?: number
}

/**
 * 备份文件信息
 */
export interface BackupFile {
  name: string
  size: number
  lastModified: Date
  path: string
}

/**
 * WebDAV 同步管理器
 */
export class WebDAVSyncManager {
  private config: WebDAVConfig = DEFAULT_WEBDAV_CONFIG
  private autoSyncTimer: NodeJS.Timeout | null = null

  constructor() {
    this.loadConfig()
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<WebDAVConfig> {
    const settings = await localStorage.get<Settings>(STORAGE_KEYS.SETTINGS)
    if (settings?.webdav) {
      this.config = { ...DEFAULT_WEBDAV_CONFIG, ...settings.webdav }
    }
    return this.config
  }

  /**
   * 保存配置
   */
  async saveConfig(config: Partial<WebDAVConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    const settings = (await localStorage.get<Settings>(STORAGE_KEYS.SETTINGS)) || {}
    await localStorage.set(STORAGE_KEYS.SETTINGS, {
      ...settings,
      webdav: this.config,
    })
  }

  /**
   * 获取当前配置
   */
  getConfig(): WebDAVConfig {
    return { ...this.config }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<SyncResult> {
    if (!this.config.url || !this.config.username || !this.config.password) {
      return { success: false, messageKey: "webdavConfigIncomplete" }
    }

    try {
      // 发送 PROPFIND 请求测试连接（测试备份目录是否可访问）
      const response = await this.request("PROPFIND", this.config.remoteDir, null, {
        Depth: "0",
      })

      if (response.ok || response.status === 404) {
        // 404 表示文件不存在但连接成功
        return { success: true, messageKey: "webdavConnectionSuccess" }
      } else if (response.status === 401) {
        return { success: false, messageKey: "webdavAuthFailed" }
      } else {
        return {
          success: false,
          messageKey: "webdavConnectionFailed",
          messageArgs: { status: response.status },
        }
      }
    } catch (err) {
      return {
        success: false,
        messageKey: "webdavConnectionFailed",
        messageArgs: { error: String(err) },
      }
    }
  }

  /**
   * 上传数据到 WebDAV
   */
  async upload(): Promise<SyncResult> {
    if (!this.config.url || !this.config.username || !this.config.password) {
      return { success: false, messageKey: "webdavConfigIncomplete" }
    }

    try {
      await this.saveConfig({ lastSyncStatus: "syncing" })

      // 获取本地所有数据
      const localData = await new Promise<Record<string, any>>((resolve) =>
        chrome.storage.local.get(null, resolve),
      )

      // Hydrate data (Plasmo stores objects as JSON strings, we want clean JSON on cloud)
      const hydratedData = Object.fromEntries(
        Object.entries(localData).map(([k, v]) => {
          try {
            return [k, typeof v === "string" ? JSON.parse(v) : v]
          } catch {
            return [k, v]
          }
        }),
      )

      const exportData = {
        version: 2,
        timestamp: new Date().toISOString(),
        data: hydratedData,
      }

      // 上传到 WebDAV（使用动态生成的文件名）
      const fileName = generateBackupFileName()
      const remotePath = this.buildRemotePath(fileName)

      // 确保目录存在
      if (this.config.remoteDir) {
        try {
          // 尝试创建目录，如果已存在通常会返回 405
          const mkcolResponse = await this.request("MKCOL", this.config.remoteDir)
          // 201 Created
        } catch (e) {
          // 忽略创建目录失败（可能是已存在 405，或无权限等，后续 PUT 会再次验证）
          // 实际上 405 会被 request 视为失败抛出 error，这里 catch 住即可
        }
      }

      const response = await this.request("PUT", remotePath, JSON.stringify(exportData, null, 2), {
        "Content-Type": "application/json",
      })

      if (response.ok || response.status === 201 || response.status === 204) {
        const now = Date.now()
        await this.saveConfig({ lastSyncTime: now, lastSyncStatus: "success" })
        return { success: true, messageKey: "webdavUploadSuccess", timestamp: now }
      } else {
        await this.saveConfig({ lastSyncStatus: "failed" })
        return {
          success: false,
          messageKey: "webdavUploadFailed",
          messageArgs: { status: response.status },
        }
      }
    } catch (err) {
      await this.saveConfig({ lastSyncStatus: "failed" })
      return {
        success: false,
        messageKey: "webdavUploadFailed",
        messageArgs: { error: String(err) },
      }
    }
  }

  /**
   * 获取备份列表（按时间倒序）
   */
  async getBackupList(limit: number = 10): Promise<BackupFile[]> {
    if (!this.config.url || !this.config.username || !this.config.password) {
      return []
    }

    try {
      // PROPFIND 获取目录列表详细信息
      // 请求体告诉服务器我们需要哪些属性
      const body = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
  </D:prop>
</D:propfind>`

      const response = await this.request("PROPFIND", this.config.remoteDir, body, {
        Depth: "1",
        "Content-Type": "application/xml",
      })

      if (!response.ok) return []

      const text = await response.text()
      // 简单正则解析 XML
      // 匹配 <D:response> 块
      const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/gi
      const responses = Array.from(text.matchAll(responseRegex))

      const files: BackupFile[] = []

      for (const match of responses) {
        const content = match[1]

        // 解析 href
        const hrefMatch = content.match(/<d:href>([^<]+)<\/d:href>/i)
        if (!hrefMatch) continue
        const href = safeDecodeURIComponent(hrefMatch[1])

        // 排除目录本身（通常以斜杠结尾，或者是请求的根路径）
        // 这里简单判断：如果是 json 文件且包含 backup 关键字
        if (!href.endsWith(".json") || !href.includes(`${APP_NAME}_backup_`)) continue

        // 解析大小
        const sizeMatch = content.match(/<d:getcontentlength>([^<]+)<\/d:getcontentlength>/i)
        const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0

        // 解析时间
        const timeMatch = content.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i)
        const lastModified = timeMatch ? new Date(timeMatch[1]) : new Date(0)

        // 提取文件名
        const name = href.split("/").pop() || href

        files.push({
          name,
          path: href,
          size,
          lastModified,
        })
      }

      // 按时间倒序
      files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

      return files.slice(0, limit)
    } catch (err) {
      console.error("Failed to get backup list:", err)
      return []
    }
  }

  /**
   * 删除备份文件
   */
  async deleteFile(fileName: string): Promise<SyncResult> {
    if (!this.config.url || !this.config.username || !this.config.password) {
      return { success: false, messageKey: "webdavConfigIncomplete" }
    }

    try {
      const remotePath = this.buildRemotePath(fileName)
      const response = await this.request("DELETE", remotePath)

      if (response.ok || response.status === 204 || response.status === 404) {
        return { success: true, messageKey: "webdavDeleteSuccess" }
      } else {
        return {
          success: false,
          messageKey: "webdavDeleteFailed",
          messageArgs: { status: response.status },
        }
      }
    } catch (err) {
      return {
        success: false,
        messageKey: "webdavDeleteFailed",
        messageArgs: { error: String(err) },
      }
    }
  }

  /**
   * 从 WebDAV 下载并恢复数据
   * @param targetFileName 可选，指定下载的文件名。若不指定则下载最新。
   */
  async download(targetFileName?: string): Promise<SyncResult> {
    if (!this.config.url || !this.config.username || !this.config.password) {
      return { success: false, messageKey: "webdavConfigIncomplete" }
    }

    try {
      await this.saveConfig({ lastSyncStatus: "syncing" })

      let fileName = targetFileName
      if (!fileName) {
        // Find latest backup
        const list = await this.getBackupList(1)
        if (list.length === 0) {
          await this.saveConfig({ lastSyncStatus: "failed" })
          return { success: false, messageKey: "webdavFileNotFound" }
        }
        fileName = list[0].name
      }

      const remotePath = this.buildRemotePath(fileName)
      const response = await this.request("GET", remotePath)

      if (!response.ok) {
        await this.saveConfig({ lastSyncStatus: "failed" })
        return {
          success: false,
          messageKey: "webdavDownloadFailed",
          messageArgs: { status: response.status },
        }
      }

      const text = await response.text()
      const backupData = JSON.parse(text)

      if (!backupData.version || !backupData.data) {
        await this.saveConfig({ lastSyncStatus: "failed" })
        return { success: false, messageKey: "webdavInvalidFormat" }
      }

      // 1. 保存当前的WebDAV配置(避免被备份数据覆盖)
      const currentWebdavConfig = this.config

      // 2. Dehydrate: 将对象序列化回JSON字符串(与Plasmo Storage格式匹配)
      // Plasmo Storage会自动将对象序列化为JSON字符串存储,
      // 备份时我们hydrate成对象,恢复时需要dehydrate回字符串
      const dehydratedData = Object.fromEntries(
        Object.entries(backupData.data).map(([k, v]) => {
          // 如果值是对象或数组,序列化为JSON字符串
          if (v !== null && typeof v === "object") {
            return [k, JSON.stringify(v)]
          }
          return [k, v]
        }),
      )

      // 3. 恢复备份数据
      await new Promise<void>((resolve, reject) =>
        chrome.storage.local.set(dehydratedData, () =>
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(),
        ),
      )

      // 4. 恢复当前的WebDAV配置(保持用户当前的WebDAV设置)
      await this.saveConfig(currentWebdavConfig)

      const now = Date.now()
      return { success: true, messageKey: "webdavDownloadSuccess", timestamp: now }
    } catch (err) {
      await this.saveConfig({ lastSyncStatus: "failed" })
      return {
        success: false,
        messageKey: "webdavDownloadFailed",
        messageArgs: { error: String(err) },
      }
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync(): void {
    this.stopAutoSync()
    if (this.config.enabled && this.config.syncMode === "auto" && this.config.syncInterval > 0) {
      this.autoSyncTimer = setInterval(
        () => {
          this.upload()
        },
        this.config.syncInterval * 60 * 1000,
      )
    }
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  /**
   * 构建远程文件路径
   * 结果格式: remoteDir/fileName (e.g., "ophel/filename.json")
   */
  private buildRemotePath(fileName: string): string {
    let dir = this.config.remoteDir.trim()
    // 去除开头和结尾的斜杠
    dir = dir.replace(/^\/+|\/+$/g, "")
    // 如果 dir 为空，直接返回文件名
    if (!dir) return fileName
    return `${dir}/${fileName}`
  }

  /**
   * 发送 WebDAV 请求（通过 background service worker 绕过 CORS）
   */
  private async request(
    method: string,
    path: string,
    body?: string | null,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const url = this.buildUrl(path)

    // 通过 background 代理请求以绕过 CORS
    const response = await chrome.runtime.sendMessage({
      type: MSG_WEBDAV_REQUEST,
      method,
      url,
      body,
      headers,
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
    })

    if (!response.success) {
      throw new Error(response.error || "WebDAV request failed")
    }

    // 构造一个类 Response 对象返回
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      text: async () => response.body,
      headers: {
        get: (name: string) => response.headers?.[name.toLowerCase()] || null,
      },
    } as unknown as Response
  }

  /**
   * 构建完整 URL
   * 逻辑：baseUrl + path
   * path 可能是 "ophel" (remoteDir) 或 "ophel/backup.json" (remoteDir + filename)
   */
  private buildUrl(path: string): string {
    let baseUrl = this.config.url.trim()
    if (!baseUrl.endsWith("/")) baseUrl += "/"

    // 移除 path 开头的斜杠，防止双斜杠
    const cleanPath = path.replace(/^\/+/, "")

    return baseUrl + cleanPath
  }
}

// 单例
let instance: WebDAVSyncManager | null = null

export function getWebDAVSyncManager(): WebDAVSyncManager {
  if (!instance) {
    instance = new WebDAVSyncManager()
  }
  return instance
}
