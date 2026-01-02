/**
 * 快捷按钮组
 *
 * - 面板折叠时显示 panel-only 按钮
 * - 智能分隔线逻辑
 * - 手动锚点组（设置/返回/清除）
 */

import React, { useCallback, useEffect, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { getAdapter } from "~adapters/index"
import { t } from "~utils/i18n"
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from "~utils/storage"

// 折叠面板按钮定义（与油猴脚本一致）
// isPanelOnly: true 表示仅在面板折叠时显示，false 表示常显
const COLLAPSED_BUTTON_DEFS: Record<
  string,
  { icon: string; labelKey: string; canToggle: boolean; isPanelOnly: boolean; isGroup?: boolean }
> = {
  scrollTop: { icon: "⬆", labelKey: "scrollTop", canToggle: false, isPanelOnly: false },
  panel: { icon: "✨", labelKey: "panelTitle", canToggle: false, isPanelOnly: true },
  anchor: { icon: "⚓", labelKey: "showCollapsedAnchorLabel", canToggle: true, isPanelOnly: true },
  theme: { icon: "☀", labelKey: "showCollapsedThemeLabel", canToggle: true, isPanelOnly: true },
  manualAnchor: {
    icon: "📍",
    labelKey: "manualAnchorLabel",
    canToggle: true,
    isPanelOnly: false,
    isGroup: true,
  },
  scrollBottom: { icon: "⬇", labelKey: "scrollBottom", canToggle: false, isPanelOnly: false },
}

interface QuickButtonsProps {
  isPanelOpen: boolean
  onPanelToggle: () => void
  onThemeToggle?: () => void
  themeMode?: "light" | "dark"
}

export const QuickButtons: React.FC<QuickButtonsProps> = ({
  isPanelOpen,
  onPanelToggle,
  onThemeToggle,
  themeMode = "light",
}) => {
  const [settings] = useStorage<Settings>(STORAGE_KEYS.SETTINGS)
  const currentSettings = settings || DEFAULT_SETTINGS
  const { collapsedButtonsOrder } = currentSettings

  // 锚点状态
  const [hasAnchor, setHasAnchor] = useState(false)
  const [savedAnchorTop, setSavedAnchorTop] = useState<number | null>(null)

  // 悬浮隐藏状态
  const [isHovered, setIsHovered] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)

  // 获取适配器
  const adapter = getAdapter()

  // 获取滚动容器
  const getScrollContainer = useCallback(() => {
    const selectors = [
      "infinite-scroller.chat-history",
      ".chat-history",
      ".chat-mode-scroller",
      "main",
      '[role="main"]',
    ]
    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.scrollHeight > el.clientHeight) {
        return el
      }
    }
    return document.documentElement
  }, [])

  // 滚动到顶部（包含加载历史消息的特殊逻辑）
  const scrollToTop = useCallback(async () => {
    const container = getScrollContainer()

    // 先保存当前位置作为锚点
    setSavedAnchorTop(container.scrollTop)
    setHasAnchor(true)

    // 滚动到顶部
    container.scrollTo({ top: 0, behavior: "smooth" })

    // 如果有适配器，尝试加载更多历史消息
    if (adapter) {
      // 等待滚动完成后检查是否需要加载更多
      setTimeout(() => {
        // 查找"加载更多"按钮并点击
        const loadMoreBtn = document.querySelector(
          '[data-test-id="load-earlier-messages"], .load-more-button, [aria-label*="earlier"]',
        ) as HTMLElement
        if (loadMoreBtn) {
          loadMoreBtn.click()
        }
      }, 500)
    }
  }, [getScrollContainer, adapter])

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer()

    // 保存当前位置作为锚点
    setSavedAnchorTop(container.scrollTop)
    setHasAnchor(true)

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
  }, [getScrollContainer])

  // 锚点跳转（双向）
  const handleAnchorClick = useCallback(() => {
    if (savedAnchorTop === null) return

    const container = getScrollContainer()
    const currentPos = container.scrollTop

    // 跳转到锚点
    container.scrollTo({ top: savedAnchorTop, behavior: "instant" })

    // 交换位置
    setSavedAnchorTop(currentPos)
  }, [savedAnchorTop, getScrollContainer])

  // 手动锚点：设置
  const setAnchorManually = useCallback(() => {
    const container = getScrollContainer()
    setSavedAnchorTop(container.scrollTop)
    setHasAnchor(true)
  }, [getScrollContainer])

  // 手动锚点：返回
  const backToManualAnchor = useCallback(() => {
    if (savedAnchorTop === null) return

    const container = getScrollContainer()
    const currentPos = container.scrollTop

    container.scrollTo({ top: savedAnchorTop, behavior: "instant" })
    setSavedAnchorTop(currentPos)
  }, [savedAnchorTop, getScrollContainer])

  // 手动锚点：清除
  const clearAnchorManually = useCallback(() => {
    setSavedAnchorTop(null)
    setHasAnchor(false)
  }, [])

  // 获取主题图标（与油猴脚本一致，使用 SVG）
  const getThemeIcon = () => {
    const isDark = themeMode === "dark"
    // 深色模式显示太阳（点击切换到浅色），浅色模式显示月亮（点击切换到深色）
    const pathD = isDark
      ? "M480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Z"
      : "M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="20px"
        viewBox="0 -960 960 960"
        width="20px"
        fill="currentColor">
        <path d={pathD} />
      </svg>
    )
  }

  // 按钮点击处理器
  const buttonActions: Record<string, (e?: React.MouseEvent) => void> = {
    scrollTop: scrollToTop,
    scrollBottom: scrollToBottom,
    panel: onPanelToggle,
    anchor: handleAnchorClick,
    theme: (e) => {
      e?.stopPropagation()
      onThemeToggle?.()
    },
  }

  // 渲染单个按钮
  const renderButton = (
    id: string,
    def: (typeof COLLAPSED_BUTTON_DEFS)[string],
    enabled: boolean,
  ) => {
    const isPanelOnly = def.isPanelOnly
    const isDisabled = !enabled

    // panel-only 按钮：面板展开时隐藏
    // 禁用的按钮：永远隐藏
    const shouldHide = isDisabled || (isPanelOnly && isPanelOpen)
    if (shouldHide) return null

    const icon = id === "theme" ? getThemeIcon() : def.icon
    const isAnchorBtn = id === "anchor"
    const anchorDisabled = isAnchorBtn && !hasAnchor

    return (
      <button
        key={id}
        className={`quick-prompt-btn gh-interactive ${isPanelOnly ? "panel-only" : ""}`}
        onClick={(e) => buttonActions[id]?.(e)}
        title={t(def.labelKey) || def.labelKey}
        style={{
          opacity: anchorDisabled ? 0.4 : 1,
          cursor: anchorDisabled ? "default" : "pointer",
        }}
        disabled={anchorDisabled}>
        {icon}
      </button>
    )
  }

  // 渲染手动锚点组
  const renderManualAnchorGroup = (enabled: boolean) => {
    if (!enabled) return null

    const hasManualAnchor = savedAnchorTop !== null

    return (
      <React.Fragment key="manualAnchor">
        {/* 设置锚点 */}
        <button
          className="quick-prompt-btn manual-anchor-btn set-btn gh-interactive"
          onClick={setAnchorManually}
          title={t("setAnchor") || "设置锚点"}>
          📍
        </button>
        {/* 返回锚点 */}
        <button
          className={`quick-prompt-btn manual-anchor-btn back-btn gh-interactive ${hasManualAnchor ? "has-anchor" : ""}`}
          onClick={backToManualAnchor}
          title={hasManualAnchor ? t("goToAnchor") || "返回锚点" : t("noAnchor") || "暂无锚点"}
          style={{
            opacity: hasManualAnchor ? 1 : 0.4,
            cursor: hasManualAnchor ? "pointer" : "default",
          }}
          disabled={!hasManualAnchor}>
          ↩
        </button>
        {/* 清除锚点 */}
        <button
          className="quick-prompt-btn manual-anchor-btn clear-btn gh-interactive"
          onClick={clearAnchorManually}
          title={t("clearAnchor") || "清除锚点"}
          style={{
            opacity: hasManualAnchor ? 1 : 0.4,
            cursor: hasManualAnchor ? "pointer" : "default",
          }}
          disabled={!hasManualAnchor}>
          ✕
        </button>
      </React.Fragment>
    )
  }

  // 渲染分隔线
  const renderDivider = (isPanelOnly: boolean, key: string) => {
    // panel-only 分隔线：面板展开时隐藏
    if (isPanelOnly && isPanelOpen) return null
    return <div key={key} className={`divider ${isPanelOnly ? "panel-only" : ""}`} />
  }

  // 构建按钮列表（包含智能分隔线逻辑）
  const renderButtonGroup = () => {
    const elements: React.ReactNode[] = []
    let prevRenderedType: "panelOnly" | "always" | null = null
    let prevRenderedId: string | null = null
    let isFirstRendered = true

    collapsedButtonsOrder.forEach((btnConfig, index) => {
      const def = COLLAPSED_BUTTON_DEFS[btnConfig.id]
      if (!def) return

      const isEnabled = def.canToggle ? btnConfig.enabled : true
      const currentType = def.isPanelOnly ? "panelOnly" : "always"

      // 禁用的按钮跳过（不渲染，不更新状态）
      if (!isEnabled) return

      // panel-only 按钮在面板展开时也跳过
      if (def.isPanelOnly && isPanelOpen) return

      // === 智能分隔线插入 ===
      if (!isFirstRendered && prevRenderedType !== null) {
        // manualAnchor 上方需要分隔线
        if (btnConfig.id === "manualAnchor") {
          elements.push(renderDivider(false, `divider-before-${btnConfig.id}`))
        }
        // 上一个是 manualAnchor，需要分隔线
        else if (prevRenderedId === "manualAnchor") {
          elements.push(
            renderDivider(currentType === "panelOnly", `divider-after-manualAnchor-${index}`),
          )
        }
        // 类型切换时插入分隔线
        else if (prevRenderedType !== currentType) {
          elements.push(renderDivider(currentType === "panelOnly", `divider-type-switch-${index}`))
        }
      }

      // === 创建按钮 ===
      if (btnConfig.id === "manualAnchor") {
        elements.push(renderManualAnchorGroup(isEnabled))
      } else {
        elements.push(renderButton(btnConfig.id, def, isEnabled))
      }

      // 更新状态
      prevRenderedType = currentType
      prevRenderedId = btnConfig.id
      isFirstRendered = false
    })

    return elements
  }

  // 悬浮隐藏：鼠标离开后延迟隐藏
  useEffect(() => {
    if (!groupRef.current) return

    let hideTimer: number | null = null

    const handleMouseEnter = () => {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      setIsHovered(true)
    }

    const handleMouseLeave = () => {
      hideTimer = window.setTimeout(() => {
        setIsHovered(false)
      }, 300)
    }

    const el = groupRef.current
    el.addEventListener("mouseenter", handleMouseEnter)
    el.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter)
      el.removeEventListener("mouseleave", handleMouseLeave)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  return (
    <div
      ref={groupRef}
      className={`quick-btn-group gh-interactive ${!isPanelOpen ? "collapsed" : ""}`}
      style={{
        position: "fixed",
        right: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9998,
        transition: "opacity 0.3s",
      }}>
      {renderButtonGroup()}
    </div>
  )
}
