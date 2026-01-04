# WebDAV 恢复后主题预置选中状态不同步问题

**日期**: 2026-01-04

## 问题描述

通过 WebDAV 备份恢复后：

1. 主题样式**正确恢复并应用**（如浅色"独角兽"主题生效）
2. 但主题设置 UI 中**选中状态不正确**（显示恢复前的主题被选中，如"奶油脆饼"）

## 问题根因

### 1. 多个 `useStorage` 实例导致缓存不一致

当前架构中，`App.tsx` 和 `SettingsTab.tsx` **各自独立调用** `useStorage`：

```tsx
// App.tsx (第19行)
const [settings, setSettings] = useStorage<Settings>(STORAGE_KEYS.SETTINGS, ...)

// SettingsTab.tsx (第738行)  
const [settings, setSettings] = useStorage<Settings>(STORAGE_KEYS.SETTINGS, ...)
```

Plasmo 的 `useStorage` Hook 有内部缓存机制：

- 页面刷新后，可能先返回**缓存的旧值**，然后才从 Storage 读取新值
- 多个组件各自调用 `useStorage`，每个都有自己的缓存实例
- 导致不同组件拿到的值可能不一致

### 2. 数据流分析

```
WebDAV 恢复 → 写入 Storage (正确值) → 刷新页面
                                        ↓
                    ┌───────────────────┼───────────────────┐
                    ↓                   ↓                   ↓
              main.ts              App.tsx            SettingsTab.tsx
           (getSetting)        (useStorage)          (useStorage)
           直接读 Storage      可能返回缓存旧值      可能返回缓存旧值
                ↓                   ↓                    ↓
           ThemeManager        React State          React State
           (正确的preset)      (可能是旧值)         (可能是旧值)
                ↓                   ↓                    ↓
            主题正确应用          状态可能错误         UI显示错误选中
```

### 3. 为什么主题样式正确但 UI 选中错误

- `main.ts` 使用 `getSetting()` **直接同步读取** Storage，拿到正确的 preset 值
- `ThemeManager` 用正确值初始化，主题样式正确应用
- 但 `SettingsTab` 使用 `useStorage` 可能拿到缓存旧值，UI 选中状态错误

## 解决方案

### 方案 A：统一 Settings 状态管理（推荐）

**核心思想**：只在 `App.tsx` 顶层调用一次 `useStorage`，通过 **React Context** 或 **Props** 传递给子组件。

#### 实现步骤

1. **创建 SettingsContext**

```tsx
// src/contexts/SettingsContext.tsx
import { createContext, useContext } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from "~utils/storage"

interface SettingsContextValue {
  settings: Settings
  setSettings: (settings: Settings | ((prev: Settings) => Settings)) => void
  isLoading: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings, { isLoading }] = useStorage<Settings>(
    STORAGE_KEYS.SETTINGS,
    (saved) => (saved === undefined ? DEFAULT_SETTINGS : { ...DEFAULT_SETTINGS, ...saved }),
  )

  return (
    <SettingsContext.Provider value={{ settings: settings!, setSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider")
  }
  return context
}
```

1. **在 App.tsx 中包裹 Provider**

```tsx
// App.tsx
import { SettingsProvider } from "~contexts/SettingsContext"

export const App = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}
```

1. **重构 SettingsTab 使用 Context**

```tsx
// SettingsTab.tsx
import { useSettings } from "~contexts/SettingsContext"

export const SettingsTab = () => {
  const { settings, setSettings } = useSettings()
  // ... 其余代码不变
}
```

1. **在 Provider 初始化时同步 ThemeManager 的值**

```tsx
// SettingsProvider 内
useEffect(() => {
  if (isLoading) return
  
  const themeManager = (window as any).__ghThemeManager
  if (!themeManager) return
  
  const tmPresets = themeManager.getPresetIds()
  const settingsPresets = settings.themePresets
  
  // 如果不一致，用 ThemeManager 的值覆盖
  if (tmPresets.lightPresetId !== settingsPresets?.lightPresetId ||
      tmPresets.darkPresetId !== settingsPresets?.darkPresetId) {
    setSettings(prev => ({
      ...prev,
      themePresets: tmPresets
    }))
  }
}, [isLoading])
```

#### 优点

- 从根本上解决多实例缓存不一致问题
- 统一的状态管理，更清晰的数据流
- 减少重复的 `useStorage` 调用

#### 影响范围

- 需要修改所有使用 `useStorage(STORAGE_KEYS.SETTINGS, ...)` 的组件
- 主要涉及：`App.tsx`, `SettingsTab.tsx`, 其他可能使用 settings 的组件

---

### 方案 B：在组件挂载时强制刷新 Storage（临时方案）

在 SettingsTab 挂载时，强制从 Storage 重新读取并覆盖 useStorage 的缓存：

```tsx
useEffect(() => {
  // 强制从 Storage 重新读取
  chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (result) => {
    const freshSettings = result[STORAGE_KEYS.SETTINGS]
    if (freshSettings) {
      const parsed = typeof freshSettings === 'string' 
        ? JSON.parse(freshSettings) 
        : freshSettings
      setSettings({ ...DEFAULT_SETTINGS, ...parsed })
    }
  })
}, [])
```

#### 缺点

- 绕过 useStorage 的抽象，直接操作 chrome.storage API
- 可能导致短暂的 UI 闪烁
- 治标不治本

---

### 方案 C：使用全局状态管理库（如 Zustand）

如果项目规模继续增长，可以考虑引入轻量级状态管理库：

```tsx
// src/stores/settings.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsStore {
  settings: Settings
  setSettings: (settings: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => localStorage), // 或自定义 chrome.storage adapter
    }
  )
)
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/components/App.tsx` | 顶层组件，有自己的 useStorage 调用 |
| `src/components/SettingsTab.tsx` | 设置面板，有独立的 useStorage 调用 |
| `src/core/theme-manager.ts` | 主题管理器，由 main.ts 创建并挂载到 window |
| `src/contents/main.ts` | Content Script 入口，使用 getSetting 直接读取 Storage |
| `src/utils/storage.ts` | Storage 抽象层 |

## 推荐行动

1. **短期**：采用方案 A（Context），统一 Settings 状态管理
2. **长期**：如果项目继续复杂化，考虑引入 Zustand 等状态管理库

## 参考

- TROUBLESHOOTING.md 第 8 节 "WebDAV 恢复后主题同步失效与数据覆盖问题"
- Plasmo Storage Hook: <https://docs.plasmo.com/framework/storage>

---

## 方案 A vs 方案 C 详细对比

### 基础对比

| 维度 | React Context | Zustand |
|------|---------------|---------|
| **依赖** | 零依赖，原生 React | ~2KB（极轻量） |
| **学习成本** | 无，已熟悉 | 低，API 极简 |
| **迁移成本** | 中等 | 中等（类似） |
| **性能** | 状态变化导致整颗树 re-render | 选择性订阅，仅订阅的组件 re-render |
| **持久化** | 需手动实现与 chrome.storage 同步 | 内置 `persist` 中间件，可自定义 storage |
| **与 Plasmo useStorage 共存** | 需要完全替换 | 可以完全替换 |
| **调试** | React DevTools | 有专用 DevTools 插件 |
| **TypeScript** | 良好 | 优秀（推断更强） |

### Zustand 的独特收益

1. **内置持久化中间件** - 这正是我们反复踩坑的根源

   ```ts
   persist(
     (set) => ({ ... }),
     {
       name: 'settings',
       storage: createJSONStorage(() => chromeStorageAdapter),
       // ⭐ 关键：可以配置 merge 策略、版本迁移等
     }
   )
   ```

2. **跨组件状态共享无需 Provider 包裹**

   ```ts
   // 任何地方直接使用，无需 Provider
   const settings = useSettingsStore((state) => state.settings)
   ```

3. **选择性订阅**（性能优势）

   ```ts
   // 只订阅 themePresets，其他 settings 变化不触发 re-render
   const themePresets = useSettingsStore((state) => state.settings.themePresets)
   ```

4. **在 React 外部读写**（解决 main.ts 与 React 组件同步问题）

   ```ts
   // main.ts (非 React 上下文)
   const settings = useSettingsStore.getState().settings
   useSettingsStore.setState({ settings: newSettings })
   ```

### 风险分析

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 与 Plasmo useStorage 冲突 | 中 | 高 | 完全迁移，不混用 |
| 引入新 bug | 低 | 中 | 渐进式迁移，充分测试 |
| chrome.storage 适配器问题 | 低 | 中 | 社区有成熟方案 |
| 团队学习成本 | 低 | 低 | API 极简，1 小时上手 |

### 成本分析

| 成本项 | React Context | Zustand |
|--------|---------------|---------|
| 代码改动 | 创建 Context + 修改 ~5 个文件 | 创建 Store + 修改 ~5 个文件 |
| 持久化实现 | 需要自己写同步逻辑（约 50-100 行） | 配置中间件（约 20 行） |
| 测试 | 需要测试同步逻辑 | 持久化由库保证 |
| 维护 | 自己维护同步逻辑 | 库维护 |

---

## 最终建议

**鉴于项目已经在状态同步上踩了多次坑，推荐 Zustand**，理由：

1. **解决根本问题**：Plasmo `useStorage` 的缓存行为不可控，而 Zustand 的 `persist` 中间件给了我们完全的控制权

2. **一劳永逸**：一次迁移后，未来不会再踩类似的坑

3. **成本收益比高**：
   - 迁移成本与 Context 方案相当
   - 但省去了自己实现持久化同步的时间
   - 长期维护成本更低

4. **未来扩展**：如果项目继续复杂化（如添加 prompts 状态、folders 状态等），Zustand 可以更优雅地处理多个 store
