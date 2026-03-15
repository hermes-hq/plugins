#!/usr/bin/env python3
"""
Convert LimeZu premade character spritesheets to pixel-agents format.

LimeZu format: 896x656 (56 cols x 20 anim rows of 16x32 frames)
pixel-agents format: 112x96 (7 cols x 3 rows of 16x32 frames)
  - Row 0 = DOWN, Row 1 = UP, Row 2 = RIGHT
  - Frames: 0,1,2 = walk cycle, 3,4 = typing/sit, 5,6 = reading/idle
"""

from PIL import Image
import os

VENDOR_DIR = os.path.join(os.path.dirname(__file__), "..", "vendor", "limezu", "interiors",
                          "2_Characters", "Character_Generator", "0_Premade_Characters", "16x16")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "characters")

FW, FH = 16, 32

# LimeZu direction groups (6 frames each within a 24-frame animation row):
# Group 0 (cols 0-5): Down
# Group 1 (cols 6-11): Up
# Group 2 (cols 12-17): Left
# Group 3 (cols 18-23): Right

# Sit row 3 layout (from pixel analysis):
# cols 0-5: Down sit (6 frames, ~192px each)
# cols 6-7: Up sit (2 frames, ~132px each)
# cols 8-12: BED/SLEEP sprites (486-490px — NOT sit!) — SKIP THESE


def extract_frame(img, col, anim_row):
    """Extract a single 16x32 frame."""
    x = col * FW
    y = anim_row * FH
    return img.crop((x, y, x + FW, y + FH))


def convert_character(input_path, output_path, char_idx):
    src = Image.open(input_path)
    dst = Image.new("RGBA", (7 * FW, 3 * FH), (0, 0, 0, 0))

    # Direction config: (limezu_col_start, pa_row)
    dirs = [
        ("down", 0, 0),   # LimeZu cols 0-5, pixel-agents row 0
        ("up", 6, 1),     # LimeZu cols 6-11, pixel-agents row 1
        ("right", 18, 2), # LimeZu cols 18-23, pixel-agents row 2
    ]

    for dir_name, lz_start, pa_row in dirs:
        # Walk frames (anim row 2): take frames 0, 2, 4 for 3-frame walk cycle
        for i in range(3):
            frame = extract_frame(src, lz_start + i * 2, 2)
            dst.paste(frame, (i * FW, pa_row * FH))

        # Typing frames (use sit for down, idle for up/right since sit only has down reliably)
        if dir_name == "down":
            # Sit frames from anim row 3, cols 0-1
            for i in range(2):
                frame = extract_frame(src, i, 3)
                dst.paste(frame, ((3 + i) * FW, pa_row * FH))
        else:
            # Use idle frames as typing fallback (characters face the desk)
            for i in range(2):
                frame = extract_frame(src, lz_start + i, 1)  # idle row
                dst.paste(frame, ((3 + i) * FW, pa_row * FH))

        # Reading/idle frames (anim row 1): take frames 0, 1
        for i in range(2):
            frame = extract_frame(src, lz_start + i, 1)
            dst.paste(frame, ((5 + i) * FW, pa_row * FH))

    dst.save(output_path)
    print(f"  char_{char_idx}.png <- {os.path.basename(input_path)}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    premade_files = sorted([
        f for f in os.listdir(VENDOR_DIR)
        if f.startswith("Premade_Character_") and f.endswith(".png")
    ])

    # Pick 6 diverse characters spread across the 20 premade
    picks = [0, 2, 4, 7, 11, 15]

    print(f"Converting {len(picks)} LimeZu characters to pixel-agents format:")
    for i, pick_idx in enumerate(picks):
        if pick_idx < len(premade_files):
            input_path = os.path.join(VENDOR_DIR, premade_files[pick_idx])
            output_path = os.path.join(OUTPUT_DIR, f"char_{i}.png")
            convert_character(input_path, output_path, i)

    print(f"\nDone! Characters saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
