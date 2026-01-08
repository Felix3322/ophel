/**
 * SVG 图标组件 - 锚点 (自动锚点)
 * 风格：Outline (stroke-based)
 * 设计：经典船锚形状，形象生动
 */
import React from "react"

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export const AnchorIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  className = "",
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: "block" }}>
    {/* 顶部圆环 */}
    <circle cx="12" cy="5" r="3" />
    {/* 主干竖线 */}
    <line x1="12" y1="8" x2="12" y2="21" />
    {/* 横杆 */}
    <line x1="5" y1="12" x2="19" y2="12" />
    {/* 左弯钩 */}
    <path d="M5 12c0 4 3 7 7 9" />
    {/* 右弯钩 */}
    <path d="M19 12c0 4-3 7-7 9" />
  </svg>
)

export default AnchorIcon
