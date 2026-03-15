/**
 * Browser-side asset loader.
 *
 * Pixel Office browser-side asset loader.
 * Decodes PNGs in the browser using Image + Canvas getImageData.
 *
 * For the plugin IIFE bundle, assets are embedded as base64 data URLs at build
 * time (see scripts/encode-assets.ts). At runtime, we decode them here.
 */

import type { SpriteData } from "../office/types";

// ── Asset loading constants ──

const CHAR_COUNT = 6;
const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAMES_PER_ROW = 7;
const CHARACTER_DIRECTIONS = ["down", "up", "right"] as const;
const FLOOR_TILE_SIZE = 16;
const WALL_PIECE_WIDTH = 16;
const WALL_PIECE_HEIGHT = 32;
const WALL_GRID_COLS = 4;
const WALL_BITMASK_COUNT = 16;
const PNG_ALPHA_THRESHOLD = 2;

// ── Core PNG → SpriteData conversion ──

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < PNG_ALPHA_THRESHOLD) return "";
  const rgb = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  if (a >= 255) return rgb;
  return `${rgb}${a.toString(16).padStart(2, "0").toUpperCase()}`;
}

/**
 * Load an image from a URL (supports data: URIs and blob: URIs)
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = src;
  });
}

/**
 * Read pixel data from an image using an offscreen canvas.
 */
function getImagePixels(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/**
 * Convert a region of ImageData to SpriteData (string[][]).
 */
function regionToSpriteData(
  imageData: ImageData,
  ox: number,
  oy: number,
  width: number,
  height: number
): SpriteData {
  const sprite: string[][] = [];
  const { data, width: imgWidth } = imageData;
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const idx = ((oy + y) * imgWidth + (ox + x)) * 4;
      row.push(rgbaToHex(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]));
    }
    sprite.push(row);
  }
  return sprite;
}

/**
 * Convert a full image to SpriteData.
 */
function imageToSpriteData(
  imageData: ImageData,
  width: number,
  height: number
): SpriteData {
  return regionToSpriteData(imageData, 0, 0, width, height);
}

// ── Character sprite loading ──

export interface CharacterDirectionSprites {
  down: SpriteData[];
  up: SpriteData[];
  right: SpriteData[];
}

/**
 * Load character sprites from base64-encoded PNG data URLs.
 * Each character PNG is 112x96 (7 frames × 3 directions × 16×32 each).
 */
export async function loadCharacterSprites(
  characterDataUrls: string[]
): Promise<CharacterDirectionSprites[]> {
  const characters: CharacterDirectionSprites[] = [];

  for (const dataUrl of characterDataUrls) {
    const img = await loadImage(dataUrl);
    const pixels = getImagePixels(img);

    const charData: CharacterDirectionSprites = { down: [], up: [], right: [] };

    for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
      const dir = CHARACTER_DIRECTIONS[dirIdx];
      const rowOffsetY = dirIdx * CHAR_FRAME_H;

      for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
        const frameOffsetX = f * CHAR_FRAME_W;
        const sprite = regionToSpriteData(
          pixels,
          frameOffsetX,
          rowOffsetY,
          CHAR_FRAME_W,
          CHAR_FRAME_H
        );
        charData[dir].push(sprite);
      }
    }

    characters.push(charData);
  }

  return characters;
}

// ── Floor tile loading ──

/**
 * Load floor tiles from base64-encoded PNG data URLs.
 * Each PNG is 16×16 grayscale.
 */
export async function loadFloorTiles(
  floorDataUrls: string[]
): Promise<SpriteData[]> {
  const sprites: SpriteData[] = [];

  for (const dataUrl of floorDataUrls) {
    const img = await loadImage(dataUrl);
    const pixels = getImagePixels(img);
    sprites.push(imageToSpriteData(pixels, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE));
  }

  return sprites;
}

// ── Wall tile loading ──

/**
 * Load wall tile set from a base64-encoded PNG data URL.
 * Each PNG is 64×128 (4×4 grid of 16×32 pieces, one per 4-bit bitmask).
 */
export async function loadWallTiles(
  wallDataUrls: string[]
): Promise<SpriteData[][]> {
  const sets: SpriteData[][] = [];

  for (const dataUrl of wallDataUrls) {
    const img = await loadImage(dataUrl);
    const pixels = getImagePixels(img);
    const sprites: SpriteData[] = [];

    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
      sprites.push(
        regionToSpriteData(pixels, ox, oy, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT)
      );
    }

    sets.push(sprites);
  }

  return sets;
}

// ── Furniture loading ──

export interface FurnitureAsset {
  id: string;
  name: string;
  label: string;
  category: string;
  file: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  groupId?: string;
  orientation?: string;
  state?: string;
  mirrorSide?: boolean;
  rotationScheme?: string;
  animationGroup?: string;
  frame?: number;
}

/**
 * Load furniture sprites from a map of asset IDs to base64-encoded PNG data URLs.
 * Returns the SpriteData map expected by buildDynamicCatalog().
 */
export async function loadFurnitureSprites(
  catalog: FurnitureAsset[],
  pngDataUrls: Record<string, string>,
  pngDimensions: Record<string, { width: number; height: number }>
): Promise<Record<string, SpriteData>> {
  const sprites: Record<string, SpriteData> = {};

  for (const asset of catalog) {
    const dataUrl = pngDataUrls[asset.id];
    if (!dataUrl) continue;

    try {
      const img = await loadImage(dataUrl);
      const pixels = getImagePixels(img);
      const dims = pngDimensions[asset.id] || {
        width: asset.width,
        height: asset.height,
      };
      sprites[asset.id] = imageToSpriteData(pixels, dims.width, dims.height);
    } catch {
      // Create transparent placeholder
      const placeholder: string[][] = [];
      for (let y = 0; y < asset.height; y++) {
        placeholder.push(new Array(asset.width).fill(""));
      }
      sprites[asset.id] = placeholder;
    }
  }

  return sprites;
}
