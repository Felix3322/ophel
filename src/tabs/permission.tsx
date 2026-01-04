import React, { useEffect, useState } from "react"

import "./permission.css"

const PermissionPage = () => {
  const [status, setStatus] = useState<"idle" | "requesting" | "success" | "failed">("idle")
  const [origin, setOrigin] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetOrigin = params.get("origin")
    if (targetOrigin) {
      setOrigin(targetOrigin)
    }
  }, [])

  const requestPermission = async () => {
    if (!origin) return

    setStatus("requesting")
    try {
      const granted = await chrome.permissions.request({
        origins: [origin],
      })

      if (granted) {
        setStatus("success")
        setTimeout(() => {
          window.close()
        }, 1500)
      } else {
        setStatus("failed")
        setError("User denied permission")
      }
    } catch (err) {
      console.error("Permission request error:", err)
      setStatus("failed")
      setError(String(err))
    }
  }

  return (
    <div className="permission-container">
      <div className="permission-card">
        <h2>WebDAV Access Request</h2>
        <p>Chat Helper needs permission to access your WebDAV server:</p>
        <code className="origin-display">{origin || "Unknown Origin"}</code>

        {status === "idle" && (
          <div className="actions">
            <button className="btn-primary" onClick={requestPermission}>
              Allow Access
            </button>
            <button className="btn-secondary" onClick={() => window.close()}>
              Cancel
            </button>
          </div>
        )}

        {status === "requesting" && <p>Requesting permission...</p>}

        {status === "success" && (
          <div className="success-message">
            <span className="icon">✅</span>
            <p>Permission granted! Closing...</p>
          </div>
        )}

        {status === "failed" && (
          <div className="error-message">
            <p>Failed: {error}</p>
            <button className="btn-secondary" onClick={() => window.close()}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PermissionPage
