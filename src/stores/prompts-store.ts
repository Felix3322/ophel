/**
 * Prompts Store - Zustand 状态管理
 *
 * 管理提示词列表
 */

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { DEFAULT_PROMPTS } from "~constants"
import type { Prompt } from "~utils/storage"

import { chromeStorageAdapter } from "./chrome-adapter"

// ==================== Store 类型定义 ====================

interface PromptsState {
  // 状态
  prompts: Prompt[]
  _hasHydrated: boolean

  // Actions
  addPrompt: (data: Omit<Prompt, "id">) => Prompt
  updatePrompt: (id: string, data: Partial<Omit<Prompt, "id">>) => void
  deletePrompt: (id: string) => void
  renameCategory: (oldName: string, newName: string) => void
  deleteCategory: (name: string, defaultCategory?: string) => void
  updateOrder: (newOrderIds: string[]) => void
  setHasHydrated: (state: boolean) => void
}

// ==================== Store 创建 ====================

export const usePromptsStore = create<PromptsState>()(
  persist(
    (set, get) => ({
      prompts: DEFAULT_PROMPTS,
      _hasHydrated: false,

      addPrompt: (data) => {
        const newPrompt: Prompt = {
          id: "custom_" + Date.now(),
          ...data,
        }
        set((state) => ({
          prompts: [...state.prompts, newPrompt],
        }))
        return newPrompt
      },

      updatePrompt: (id, data) =>
        set((state) => ({
          prompts: state.prompts.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      deletePrompt: (id) =>
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        })),

      renameCategory: (oldName, newName) =>
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.category === oldName ? { ...p, category: newName } : p,
          ),
        })),

      deleteCategory: (name, defaultCategory = "未分类") =>
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.category === name ? { ...p, category: defaultCategory } : p,
          ),
        })),

      updateOrder: (newOrderIds) =>
        set((state) => {
          const ordered: Prompt[] = []
          newOrderIds.forEach((id) => {
            const p = state.prompts.find((x) => x.id === id)
            if (p) ordered.push(p)
          })
          // 追加任何遗漏的项
          state.prompts.forEach((p) => {
            if (!ordered.find((x) => x.id === p.id)) ordered.push(p)
          })
          return { prompts: ordered }
        }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "prompts", // chrome.storage key
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({ prompts: state.prompts }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

// ==================== 便捷 Hooks ====================

export const usePromptsHydrated = () => usePromptsStore((state) => state._hasHydrated)
export const usePrompts = () => usePromptsStore((state) => state.prompts)

// ==================== 非 React 环境使用 ====================

export const getPromptsState = () => usePromptsStore.getState().prompts
export const getPromptsStore = () => usePromptsStore.getState()

// ==================== 辅助函数 ====================

export const getCategories = (): string[] => {
  const prompts = getPromptsState()
  const categories = new Set<string>()
  prompts.forEach((p) => {
    if (p.category) categories.add(p.category)
  })
  return Array.from(categories)
}

export const filterPrompts = (filter: string = "", category: string = "all"): Prompt[] => {
  let filtered = getPromptsState()
  if (category !== "all") {
    filtered = filtered.filter((p) => p.category === category)
  }
  if (filter) {
    const lowerFilter = filter.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerFilter) ||
        p.content.toLowerCase().includes(lowerFilter),
    )
  }
  return filtered
}
