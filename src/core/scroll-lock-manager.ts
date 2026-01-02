/**
 * 滚动锁定管理器
 *
 * 功能：当 AI 正在生成内容时，如果用户手动向上滚动查看历史消息，
 * 则阻止页面自动滚动到底部，避免打断用户阅读。
 *
 * 使用适配器的 isGenerating() 方法检测 AI 生成状态
 */

import type { SiteAdapter } from "~adapters/base"
import type { Settings } from "~utils/storage"

export class ScrollLockManager {
  private adapter: SiteAdapter
  private settings: Settings
  private userHasScrolledUp = false
  private scrollContainer: HTMLElement | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private originalScrollTo: typeof Element.prototype.scrollTo | null = null

  // 阈值：距离底部多少像素内被视为"在底部"
  private static readonly BOTTOM_THRESHOLD = 100

  constructor(adapter: SiteAdapter, settings: Settings) {
    this.adapter = adapter
    this.settings = settings
    this.init()
  }

  updateSettings(settings: Settings) {
    this.settings = settings
    if (!settings.preventAutoScroll) {
      this.stop()
    }
  }

  private init() {
    if (!this.settings.preventAutoScroll) return

    // 定时检测 AI 生成状态
    this.checkInterval = setInterval(() => {
      const isGenerating = this.adapter.isGenerating()

      if (isGenerating && !this.scrollContainer) {
        // AI 开始生成，初始化滚动检测
        this.userHasScrolledUp = false
        this.initScrollDetection()
      } else if (!isGenerating && this.scrollContainer) {
        // AI 生成完成，停止滚动检测
        this.stopScrollDetection()
      }
    }, 500)

    // 初始化滚动容器监听
    this.initScrollDetection()
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.stopScrollDetection()
  }

  private initScrollDetection() {
    // 获取滚动容器
    this.scrollContainer = this.findScrollContainer()

    if (this.scrollContainer) {
      this.scrollContainer.addEventListener("scroll", this.onScroll)
      this.scrollContainer.addEventListener("wheel", this.onWheel, { passive: true })

      // 覆盖 scrollTo 方法以阻止自动滚动
      this.patchScrollTo()
    }
  }

  private stopScrollDetection() {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener("scroll", this.onScroll)
      this.scrollContainer.removeEventListener("wheel", this.onWheel)
      this.scrollContainer = null
    }
    this.restoreScrollTo()
    this.userHasScrolledUp = false
  }

  private findScrollContainer(): HTMLElement {
    // 常见的滚动容器选择器
    const selectors = [
      "infinite-scroller.chat-history",
      ".chat-history",
      ".chat-mode-scroller",
      "main",
      '[role="main"]',
    ]

    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement
      if (el && el.scrollHeight > el.clientHeight) {
        return el
      }
    }
    return document.documentElement
  }

  private onScroll = () => {
    if (!this.adapter.isGenerating() || !this.scrollContainer) return

    const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer
    const distanceToBottom = scrollHeight - scrollTop - clientHeight

    // 如果用户滚动到底部附近，重置锁定状态
    if (distanceToBottom <= ScrollLockManager.BOTTOM_THRESHOLD) {
      this.userHasScrolledUp = false
    }
  }

  // 监听滚轮事件，判断用户意图
  private onWheel = (e: WheelEvent) => {
    if (e.deltaY < 0) {
      // 用户向上滚动
      this.userHasScrolledUp = true
    }
  }

  // 覆盖 scrollTo 方法，阻止自动滚动到底部
  private patchScrollTo() {
    if (this.originalScrollTo) return

    const self = this
    this.originalScrollTo = Element.prototype.scrollTo

    Element.prototype.scrollTo = function (this: Element, ...args: any[]) {
      // 如果用户已向上滚动且 AI 正在生成，阻止滚动到底部
      if (
        self.userHasScrolledUp &&
        self.adapter.isGenerating() &&
        self.scrollContainer &&
        this === self.scrollContainer
      ) {
        // 检查是否是滚动到底部的操作
        const options = args[0] as ScrollToOptions | undefined
        const targetTop = options?.top ?? args[0]
        const scrollHeight = this.scrollHeight
        const clientHeight = this.clientHeight

        // 如果目标位置接近底部，阻止滚动
        if (typeof targetTop === "number" && targetTop > scrollHeight - clientHeight - 100) {
          console.log("[Chat Helper] Blocked auto scroll to bottom")
          return
        }
      }

      // 正常执行原始的 scrollTo
      self.originalScrollTo?.apply(this, args as any)
    }
  }

  // 恢复原始的 scrollTo
  private restoreScrollTo() {
    if (this.originalScrollTo) {
      Element.prototype.scrollTo = this.originalScrollTo
      this.originalScrollTo = null
    }
  }
}
