#!/usr/bin/env node
/**
 * Pre-processes PNG assets into a TypeScript module with base64 data URLs.
 *
 * Since Hermes plugins build to a single IIFE bundle, asset files can't be
 * loaded at runtime from the filesystem. This script encodes all PNG sprites
 * as base64 data URLs and writes them to src/assets/encoded.ts, which is then
 * imported at build time and bundled into the IIFE.
 *
 * Usage: node scripts/encode-assets.js
 * Run this before `vite build`.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from "fs";
import { join, resolve } from "path";

const assetsDir = resolve(import.meta.dirname, "..", "src", "assets");
const outputFile = resolve(import.meta.dirname, "..", "src", "assets", "encoded.ts");

function toDataUrl(filePath) {
  const buffer = readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function encodeDirectory(dir, prefix = "") {
  const entries = {};
  if (!existsSync(dir)) return entries;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isFile() && entry.endsWith(".png")) {
      const key = prefix ? `${prefix}/${entry}` : entry;
      entries[key] = toDataUrl(fullPath);
    }
  }
  return entries;
}

// ── Encode characters ──
const characters = [];
for (let i = 0; i < 6; i++) {
  const path = join(assetsDir, "characters", `char_${i}.png`);
  if (existsSync(path)) {
    characters.push(toDataUrl(path));
  }
}

// ── Encode floor tiles ──
const floors = [];
const floorsDir = join(assetsDir, "floors");
if (existsSync(floorsDir)) {
  const floorFiles = readdirSync(floorsDir)
    .filter((f) => /^floor_\d+\.png$/i.test(f))
    .sort((a, b) => {
      const ai = parseInt(a.match(/\d+/)[0]);
      const bi = parseInt(b.match(/\d+/)[0]);
      return ai - bi;
    });
  for (const f of floorFiles) {
    floors.push(toDataUrl(join(floorsDir, f)));
  }
}

// ── Encode wall tiles ──
const walls = [];
const wallsDir = join(assetsDir, "walls");
if (existsSync(wallsDir)) {
  const wallFiles = readdirSync(wallsDir)
    .filter((f) => /^wall_\d+\.png$/i.test(f))
    .sort((a, b) => {
      const ai = parseInt(a.match(/\d+/)[0]);
      const bi = parseInt(b.match(/\d+/)[0]);
      return ai - bi;
    });
  for (const f of wallFiles) {
    walls.push(toDataUrl(join(wallsDir, f)));
  }
}

// ── Encode furniture ──
const furnitureCatalog = [];
const furnitureSprites = {};
const furnitureDimensions = {};
const furnitureDir = join(assetsDir, "furniture");

if (existsSync(furnitureDir)) {
  for (const dir of readdirSync(furnitureDir)) {
    const itemDir = join(furnitureDir, dir);
    if (!statSync(itemDir).isDirectory()) continue;
    const manifestPath = join(itemDir, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    // Flatten manifest to get all asset entries
    const assets = flattenManifest(manifest);
    furnitureCatalog.push(...assets);

    // Encode PNGs
    for (const asset of assets) {
      const pngPath = join(itemDir, asset.file);
      if (existsSync(pngPath)) {
        furnitureSprites[asset.id] = toDataUrl(pngPath);
        furnitureDimensions[asset.id] = {
          width: asset.width,
          height: asset.height,
        };
      }
    }
  }
}

function flattenManifest(manifest, inherited = null) {
  const baseProps = inherited || {
    groupId: manifest.id,
    name: manifest.name,
    category: manifest.category,
    canPlaceOnWalls: manifest.canPlaceOnWalls || false,
    canPlaceOnSurfaces: manifest.canPlaceOnSurfaces || false,
    backgroundTiles: manifest.backgroundTiles || 0,
    rotationScheme: manifest.rotationScheme,
  };

  if (manifest.type === "asset") {
    return [
      {
        id: manifest.id,
        name: baseProps.name,
        label: baseProps.name,
        category: baseProps.category,
        file: manifest.file || `${manifest.id}.png`,
        width: manifest.width,
        height: manifest.height,
        footprintW: manifest.footprintW,
        footprintH: manifest.footprintH,
        isDesk: baseProps.category === "desks",
        canPlaceOnWalls: baseProps.canPlaceOnWalls,
        canPlaceOnSurfaces: baseProps.canPlaceOnSurfaces,
        backgroundTiles: baseProps.backgroundTiles,
        groupId: baseProps.groupId,
        ...(manifest.orientation ? { orientation: manifest.orientation } : {}),
        ...(manifest.state ? { state: manifest.state } : {}),
        ...(manifest.mirrorSide ? { mirrorSide: true } : {}),
        ...(baseProps.rotationScheme
          ? { rotationScheme: baseProps.rotationScheme }
          : {}),
        ...(baseProps.animationGroup
          ? { animationGroup: baseProps.animationGroup }
          : {}),
        ...(manifest.frame !== undefined ? { frame: manifest.frame } : {}),
      },
    ];
  }

  // Group node
  const results = [];
  if (manifest.members) {
    for (const member of manifest.members) {
      const childProps = { ...baseProps };
      if (manifest.groupType === "rotation" && manifest.rotationScheme) {
        childProps.rotationScheme = manifest.rotationScheme;
      }
      if (manifest.groupType === "state" && manifest.orientation) {
        childProps.orientation = manifest.orientation;
      }
      if (manifest.groupType === "animation") {
        const orient = manifest.orientation || baseProps.orientation || "";
        const state = manifest.state || baseProps.state || "";
        childProps.animationGroup =
          `${baseProps.groupId}_${orient}_${state}`.toUpperCase();
      }
      if (manifest.orientation && !childProps.orientation) {
        childProps.orientation = manifest.orientation;
      }
      if (manifest.state) {
        childProps.state = manifest.state;
      }
      results.push(...flattenManifest(member, childProps));
    }
  }
  return results;
}

// ── Load default layout ──
let defaultLayout = null;
const layoutPath = join(assetsDir, "default-layout.json");
if (existsSync(layoutPath)) {
  defaultLayout = JSON.parse(readFileSync(layoutPath, "utf-8"));
}

// ── Load bubble sprites ──
let bubblePermission = null;
let bubbleWaiting = null;
const bubblePermPath = join(assetsDir, "bubble-permission.json");
const bubbleWaitPath = join(assetsDir, "bubble-waiting.json");
if (existsSync(bubblePermPath)) {
  bubblePermission = JSON.parse(readFileSync(bubblePermPath, "utf-8"));
}
if (existsSync(bubbleWaitPath)) {
  bubbleWaiting = JSON.parse(readFileSync(bubbleWaitPath, "utf-8"));
}

// ── Generate TypeScript output ──

const output = `// AUTO-GENERATED by scripts/encode-assets.js — do not edit manually
// Run: node scripts/encode-assets.js

import type { SpriteData } from "../office/types";

/** Base64 data URLs for the 6 character sprite sheets (112×96 each) */
export const CHARACTER_DATA_URLS: string[] = ${JSON.stringify(characters, null, 2)};

/** Base64 data URLs for floor tile patterns (16×16 each) */
export const FLOOR_DATA_URLS: string[] = ${JSON.stringify(floors, null, 2)};

/** Base64 data URLs for wall tile sets (64×128 each) */
export const WALL_DATA_URLS: string[] = ${JSON.stringify(walls, null, 2)};

/** Furniture catalog metadata */
export const FURNITURE_CATALOG = ${JSON.stringify(furnitureCatalog, null, 2)} as const;

/** Base64 data URLs for furniture sprites, keyed by asset ID */
export const FURNITURE_SPRITE_URLS: Record<string, string> = ${JSON.stringify(furnitureSprites, null, 2)};

/** Furniture sprite dimensions, keyed by asset ID */
export const FURNITURE_DIMENSIONS: Record<string, { width: number; height: number }> = ${JSON.stringify(furnitureDimensions, null, 2)};

/** Default office layout */
export const DEFAULT_LAYOUT = ${JSON.stringify(defaultLayout, null, 2)};

/** Speech bubble sprites */
export const BUBBLE_PERMISSION: SpriteData = ${JSON.stringify(bubblePermission)};
export const BUBBLE_WAITING: SpriteData = ${JSON.stringify(bubbleWaiting)};
`;

writeFileSync(outputFile, output, "utf-8");

const sizeKb = Math.round(Buffer.byteLength(output) / 1024);
console.log(`Encoded assets written to src/assets/encoded.ts (${sizeKb} KB)`);
console.log(`  Characters: ${characters.length}`);
console.log(`  Floors: ${floors.length}`);
console.log(`  Walls: ${walls.length}`);
console.log(`  Furniture: ${furnitureCatalog.length} items, ${Object.keys(furnitureSprites).length} sprites`);
console.log(`  Layout: ${defaultLayout ? "yes" : "no"}`);
console.log(`  Bubbles: permission=${!!bubblePermission}, waiting=${!!bubbleWaiting}`);
