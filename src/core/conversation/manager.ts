import type { ConversationInfo, ConversationObserverConfig, SiteAdapter } from "~adapters/base"
import { DEFAULT_FOLDERS, type Folder } from "~constants"
import { DOMToolkit } from "~utils/dom-toolkit"
import {
  createExportMetadata,
  downloadFile,
  formatToJSON,
  formatToMarkdown,
  formatToTXT,
  htmlToMarkdown,
  type ExportFormat,
} from "~utils/exporter"
import { getLocalData, getSetting, setLocalData, setSetting, STORAGE_KEYS } from "~utils/storage"
import { showToast } from "~utils/toast"

import type { Conversation, ConversationData, Tag } from "./types"

export type { Conversation, ConversationData, Folder, Tag }

export class ConversationManager {
  public readonly siteAdapter: SiteAdapter
  private folders: Folder[] = []
  private conversations: Record<string, Conversation> = {}
  private lastUsedFolderId: string = "inbox"

  // Observer state
  private observerConfig: ConversationObserverConfig | null = null
  private sidebarObserverStop: (() => void) | null = null
  private observerContainer: Node | null = null
  private titleWatcher: any = null // DOMToolkit watcher instance
  private pollInterval: NodeJS.Timeout | null = null

  // Settings (passed in or fetched?)
  // We assume settings regarding 'syncUnpin' are passed or fetched.
  // Ideally passed in constructor or updated via method.
  private syncUnpin: boolean = false

  // 数据变更回调（用于通知 UI 刷新）
  private onChangeCallbacks: Array<() => void> = []

  constructor(adapter: SiteAdapter) {
    this.siteAdapter = adapter
  }

  /**
   * 订阅数据变更事件
   * @returns 取消订阅函数
   */
  onDataChange(callback: () => void): () => void {
    this.onChangeCallbacks.push(callback)
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * 触发数据变更通知
   */
  notifyDataChange() {
    this.onChangeCallbacks.forEach((cb) => cb())
  }

  async init() {
    await this.loadData()
    await this.loadTags()
    this.startSidebarObserver()
  }

  destroy() {
    this.stopSidebarObserver()
  }

  updateSettings(settings: { syncUnpin: boolean }) {
    this.syncUnpin = settings.syncUnpin
  }

  // ================= Data Loading =================

  async loadData() {
    // Load Folders (Sync)
    this.folders = await getSetting<Folder[]>(STORAGE_KEYS.FOLDERS, DEFAULT_FOLDERS)
    if (this.folders.length === 0) {
      this.folders = [...DEFAULT_FOLDERS]
      await this.saveFolders()
    }

    // Load Last Used Folder
    // We can store this in Sync or Local? Sync likely.
    // For now, let's assume it's part of settings or stored separately?
    // Original script stored it in one object.
    // We'll store it in local storage to avoid sync conflicts on different devices?
    // Actually, user preference should probably sync.
    // Let's use a separate key or group it?
    // I'll put it in local storage for now as "state".
    // Or store it with conversations?
    // Let's store it with conversations in LOCAL since it's UI state.

    // Load Conversations (Local)
    const savedConvos = await getLocalData<{
      conversations: Record<string, Conversation>
      lastUsedFolderId: string
    } | null>(STORAGE_KEYS.LOCAL.CONVERSATIONS, null)

    if (savedConvos) {
      this.conversations = savedConvos.conversations || {}
      this.lastUsedFolderId = savedConvos.lastUsedFolderId || "inbox"
    } else {
      this.conversations = {}
      this.lastUsedFolderId = "inbox"
    }
  }

  async saveFolders() {
    await setSetting(STORAGE_KEYS.FOLDERS, this.folders)
  }

  async saveConversations() {
    await setLocalData(STORAGE_KEYS.LOCAL.CONVERSATIONS, {
      conversations: this.conversations,
      lastUsedFolderId: this.lastUsedFolderId,
    })
  }

  // ================= Observer Logic =================

  startSidebarObserver() {
    if (this.sidebarObserverStop) return

    const config = this.siteAdapter.getConversationObserverConfig()
    if (!config) return

    this.observerConfig = config

    const startObserverRetry = (retryCount = 0) => {
      const maxRetries = 5
      const retryDelay = 1000

      const sidebarContainer = this.siteAdapter.getSidebarScrollContainer() || document

      if (config.shadow && retryCount < maxRetries) {
        const foundContainer = this.siteAdapter.getSidebarScrollContainer()
        if (!foundContainer) {
          setTimeout(() => startObserverRetry(retryCount + 1), retryDelay)
          return
        }
      }

      this.observerContainer = sidebarContainer

      // DOMToolkit.each returns a stop function
      this.sidebarObserverStop = DOMToolkit.each(
        config.selector,
        (el, isNew) => {
          this.handleObservedElement(el, isNew, config)
        },
        { parent: sidebarContainer, shadow: config.shadow },
      )
    }

    startObserverRetry()

    if (config.shadow) {
      this.startPolling()
    }
  }

  stopSidebarObserver() {
    if (this.sidebarObserverStop) {
      this.sidebarObserverStop()
      this.sidebarObserverStop = null
    }
    this.observerContainer = null

    if (this.titleWatcher) {
      // DOMToolkit Watcher doesnt explicitly expose stop on the object returned by watchMultiple?
      // Actually `watchMultiple` returns `MutationObserver` wrapper usually?
      // Checking `dom-toolkit.ts`: watchMultiple returns an object with `add` and logic.
      // It doesn't seem to expose simple `stop`.
      // But we can just clear references.
      // Original script called `this.titleWatcher.stop()`.
      // I'll assume I can implement stop or it exists.
      if (typeof this.titleWatcher.stop === "function") {
        this.titleWatcher.stop()
      }
      this.titleWatcher = null
    }
    this.stopPolling()
  }

  private handleObservedElement(el: Element, isNew: boolean, config: ConversationObserverConfig) {
    const tryAdd = (retries = 5) => {
      const info = config.extractInfo(el)

      if (info?.id) {
        this.updateConversationFromObservation(info, isNew)
        this.monitorConversationTitle(el as HTMLElement, info.id)
      } else if (retries > 0) {
        setTimeout(() => tryAdd(retries - 1), 500)
      }
    }
    tryAdd()
  }

  private updateConversationFromObservation(info: ConversationInfo, isNew: boolean) {
    const existing = this.conversations[info.id]
    let needsSave = false

    if (isNew && !existing) {
      // New Conversation
      this.conversations[info.id] = {
        id: info.id,
        siteId: this.siteAdapter.getSiteId(),
        cid: info.cid,
        title: info.title,
        url: info.url,
        folderId: this.lastUsedFolderId,
        pinned: info.isPinned || false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      needsSave = true
    } else if (existing) {
      // Update existing
      if (info.isPinned !== undefined && info.isPinned !== existing.pinned) {
        if (info.isPinned) {
          existing.pinned = true
          existing.updatedAt = Date.now()
          needsSave = true
        } else if (!info.isPinned && this.syncUnpin) {
          existing.pinned = false
          existing.updatedAt = Date.now()
          needsSave = true
        }
      }
    }

    if (needsSave) {
      this.saveConversations()
      this.notifyDataChange()
    }
  }

  private startPolling() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => {
      if (!this.observerConfig) return
      const config = this.observerConfig
      // DOMToolkit.queryAll?
      // Checking dom-toolkit.ts: query returns Element | Element[]
      // Use { all: true }
      const elements = DOMToolkit.query(config.selector, {
        all: true,
        shadow: config.shadow,
      }) as Element[]

      if (Array.isArray(elements)) {
        elements.forEach((el) => {
          const info = config.extractInfo(el)
          if (info?.id && !this.conversations[info.id]) {
            this.updateConversationFromObservation(info, true)
            this.monitorConversationTitle(el as HTMLElement, info.id)
          }
        })
      }
    }, 3000)
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private monitorConversationTitle(el: HTMLElement, id: string) {
    if (el.dataset.ghTitleObserver) return
    el.dataset.ghTitleObserver = "true"

    if (!this.titleWatcher) {
      const container = this.siteAdapter.getSidebarScrollContainer() || document.body
      this.titleWatcher = DOMToolkit.watchMultiple(container as Node, {
        debounce: 500,
      })
    }

    this.titleWatcher.add(el, () => {
      const config = this.observerConfig
      if (!config) return

      const currentInfo = config.extractInfo(el)
      const currentId = currentInfo?.id

      if (!currentId || currentId !== id) return

      const existing = this.conversations[id]
      if (!existing) return

      let needsSave = false

      if (currentInfo.title && currentInfo.title !== existing.title) {
        existing.title = currentInfo.title
        existing.updatedAt = Date.now()
        needsSave = true
      }

      if (currentInfo.isPinned !== undefined && currentInfo.isPinned !== existing.pinned) {
        if (currentInfo.isPinned) {
          existing.pinned = true
          existing.updatedAt = Date.now()
          needsSave = true
        } else if (!currentInfo.isPinned && this.syncUnpin) {
          existing.pinned = false
          existing.updatedAt = Date.now()
          needsSave = true
        }
      }

      if (needsSave) {
        this.saveConversations()
        this.notifyDataChange()
      }
    })
  }

  // ================= Folder Operations =================

  getFolders() {
    return this.folders
  }

  getConversations(folderId?: string) {
    // 按当前站点和团队过滤
    const currentSiteId = this.siteAdapter.getSiteId()
    const currentCid = this.siteAdapter.getCurrentCid?.() || null

    let result = Object.values(this.conversations).filter((c) => this.matchesCid(c, currentCid))

    if (folderId) {
      result = result.filter((c) => c.folderId === folderId)
    }
    return result
  }

  async createFolder(name: string, icon: string) {
    const newFolder: Folder = {
      id: "folder_" + Date.now(),
      name,
      icon,
    }
    this.folders.push(newFolder)
    await this.saveFolders()
    return newFolder
  }

  async updateFolder(id: string, updates: Partial<Folder>) {
    const folder = this.folders.find((f) => f.id === id)
    if (folder) {
      Object.assign(folder, updates)
      await this.saveFolders()
    }
  }

  async deleteFolder(id: string) {
    if (id === "inbox") return // prevent delete inbox

    // Move conversations to inbox
    let changed = false
    Object.values(this.conversations).forEach((c) => {
      if (c.folderId === id) {
        c.folderId = "inbox"
        changed = true
      }
    })

    this.folders = this.folders.filter((f) => f.id !== id)
    await this.saveFolders()

    if (changed) {
      await this.saveConversations()
    }
  }

  async moveFolder(id: string, direction: "up" | "down") {
    const index = this.folders.findIndex((f) => f.id === id)
    if (index === -1) return
    if (index === 0) return // Inbox fixed

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex <= 0 || newIndex >= this.folders.length) return

    // Swap
    const temp = this.folders[index]
    this.folders[index] = this.folders[newIndex]
    this.folders[newIndex] = temp

    await this.saveFolders()
  }

  // ================= Conversation Operations =================

  async deleteConversation(id: string) {
    if (this.conversations[id]) {
      delete this.conversations[id]
      await this.saveConversations()
    }
  }

  async moveConversation(id: string, targetFolderId: string) {
    if (this.conversations[id] && this.conversations[id].folderId !== targetFolderId) {
      this.conversations[id].folderId = targetFolderId
      this.conversations[id].updatedAt = Date.now()
      await this.saveConversations()
    }
  }

  async setLastUsedFolder(folderId: string) {
    if (this.lastUsedFolderId !== folderId) {
      this.lastUsedFolderId = folderId
      await this.saveConversations() // stored in local
    }
  }

  // ================= Tag Operations =================

  private tags: Tag[] = []

  getTags() {
    return this.tags
  }

  async createTag(name: string, color: string): Promise<Tag | null> {
    // 检查重复
    const exists = this.tags.some((t) => t.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      return null
    }

    const tag: Tag = {
      id: "tag_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name,
      color,
    }
    this.tags.push(tag)
    await this.saveTags()
    return tag
  }

  async updateTag(tagId: string, name: string, color: string): Promise<Tag | null> {
    // 检查重复（排除自己）
    const exists = this.tags.some(
      (t) => t.id !== tagId && t.name.toLowerCase() === name.toLowerCase(),
    )
    if (exists) {
      return null
    }

    const tag = this.tags.find((t) => t.id === tagId)
    if (tag) {
      tag.name = name
      tag.color = color
      await this.saveTags()
    }
    return tag || null
  }

  async deleteTag(tagId: string) {
    this.tags = this.tags.filter((t) => t.id !== tagId)

    // 从所有会话中移除该标签引用
    let changed = false
    Object.values(this.conversations).forEach((conv) => {
      if (conv.tagIds) {
        const before = conv.tagIds.length
        conv.tagIds = conv.tagIds.filter((id) => id !== tagId)
        if (conv.tagIds.length === 0) delete conv.tagIds
        if (conv.tagIds?.length !== before) changed = true
      }
    })

    await this.saveTags()
    if (changed) {
      await this.saveConversations()
    }
  }

  async setConversationTags(convId: string, tagIds: string[]) {
    const conv = this.conversations[convId]
    if (conv) {
      if (tagIds && tagIds.length > 0) {
        conv.tagIds = tagIds
      } else {
        delete conv.tagIds
      }
      await this.saveConversations()
    }
  }

  private async saveTags() {
    await setSetting(STORAGE_KEYS.TAGS, this.tags)
  }

  private async loadTags() {
    this.tags = await getSetting<Tag[]>(STORAGE_KEYS.TAGS, [])
  }

  // ================= Conversation Operations Extended =================

  async togglePin(convId: string): Promise<boolean> {
    const conv = this.conversations[convId]
    if (conv) {
      conv.pinned = !conv.pinned
      conv.updatedAt = Date.now()
      await this.saveConversations()
      return conv.pinned
    }
    return false
  }

  async renameConversation(convId: string, newTitle: string) {
    const conv = this.conversations[convId]
    if (conv && newTitle) {
      conv.title = newTitle
      conv.updatedAt = Date.now()
      await this.saveConversations()
    }
  }

  getConversation(convId: string): Conversation | undefined {
    return this.conversations[convId]
  }

  getLastUsedFolderId(): string {
    return this.lastUsedFolderId
  }

  /**
   * 获取当前站点/团队的所有会话
   */
  getAllConversations(): Record<string, Conversation> {
    const currentCid = this.siteAdapter.getCurrentCid?.() || null
    const result: Record<string, Conversation> = {}

    for (const [id, conv] of Object.entries(this.conversations)) {
      if (this.matchesCid(conv, currentCid)) {
        result[id] = conv
      }
    }
    return result
  }

  // ================= Sync Logic =================

  /**
   * 从侧边栏同步会话（增量）
   */
  async syncConversations(
    targetFolderId: string | null = null,
    silent = false,
  ): Promise<{ newCount: number; updatedCount: number }> {
    const sidebarItems = this.siteAdapter.getConversationList()

    if (!sidebarItems || sidebarItems.length === 0) {
      return { newCount: 0, updatedCount: 0 }
    }

    const currentCid = sidebarItems[0]?.cid || null
    let newCount = 0
    let updatedCount = 0
    const now = Date.now()
    const folderId = targetFolderId || this.lastUsedFolderId || "inbox"

    sidebarItems.forEach((item) => {
      const storageKey = item.id
      const existing = this.conversations[storageKey]

      if (existing) {
        // 更新已有会话的标题
        if (existing.title !== item.title) {
          existing.title = item.title
          existing.updatedAt = now
          updatedCount++
        }
        // 同步云端置顶状态
        if (item.isPinned && !existing.pinned) {
          existing.pinned = true
          existing.updatedAt = now
          updatedCount++
        } else if (!item.isPinned && existing.pinned && this.syncUnpin) {
          existing.pinned = false
          existing.updatedAt = now
          updatedCount++
        }
        // 确保 siteId 和 cid 是最新的
        if (!existing.siteId) existing.siteId = this.siteAdapter.getSiteId()
        if (item.cid && !existing.cid) existing.cid = item.cid
      } else {
        // 新会话
        this.conversations[storageKey] = {
          id: item.id,
          siteId: this.siteAdapter.getSiteId(),
          cid: item.cid,
          title: item.title,
          url: item.url,
          folderId: folderId,
          pinned: item.isPinned || false,
          createdAt: now,
          updatedAt: now,
        }
        newCount++
      }
    })

    // 记住用户选择
    if (targetFolderId) {
      this.lastUsedFolderId = targetFolderId
    }

    if (newCount > 0 || updatedCount > 0) {
      await this.saveConversations()
    }

    return { newCount, updatedCount }
  }

  /**
   * 检查会话是否属于当前站点和团队
   */
  matchesCid(conv: Conversation, currentCid: string | null): boolean {
    const currentSiteId = this.siteAdapter.getSiteId()
    if (conv.siteId && conv.siteId !== currentSiteId) {
      return false
    }
    if (!currentCid) return !conv.cid
    if (!conv.cid) return true
    return conv.cid === currentCid
  }

  /**
   * 获取侧边栏会话顺序
   */
  getSidebarConversationOrder(): string[] {
    const config = this.siteAdapter.getConversationObserverConfig?.()
    if (!config) return []

    const elements = DOMToolkit.query(config.selector, {
      all: true,
      shadow: config.shadow,
    }) as Element[]

    return Array.from(elements || [])
      .map((el) => config.extractInfo?.(el)?.id)
      .filter((id): id is string => Boolean(id))
  }

  // ================= Utility Methods =================

  /**
   * 格式化时间显示
   */
  formatTime(timestamp: number): string {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "刚刚"
    if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前"
    if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前"
    if (diff < 604800000) return Math.floor(diff / 86400000) + "天前"

    return date.toLocaleDateString()
  }

  // ================= Export Functionality =================

  /**
   * 导出会话
   */
  async exportConversation(
    convId: string,
    format: "markdown" | "json" | "txt" | "clipboard",
  ): Promise<boolean> {
    const conv = this.conversations[convId]
    if (!conv) {
      console.error("[ConversationManager] Conversation not found:", convId)
      return false
    }

    // 检查是否为当前会话
    const currentSessionId = this.siteAdapter.getSessionId()
    if (currentSessionId !== convId) {
      console.error("[ConversationManager] Please open the conversation first")
      return false
    }

    try {
      // 加载完整历史（滚动到顶部）
      const scrollContainer = this.siteAdapter.getScrollContainer?.()
      if (scrollContainer) {
        let prevHeight = 0
        let retries = 0
        const maxRetries = 50

        while (retries < maxRetries) {
          scrollContainer.scrollTop = 0
          await new Promise((resolve) => setTimeout(resolve, 500))

          const currentHeight = scrollContainer.scrollHeight
          if (currentHeight === prevHeight) {
            retries++
            if (retries >= 3) break
          } else {
            retries = 0
            prevHeight = currentHeight
          }
        }
      }

      // 提取对话内容
      const messages = this.extractConversationMessages()
      if (messages.length === 0) {
        console.error("[ConversationManager] No messages found")
        return false
      }

      // 格式化
      const safeTitle = (conv.title || "conversation")
        .replace(/[<>:"/\\|?*]/g, "_")
        .substring(0, 50)

      const metadata = createExportMetadata(
        conv.title || "未命名",
        this.siteAdapter.getName(),
        conv.id,
      )

      let content: string
      let filename: string
      let mimeType: string

      if (format === "clipboard") {
        content = formatToMarkdown(metadata, messages)
        await navigator.clipboard.writeText(content)
        showToast("已复制到剪贴板")
        return true
      } else if (format === "markdown") {
        content = formatToMarkdown(metadata, messages)
        filename = `${safeTitle}.md`
        mimeType = "text/markdown;charset=utf-8"
      } else if (format === "json") {
        content = formatToJSON(metadata, messages)
        filename = `${safeTitle}.json`
        mimeType = "application/json;charset=utf-8"
      } else {
        content = formatToTXT(metadata, messages)
        filename = `${safeTitle}.txt`
        mimeType = "text/plain;charset=utf-8"
      }

      await downloadFile(content, filename, mimeType)
      showToast(`已导出为 ${format.toUpperCase()}`)
      return true
    } catch (error) {
      console.error("[ConversationManager] Export failed:", error)
      return false
    }
  }

  /**
   * 提取当前页面的对话消息
   */
  private extractConversationMessages(): Array<{
    role: "user" | "assistant"
    content: string
  }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = []

    const config = this.siteAdapter.getExportConfig?.()
    if (!config) {
      console.warn("[ConversationManager] Export config not available")
      return messages
    }

    const { userQuerySelector, assistantResponseSelector, useShadowDOM } = config

    const userMessages =
      (DOMToolkit.query(userQuerySelector, {
        all: true,
        shadow: useShadowDOM,
      }) as Element[]) || []

    const aiMessages =
      (DOMToolkit.query(assistantResponseSelector, {
        all: true,
        shadow: useShadowDOM,
      }) as Element[]) || []

    const maxLen = Math.max(userMessages.length, aiMessages.length)
    for (let i = 0; i < maxLen; i++) {
      if (userMessages[i]) {
        const userContent = userMessages[i].textContent?.trim() || ""
        messages.push({ role: "user", content: userContent })
      }
      if (aiMessages[i]) {
        messages.push({
          role: "assistant",
          content: htmlToMarkdown(aiMessages[i]) || aiMessages[i].textContent?.trim() || "",
        })
      }
    }

    return messages
  }
}
