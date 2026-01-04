import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
  duration?: number
  onClose: () => void
}

const TOAST_STYLES = `
  .gh-toast-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: gh-toast-fade-in 0.3s ease-out;
  }

  .gh-toast {
    background: white;
    color: #374151;
    padding: 10px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    border: 1px solid #e5e7eb;
    min-width: 200px;
    max-width: 80vw;
  }
  
  .gh-toast-success { border-left: 4px solid #10b981; }
  .gh-toast-error { border-left: 4px solid #ef4444; }
  .gh-toast-info { border-left: 4px solid #3b82f6; }

  @keyframes gh-toast-fade-in {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`

let styleInjected = false
const injectStyles = () => {
  if (styleInjected) return
  const style = document.createElement("style")
  style.textContent = TOAST_STYLES
  document.head.appendChild(style)
  styleInjected = true
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    injectStyles()
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return createPortal(
    <div className="gh-toast-container">
      <div className={`gh-toast gh-toast-${type}`}>
        {type === "success" && <span style={{ color: "#10b981" }}>✓</span>}
        {type === "error" && <span style={{ color: "#ef4444" }}>✕</span>}
        {type === "info" && <span style={{ color: "#3b82f6" }}>ℹ</span>}
        {message}
      </div>
    </div>,
    document.body,
  )
}
