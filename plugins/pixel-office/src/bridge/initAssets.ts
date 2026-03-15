/**
 * Initializes the rendering engine with the encoded assets.
 *
 * Initializes the rendering engine with the encoded assets.
 * Decodes base64 PNGs to SpriteData
 * and registers them with the engine's sprite systems.
 */

import {
  CHARACTER_DATA_URLS,
  FLOOR_DATA_URLS,
  WALL_DATA_URLS,
  FURNITURE_CATALOG,
  FURNITURE_SPRITE_URLS,
  FURNITURE_DIMENSIONS,
  DEFAULT_LAYOUT,
  BUBBLE_PERMISSION,
  BUBBLE_WAITING,
} from "../assets/encoded";
import {
  loadCharacterSprites,
  loadFloorTiles,
  loadWallTiles,
  loadFurnitureSprites,
} from "./AssetLoader";
import { setCharacterTemplates } from "../engine/spriteData";
import { setFloorSprites } from "../office/floorTiles";
import { setWallSprites } from "../office/wallTiles";
import { buildDynamicCatalog } from "../office/furnitureCatalog";
import type { OfficeState } from "../engine/officeState";
import type { OfficeLayout } from "../office/types";

/**
 * Load and initialize all assets. Call once on plugin startup,
 * before the game loop renders its first frame.
 */
export async function initAssets(officeState: OfficeState): Promise<void> {
  // Load character sprites (base64 → Image → SpriteData)
  const characterSprites = await loadCharacterSprites(CHARACTER_DATA_URLS);
  setCharacterTemplates(characterSprites);

  // Load floor tiles
  const floorSprites = await loadFloorTiles(FLOOR_DATA_URLS);
  setFloorSprites(floorSprites);

  // Load wall tiles
  const wallSets = await loadWallTiles(WALL_DATA_URLS);
  setWallSprites(wallSets);

  // Load furniture sprites
  const catalog = [...FURNITURE_CATALOG] as any[];
  const furnitureSprites = await loadFurnitureSprites(
    catalog,
    FURNITURE_SPRITE_URLS,
    FURNITURE_DIMENSIONS
  );
  buildDynamicCatalog({ catalog, sprites: furnitureSprites });

  // Load default layout
  if (DEFAULT_LAYOUT) {
    const layout = DEFAULT_LAYOUT as OfficeLayout;
    console.log(`[PixelOffice] Loading layout: ${layout.cols}x${layout.rows}, ${layout.furniture?.length ?? 0} furniture`);
    officeState.rebuildFromLayout(layout);
    console.log(`[PixelOffice] Layout loaded. OfficeState rows=${officeState.getLayout().rows}`);
  } else {
    console.warn("[PixelOffice] No default layout found in encoded assets");
  }
}
