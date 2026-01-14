/**
 * 默认值常量
 */

import { t } from "~utils/i18n"
import type { Prompt } from "~utils/storage"

// ==================== Zustand Store Keys ====================
// 用于备份导出/导入时识别 Zustand persist 格式的数据
export const ZUSTAND_KEYS: string[] = [
  "settings",
  "prompts",
  "folders",
  "tags",
  "conversations",
  "readingHistory",
]

// 多属性 Store（导入时需要特殊处理）
// 这些 store 的 state 中包含多个属性，不只是与 key 同名的主数据
export const MULTI_PROP_STORES: string[] = ["conversations", "readingHistory"]

// ==================== 默认提示词 ====================
// 返回国际化后的默认提示词
export const getDefaultPrompts = (): Prompt[] => [
  {
    id: "default_1",
    title: t("defaultPromptCodeOptTitle") || "代码优化",
    content: t("defaultPromptCodeOptContent") || "请帮我优化以下代码，提高性能和可读性：\n\n",
    category: t("defaultPromptCodeOptCategory") || "编程",
  },
  {
    id: "default_2",
    title: t("defaultPromptTranslateTitle") || "翻译助手",
    content:
      t("defaultPromptTranslateContent") || "请将以下内容翻译成中文，保持专业术语的准确性：\n\n",
    category: t("defaultPromptTranslateCategory") || "翻译",
  },
]

// ==================== 默认文件夹 ====================
export interface Folder {
  id: string
  name: string
  icon: string
  isDefault?: boolean
  color?: string
}

export const DEFAULT_FOLDERS: Folder[] = [
  { id: "inbox", name: "📥 收件箱", icon: "📥", isDefault: true },
]

// ==================== 布局配置默认值 ====================
export const LAYOUT_CONFIG = {
  PAGE_WIDTH: {
    DEFAULT_PX: "1280",
    DEFAULT_PERCENT: "81",
    MIN_PERCENT: 40,
    MAX_PERCENT: 100,
    MIN_PX: 1200,
  },
  USER_QUERY_WIDTH: {
    DEFAULT_PX: "600",
    DEFAULT_PERCENT: "81",
    MIN_PERCENT: 40,
    MAX_PERCENT: 100,
    MIN_PX: 600,
  },
} as const

// ==================== 验证规则 ====================
export const VALIDATION_PATTERNS = {
  // Claude Session Key 格式：sk-ant-sidXX-
  CLAUDE_KEY: /^sk-ant-sid\d{2}-/,
} as const

// ==================== 批量测试配置 ====================
export const BATCH_TEST_CONFIG = {
  INTERVAL_MS: 500, // 两次请求间隔
} as const

// ==================== 站点 ID ====================
export const SITE_IDS = {
  CLAUDE: "claude",
  GEMINI: "gemini",
  CHATGPT: "chatgpt",
  GEMINI_ENTERPRISE: "gemini-enterprise",
  GROK: "grok",
} as const
