# 代码重构建议

> 创建时间: 2026-01-04
> 状态: 待处理

本文档记录了项目当前需要重构的代码区域和建议方案。

---

## 📊 代码量概览

| 文件 | 行数 | 优先级 |
|-----|------|-------|
| `themes.ts` | 1912 | 🟡 中 |
| `locales/resources.ts` | 1275 | 🟡 中 |
| `ConversationDialogs.tsx` | 1261 | 🟡 中 |
| `conversation-manager.ts` | 1127 | 🟢 低 |

---

## 🟡 中优先级

### 1. themes.ts - 数据与逻辑分离

**问题**: 主题预置定义占用大量代码，每个主题约 70 行。

**建议方案**:

```
utils/themes/
├── index.ts              # 导出接口
├── types.ts              # ThemeVariables, ThemePreset 类型
├── presets/
│   ├── light/
│   │   ├── google-gradient.ts
│   │   ├── purple.ts
│   │   └── ...
│   └── dark/
│       ├── classic-dark.ts
│       └── ...
└── helpers.ts            # getPreset, applyTheme 等工具函数
```

**替代方案**: 将主题数据移至 JSON 文件。

---

### 2. locales/resources.ts - 按语言拆分

**问题**: 单文件包含所有语言翻译，难以维护。

**建议方案**:

```
locales/
├── index.ts      # 导出统一接口
├── zh-CN.ts      # 简体中文
├── zh-TW.ts      # 繁体中文
└── en.ts         # 英文
```

---

### 3. ConversationDialogs.tsx - 对话框组件拆分

**问题**: 单文件包含多个对话框组件。

**建议方案**:

```
components/dialogs/
├── FolderDialog.tsx       # 新建/编辑文件夹
├── RenameDialog.tsx       # 重命名
├── TagDialog.tsx          # 标签管理
├── MoveDialog.tsx         # 移动会话
└── ExportDialog.tsx       # 导出会话
```

---

## 🟢 低优先级

### 4. conversation-manager.ts - 职责分离

**问题**: 单个类承担过多职责（文件夹、标签、会话、导出）。

**建议方案**:

- `FolderManager` - 文件夹管理
- `TagManager` - 标签管理
- `ConversationStore` - 会话数据存储
- `ExportService` - 导出功能

---

### 5. 通用组件抽取

多个文件中存在重复的 UI 模式，可统一到 `components/ui/`:

- Toast 显示逻辑
- 确认对话框
- 可折叠区域
- 排序列表

---

### 6. 常量集中管理

分散的常量（如 `TAB_DEFINITIONS`、`DEFAULT_*`）可集中到 `constants/` 目录。

---

## 📋 推荐执行顺序

1. themes.ts 数据分离
2. locales 拆分
3. ConversationDialogs 拆分
4. 通用组件抽取
5. 常量集中管理
6. conversation-manager 职责分离
