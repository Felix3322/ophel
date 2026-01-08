/**
 * Reading History Manager
 *
 * 管理阅读进度的记录与恢复
 * 数据存储已迁移到 reading-history-store.ts
 */

import type { SiteAdapter } from "~adapters/base"
import {
  getReadingHistoryStore,
  useReadingHistoryStore,
  type ReadingPosition,
} from "~stores/reading-history-store"
import { t } from "~utils/i18n"
import type { Settings } from "~utils/storage"

// 重新导出类型供其他模块使用
export type { ReadingPosition }

export class ReadingHistoryManager {
  private adapter: SiteAdapter
  private settings: Settings["readingHistory"]

  private isRecording = false
  private listeningContainer: Element | null = null
  private scrollHandler: ((e: Event) => void) | null = null
  private lastSaveTime = 0

  public restoredTop: number | undefined

  constructor(adapter: SiteAdapter, settings: Settings["readingHistory"]) {
    this.adapter = adapter
    this.settings = settings
  }

  /**
   * 等待 store hydration 完成
   */
  async waitForHydration() {
    if (!useReadingHistoryStore.getState()._hasHydrated) {
      await new Promise<void>((resolve) => {
        const unsubscribe = useReadingHistoryStore.subscribe((state) => {
          if (state._hasHydrated) {
            unsubscribe()
            resolve()
          }
        })
      })
    }
  }

  updateSettings(settings: Settings["readingHistory"]) {
    this.settings = settings
    if (!this.settings.persistence && this.isRecording) {
      this.stopRecording()
    } else if (this.settings.persistence && !this.isRecording) {
      this.startRecording()
    }
  }

  startRecording() {
    if (this.isRecording) return
    this.isRecording = true

    this.scrollHandler = () => this.handleScroll()

    const container = this.adapter.getScrollContainer()
    if (container) {
      container.addEventListener("scroll", this.scrollHandler, {
        passive: true,
      })
      this.listeningContainer = container
    }

    window.addEventListener("scroll", this.scrollHandler, {
      capture: true,
      passive: true,
    })
  }

  stopRecording() {
    if (!this.isRecording) return
    this.isRecording = false

    if (this.scrollHandler) {
      if (this.listeningContainer) {
        this.listeningContainer.removeEventListener("scroll", this.scrollHandler)
        this.listeningContainer = null
      }
      window.removeEventListener("scroll", this.scrollHandler, {
        capture: true,
      })
      this.scrollHandler = null
    }
  }

  restartRecording() {
    this.stopRecording()
    this.startRecording()
  }

  private handleScroll() {
    if (!this.settings.persistence) return

    const now = Date.now()
    if (now - this.lastSaveTime > 1000) {
      this.saveProgress()
      this.lastSaveTime = now
    }
  }

  private getKey(): string {
    const sessionId = this.adapter.getSessionId() || "unknown"
    const siteId = this.adapter.getSiteId()
    return `${siteId}:${sessionId}`
  }

  private saveProgress() {
    if (!this.isRecording) return
    if (this.adapter.isNewConversation()) return

    const container = this.adapter.getScrollContainer()
    const scrollTop = container ? container.scrollTop : window.scrollY

    if (scrollTop < 0) return

    const key = this.getKey()

    let anchorInfo = {}
    try {
      if (this.adapter.getVisibleAnchorElement) {
        anchorInfo = this.adapter.getVisibleAnchorElement() || {}
      }
    } catch (e) {
      console.error("Error getting visible anchor:", e)
    }

    const data: ReadingPosition = {
      top: scrollTop,
      ts: Date.now(),
      ...anchorInfo,
    }

    // 使用 Zustand store 保存
    getReadingHistoryStore().savePosition(key, data)
  }

  async restoreProgress(onProgress?: (msg: string) => void): Promise<boolean> {
    if (!this.settings.autoRestore) return false

    // 确保 store 已 hydrated
    await this.waitForHydration()

    const key = this.getKey()
    const data = getReadingHistoryStore().getPosition(key)

    if (!data) return false

    const scrollContainer = this.adapter.getScrollContainer() || document.documentElement

    return new Promise((resolve) => {
      let historyLoadAttempts = 0
      const maxHistoryLoadAttempts = 5
      let lastScrollHeight = 0

      const tryScroll = async (attempts = 0) => {
        // Break infinite loop
        if (attempts > 30) {
          if (data.top !== undefined) {
            this.rawScroll(scrollContainer, data.top)
            this.restoredTop = data.top
            resolve(true)
          } else {
            resolve(false)
          }
          return
        }

        // 1. Precise restore via content anchor
        let contentRestored = false
        if (data.type && this.adapter.restoreScroll) {
          try {
            contentRestored = await this.adapter.restoreScroll(data as any)
          } catch (e) {
            console.error(e)
          }
        }

        if (contentRestored) {
          this.restoredTop = (scrollContainer as HTMLElement).scrollTop || window.scrollY
          resolve(true)
          return
        }

        // 2. Load more history logic
        const currentScrollHeight = scrollContainer.scrollHeight
        lastScrollHeight = currentScrollHeight

        const hasContentAnchor = !!(data.type && (data.textSignature || data.selector))
        const needsMoreHistory =
          hasContentAnchor || (data.top !== undefined && currentScrollHeight < data.top)
        const canLoadMore = historyLoadAttempts < maxHistoryLoadAttempts

        if (needsMoreHistory && canLoadMore) {
          if (onProgress)
            onProgress(
              `${t("exportLoading")} (${historyLoadAttempts + 1}/${maxHistoryLoadAttempts})`,
            )

          // Scroll to top to trigger lazy load
          this.rawScroll(scrollContainer, 0)

          historyLoadAttempts++
          setTimeout(() => tryScroll(attempts + 1), 2000)
        } else if (data.top !== undefined && currentScrollHeight >= data.top) {
          this.rawScroll(scrollContainer, data.top)
          this.restoredTop = data.top
          resolve(true)
        } else if (!canLoadMore && hasContentAnchor) {
          setTimeout(() => tryScroll(attempts + 1), 500)
        } else {
          resolve(false)
        }
      }

      tryScroll()
    })
  }

  private rawScroll(container: Element | HTMLElement, top: number) {
    if (container instanceof HTMLElement || container instanceof Element) {
      container.scrollTop = top
      if (container === document.documentElement) {
        window.scrollTo(0, top)
      }
    } else {
      window.scrollTo(0, top)
    }
  }

  cleanup() {
    const days = this.settings.cleanupDays || 7
    getReadingHistoryStore().cleanup(days)
  }
}
