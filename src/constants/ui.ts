/**
 * UI 相关常量
 */

// ==================== Tab ID 常量 ====================
// 用于 Tab 切换判断，避免字符串字面量拼写错误
export const TAB_IDS = {
  PROMPTS: "prompts",
  OUTLINE: "outline",
  CONVERSATIONS: "conversations",
  SETTINGS: "settings",
} as const

export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS]

// ==================== Tab 定义 ====================
// Tab 标签的显示配置
export const TAB_DEFINITIONS: Record<string, { label: string; icon?: string }> = {
  [TAB_IDS.PROMPTS]: { label: "tabPrompts", icon: "✏️" },
  [TAB_IDS.CONVERSATIONS]: { label: "tabConversations", icon: "💬" },
  [TAB_IDS.OUTLINE]: { label: "tabOutline", icon: "📑" },
  [TAB_IDS.SETTINGS]: { label: "tabSettings", icon: "⚙️" },
}

// ==================== 折叠面板按钮定义 ====================
// isPanelOnly: true 表示仅在面板折叠时显示，false 表示常显
export const COLLAPSED_BUTTON_DEFS: Record<
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

// ==================== Emoji 预设 ====================
// 扩充的预设 Emoji 库 (64个)
export const PRESET_EMOJIS = [
  // 📂 基础文件夹
  "📁",
  "📂",
  "📥",
  "🗂️",
  "📊",
  "📈",
  "📉",
  "📋",
  // 💼 办公/工作
  "💼",
  "📅",
  "📌",
  "📎",
  "📝",
  "✒️",
  "🔍",
  "💡",
  // 💻 编程/技术
  "💻",
  "⌨️",
  "🖥️",
  "🖱️",
  "🐛",
  "🔧",
  "🔨",
  "⚙️",
  // 🤖 AI/机器人
  "🤖",
  "👾",
  "🧠",
  "⚡",
  "🔥",
  "✨",
  "🎓",
  "📚",
  // 🎨 创意/艺术
  "🎨",
  "🎭",
  "🎬",
  "🎹",
  "🎵",
  "📷",
  "🖌️",
  "🖍️",
  // 🏠 生活/日常
  "🏠",
  "🛒",
  "✈️",
  "🎮",
  "⚽",
  "🍔",
  "☕",
  "❤️",
  // 🌈 颜色/标记
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "🔵",
  "🟣",
  "⚫",
  "⚪",
  // ⭐ 其他
  "⭐",
  "🌟",
  "🎉",
  "🔒",
  "🔑",
  "🚫",
  "✅",
  "❓",
]

// ==================== 标签颜色预设 ====================
// 30 色预设网格
export const TAG_COLORS = [
  // 第一行
  "#FF461F",
  "#FF6B6B",
  "#FA8072",
  "#DC143C",
  "#CD5C5C",
  "#FF4500",
  // 第二行
  "#FFA500",
  "#FFB347",
  "#F0E68C",
  "#DAA520",
  "#FFD700",
  "#9ACD32",
  // 第三行
  "#32CD32",
  "#3CB371",
  "#20B2AA",
  "#00CED1",
  "#5F9EA0",
  "#4682B4",
  // 第四行
  "#6495ED",
  "#4169E1",
  "#0000CD",
  "#8A2BE2",
  "#9370DB",
  "#BA55D3",
  // 第五行
  "#DB7093",
  "#C71585",
  "#8B4513",
  "#A0522D",
  "#708090",
  "#2F4F4F",
]
