# Contributing to Hermes IDE Plugins

The Hermes IDE plugin registry is **curated** — every plugin is reviewed and approved by the Hermes HQ team before it becomes available to users. This ensures all plugins meet our standards for security, quality, and usefulness.

## Submitting a New Plugin

### 1. Fork and clone

Fork the [hermes-hq/plugins](https://github.com/hermes-hq/plugins) repository and clone your fork locally.

### 2. Scaffold your plugin

```bash
cp -r templates/basic plugins/your-plugin-name
cd plugins/your-plugin-name
```

### 3. Develop your plugin

- Update `hermes-plugin.json` with your plugin's ID, name, description, author, commands, panels, and permissions.
- Update `package.json` with your plugin's name.
- Write your plugin code in `src/`.
- Build with `npm install && npm run build`.

See the [Development Guide](./docs/DEVELOPMENT.md) for a full walkthrough.

### 4. Test locally

Copy (or symlink) the built plugin to your Hermes IDE plugins directory and restart the app:

- **macOS:** `~/Library/Application Support/com.hermes-ide.terminal/plugins/your-name.plugin-name/`
- **Linux:** `~/.config/com.hermes-ide.terminal/plugins/your-name.plugin-name/`
- **Windows:** `%APPDATA%/com.hermes-ide.terminal/plugins/your-name.plugin-name/`

### 5. Open a Pull Request

Your PR must include:

- Your plugin source in `plugins/your-plugin-name/`
- An entry added to `registry/index.json` with your plugin's metadata (see [Registry Entry Format](#registry-entry-format) below)

### 6. Review

The Hermes HQ team reviews every submission for:

- **Security** — No malicious code, no obfuscated code, minimal permissions requested.
- **Quality** — Builds successfully, follows conventions, code is readable.
- **Usefulness** — Provides clear value to Hermes IDE users.

### 7. Publication

Once approved and merged, the plugin becomes available to all Hermes IDE users through the Plugin Manager.

---

## Plugin Requirements

All submitted plugins must meet these requirements:

- Must include a valid `hermes-plugin.json` manifest.
- Must build successfully with `npm run build`.
- Must use the IIFE bundle format with React externalized (use the template's `vite.config.ts`).
- Must request only the permissions actually needed.
- Must include a clear, accurate description.
- CSS must use the app's CSS custom properties (`--bg-1`, `--text-1`, `--accent`, etc.) for theme compatibility. Do not hardcode colors.
- Plugin ID must follow the format `author.plugin-name` (e.g., `hermes-hq.json-formatter`).

---

## Review Criteria

During code review, the team checks for:

- **No obfuscated code** — All code must be readable. Minified build output is fine, but source code must be included and readable.
- **No unnecessary network requests** — Plugins should not make network calls beyond what the plugin genuinely needs for its functionality.
- **No filesystem or shell access** — These permissions are not available in the current plugin API.
- **Permission alignment** — The permissions declared in `hermes-plugin.json` must match what the plugin actually uses. Don't request permissions you don't need.
- **Standard practices** — Code should follow standard TypeScript/React conventions.

---

## Updating an Existing Plugin

1. Update the plugin source code in `plugins/your-plugin-name/`.
2. Bump the version in `hermes-plugin.json`.
3. Update the version (and `downloadUrl` if applicable) in `registry/index.json`.
4. Open a Pull Request.

Updates submitted by the original plugin author receive expedited review.

---

## Registry Entry Format

Each plugin entry in `registry/index.json` has the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Must match the `id` in your `hermes-plugin.json` |
| `name` | string | Yes | Display name shown in the Plugin Store |
| `version` | string | Yes | Current published version |
| `description` | string | Yes | Short description |
| `author` | string | Yes | Author name |
| `icon` | string | No | Inline SVG string for the store card (24x24 viewBox recommended, use `currentColor`) |
| `category` | string | No | Category label (e.g., `"Formatters"`, `"Dev Tools"`, `"Themes"`, `"Utilities"`) |
| `downloadUrl` | string | Yes | URL to the `.tgz` release asset |
| `minAppVersion` | string | No | Minimum Hermes IDE version required |
| `permissions` | array | No | Permissions the plugin requires |

**Icon guidelines:** Keep the SVG simple. Use a `viewBox="0 0 24 24"` with stroke-based paths. The store renders icons at 36x36px with the app's accent color.

---

## Questions?

If you have questions about the plugin API, development process, or review criteria, open an issue on this repository.
