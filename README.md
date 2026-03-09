<div align="center">

# Hermes IDE Plugins

Official plugin registry and development resources for [Hermes IDE](https://github.com/hermes-hq/hermes-ide).

</div>

---

## Structure

```
registry/       Plugin registry index
plugins/        Official plugins
templates/      Plugin project templates
```

## Creating a Plugin

1. Copy the `templates/basic/` directory
2. Update `hermes-plugin.json` with your plugin's metadata
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Copy the output directory to your Hermes IDE plugins folder:
   - macOS: `~/Library/Application Support/com.hermes-ide.terminal/plugins/your-plugin-id/`
   - Linux: `~/.config/com.hermes-ide.terminal/plugins/your-plugin-id/`
   - Windows: `%APPDATA%/com.hermes-ide.terminal/plugins/your-plugin-id/`

## Plugin Format

Each plugin is a directory containing:

```
your-plugin-id/
├── hermes-plugin.json    # Plugin manifest
└── dist/
    └── index.js          # IIFE-bundled JavaScript
```

### Manifest (`hermes-plugin.json`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier (e.g., `author.plugin-name`) |
| `name` | string | Display name |
| `version` | string | Semver version |
| `description` | string | Short description |
| `author` | string | Author name |
| `main` | string | Path to the IIFE bundle (relative to plugin dir) |
| `activationEvents` | array | When the plugin should be activated |
| `contributes` | object | What the plugin provides (commands, panels, status bar items) |
| `permissions` | array | Required permissions |

### Build Configuration

Plugins must be built as IIFE bundles with React externalized:
- Use `jsx: "react"` (classic runtime) in tsconfig.json
- Externalize `react` in Vite/Rollup config
- React is provided as `window.React` by the host app

## Official Plugins

| Plugin | Description |
|--------|-------------|
| [JSON Formatter](./plugins/json-formatter) | Format, minify, and validate JSON |

## License

Official plugins are licensed under [Apache 2.0](./LICENSE).
