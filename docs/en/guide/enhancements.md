# ⚡ Enhancements

Beyond the three core features, Ophel provides 20+ practical enhancement features to comprehensively improve AI conversation efficiency.

## Claude Exclusive

### Session Key Management

::: warning Claude Users Only
This feature is only for Claude (claude.ai) platform.
:::

Manage Claude Session Keys with multi-account rotation:

- 🔑 **Quick Switch**: One-click switch between Session Keys
- 🔄 **Auto Rotation**: Rotate multiple keys to avoid single account limits
- 🔐 **Secure Storage**: Encrypted key storage, WebDAV sync backup
- 📊 **Status Monitor**: Real-time key availability status

## Interface Customization

### Wide Screen Mode

Customize page max width for ultrawide displays:

| Setting    | Description        | Example            |
| ---------- | ------------------ | ------------------ |
| Percentage | Relative to screen | `80%`, `90%`       |
| Pixels     | Fixed width        | `1200px`, `1600px` |
| Full Width | Fill screen        | `100%`             |

### Bubble Width

Independently set user message bubble width:

- 📏 Custom width: `60%` ~ `100%`
- 🎯 Alignment: Left / Center / Right

### Sidebar Layout

AI Studio specific optimizations:

- 📂 Auto-collapse navigation
- ⚙️ Auto-collapse settings panel
- 📐 Maximize workspace

## Reading Assistance

### Scroll Lock

Prevent accidental scrolling during AI generation:

- 🔒 Lock viewport during generation
- 👆 Pause lock on manual scroll
- ⚙️ `Alt + S` to toggle manually

### Reading History

Auto-save and restore reading position:

- 📍 Auto-save position on leave
- 🔄 Auto-restore on return
- 📊 Independent tracking per conversation

### Markdown Optimization

Fix and enhance Markdown rendering:

- ✅ Fix Gemini bold/code block rendering
- ✅ Real-time render Markdown in input
- ✅ Optimize code block highlighting

## Content Interaction

### Formula Copy

Double-click LaTeX formulas to copy source:

```latex
E = mc^2
```

- 🖱️ Double-click formula → Auto copy
- 📋 Copy LaTeX source to clipboard
- ✨ Show copy success toast

### Table Conversion

One-click convert AI tables to Markdown:

| Table           | Result         |
| --------------- | -------------- |
| HTML table      | Markdown table |
| Complete format | Ready to use   |

### Watermark Removal

Auto-remove invisible watermarks from Gemini/AI Studio images:

::: warning Permission Required
Requires `<all_urls>` permission, configurable in permission settings.
:::

- 🖼️ Auto-process generated images
- 🔇 Remove digital watermarks
- 📥 Download clean images

## Model Lock

Auto-lock default model per platform:

| Platform  | Supported |
| --------- | :-------: |
| Gemini    |    ✅     |
| AI Studio |    ✅     |
| ChatGPT   |    ✅     |
| Claude    |    ✅     |
| Grok      |    ✅     |

## Tab Management

### Auto Rename

Auto-rename browser tabs based on conversation:

- 📝 Extract conversation topic
- 🔄 Real-time title update
- 🎯 Easy identification across tabs

### Privacy Mode

One-click blur page title for privacy:

- 🔒 Show generic tab name
- 👀 Prevent peeking at conversation
- ⚡ Quick shortcut toggle

### Notifications

Alert when AI response completes:

| Method                  | Description               |
| ----------------------- | ------------------------- |
| 🔔 Desktop Notification | System notification popup |
| 🔊 Sound Alert          | Play notification sound   |
| 📳 Tab Flash            | Tab title flashing        |

## Custom Shortcuts

All features support custom shortcuts:

- ⌨️ Windows / macOS compatible
- 🔧 Fully customizable
- ⚠️ Conflict detection

[View Shortcuts Settings →](/en/guide/shortcuts)
