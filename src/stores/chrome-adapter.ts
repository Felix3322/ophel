/**
 * Chrome Storage 适配器
 *
 * 用于 Zustand persist 中间件，统一所有 stores 的存储逻辑
 */

import type { StateStorage } from "zustand/middleware"

/**
 * chrome.storage.local 适配器
 *
 * Zustand persist 存储格式: { state: { [storeName]: ... }, version: 0 }
 */
export const chromeStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(name, (result) => {
        const value = result[name]
        if (value === undefined) {
          resolve(null)
          return
        }

        // storage 中存储的是 JSON 字符串
        if (typeof value === "string") {
          resolve(value)
        } else {
          // 对象格式（理论上不应出现），转换为字符串
          resolve(JSON.stringify(value))
        }
      })
    })
  },

  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      // 存储 JSON 字符串
      chrome.storage.local.set({ [name]: value }, () => {
        resolve()
      })
    })
  },

  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(name, () => {
        resolve()
      })
    })
  },
}
