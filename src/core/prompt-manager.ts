/**
 * Prompt Manager
 *
 * 提供 DOM 相关操作（插入提示词到输入框）
 * 数据存储已迁移到 prompts-store.ts
 */

import type { SiteAdapter } from "~adapters/base"
import {
  filterPrompts,
  getCategories,
  getPromptsStore,
  usePromptsStore,
} from "~stores/prompts-store"
import type { Prompt } from "~utils/storage"

export class PromptManager {
  private adapter: SiteAdapter

  constructor(adapter: SiteAdapter) {
    this.adapter = adapter
  }

  /**
   * 初始化 - 等待 Zustand hydration 完成
   */
  async init() {
    // 等待 hydration 完成
    if (!usePromptsStore.getState()._hasHydrated) {
      await new Promise<void>((resolve) => {
        const unsubscribe = usePromptsStore.subscribe((state) => {
          if (state._hasHydrated) {
            unsubscribe()
            resolve()
          }
        })
      })
    }
  }

  // ==================== 数据访问（委托给 store）====================

  getPrompts(): Prompt[] {
    return getPromptsStore().prompts
  }

  addPrompt(data: Omit<Prompt, "id">): Prompt {
    return getPromptsStore().addPrompt(data)
  }

  updatePrompt(id: string, data: Partial<Omit<Prompt, "id">>) {
    getPromptsStore().updatePrompt(id, data)
  }

  deletePrompt(id: string) {
    getPromptsStore().deletePrompt(id)
  }

  getCategories(): string[] {
    return getCategories()
  }

  renameCategory(oldName: string, newName: string) {
    getPromptsStore().renameCategory(oldName, newName)
  }

  deleteCategory(name: string, defaultCategoryName: string = "未分类") {
    getPromptsStore().deleteCategory(name, defaultCategoryName)
  }

  updateOrder(newOrderIds: string[]) {
    getPromptsStore().updateOrder(newOrderIds)
  }

  filterPrompts(filter: string = "", category: string = "all"): Prompt[] {
    return filterPrompts(filter, category)
  }

  // ==================== DOM 操作 ====================

  /**
   * 插入提示词到输入框
   */
  async insertPrompt(content: string): Promise<boolean> {
    // 首次尝试插入
    let result = this.adapter.insertPrompt(content)

    // 如果失败，尝试重新查找输入框后再次插入
    if (!result) {
      this.adapter.findTextarea()
      // 短暂延迟后重试
      await new Promise((resolve) => setTimeout(resolve, 100))
      result = this.adapter.insertPrompt(content)
    }

    return result
  }
}
