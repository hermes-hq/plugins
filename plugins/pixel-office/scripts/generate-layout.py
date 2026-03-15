#!/usr/bin/env python3
"""
Generate a creative office layout for Pixel Office.
Tech startup: open workspace, meeting room, break area, reception.
"""

import json
import os

VOID = 255
WALL = 0
FLOOR_1 = 1
FLOOR_2 = 2
FLOOR_7 = 7
FLOOR_9 = 9

COLS = 26
ROWS = 16


def make_tiles():
    tiles = [VOID] * (COLS * ROWS)
    colors = [None] * (COLS * ROWS)

    def set_tile(c, r, t, color=None):
        if 0 <= r < ROWS and 0 <= c < COLS:
            tiles[r * COLS + c] = t
            if color:
                colors[r * COLS + c] = color

    def fill_rect(c1, r1, c2, r2, t, color=None):
        for r in range(r1, r2 + 1):
            for c in range(c1, c2 + 1):
                set_tile(c, r, t, color)

    # Warm brown workspace floor (left)
    workspace_color = {"h": 30, "s": 35, "b": 18, "c": 0}
    fill_rect(1, 1, 13, 12, FLOOR_1, workspace_color)

    # Cool blue meeting room floor (top right)
    meeting_color = {"h": 210, "s": 20, "b": 12, "c": 0}
    fill_rect(14, 1, 24, 6, FLOOR_7, meeting_color)

    # Warm break room floor (bottom right)
    break_color = {"h": 25, "s": 40, "b": 14, "c": 0}
    fill_rect(14, 7, 24, 12, FLOOR_2, break_color)

    # Entrance hall (bottom, full width) — checkered
    entrance_color = {"h": 0, "s": 0, "b": 18, "c": 0}
    fill_rect(1, 13, 24, 14, FLOOR_9, entrance_color)

    # Walls — top edge
    for c in range(0, 25):
        set_tile(c, 0, WALL)

    # Walls — left edge
    for r in range(0, 15):
        set_tile(0, r, WALL)

    # Walls — right edge
    for r in range(0, 15):
        set_tile(25, r, WALL)

    # Walls — bottom edge
    for c in range(0, 26):
        set_tile(c, 15, WALL)

    # Divider wall between workspace and right rooms (with door gap at rows 4-5 and 9-10)
    for r in range(0, 15):
        if r in [4, 5, 9, 10]:  # door gaps
            continue
        set_tile(13, r, WALL)

    # Divider between meeting room and break room
    for c in range(14, 25):
        if c in [17, 18, 19]:  # door gap
            continue
        set_tile(c, 7, WALL)

    return tiles, colors


def make_furniture():
    furniture = []
    uid_counter = [0]

    def place(ftype, col, row):
        uid_counter[0] += 1
        furniture.append({"uid": f"f{uid_counter[0]}", "type": ftype, "col": col, "row": row})

    # === MAIN WORKSPACE — 6 computer desks ===

    # Top row of desks
    place("DESK_FRONT", 2, 2)
    place("PC_FRONT_OFF", 3, 2)
    place("DESK_FRONT", 7, 2)
    place("PC_FRONT_OFF", 8, 2)

    place("CUSHIONED_BENCH", 3, 4)
    place("CUSHIONED_BENCH", 8, 4)

    # Middle row of desks
    place("DESK_FRONT", 2, 6)
    place("PC_FRONT_OFF", 3, 6)
    place("DESK_FRONT", 7, 6)
    place("PC_FRONT_OFF", 8, 6)

    place("CUSHIONED_BENCH", 3, 8)
    place("CUSHIONED_BENCH", 8, 8)

    # Bottom row of desks
    place("DESK_FRONT", 2, 10)
    place("PC_FRONT_OFF", 3, 10)
    place("DESK_FRONT", 7, 10)
    place("PC_FRONT_OFF", 8, 10)

    place("CUSHIONED_BENCH", 3, 12)
    place("CUSHIONED_BENCH", 8, 12)

    # Workspace wall deco
    place("DOUBLE_BOOKSHELF", 2, 0)
    place("CLOCK", 5, 0)
    place("DOUBLE_BOOKSHELF", 7, 0)
    place("WHITEBOARD", 10, 0)

    # Workspace plants
    place("PLANT", 1, 1)
    place("LARGE_PLANT", 11, 1)
    place("CACTUS", 5, 4)
    place("PLANT_2", 1, 7)
    place("CACTUS", 5, 8)
    place("PLANT", 11, 9)
    place("PLANT_2", 11, 5)

    # === MEETING ROOM (top right) ===
    place("TABLE_FRONT", 18, 3)
    place("WOODEN_CHAIR_SIDE", 17, 3)
    place("WOODEN_CHAIR_SIDE:left", 20, 3)
    place("WOODEN_CHAIR_SIDE", 17, 5)
    place("WOODEN_CHAIR_SIDE:left", 20, 5)
    place("PC_SIDE", 18, 3)
    place("PC_SIDE:left", 19, 5)

    # Meeting room deco
    place("LARGE_PAINTING", 17, 0)
    place("SMALL_PAINTING", 21, 0)
    place("HANGING_PLANT", 15, 0)
    place("PLANT_2", 23, 1)
    place("HANGING_PLANT", 23, 0)

    # === BREAK ROOM (bottom right) ===
    place("COFFEE_TABLE", 18, 10)
    place("SOFA_FRONT", 18, 9)
    place("SOFA_SIDE", 17, 10)
    place("SOFA_SIDE:left", 20, 10)
    place("SOFA_BACK", 18, 11)
    place("COFFEE", 19, 11)

    # Break room deco
    place("SMALL_TABLE_FRONT", 22, 11)
    place("COFFEE", 22, 10)
    place("PLANT", 15, 8)
    place("HANGING_PLANT", 22, 7)
    place("SMALL_PAINTING_2", 16, 7)
    place("BOOKSHELF", 23, 7)

    # === ENTRANCE ===
    place("SMALL_TABLE_FRONT", 5, 13)
    place("PLANT", 2, 13)
    place("PLANT_2", 10, 13)
    place("BIN", 1, 14)
    place("PLANT", 22, 13)
    place("POT", 24, 14)

    return furniture


def main():
    tiles, colors = make_tiles()
    furniture = make_furniture()

    layout = {
        "version": 1,
        "cols": COLS,
        "rows": ROWS,
        "tiles": tiles,
        "tileColors": colors,
        "furniture": furniture,
        "layoutRevision": 3,
    }

    output_path = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "default-layout.json")
    with open(output_path, "w") as f:
        json.dump(layout, f)

    print(f"Generated layout: {COLS}x{ROWS}, {len(furniture)} furniture, {sum(1 for t in tiles if t != VOID)} tiles")


if __name__ == "__main__":
    main()
