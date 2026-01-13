/**
 * Claude 专属设置组件
 * 包含 SessionKey 管理功能
 */
import React, { useState } from "react"

import { CopyIcon } from "~components/icons"
import { ConfirmDialog, InputDialog } from "~components/ui"
import { useClaudeSessionKeysStore } from "~stores/claude-sessionkeys-store"
import { useSettingsStore } from "~stores/settings-store"
import { t } from "~utils/i18n"
import {
  MSG_CHECK_CLAUDE_GENERATING,
  MSG_CHECK_PERMISSIONS,
  MSG_GET_CLAUDE_SESSION_KEY,
  MSG_REQUEST_PERMISSIONS,
  MSG_SET_CLAUDE_SESSION_KEY,
  MSG_TEST_CLAUDE_TOKEN,
  sendToBackground,
} from "~utils/messaging"
import { showToast } from "~utils/toast"

import { SettingCard } from "../components"

interface ClaudeSettingsProps {
  siteId: string
}

// 对话框状态类型
type DialogState =
  | { type: "none" }
  | { type: "add-name"; defaultName?: string }
  | { type: "add-key"; name: string }
  | { type: "import-name"; sessionKey: string }
  | { type: "delete"; id: string; name: string }

const ClaudeSettings: React.FC<ClaudeSettingsProps> = ({ siteId }) => {
  const { keys, currentKeyId, addKey, deleteKey, setCurrentKey, testKey, setKeys, updateKey } =
    useClaudeSessionKeysStore()
  const { settings } = useSettingsStore()
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [dialog, setDialog] = useState<DialogState>({ type: "none" })
  const [hoveredKeyId, setHoveredKeyId] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // 获取当前 Session Key
  const currentKey = keys.find((k) => k.id === currentKeyId)

  // 关闭对话框
  const closeDialog = () => setDialog({ type: "none" })

  // 复制 Session Key（带反馈动画）
  const handleCopyKey = async (keyId: string, keyValue: string) => {
    try {
      await navigator.clipboard.writeText(keyValue)
      setCopiedKeyId(keyId)
      showToast(t("claudeKeyCopied"), 1500)
      // 1.5秒后恢复图标
      setTimeout(() => setCopiedKeyId(null), 1500)
    } catch {
      showToast(t("claudeKeyCopyFailed"), 1500)
    }
  }

  // 切换 Session Key（带检测）
  const handleSwitchToken = async (keyId: string) => {
    // 禁止切换到空值（已移除默认选项）
    if (!keyId) {
      showToast(t("claudePleaseSelectKey"), 1500)
      return
    }

    // 如果点击的是当前使用的，提示无需切换
    if (keyId === currentKeyId) {
      showToast(t("claudeAlreadyUsing"), 1500)
      return
    }

    // 1. 检查cookies权限
    const checkResult = await sendToBackground({
      type: MSG_CHECK_PERMISSIONS,
      permissions: ["cookies"],
    })

    if (!checkResult.hasPermission) {
      await sendToBackground({
        type: MSG_REQUEST_PERMISSIONS,
        permType: "cookies",
      })
      showToast(t("claudeRequestPermission"), 3000)
      return
    }

    // 2. 设置cookie
    const key = keyId ? keys.find((k) => k.id === keyId)?.key : ""
    await sendToBackground({
      type: MSG_SET_CLAUDE_SESSION_KEY,
      key: key || "",
    })

    // 3. 更新当前选中
    setCurrentKey(keyId)
    showToast(t("claudeKeySwitched"), 2000)
  }

  // 测试 Session Key 有效性
  const handleTestToken = async (id: string) => {
    const key = keys.find((k) => k.id === id)
    if (!key) return

    // 安全检测：如果正在生成则拒绝测试
    try {
      const checkResult = await sendToBackground({
        type: MSG_CHECK_CLAUDE_GENERATING,
      })
      if (checkResult.isGenerating) {
        showToast(t("claudeGenerating"), 3000)
        return
      }
    } catch {
      // 检测失败时允许继续
    }

    setTesting((prev) => ({ ...prev, [id]: true }))

    try {
      const result = await sendToBackground({
        type: MSG_TEST_CLAUDE_TOKEN,
        sessionKey: key.key,
      })

      if (result.isValid) {
        testKey(id, { isValid: true, accountType: result.accountType })
        showToast(`${key.name}: ${result.accountType}`, 2000)
      } else {
        testKey(id, { isValid: false })
        showToast(`${key.name}: ${t("claudeKeyInvalid")}`, 2000)
      }
    } catch (error) {
      testKey(id, { isValid: false })
      showToast(`${key.name}: ${t("claudeKeyTest")} ${t("claudeKeyInvalid")}`, 2000)
    } finally {
      setTesting((prev) => ({ ...prev, [id]: false }))
    }
  }

  // 从浏览器导入当前Cookie
  const handleImportFromBrowser = async () => {
    try {
      const checkResult = await sendToBackground({
        type: MSG_CHECK_PERMISSIONS,
        permissions: ["cookies"],
      })

      if (!checkResult.hasPermission) {
        await sendToBackground({
          type: MSG_REQUEST_PERMISSIONS,
          permType: "cookies",
        })
        showToast(t("claudeRequestPermission"), 3000)
        return
      }

      const result = await sendToBackground({
        type: MSG_GET_CLAUDE_SESSION_KEY,
      })

      if (!result.success) {
        showToast(result.error || t("claudeNoCookieFound"), 2000)
        return
      }

      const existingKey = keys.find((k) => k.key === result.sessionKey)
      if (existingKey) {
        showToast(t("claudeTokenExists").replace("{name}", existingKey.name), 2000)
        return
      }

      setDialog({
        type: "import-name",
        sessionKey: result.sessionKey,
      })
    } catch (error) {
      showToast(t("claudeKeyCopyFailed") + ": " + (error as Error).message, 3000)
    }
  }

  // 导出所有 Session Key
  const handleExportTokens = () => {
    if (keys.length === 0) {
      showToast(t("claudeNoTokensToExport"), 1500)
      return
    }

    const data = JSON.stringify(keys, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `claude-session-keys-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast(t("claudeExported"), 1500)
  }

  // 导入 Session Key
  const handleImportTokens = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)

        if (!Array.isArray(imported)) {
          showToast(t("claudeInvalidJSON"), 2000)
          return
        }

        const existingKeys = new Set(keys.map((k) => k.key))
        const newKeys = imported.filter((k: any) => !existingKeys.has(k.key))

        if (newKeys.length === 0) {
          showToast(t("claudeNoNewTokens"), 1500)
          return
        }

        setKeys([...keys, ...newKeys])
        showToast(t("claudeImported").replace("{count}", String(newKeys.length)), 2000)
      } catch (error) {
        showToast(t("claudeInvalidJSON") + ": " + (error as Error).message, 3000)
      }
    }
    input.click()
  }

  // 添加 Session Key - 第一步
  const handleAddToken = () => {
    setDialog({ type: "add-name" })
  }

  // 添加 Session Key - 第二步
  const handleAddTokenKey = (name: string) => {
    if (!name.trim()) {
      showToast(t("claudeNameRequired"), 1500)
      return
    }
    setDialog({ type: "add-key", name: name.trim() })
  }

  // 添加 Session Key - 完成
  const handleAddTokenComplete = (key: string) => {
    if (!key.trim()) {
      showToast(t("claudeKeyRequired"), 1500)
      return
    }

    if (!/^sk-ant-sid\d{2}-/.test(key)) {
      showToast(t("claudeKeyInvalidFormat"), 2000)
      return
    }

    if (keys.some((k) => k.key === key)) {
      showToast(t("claudeKeyExists"), 2000)
      return
    }

    const dialogState = dialog as { type: "add-key"; name: string }
    addKey({ name: dialogState.name, key: key.trim() })
    showToast(t("claudeKeyAdded"), 1500)
    closeDialog()
  }

  // 从浏览器导入 - 完成命名
  const handleImportComplete = (name: string) => {
    if (!name.trim()) {
      showToast(t("claudeNameRequired"), 1500)
      return
    }

    const dialogState = dialog as { type: "import-name"; sessionKey: string }
    const newKey = addKey({ name: name.trim(), key: dialogState.sessionKey })

    // 自动设为当前使用（因为这就是浏览器当前正在用的 key）
    setCurrentKey(newKey.id)

    showToast(t("claudeKeyImported"), 1500)
    closeDialog()
    setTimeout(() => handleTestToken(newKey.id), 500)
  }

  // 删除 Session Key
  const handleDeleteToken = (id: string, name: string) => {
    setDialog({ type: "delete", id, name })
  }

  const confirmDelete = () => {
    const dialogState = dialog as { type: "delete"; id: string; name: string }
    deleteKey(dialogState.id)
    showToast(t("claudeKeyDeleted"), 1500)
    closeDialog()
  }

  // 渲染状态标签
  const renderStatusBadge = (isValid: boolean | undefined) => {
    if (isValid === undefined) return <span style={{ color: "var(--gh-text-secondary)" }}>-</span>
    return isValid ? (
      <span style={{ color: "#10b981", fontWeight: 500 }}>✓ {t("claudeKeyValid")}</span>
    ) : (
      <span style={{ color: "#ef4444", fontWeight: 500 }}>✗ {t("claudeKeyInvalid")}</span>
    )
  }

  // 渲染类型标签
  const renderTypeBadge = (type: string | undefined) => {
    if (!type)
      return <span style={{ color: "var(--gh-text-secondary)" }}>{t("claudeKeyUntested")}</span>
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 500,
          backgroundColor: "var(--gh-bg-secondary)",
        }}>
        {type}
      </span>
    )
  }

  return (
    <div>
      {/* Session Key 管理（合并后的卡片） */}
      <SettingCard title={t("claudeSessionKeyTitle")} description={t("claudeSessionKeyDesc")}>
        {/* 当前使用状态栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "var(--gh-bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--gh-border)",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "var(--gh-text-secondary)" }}>
              {t("claudeCurrentUsing")}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>
              {currentKey ? (
                <>
                  🔑 {currentKey.name}
                  {currentKey.accountType && (
                    <span
                      style={{
                        marginLeft: "8px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        backgroundColor: "var(--gh-bg)",
                      }}>
                      {currentKey.accountType}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--gh-text-secondary)" }}>
                  {t("claudeNoKeySelected")}
                </span>
              )}
            </span>
          </div>
          {/* 快捷切换下拉 */}
          <select
            className="settings-select"
            value={currentKeyId}
            onChange={(e) => handleSwitchToken(e.target.value)}
            disabled={keys.length === 0}
            style={{
              minWidth: "180px",
              padding: "6px 12px",
              fontSize: "13px",
              opacity: keys.length === 0 ? 0.5 : 1,
            }}>
            {keys.length === 0 ? (
              <option value="">{t("claudePleaseAddKey")}</option>
            ) : (
              keys.map((k) => (
                <option key={k.id} value={k.id}>
                  🔑 {k.name} {k.accountType ? `(${k.accountType})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 操作按钮栏 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}>
          <button className="settings-btn settings-btn-primary" onClick={handleAddToken}>
            ➕ {t("claudeAddKey")}
          </button>
          <button className="settings-btn settings-btn-secondary" onClick={handleImportFromBrowser}>
            🌐 {t("claudeImportFromBrowser")}
          </button>
          <button className="settings-btn settings-btn-secondary" onClick={handleImportTokens}>
            📥 {t("claudeImportJSON")}
          </button>
          <button
            className="settings-btn settings-btn-secondary"
            onClick={handleExportTokens}
            disabled={keys.length === 0}>
            📤 {t("claudeExportJSON")}
          </button>
        </div>

        {/* Token 列表 */}
        {keys.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--gh-text-secondary)",
              backgroundColor: "var(--gh-bg-secondary)",
              borderRadius: "8px",
              border: "1px dashed var(--gh-border)",
            }}>
            <div style={{ marginBottom: "8px", fontSize: "24px" }}>🔑</div>
            <div>{t("claudeNoKeys")}</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>{t("claudeNoKeysHint")}</div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}>
            {keys.map((key) => {
              const isCurrent = key.id === currentKeyId
              const isHovered = hoveredKeyId === key.id

              return (
                <div
                  key={key.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    backgroundColor: isCurrent
                      ? "rgba(var(--gh-primary-rgb), 0.08)"
                      : "var(--gh-bg-secondary)",
                    borderRadius: "8px",
                    border: isCurrent
                      ? "1px solid rgba(var(--gh-primary-rgb), 0.3)"
                      : "1px solid var(--gh-border)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={() => setHoveredKeyId(key.id)}
                  onMouseLeave={() => setHoveredKeyId(null)}>
                  {/* 左侧：名称 + 当前标记 */}
                  <div
                    style={{
                      flex: "0 0 140px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                    {isCurrent && (
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "var(--gh-primary)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontWeight: isCurrent ? 600 : 400,
                        fontSize: "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                      {key.name}
                    </span>
                  </div>

                  {/* 中间：Session Key（带复制） */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      minWidth: 0,
                    }}
                    onDoubleClick={() => handleCopyKey(key.id, key.key)}
                    title={t("claudeKeyDoubleTapCopy")}>
                    <code
                      style={{
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: "var(--gh-text-secondary)",
                        backgroundColor: "var(--gh-bg)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}>
                      {key.key.substring(0, 24)}...
                    </code>
                    {/* 复制按钮：悬浮显示，点击后变绿色对号 */}
                    {(isHovered || copiedKeyId === key.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyKey(key.id, key.key)
                        }}
                        style={{
                          padding: "4px",
                          background: "none",
                          border: "none",
                          cursor: copiedKeyId === key.id ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          color: copiedKeyId === key.id ? "#22c55e" : "currentColor",
                          opacity: copiedKeyId === key.id ? 1 : 0.7,
                          transition: "color 0.2s, opacity 0.2s",
                        }}
                        title={copiedKeyId === key.id ? t("claudeCopied") : t("claudeCopyKey")}>
                        {copiedKeyId === key.id ? (
                          /* 绿色对号 */
                          <svg
                            viewBox="0 0 24 24"
                            width={14}
                            height={14}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <CopyIcon size={14} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* 类型 */}
                  <div style={{ flex: "0 0 70px", textAlign: "center" }}>
                    {renderTypeBadge(key.accountType)}
                  </div>

                  {/* 状态 */}
                  <div style={{ flex: "0 0 60px", textAlign: "center", fontSize: "12px" }}>
                    {renderStatusBadge(key.isValid)}
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ flex: "0 0 auto", display: "flex", gap: "4px" }}>
                    <button
                      className="settings-btn settings-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => handleSwitchToken(key.id)}>
                      {isCurrent ? t("claudeKeyUsing") : t("claudeKeyUse")}
                    </button>
                    <button
                      className="settings-btn settings-btn-secondary"
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        minWidth: "52px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                      onClick={() => handleTestToken(key.id)}
                      disabled={testing[key.id]}>
                      {testing[key.id] ? (
                        /* 加载动画：旋转的圆圈 */
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          style={{ animation: "spin 1s linear infinite" }}>
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="31.4"
                            strokeDashoffset="10"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        t("claudeKeyTest")
                      )}
                    </button>
                    <style>{`
                      @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                    `}</style>
                    <button
                      className="settings-btn settings-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "12px", color: "#ef4444" }}
                      onClick={() => handleDeleteToken(key.id, key.name)}>
                      {t("claudeKeyDelete")}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SettingCard>

      {/* 对话框 */}
      {dialog.type === "add-name" && (
        <InputDialog
          title={t("claudeAddKeyNameTitle")}
          placeholder={t("claudeAddKeyNamePlaceholder")}
          onConfirm={handleAddTokenKey}
          onCancel={closeDialog}
        />
      )}

      {dialog.type === "add-key" && (
        <InputDialog
          title={`${t("claudeAddKeyValueTitle")} (${dialog.name})`}
          placeholder={t("claudeAddKeyValuePlaceholder")}
          onConfirm={handleAddTokenComplete}
          onCancel={closeDialog}
        />
      )}

      {dialog.type === "import-name" && (
        <InputDialog
          title={t("claudeImportNameTitle")}
          defaultValue={`Import-${new Date().toLocaleDateString()}`}
          placeholder={t("claudeImportNamePlaceholder")}
          onConfirm={handleImportComplete}
          onCancel={closeDialog}
        />
      )}

      {dialog.type === "delete" && (
        <ConfirmDialog
          title={t("claudeDeleteConfirmTitle")}
          message={t("claudeDeleteConfirmMsg").replace("{name}", dialog.name)}
          confirmText={t("claudeKeyDelete")}
          danger
          onConfirm={confirmDelete}
          onCancel={closeDialog}
        />
      )}
    </div>
  )
}

export default ClaudeSettings
