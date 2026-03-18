# Hermes Plugin API Reference

## Overview

Every plugin receives a `HermesPluginAPI` object when its `activate()` function is called. This object provides namespaced access to the host app's functionality.

```typescript
export function activate(api: HermesPluginAPI) {
  // api.ui            — UI operations (panels, toasts, status bar, session action badges)
  // api.commands      — Command registration and execution
  // api.clipboard     — Clipboard access (requires permissions)
  // api.storage       — Persistent key-value storage (requires "storage" permission)
  // api.settings      — Schema-based plugin settings (requires "storage", auto-granted if settings schema exists)
  // api.events        — Subscribe to host app events (theme, sessions, window)
  // api.notifications — Desktop notifications (requires "notifications" permission)
  // api.network       — HTTP requests (requires "network" permission)
  // api.shell         — Open URLs in browser (requires "network" permission)
  // api.sessions      — Terminal session info (requires "sessions.read" permission)
  // api.agents        — AI agent transcript watching (requires "sessions.read" permission)
  // api.subscriptions — Auto-cleanup array for disposables
}
```

---

## Types

### `Disposable`

```typescript
interface Disposable {
  dispose(): void;
}
```

Returned by registration methods. Call `.dispose()` to unregister, or add to `api.subscriptions` for automatic cleanup on deactivation.

### `PluginPanelProps`

```typescript
interface PluginPanelProps {
  pluginId: string;
  panelId: string;
}
```

Props passed to panel components registered with `api.ui.registerPanel()`.

---

## `api.ui`

Methods for interacting with the app's user interface.

### `api.ui.registerPanel(panelId, component)`

Register a React component as a sidebar panel.

| Parameter | Type | Description |
|-----------|------|-------------|
| `panelId` | `string` | Must match an ID declared in `hermes-plugin.json` under `contributes.panels` |
| `component` | `React.ComponentType<PluginPanelProps>` | The React component to render in the panel |

**Returns:** `Disposable` — call `.dispose()` to unregister the panel.

```typescript
import { MyPanel } from "./MyPanel";

api.ui.registerPanel("my-plugin-panel", MyPanel);
```

### `api.ui.showPanel(panelId)`

Show and activate a panel in the sidebar.

| Parameter | Type | Description |
|-----------|------|-------------|
| `panelId` | `string` | The panel ID to show |

```typescript
api.ui.showPanel("my-plugin-panel");
```

### `api.ui.hidePanel(panelId)`

Hide a panel from the sidebar.

| Parameter | Type | Description |
|-----------|------|-------------|
| `panelId` | `string` | The panel ID to hide |

```typescript
api.ui.hidePanel("my-plugin-panel");
```

### `api.ui.togglePanel(panelId)`

Toggle a panel's visibility.

| Parameter | Type | Description |
|-----------|------|-------------|
| `panelId` | `string` | The panel ID to toggle |

```typescript
api.ui.togglePanel("my-plugin-panel");
```

### `api.ui.showToast(message, options?)`

Show a toast notification in the top-right corner of the app. Toasts stack vertically and support action buttons.

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | The message to display |
| `options.type` | `"info" \| "success" \| "warning" \| "error"` | Toast style (default: `"info"`) |
| `options.duration` | `number` | Duration in milliseconds (default: `3000`) |

```typescript
api.ui.showToast("Operation complete!", { type: "success" });
api.ui.showToast("Something went wrong", { type: "error", duration: 5000 });
```

### `api.ui.updateStatusBarItem(itemId, update)`

Update a status bar item's display properties.

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemId` | `string` | Must match an ID in `contributes.statusBarItems` |
| `update.text` | `string` (optional) | New display text |
| `update.tooltip` | `string` (optional) | New tooltip text |
| `update.visible` | `boolean` (optional) | Show or hide the item |

```typescript
api.ui.updateStatusBarItem("my-plugin.status", {
  text: "Ready",
  tooltip: "My Plugin is active",
  visible: true,
});
```

### `api.ui.updateSessionActionBadge(actionId, badge)`

Update the badge shown on a session action button. Requires a `sessionActions` entry in the manifest.

| Parameter | Type | Description |
|-----------|------|-------------|
| `actionId` | `string` | Must match an ID in `contributes.sessionActions` |
| `badge.text` | `string` (optional) | Badge text (reserved for future use) |
| `badge.count` | `number` (optional) | Badge count — displayed as a number on the button. Set to `0` to hide. |

> **Availability:** Hermes IDE 0.6.0+. For backward compatibility, guard the call:
> ```typescript
> if (typeof api.ui.updateSessionActionBadge === "function") {
>   api.ui.updateSessionActionBadge("my-action", { count: 5 });
> }
> ```

```typescript
// Show a badge with count
api.ui.updateSessionActionBadge("my-plugin-action", { count: 3 });

// Hide the badge
api.ui.updateSessionActionBadge("my-plugin-action", { count: 0 });
```

---

## `api.commands`

Methods for registering and executing commands.

### `api.commands.register(commandId, handler)`

Register a command handler.

| Parameter | Type | Description |
|-----------|------|-------------|
| `commandId` | `string` | Must match a command in `contributes.commands` |
| `handler` | `() => void \| Promise<void>` | The function to run when the command is invoked |

**Returns:** `Disposable` — call `.dispose()` to unregister the command.

```typescript
const disposable = api.commands.register("my-plugin.format", async () => {
  // Command logic here
  api.ui.showToast("Formatted!", { type: "success" });
});

// Add to subscriptions for automatic cleanup
api.subscriptions.push(disposable);
```

### `api.commands.execute(commandId)`

Execute a registered command programmatically.

| Parameter | Type | Description |
|-----------|------|-------------|
| `commandId` | `string` | The command ID to execute |

**Returns:** `Promise<void>`

```typescript
await api.commands.execute("my-plugin.format");
```

---

## `api.clipboard`

Methods for reading from and writing to the system clipboard. **Requires permissions.**

### `api.clipboard.readText()`

Read text content from the clipboard.

- **Requires:** `clipboard.read` permission in `hermes-plugin.json`
- **Returns:** `Promise<string>`

```typescript
const text = await api.clipboard.readText();
```

### `api.clipboard.writeText(text)`

Write text content to the clipboard.

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | The text to write to the clipboard |

- **Requires:** `clipboard.write` permission in `hermes-plugin.json`
- **Returns:** `Promise<void>`

```typescript
await api.clipboard.writeText("Hello, clipboard!");
```

---

## `api.storage`

Persistent key-value storage scoped to the plugin. Data persists across app restarts. **Requires permission.**

### `api.storage.get(key)`

Read a value from storage.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The storage key |

- **Requires:** `storage` permission in `hermes-plugin.json`
- **Returns:** `Promise<string | null>` — `null` if the key does not exist

```typescript
const savedValue = await api.storage.get("lastInput");
if (savedValue !== null) {
  // Use the saved value
}
```

### `api.storage.set(key, value)`

Write a value to storage.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The storage key |
| `value` | `string` | The value to store |

- **Requires:** `storage` permission in `hermes-plugin.json`
- **Returns:** `Promise<void>`

```typescript
await api.storage.set("lastInput", JSON.stringify({ query: "hello" }));
```

### `api.storage.delete(key)`

Delete a value from storage.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The storage key to delete |

- **Requires:** `storage` permission in `hermes-plugin.json`
- **Returns:** `Promise<void>`

```typescript
await api.storage.delete("lastInput");
```

---

## `api.settings`

Schema-based settings that appear in the Plugin Manager UI. Settings are persisted via the same storage backend as `api.storage`. **Requires `"storage"` permission**, but this is auto-granted if your plugin declares a `contributes.settings` schema.

### `api.settings.get(key)`

Get a setting's current value. Returns the default from the schema if no value has been stored.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Setting key, must match a key in `contributes.settings` |

- **Returns:** `Promise<T>` — the value, coerced to the schema's type (number, boolean, or string)

```typescript
const indentSize = await api.settings.get<number>("indentSize");
```

### `api.settings.update(key, value)`

Update a setting. Validates the value against the schema (type, min/max, allowed options).

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Setting key |
| `value` | `string \| number \| boolean` | The new value |

- **Returns:** `Promise<void>`

```typescript
await api.settings.update("indentSize", 4);
```

### `api.settings.onDidChange(key, callback)`

Subscribe to changes for a specific setting key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Setting key to watch |
| `callback` | `(newValue) => void` | Called when the value changes |

- **Returns:** `Disposable`

```typescript
api.subscriptions.push(
  api.settings.onDidChange("theme", (newTheme) => {
    console.log("Theme changed to:", newTheme);
  })
);
```

### `api.settings.getAll()`

Get all settings as a flat object with defaults applied for any unset values.

- **Returns:** `Promise<Record<string, string | number | boolean>>`

```typescript
const all = await api.settings.getAll();
// { indentSize: 2, sortKeys: false, maxDepth: 0 }
```

---

## `api.events`

Subscribe to host app events. No permission required.

### `api.events.on(event, callback)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `HermesEvent` | Event name (see table below) |
| `callback` | `(...args) => void` | Event handler |

- **Returns:** `Disposable`

| Event | Description |
|-------|-------------|
| `"theme.changed"` | User switched themes |
| `"session.created"` | A new terminal session was created |
| `"session.closed"` | A terminal session was closed |
| `"session.phase_changed"` | A session's phase changed (e.g., idle to running) |
| `"session.focus_changed"` | User switched to a different session |
| `"window.focused"` | App window gained focus |
| `"window.blurred"` | App window lost focus |

```typescript
api.subscriptions.push(
  api.events.on("theme.changed", () => {
    // Re-render with new theme colors
  })
);
```

---

## `api.notifications`

Send desktop notifications. **Requires `"notifications"` permission.**

### `api.notifications.send(options)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.title` | `string` | Notification title |
| `options.body` | `string` (optional) | Notification body text |

- **Returns:** `Promise<void>`

```typescript
await api.notifications.send({
  title: "Timer Complete",
  body: "Your 25-minute focus session is done!",
});
```

---

## `api.network`

Make HTTP requests through the Rust backend (bypasses WebView CSP). **Requires `"network"` permission.**

### `api.network.fetch(url)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | The URL to fetch |

- **Returns:** `Promise<string>` — the response body as text

```typescript
const response = await api.network.fetch("https://api.example.com/data.json");
const data = JSON.parse(response);
```

---

## `api.shell`

Shell operations. `openExternal` requires `"network"` permission. `exec` requires `"shell.exec"` permission.

### `api.shell.openExternal(url)`

Open a URL in the user's default browser. **Requires `"network"` permission.**

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | The URL to open |

- **Returns:** `Promise<void>`

```typescript
await api.shell.openExternal("https://hermes-ide.com");
```

### `api.shell.exec(command, args?)`

Execute a shell command and capture its output. **Requires `"shell.exec"` permission.**

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | `string` | The command to run (e.g., `"ping"`, `"ifconfig"`) |
| `args` | `string[]` (optional) | Arguments to pass to the command |

- **Returns:** `Promise<{ stdout: string; stderr: string; exitCode: number }>`

```typescript
const result = await api.shell.exec("ping", ["-c", "4", "google.com"]);
console.log(result.stdout);  // Ping output
console.log(result.exitCode); // 0 on success
```

> **Availability:** Hermes IDE 0.5.16+. For backward compatibility, guard the call:
> ```typescript
> if (typeof api.shell.exec === "function") {
>   const result = await api.shell.exec("whoami");
> }
> ```

---

## `api.sessions`

Access terminal session information. **Requires `"sessions.read"` permission.**

### `api.sessions.getActive()`

Get the currently active (focused) session.

- **Returns:** `Promise<SessionInfo | null>`

### `api.sessions.list()`

Get all terminal sessions.

- **Returns:** `Promise<SessionInfo[]>`

### `api.sessions.focus(sessionId)`

Switch focus to a specific session.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | The session ID to focus |

```typescript
const active = await api.sessions.getActive();
if (active) {
  console.log("Active session:", active.name, active.working_directory);
}
```

---

## `api.agents`

Watch AI agent transcripts in real time. **Requires `"sessions.read"` permission.**

### `api.agents.watchTranscript(sessionId, callback)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session ID to watch |
| `callback` | `(event) => void` | Called for each transcript event |

- **Returns:** `Promise<Disposable>`

Transcript events have these types: `tool_start`, `tool_end`, `text`, `thinking`, `turn_end`.

```typescript
const watcher = await api.agents.watchTranscript(sessionId, (event) => {
  if (event.type === "tool_start") {
    console.log("Agent using tool:", event.tool_name);
  }
});
api.subscriptions.push(watcher);
```

---

## `api.subscriptions`

An array of `Disposable` objects managed by the host app. Any disposable added to this array is automatically disposed when the plugin is deactivated.

```typescript
export function activate(api: HermesPluginAPI) {
  // These will be cleaned up automatically on deactivation
  api.subscriptions.push(
    api.commands.register("my-plugin.cmd1", () => { /* ... */ })
  );
  api.subscriptions.push(
    api.ui.registerPanel("my-plugin-panel", MyPanel)
  );
}

export function deactivate() {
  // No need to manually dispose subscriptions — the host handles it.
  // Use this for any other cleanup (clearing intervals, etc.)
}
```

---

## Permissions

Permissions are declared in `hermes-plugin.json` and control access to sensitive APIs. Permissions are enforced at two layers: the frontend API proxy and the Rust backend.

| Permission | Grants access to |
|-----------|------------------|
| *(none)* | `api.ui`, `api.commands`, `api.events`, `api.subscriptions` |
| `clipboard.read` | `api.clipboard.readText()` |
| `clipboard.write` | `api.clipboard.writeText()` |
| `storage` | `api.storage.*`, `api.settings.*` |
| `notifications` | `api.notifications.send()` |
| `sessions.read` | `api.sessions.*`, `api.agents.*` |
| `network` | `api.network.fetch()`, `api.shell.openExternal()` |
| `shell.exec` | `api.shell.exec()` |

### Auto-granted Permissions

If your plugin declares a `contributes.settings` schema, the `"storage"` permission is automatically granted — you don't need to list it explicitly. However, it's good practice to declare it anyway for clarity.

### Declaring Permissions

```json
{
  "permissions": ["clipboard.read", "clipboard.write", "storage"]
}
```

### Permission Errors

Attempting to use an API without the required permission throws a `PermissionDeniedError`. Always declare the permissions your plugin needs in the manifest.

```typescript
// If "clipboard.read" is not in permissions:
await api.clipboard.readText();
// Throws: PermissionDeniedError: Plugin "my-plugin" requires permission "clipboard.read" which was not granted.
```

### Install Confirmation

When a user installs a plugin that requests permissions, a confirmation dialog is shown listing each permission with a description. Users must approve before installation proceeds.
