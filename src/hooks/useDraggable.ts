/**
 * 面板拖拽 Hook
 *
 * 与油猴脚本 makeDraggable() 逻辑一致：
 * - 通过 header 拖拽移动面板
 * - 拖拽结束时检测边缘吸附
 * - 窗口 resize 时边界检测
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface DragState {
  isDragging: boolean
  hasDragged: boolean
  position: { left: number; top: number } | null
}

interface UseDraggableOptions {
  edgeSnapHide?: boolean
  onEdgeSnap?: (side: "left" | "right") => void
  onUnsnap?: () => void
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const { edgeSnapHide = false, onEdgeSnap, onUnsnap } = options

  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    hasDragged: false,
    position: null,
  })

  // 记录拖拽是否发生过实质性移动（避免点击触发吸附）
  const hasMovedRef = useRef(false)

  // 拖拽偏移量（鼠标相对于面板左上角的偏移）
  const offsetRef = useRef({ x: 0, y: 0 })

  // 开始拖拽
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // 排除控制按钮区域
      if ((e.target as Element).closest(".gh-panel-controls")) return

      const panel = panelRef.current
      if (!panel) return

      e.preventDefault() // 阻止文本选中

      // 取消吸附状态（如果有）
      onUnsnap?.()

      // 读取面板当前的实际位置
      const rect = panel.getBoundingClientRect()

      // 计算鼠标相对于面板左上角的偏移
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      hasMovedRef.current = false // 重置移动标记

      // 首次拖拽时，将 CSS 定位从 right+transform 切换为 left+top
      setDragState({
        isDragging: true,
        hasDragged: true,
        position: { left: rect.left, top: rect.top },
      })

      // 拖动时禁止全局文本选中
      document.body.style.userSelect = "none"
    },
    [onUnsnap],
  )

  // 拖拽移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragState((prev) => {
      if (!prev.isDragging) return prev

      e.preventDefault()

      // 标记发生了移动
      hasMovedRef.current = true

      // 直接计算面板左上角位置 = 鼠标位置 - 初始偏移
      return {
        ...prev,
        position: {
          left: e.clientX - offsetRef.current.x,
          top: e.clientY - offsetRef.current.y,
        },
      }
    })
  }, [])

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setDragState((prev) => {
      if (!prev.isDragging) return prev

      // 恢复文本选中
      document.body.style.userSelect = ""

      // 边缘吸附检测 (仅当发生过实质性拖动时才触发)
      if (edgeSnapHide && hasMovedRef.current && prev.position && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()
        const snapThreshold = 30 // 距离边缘30px时触发吸附

        if (rect.left < snapThreshold) {
          onEdgeSnap?.("left")
        } else if (window.innerWidth - rect.right < snapThreshold) {
          onEdgeSnap?.("right")
        }
      }

      return { ...prev, isDragging: false }
    })
  }, [edgeSnapHide, onEdgeSnap])

  // 边界检测：确保面板在视口内可见
  const clampToViewport = useCallback(() => {
    setDragState((prev) => {
      if (!prev.hasDragged || !prev.position || !panelRef.current) return prev

      const rect = panelRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const margin = 10

      let newLeft = prev.position.left
      let newTop = prev.position.top

      // 超出边界检测
      if (rect.right > vw) newLeft = vw - rect.width - margin
      if (rect.bottom > vh) newTop = vh - rect.height - margin
      if (rect.left < 0) newLeft = margin
      if (rect.top < 0) newTop = margin

      if (newLeft !== prev.position.left || newTop !== prev.position.top) {
        return { ...prev, position: { left: newLeft, top: newTop } }
      }
      return prev
    })
  }, [])

  // 绑定事件
  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    header.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("resize", clampToViewport)

    return () => {
      header.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("resize", clampToViewport)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, clampToViewport])

  // 计算面板样式
  const panelStyle: React.CSSProperties = dragState.position
    ? {
        left: `${dragState.position.left}px`,
        top: `${dragState.position.top}px`,
        right: "auto",
        transform: "none",
      }
    : {}

  return {
    panelRef,
    headerRef,
    panelStyle,
    isDragging: dragState.isDragging,
    hasDragged: dragState.hasDragged,
  }
}
