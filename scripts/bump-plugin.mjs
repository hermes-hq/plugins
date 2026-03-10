#!/usr/bin/env node

/**
 * Bump a plugin's version across all three locations:
 *   1. plugins/{name}/hermes-plugin.json  (manifest)
 *   2. plugins/{name}/package.json        (npm)
 *   3. registry/index.json                (registry entry + downloadUrl)
 *
 * Optionally adds a changelog entry with change descriptions.
 *
 * Usage:
 *   node scripts/bump-plugin.mjs <plugin-dir> <version> [--changes "Change 1" "Change 2" ...]
 *
 * Examples:
 *   node scripts/bump-plugin.mjs pomodoro-timer 1.1.0
 *   node scripts/bump-plugin.mjs pomodoro-timer 1.1.0 --changes "Added UUIDv7 support" "Fixed crash on empty input"
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Parse args ──────────────────────────────────────────

const args = process.argv.slice(2);

const isHelp = args[0] === "--help" || args[0] === "-h";
if (args.length < 2 || isHelp) {
  console.log(`
Usage: node scripts/bump-plugin.mjs <plugin-dir> <version> [--changes "..." "..."]

  <plugin-dir>   Directory name under plugins/ (e.g. pomodoro-timer)
  <version>      New semver version (e.g. 1.1.0)
  --changes      Optional list of user-facing change descriptions for the changelog

Examples:
  node scripts/bump-plugin.mjs pomodoro-timer 1.1.0
  node scripts/bump-plugin.mjs json-formatter 1.2.0 --changes "Added JSONL support" "Improved error messages"
`);
  process.exit(isHelp ? 0 : 1);
}

const pluginDir = args[0];
const newVersion = args[1];

// Validate semver format
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error(`  Error: "${newVersion}" is not a valid semver (X.Y.Z)`);
  process.exit(1);
}

// Parse --changes
let changes = [];
const changesIdx = args.indexOf("--changes");
if (changesIdx !== -1) {
  changes = args.slice(changesIdx + 1);
  if (changes.length === 0) {
    console.error("  Error: --changes requires at least one change description");
    process.exit(1);
  }
}

// ─── Paths ───────────────────────────────────────────────

const manifestPath = resolve(ROOT, "plugins", pluginDir, "hermes-plugin.json");
const packagePath = resolve(ROOT, "plugins", pluginDir, "package.json");
const registryPath = resolve(ROOT, "registry", "index.json");

if (!existsSync(manifestPath)) {
  console.error(`  Error: Plugin manifest not found at ${manifestPath}`);
  console.error(`  Available plugins: ${getAvailablePlugins().join(", ")}`);
  process.exit(1);
}

function getAvailablePlugins() {
  const pluginsDir = resolve(ROOT, "plugins");
  try {
    return readdirSync(pluginsDir).filter((d) =>
      existsSync(resolve(pluginsDir, d, "hermes-plugin.json"))
    );
  } catch {
    return [];
  }
}

// ─── Read files ──────────────────────────────────────────

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

const pluginId = manifest.id;
const oldVersion = manifest.version;

if (oldVersion === newVersion) {
  console.error(`  Error: Plugin "${pluginDir}" is already at version ${newVersion}`);
  process.exit(1);
}

console.log(`\n  Bumping ${manifest.name} (${pluginId}): ${oldVersion} → ${newVersion}\n`);

// ─── 1. Update hermes-plugin.json ────────────────────────

manifest.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`  Updated plugins/${pluginDir}/hermes-plugin.json`);

// ─── 2. Update package.json ─────────────────────────────

pkg.version = newVersion;
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  Updated plugins/${pluginDir}/package.json`);

// ─── 3. Update registry/index.json ──────────────────────

const registryPlugin = registry.plugins.find((p) => p.id === pluginId);

if (!registryPlugin) {
  console.warn(`  Warning: Plugin "${pluginId}" not found in registry — skipping registry update`);
} else {
  // Update version
  registryPlugin.version = newVersion;

  // Update downloadUrl — derive from existing URL pattern
  // Pattern: https://github.com/hermes-hq/plugins/releases/download/{slug}-v{version}/{id}-{version}.tgz
  const oldUrl = registryPlugin.downloadUrl;
  const urlBase = oldUrl.substring(0, oldUrl.lastIndexOf("/download/") + "/download/".length);
  registryPlugin.downloadUrl = `${urlBase}${pluginDir}-v${newVersion}/${pluginId}-${newVersion}.tgz`;

  // Add changelog entry
  if (changes.length > 0) {
    if (!registryPlugin.changelog) {
      registryPlugin.changelog = [];
    }
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // Prepend new entry (newest first)
    registryPlugin.changelog.unshift({
      version: newVersion,
      date: today,
      changes,
    });
  }

  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`  Updated registry/index.json`);
}

// ─── Summary ─────────────────────────────────────────────

console.log("");
if (changes.length > 0) {
  console.log(`  Changelog entry added with ${changes.length} change${changes.length !== 1 ? "s" : ""}.`);
}
console.log(`  Done! Don't forget to:`);
console.log(`    1. Build the plugin:  cd plugins/${pluginDir} && npm run build`);
console.log(`    2. Commit and push`);
console.log(`    3. Create a GitHub Release tagged "${pluginDir}-v${newVersion}" and upload the .tgz\n`);
