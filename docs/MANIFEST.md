# Plugin Manifest Reference

The `hermes-plugin.json` file is the plugin's manifest. It declares metadata, capabilities, and requirements. Every plugin must include this file in its root directory.

## Full Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier, format: `author.plugin-name` |
| `name` | string | Yes | Display name shown in Plugin Manager |
| `version` | string | Yes | Semver version (e.g., `"1.0.0"`) |
| `description` | string | Yes | Short description of what the plugin does |
| `author` | string | Yes | Author name |
| `main` | string | No | Path to IIFE bundle (default: `"dist/index.js"`) |
| `activationEvents` | array | Yes | When the plugin should activate |
| `contributes` | object | Yes | What the plugin provides (commands, panels, session actions, status bar items) |
| `permissions` | array | No | Required permissions (default: `[]`) |

---

## Activation Events

Controls when the plugin is loaded and its `activate()` function is called.

```json
"activationEvents": [
  { "type": "onStartup" }
]
```

| Type | Description |
|------|-------------|
| `onStartup` | Activate when the app starts |
| `onCommand` | Activate when a specific command is invoked (planned) |
| `onView` | Activate when a specific view/panel is opened (planned) |

Currently, `onStartup` is the only supported activation event. Use it for all plugins.

---

## Contributes

The `contributes` object declares what your plugin provides to the host app.

### Commands

Commands are actions that can be invoked by the user or programmatically. Each command needs a handler registered via `api.commands.register()` in your `activate()` function.

```json
"contributes": {
  "commands": [
    {
      "command": "my-plugin.doSomething",
      "title": "Do Something",
      "category": "My Plugin"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | string | Yes | Unique command ID |
| `title` | string | Yes | Display title |
| `category` | string | No | Grouping category shown in the command palette |

### Panels

Panels are sidebar UI components. Each panel needs a React component registered via `api.ui.registerPanel()` in your `activate()` function.

```json
"contributes": {
  "panels": [
    {
      "id": "my-plugin-panel",
      "name": "My Plugin",
      "side": "left",
      "icon": "<svg>...</svg>"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique panel ID |
| `name` | string | Yes | Display name shown in the sidebar |
| `side` | string | Yes | Which sidebar to appear in (`"left"`) |
| `icon` | string | Yes | Inline SVG string for the sidebar icon |

**Icon guidelines:**
- Use an inline SVG string (not a file path).
- Recommended viewBox: `0 0 18 18`.
- Use `currentColor` for `stroke` and/or `fill` so the icon matches the app's theme.
- Keep the SVG simple and recognizable at small sizes.

Example icon:

```json
"icon": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M7 9h4\"/></svg>"
```

### Session Actions

Session actions place a button in the per-session sub-view toolbar (next to the built-in Git, Files, and Search buttons). When clicked, the button toggles a panel open/closed. Session actions also support badges (e.g., to show a count).

A session action **must reference a panel** declared in `contributes.panels`. The panel provides the component; the session action provides the button placement.

> **Requires Hermes IDE 0.6.0+.** For backward compatibility with older versions, also declare the panel in `contributes.panels` and optionally include a `contributes.statusBarItems` entry as a fallback. The host app will automatically hide the panel from the ActivityBar when a session action references it.

```json
"contributes": {
  "panels": [
    {
      "id": "my-plugin-panel",
      "name": "My Plugin",
      "side": "left",
      "icon": "<svg>...</svg>"
    }
  ],
  "sessionActions": [
    {
      "id": "my-plugin-action",
      "panelId": "my-plugin-panel",
      "name": "My Plugin",
      "icon": "<svg>...</svg>"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique action ID |
| `panelId` | string | Yes | References a panel ID from `contributes.panels` |
| `name` | string | Yes | Tooltip label shown on hover |
| `icon` | string | Yes | Inline SVG string for the button icon |

**Icon guidelines:**
- Recommended size: `width="14" height="14"` to match the built-in sub-view buttons.
- Use `currentColor` for `stroke` and/or `fill`.
- The `viewBox` can be any size (e.g., `0 0 18 18`), the width/height attributes control display size.

**Badge updates at runtime:**

Use `api.ui.updateSessionActionBadge()` to show a count on the button:

```typescript
api.ui.updateSessionActionBadge("my-plugin-action", { count: 5 });
```

Set `count: 0` to hide the badge.

---

### Status Bar Items

Status bar items appear at the bottom of the app window.

```json
"contributes": {
  "statusBarItems": [
    {
      "id": "my-plugin.status",
      "text": "My Plugin",
      "tooltip": "Click to open My Plugin",
      "alignment": "right",
      "priority": 50,
      "command": "my-plugin.openPanel"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique status bar item ID |
| `text` | string | Yes | Display text |
| `tooltip` | string | No | Tooltip shown on hover |
| `alignment` | string | No | Position in the status bar (`"left"` or `"right"`) |
| `priority` | number | No | Sort order (higher = more to the left within its alignment group) |
| `command` | string | No | Command to execute when clicked |

---

## Permissions

Declare the permissions your plugin requires. See the [Plugin API Reference](./PLUGIN-API.md#permissions) for what each permission grants.

```json
"permissions": ["clipboard.read", "clipboard.write", "storage"]
```

| Permission | Grants access to |
|-----------|------------------|
| `clipboard.read` | `api.clipboard.readText()` |
| `clipboard.write` | `api.clipboard.writeText()` |
| `storage` | `api.storage.*`, `api.settings.*` |
| `notifications` | `api.notifications.send()` |
| `sessions.read` | `api.sessions.*`, `api.agents.*` |
| `network` | `api.network.fetch()`, `api.shell.openExternal()` |

Only request permissions your plugin actually uses. Unnecessary permissions will be flagged during review.

> **Note:** If your plugin declares a `contributes.settings` schema, the `"storage"` permission is auto-granted. You don't need to list it explicitly, but it's good practice to include it for clarity.

---

## Full Example

```json
{
  "id": "hermes-hq.json-formatter",
  "name": "JSON Formatter",
  "version": "1.0.0",
  "description": "Format, minify, and validate JSON",
  "author": "Hermes HQ",
  "main": "dist/index.js",
  "activationEvents": [
    { "type": "onStartup" }
  ],
  "contributes": {
    "commands": [
      {
        "command": "json-formatter.format",
        "title": "Format JSON",
        "category": "JSON"
      },
      {
        "command": "json-formatter.minify",
        "title": "Minify JSON",
        "category": "JSON"
      }
    ],
    "panels": [
      {
        "id": "json-formatter-panel",
        "name": "JSON",
        "side": "left",
        "icon": "<svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M4 3C3 3 2 4 2 5v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 1 1 2 2 2\"/><path d=\"M14 3c1 0 2 1 2 2v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 1-1 2-2 2\"/></svg>"
      }
    ],
    "statusBarItems": [
      {
        "id": "json-formatter.status",
        "text": "JSON",
        "tooltip": "Open JSON Formatter",
        "alignment": "right",
        "priority": 50,
        "command": "json-formatter.togglePanel"
      }
    ]
  },
  "permissions": ["clipboard.read", "clipboard.write"]
}
```

## Minimal Example

The smallest valid manifest:

```json
{
  "id": "your-name.my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "description": "A simple Hermes IDE plugin",
  "author": "Your Name",
  "activationEvents": [
    { "type": "onStartup" }
  ],
  "contributes": {
    "commands": [
      {
        "command": "my-plugin.hello",
        "title": "Say Hello",
        "category": "My Plugin"
      }
    ]
  }
}
```
