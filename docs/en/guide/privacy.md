# 🔒 Privacy & Data

Ophel follows "Privacy First" design principles. All data is stored locally by default, giving you complete control.

## Local First

### Data Storage

All data stored locally in browser:

| Data Type         | Storage Location     |
| ----------------- | -------------------- |
| Settings          | Browser LocalStorage |
| Conversation Tags | Browser LocalStorage |
| Prompts           | Browser LocalStorage |
| Custom Styles     | Browser LocalStorage |

### No Remote Services

Ophel does NOT:

- ❌ Upload any data to remote servers
- ❌ Collect user behavior data
- ❌ Track user usage
- ❌ Share any information with third parties

## Permission Management

### Permission Description

Ophel follows minimum permission principle:

| Permission      | Usage                    | Required |
| --------------- | ------------------------ | :------: |
| `storage`       | Store settings and data  |    ✅    |
| `activeTab`     | Access current tab       |    ✅    |
| Site Access     | Run on AI platforms      |    ✅    |
| `notifications` | Desktop notifications    |    ❌    |
| `<all_urls>`    | WebDAV/Watermark removal |    ❌    |

### Permission Panel

View and manage permissions in settings:

1. Open Settings → Privacy & Permissions
2. View currently granted permissions
3. Enable/disable optional permissions as needed

### Optional Permissions

Some features require additional permissions (disabled by default):

| Feature               | Permission Required |
| --------------------- | ------------------- |
| WebDAV Sync           | `<all_urls>`        |
| Watermark Removal     | `<all_urls>`        |
| Desktop Notifications | `notifications`     |

::: tip On-Demand Authorization
Optional permissions are only requested when you enable the feature. You can revoke anytime in settings.
:::

## Data Sync

### WebDAV Sync

Sync data via WebDAV protocol:

**Supported Services:**

- ☁️ Nutstore (recommended for Chinese users)
- 🖥️ Synology NAS
- 📁 Nextcloud
- 🌐 Any WebDAV-compatible service

**Sync Content:**

- ⚙️ Settings
- 🏷️ Conversation tags and folders
- ⌨️ Prompt library
- 🎨 Custom styles
- 🔑 Claude Session Key (optional)

**Security Measures:**

- 🔐 Sensitive data encrypted
- 🔒 HTTPS transport encryption
- 🔑 Credentials stored locally

### Manual Backup

#### Full Backup

Export all data to single JSON file:

```json
{
  "version": "1.0",
  "exportTime": "2024-01-15T10:00:00Z",
  "settings": { ... },
  "prompts": [ ... ],
  "tags": [ ... ],
  "styles": [ ... ]
}
```

#### Modular Export

Export specific modules as needed:

- 📋 Prompts only
- ⚙️ Settings only
- 🏷️ Tags and folders only
- 🎨 Custom styles only

## Data Cleanup

### Clear Data

Clear Ophel stored data in settings:

| Action         | Effect               |
| -------------- | -------------------- |
| Clear Settings | Reset to defaults    |
| Clear Cache    | Clear temporary data |
| Full Reset     | Delete all data      |

::: danger Warning
Data clearing is irreversible. Please backup important data first.
:::

## Security Recommendations

1. **Regular Backups**: Backup important data at least weekly
2. **Careful Authorization**: Only grant optional permissions when needed
3. **Protect Credentials**: Keep WebDAV passwords and sensitive info safe
4. **Stay Updated**: Keep extension updated for security fixes
