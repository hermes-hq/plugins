# Hermes Plugin API Reference

## Overview

Every plugin receives a `HermesPluginAPI` object when its `activate()` function is called. This object provides namespaced access to the host app's functionality.

```typescript
export function activate(api: HermesPluginAPI) {
  // api.ui       — UI operations (panels, toasts, status bar)
  // api.commands  — Command registration and execution
  // api.clipboard — Clipboard access (requires permissions)
  // api.storage   — Persistent key-value storage (requires permission)
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

## `api.subscriptions`

An array of `Disposable` objects managed by the host app. Any disposable added to this array is automatically disposed when the plugin is deactivated.

```typescript
export function activate(api: HermesPluginAPI) {
  // These will be cleaned up automatically on deactivation
  api.subscriptions.push(
    api.commands.register("my-plugin.cmd1", () => { /* ... */ })
  );
  api.subscriptions.push(
    api.commands.register("my-plugin.cmd2", () => { /* ... */ })
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

Permissions are declared in `hermes-plugin.json` and control access to sensitive APIs.

| Permission | Grants access to |
|-----------|------------------|
| `clipboard.read` | `api.clipboard.readText()` |
| `clipboard.write` | `api.clipboard.writeText()` |
| `storage` | `api.storage.get()`, `api.storage.set()`, `api.storage.delete()` |

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
// Throws: PermissionDeniedError: Plugin "my-plugin" lacks permission "clipboard.read"
```
