<div align="center">

# Hermes IDE Plugins

Official plugin registry and development resources for [Hermes IDE](https://github.com/hermes-hq/hermes-ide).

</div>

---

## Structure

```
registry/       Plugin registry index
plugins/        Official and community plugins (approved by Hermes IDE)
templates/      Plugin project templates
docs/           Development guides and API reference
```

## Documentation

- [**Development Guide**](./docs/DEVELOPMENT.md) — How to create and test plugins
- [**Plugin API Reference**](./docs/PLUGIN-API.md) — Full API documentation
- [**Manifest Reference**](./docs/MANIFEST.md) — hermes-plugin.json schema
- [**Contributing**](./CONTRIBUTING.md) — How to submit a plugin for review

## Creating a Plugin

1. Copy the `templates/basic/` directory
2. Update `hermes-plugin.json` with your plugin's metadata
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Copy the output directory to your Hermes IDE plugins folder:
   - macOS: `~/Library/Application Support/com.hermes-ide.terminal/plugins/your-plugin-id/`
   - Linux: `~/.config/com.hermes-ide.terminal/plugins/your-plugin-id/`
   - Windows: `%APPDATA%/com.hermes-ide.terminal/plugins/your-plugin-id/`

See the [Development Guide](./docs/DEVELOPMENT.md) for a detailed walkthrough including symlink-based dev workflow, theming, and API usage.

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

## Plugin Review Process

All plugins in this registry are reviewed and approved by the Hermes IDE team. The app only installs plugins from this official registry — there is no way to install arbitrary plugins from external sources.

To submit a plugin:

1. Fork this repository
2. Add your plugin to `plugins/your-plugin-name/`
3. Add an entry to `registry/index.json`
4. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full details and review criteria.

## Official Plugins

| Plugin | Description |
|--------|-------------|
| [JSON Formatter](./plugins/json-formatter) | Format, minify, and validate JSON |
| [UUID Generator](./plugins/uuid-generator) | Generate UUIDs in all standard versions (v1, v4, v5, v7) with batch support |
| [Pomodoro Timer](./plugins/pomodoro-timer) | Focus timer with configurable work and break intervals, notifications, and session tracking |

## License

Official plugins are licensed under [Apache 2.0](./LICENSE).
