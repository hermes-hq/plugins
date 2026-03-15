import * as React from "react";

import { getAPI, getState, subscribe, updateState } from "../activate";
import { HermesBridge } from "../bridge/HermesBridge";
import { initAssets } from "../bridge/initAssets";
import { OfficeState } from "../engine/officeState";
import { startGameLoop } from "../engine/gameLoop";
import { renderFrame } from "../engine/renderer";
import type { SelectionRenderState } from "../engine/renderer";
import { TILE_SIZE, CharacterState } from "../office/types";

const { useState, useEffect, useRef, useCallback } = React;

// ── Constants ──

const ZOOM_MIN = 1;
const ZOOM_MAX = 10;
const ZOOM_DEFAULT = 4;
const PAN_MARGIN_FRACTION = 0.25;
const CAMERA_FOLLOW_LERP = 0.1;
const CAMERA_FOLLOW_SNAP_THRESHOLD = 0.5;
const ZOOM_SCROLL_THRESHOLD = 50;

// ── Styles ──

const panelStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#1E1E2E",
  overflow: "hidden",
};

const canvasContainerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

const statusBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 8px",
  background: "rgba(0, 0, 0, 0.5)",
  borderRadius: "4px 0 0 0",
  fontSize: "var(--text-xs, 11px)",
  fontFamily: "var(--font-mono, monospace)",
  color: "rgba(255, 255, 255, 0.5)",
  zIndex: 10,
};

const zoomBtnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  color: "rgba(255, 255, 255, 0.7)",
  padding: "2px 8px",
  cursor: "pointer",
  fontSize: "12px",
  fontFamily: "var(--font-mono, monospace)",
};

// ── Main Panel Component ──

export function PixelOfficePanel() {
  const [state, setState] = useState(getState());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const officeStateRef = useRef<OfficeState | null>(null);
  const bridgeRef = useRef<HermesBridge | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const zoomAccumulatorRef = useRef(0);
  const zoomRef = useRef(ZOOM_DEFAULT);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => subscribe(() => setState(getState())), []);

  // Initialize office state, bridge, and game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Create office state
    const officeState = new OfficeState();
    officeStateRef.current = officeState;

    // Create bridge
    let api: ReturnType<typeof getAPI>;
    try {
      api = getAPI();
    } catch {
      return;
    }

    // Load assets before starting the bridge and game loop
    initAssets(officeState).then(() => {
      setAssetsLoaded(true);
    }).catch((err) => {
      console.warn("[PixelOffice] Failed to load assets:", err);
      setAssetsLoaded(true); // Continue anyway with empty sprites
    });

    const bridge = new HermesBridge(officeState, api);
    bridgeRef.current = bridge;
    bridge.start();

    // Resize canvas backing store
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);

    // Start game loop
    const stop = startGameLoop(canvas, {
      update: (dt: number) => {
        officeState.update(dt);

        // Auto-fit: zoom to fill the visible content (skip void rows)
        const layout = officeState.getLayout();
        const ch = canvas.height;
        if (layout.rows > 0 && ch > 0) {
          // Find first and last non-void rows to calculate content bounds
          let firstRow = 0;
          let lastRow = layout.rows - 1;
          const VOID = 255;
          for (let r = 0; r < layout.rows; r++) {
            const rowStart = r * layout.cols;
            let allVoid = true;
            for (let c = 0; c < layout.cols; c++) {
              if (officeState.tileMap[r]?.[c] !== VOID) { allVoid = false; break; }
            }
            if (!allVoid) { firstRow = r; break; }
          }
          for (let r = layout.rows - 1; r >= 0; r--) {
            let allVoid = true;
            for (let c = 0; c < layout.cols; c++) {
              if (officeState.tileMap[r]?.[c] !== VOID) { allVoid = false; break; }
            }
            if (!allVoid) { lastRow = r; break; }
          }

          // Include furniture that extends above the first content row (wall items)
          const furnitureTopRow = officeState.furniture.reduce((min, f) => Math.min(min, f.y / TILE_SIZE), firstRow);
          firstRow = Math.max(0, Math.floor(furnitureTopRow));

          const contentRows = lastRow - firstRow + 1;
          const contentPixelH = contentRows * TILE_SIZE;
          // Use integer zoom for crisp pixel-perfect rendering (no sub-pixel gaps)
          const fitZoom = Math.max(1, Math.floor(ch / contentPixelH));
          zoomRef.current = fitZoom;
          // Center the visible content (not the full layout with void rows)
          // Renderer centers the full layout. Shift pan so content center = canvas center.
          const contentCenterRow = (firstRow + lastRow) / 2;
          const layoutCenterRow = layout.rows / 2;
          const shiftRows = contentCenterRow - layoutCenterRow;
          panRef.current = { x: 0, y: -shiftRows * TILE_SIZE * fitZoom };
        }
      },
      render: (ctx: CanvasRenderingContext2D) => {
        const w = canvas.width;
        const h = canvas.height;

        const selectionRender: SelectionRenderState = {
          selectedAgentId: officeState.selectedAgentId,
          hoveredAgentId: officeState.hoveredAgentId,
          hoveredTile: officeState.hoveredTile,
          seats: officeState.seats,
          characters: officeState.characters,
        };

        const result = renderFrame(
          ctx,
          w,
          h,
          officeState.tileMap,
          officeState.furniture,
          officeState.getCharacters(),
          zoomRef.current,
          panRef.current.x,
          panRef.current.y,
          selectionRender,
          undefined, // no editor in play mode
          officeState.getLayout().tileColors,
          officeState.getLayout().cols,
          officeState.getLayout().rows
        );
        offsetRef.current = { x: result.offsetX, y: result.offsetY };
      },
    });

    return () => {
      stop();
      observer.disconnect();
      bridge.destroy();
      officeStateRef.current = null;
      bridgeRef.current = null;
    };
  }, []);

  // Convert screen coords to world coords
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const deviceX = (clientX - rect.left) * dpr;
      const deviceY = (clientY - rect.top) * dpr;
      const z = zoomRef.current;
      const worldX = (deviceX - offsetRef.current.x) / z;
      const worldY = (deviceY - offsetRef.current.y) / z;
      return { worldX, worldY };
    },
    []
  );

  const clampPan = useCallback(
    (px: number, py: number) => {
      const canvas = canvasRef.current;
      const os = officeStateRef.current;
      if (!canvas || !os) return { x: px, y: py };
      const layout = os.getLayout();
      const z = zoomRef.current;
      const mapW = layout.cols * TILE_SIZE * z;
      const mapH = layout.rows * TILE_SIZE * z;
      const marginX = canvas.width * PAN_MARGIN_FRACTION;
      const marginY = canvas.height * PAN_MARGIN_FRACTION;
      const maxPanX = mapW / 2 + canvas.width / 2 - marginX;
      const maxPanY = mapH / 2 + canvas.height / 2 - marginY;
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, px)),
        y: Math.max(-maxPanY, Math.min(maxPanY, py)),
      };
    },
    [zoom]
  );

  // Mouse handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToWorld(e.clientX, e.clientY);
      const os = officeStateRef.current;
      if (!pos || !os) return;

      const hitId = os.getCharacterAt(pos.worldX, pos.worldY);
      if (hitId !== null) {
        // Toggle selection
        if (os.selectedAgentId === hitId) {
          os.selectedAgentId = null;
          os.cameraFollowId = null;
        } else {
          os.selectedAgentId = hitId;
          os.cameraFollowId = hitId;
        }
        // Focus the session in Hermes
        os.dismissBubble(hitId);
        bridgeRef.current?.focusSession(hitId);
        return;
      }

      // Click on seat while agent selected — reassign
      if (os.selectedAgentId !== null) {
        const col = Math.floor(pos.worldX / TILE_SIZE);
        const row = Math.floor(pos.worldY / TILE_SIZE);
        const seatId = os.getSeatAtTile(col, row);
        if (seatId) {
          const seat = os.seats.get(seatId);
          const selectedCh = os.characters.get(os.selectedAgentId);
          if (seat && selectedCh && !selectedCh.isSubagent) {
            if (selectedCh.seatId === seatId) {
              os.sendToSeat(os.selectedAgentId);
              os.selectedAgentId = null;
              os.cameraFollowId = null;
            } else if (!seat.assigned) {
              os.reassignSeat(os.selectedAgentId, seatId);
              os.selectedAgentId = null;
              os.cameraFollowId = null;
            }
          }
        } else {
          // Click empty — deselect
          os.selectedAgentId = null;
          os.cameraFollowId = null;
        }
      }
    },
    [screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const dx = (e.clientX - panStartRef.current.mouseX) * dpr;
        const dy = (e.clientY - panStartRef.current.mouseY) * dpr;
        panRef.current = clampPan(
          panStartRef.current.panX + dx,
          panStartRef.current.panY + dy
        );
        return;
      }

      const pos = screenToWorld(e.clientX, e.clientY);
      const os = officeStateRef.current;
      if (!pos || !os) return;

      const hitId = os.getCharacterAt(pos.worldX, pos.worldY);
      os.hoveredAgentId = hitId;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = hitId !== null ? "pointer" : "default";
      }
    },
    [screenToWorld, clampPan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        const os = officeStateRef.current;
        if (os) os.cameraFollowId = null;
        isPanningRef.current = true;
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = "grabbing";
      }
    },
    []
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = "default";
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false;
    const os = officeStateRef.current;
    if (os) {
      os.hoveredAgentId = null;
      os.hoveredTile = null;
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAccumulatorRef.current += e.deltaY;
        if (Math.abs(zoomAccumulatorRef.current) >= ZOOM_SCROLL_THRESHOLD) {
          const delta = zoomAccumulatorRef.current < 0 ? 1 : -1;
          zoomAccumulatorRef.current = 0;
          setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + delta)));
        }
      } else {
        const dpr = window.devicePixelRatio || 1;
        const os = officeStateRef.current;
        if (os) os.cameraFollowId = null;
        panRef.current = clampPan(
          panRef.current.x - e.deltaX * dpr,
          panRef.current.y - e.deltaY * dpr
        );
      }
    },
    [clampPan]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const os = officeStateRef.current;
      if (!os || os.selectedAgentId === null) return;
      const pos = screenToWorld(e.clientX, e.clientY);
      if (!pos) return;
      const col = Math.floor(pos.worldX / TILE_SIZE);
      const row = Math.floor(pos.worldY / TILE_SIZE);
      os.walkToTile(os.selectedAgentId, col, row);
    },
    [screenToWorld]
  );

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  }, []);

  const agentCount = officeStateRef.current?.characters.size ?? 0;

  return (
    <div style={panelStyle}>
      <div ref={containerRef} style={canvasContainerStyle}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          onAuxClick={handleAuxClick}
          style={{ display: "block" }}
        />
        {/* Vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div style={statusBarStyle}>
        <span>
          {agentCount} agent{agentCount !== 1 ? "s" : ""}
        </span>
        <span>{Math.round(zoomRef.current * 10) / 10}x</span>
      </div>
    </div>
  );
}
