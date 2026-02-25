"""
Tile Map Editor

Grid-based map editor with:
  - Tile palette sidebar (Wall, Floor, Door, Water, Stairs, etc.)
  - Scrollable / zoomable grid canvas
  - Left click  – paint selected tile
  - Right click – erase to floor
  - Entity placement (player_start, npc, item, trigger)
  - Resize map dialog
  - Save/Load as JSON (.json)

Run standalone:  python -m editor.map_editor
Controls:
  Left click      – paint tile
  Right click     – set floor (erase)
  Middle drag     – pan canvas
  +/-             – zoom in/out
  E               – cycle entity tool
  Del             – remove entity under cursor
  Ctrl+S          – save
  Ctrl+O          – open
  Ctrl+N          – new map (resets to blank)
  Ctrl+R          – resize
"""
from __future__ import annotations
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import tkinter as tk
from tkinter import filedialog, simpledialog
from typing import Optional, Tuple

import pygame

from engine.tilemap import TileMap, MapEntity, TILE_DEFS, WALL, FLOOR, DOOR, WATER, STAIRS_D, STAIRS_U
from engine.palette import PRESETS, Palette

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
SIDEBAR_W = 160
W, H      = 1100, 720
CANVAS_X  = SIDEBAR_W + 4
CANVAS_Y  = 40
STATUS_H  = 20
CANVAS_H  = H - CANVAS_Y - STATUS_H

ZOOM_LEVELS = [8, 10, 12, 16, 20, 24, 32]

# ---------------------------------------------------------------------------
# Tile entries in the palette sidebar
# ---------------------------------------------------------------------------
TILE_PALETTE: list = [
    (0,  "Floor"),
    (1,  "Wall"),
    (2,  "Door"),
    (3,  "Door Open"),
    (4,  "Stair ↓"),
    (5,  "Stair ↑"),
    (6,  "Water"),
    (7,  "Chest"),
    (8,  "Altar"),
    (9,  "Pillar"),
    (10, "Void"),
    (11, "Fire"),
]

ENTITY_TYPES = ["player_start", "npc", "item", "trigger"]

# ---------------------------------------------------------------------------
# Tile colors for editor (palette-derived)
# ---------------------------------------------------------------------------
def _tile_color(tile_id: int, palette: Palette) -> Tuple[int, int, int]:
    """Return a distinctive editor color for each tile type."""
    fg, bg = palette.fg, palette.bg
    tones = {
        0:  palette.blend(0.15),   # floor – very dark
        1:  palette.blend(0.95),   # wall – near fg
        2:  palette.blend(0.60),   # door – mid
        3:  palette.blend(0.40),   # door open
        4:  palette.blend(0.80),   # stairs
        5:  palette.blend(0.80),
        6:  tuple(int(c * 0.5 + 30) for c in fg),  # water – tinted
        7:  palette.blend(0.70),   # chest
        8:  palette.blend(0.90),   # altar
        9:  palette.blend(1.00),   # pillar = full fg
        10: bg,                     # void = bg
        11: palette.blend(0.75),   # fire
    }
    return tones.get(tile_id, palette.mid)


def _entity_color(entity_type: str, palette: Palette) -> Tuple[int, int, int]:
    fg = palette.fg
    colors = {
        "player_start": (0, 255, 80),
        "npc":          (255, 180, 0),
        "item":         (0, 180, 255),
        "trigger":      (220, 0, 220),
    }
    return colors.get(entity_type, fg)


# ---------------------------------------------------------------------------
# Main editor function
# ---------------------------------------------------------------------------

def run(palette: Optional[Palette] = None) -> Optional[TileMap]:
    palette = palette or PRESETS["phosphor_green"]
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Tile Map Editor")
    clock = pygame.time.Clock()

    # State
    tilemap: TileMap  = TileMap.blank(20, 15, "new_map")
    zoom:     int     = 20
    zoom_idx: int     = ZOOM_LEVELS.index(zoom)
    cam_x:    float   = 0.0
    cam_y:    float   = 0.0          # canvas offset in pixels

    selected_tile: int  = FLOOR
    entity_tool:   bool = False
    entity_type_idx: int = 0

    save_path: Optional[str] = None
    status_msg: str = "New map 20×15"
    dragging: bool = False
    mid_drag: bool = False
    mid_drag_start = None
    cam_drag_start = None

    font_md = pygame.font.SysFont("monospace", 13)
    font_sm = pygame.font.SysFont("monospace", 11)

    # -----------------------------------------------------------------------
    def canvas_to_tile(mx: int, my: int) -> Tuple[int, int]:
        tx = int((mx - CANVAS_X - cam_x) // zoom)
        ty = int((my - CANVAS_Y - cam_y) // zoom)
        return tx, ty

    def tile_rect(tx: int, ty: int) -> pygame.Rect:
        rx = int(CANVAS_X + cam_x + tx * zoom)
        ry = int(CANVAS_Y + cam_y + ty * zoom)
        return pygame.Rect(rx, ry, zoom, zoom)

    def clamp_camera() -> None:
        nonlocal cam_x, cam_y
        map_w = tilemap.width  * zoom
        map_h = tilemap.height * zoom
        # Allow panning so map can be centered at minimum
        min_x = min(0.0, CANVAS_H - map_h // 1)
        min_y = min(0.0, CANVAS_H - map_h // 1)
        cam_x = max(min(cam_x, 20.0), -(map_w - CANVAS_H + 20))
        cam_y = max(min(cam_y, 20.0), -(map_h - CANVAS_H + 20))

    def paint_tile(mx: int, my: int, tile_id: int) -> None:
        tx, ty = canvas_to_tile(mx, my)
        if 0 <= tx < tilemap.width and 0 <= ty < tilemap.height:
            tilemap.set(tx, ty, tile_id)

    def place_entity(mx: int, my: int) -> None:
        tx, ty = canvas_to_tile(mx, my)
        if not (0 <= tx < tilemap.width and 0 <= ty < tilemap.height):
            return
        etype = ENTITY_TYPES[entity_type_idx]
        # Remove duplicate player_start
        if etype == "player_start":
            tilemap.entities = [e for e in tilemap.entities if e.entity_type != "player_start"]
        eid = f"{etype}_{tx}_{ty}"
        tilemap.entities.append(MapEntity(etype, eid, tx, ty))

    def remove_entity_at(mx: int, my: int) -> None:
        tx, ty = canvas_to_tile(mx, my)
        before = len(tilemap.entities)
        tilemap.entities = [e for e in tilemap.entities
                            if not (e.x == tx and e.y == ty)]

    # -----------------------------------------------------------------------
    def draw_frame() -> None:
        bg, fg = palette.bg, palette.fg
        screen.fill(bg)

        # --- Sidebar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(0, 0, SIDEBAR_W, H))

        sx, sy = 8, CANVAS_Y
        lbl = font_md.render("TILES", False, fg)
        screen.blit(lbl, (sx, sy)); sy += 20

        for tile_id, tile_name in TILE_PALETTE:
            sel = (not entity_tool) and (selected_tile == tile_id)
            r = pygame.Rect(sx, sy, SIDEBAR_W - 16, 22)
            col = _tile_color(tile_id, palette)
            # swatch
            pygame.draw.rect(screen, col, pygame.Rect(sx, sy + 2, 16, 16))
            pygame.draw.rect(screen, fg, pygame.Rect(sx, sy + 2, 16, 16), 1)
            border_col = fg if sel else tuple(c // 3 for c in fg)
            pygame.draw.rect(screen, border_col, r, 1)
            if sel:
                pygame.draw.rect(screen, tuple(c // 6 for c in fg), r)
                pygame.draw.rect(screen, fg, r, 1)
            label_col = bg if sel else fg
            screen.blit(font_sm.render(tile_name, False, label_col), (sx + 20, sy + 4))
            sy += 24

        sy += 8
        lbl = font_md.render("ENTITIES", False, fg)
        screen.blit(lbl, (sx, sy)); sy += 18

        for i, etype in enumerate(ENTITY_TYPES):
            sel = entity_tool and (entity_type_idx == i)
            r = pygame.Rect(sx, sy, SIDEBAR_W - 16, 22)
            ecol = _entity_color(etype, palette)
            pygame.draw.rect(screen, ecol, pygame.Rect(sx, sy + 2, 12, 12))
            border_col = fg if sel else tuple(c // 3 for c in fg)
            if sel:
                pygame.draw.rect(screen, tuple(c // 6 for c in fg), r)
                pygame.draw.rect(screen, fg, r, 1)
            else:
                pygame.draw.rect(screen, border_col, r, 1)
            label_col = bg if sel else fg
            screen.blit(font_sm.render(etype, False, label_col), (sx + 16, sy + 4))
            sy += 24

        sy += 8
        hints = [
            f"Zoom: {zoom}px [+/-]",
            f"Map: {tilemap.width}×{tilemap.height}",
            f"[E] entity mode",
            "[Del] del entity",
            "Mid-drag: pan",
            "Ctrl+S  Save",
            "Ctrl+O  Open",
            "Ctrl+N  New",
            "Ctrl+R  Resize",
        ]
        for h in hints:
            screen.blit(font_sm.render(h, False, tuple(c // 2 for c in fg)), (sx, sy))
            sy += 14

        # --- Canvas background ---
        pygame.draw.rect(screen, tuple(c // 12 for c in fg),
                         pygame.Rect(CANVAS_X, CANVAS_Y,
                                     W - CANVAS_X, H - CANVAS_Y - STATUS_H))

        # --- Tiles ---
        clip_rect = pygame.Rect(CANVAS_X, CANVAS_Y, W - CANVAS_X, CANVAS_H)
        screen.set_clip(clip_rect)

        for ty in range(tilemap.height):
            for tx in range(tilemap.width):
                r = tile_rect(tx, ty)
                if not clip_rect.colliderect(r):
                    continue
                tile_id = tilemap.get(tx, ty)
                col = _tile_color(tile_id, palette)
                pygame.draw.rect(screen, col, r)
                if zoom >= 10:
                    glyph = TILE_DEFS.get(tile_id, {}).get("glyph", "?")
                    gsurf = font_sm.render(glyph, False, tuple(max(0, c - 40) for c in col))
                    screen.blit(gsurf, (r.x + 2, r.y + 2))
                # grid lines
                grid_col = tuple(max(0, c - 30) for c in col)
                pygame.draw.rect(screen, grid_col, r, 1)

        # --- Entities ---
        for e in tilemap.entities:
            r = tile_rect(e.x, e.y)
            if not clip_rect.colliderect(r):
                continue
            ecol = _entity_color(e.entity_type, palette)
            # Draw diamond marker
            cx, cy = r.centerx, r.centery
            size = max(3, zoom // 4)
            points = [(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)]
            pygame.draw.polygon(screen, ecol, points)
            if zoom >= 14:
                first_char = e.entity_type[0].upper()
                gs = font_sm.render(first_char, False, palette.bg)
                screen.blit(gs, (cx - 4, cy - 6))

        # --- Map border ---
        map_rect = pygame.Rect(
            int(CANVAS_X + cam_x) - 1,
            int(CANVAS_Y + cam_y) - 1,
            tilemap.width * zoom + 2,
            tilemap.height * zoom + 2,
        )
        pygame.draw.rect(screen, tuple(c // 2 for c in fg), map_rect, 2)

        screen.set_clip(None)

        # --- Top bar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(CANVAS_X, 0, W - CANVAS_X, CANVAS_Y - 2))
        fname = os.path.basename(save_path) if save_path else "<unsaved>"
        mode_str = f"ENTITY:{ENTITY_TYPES[entity_type_idx]}" if entity_tool else f"TILE:{TILE_DEFS.get(selected_tile,{}).get('name','?')}"
        title = font_md.render(
            f"Map Editor  |  {fname}  |  {mode_str}  |  zoom:{zoom}",
            False, fg)
        screen.blit(title, (CANVAS_X + 8, 12))

        # --- Status bar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(0, H - STATUS_H, W, STATUS_H))
        screen.blit(font_sm.render(status_msg, False, fg), (8, H - STATUS_H + 4))

        pygame.display.flip()

    # -----------------------------------------------------------------------
    running = True
    result: Optional[TileMap] = None

    while running:
        draw_frame()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                ctrl = event.mod & pygame.KMOD_CTRL
                if event.key == pygame.K_ESCAPE:
                    running = False

                elif event.key in (pygame.K_PLUS, pygame.K_EQUALS):
                    zoom_idx = min(len(ZOOM_LEVELS) - 1, zoom_idx + 1)
                    zoom = ZOOM_LEVELS[zoom_idx]

                elif event.key == pygame.K_MINUS:
                    zoom_idx = max(0, zoom_idx - 1)
                    zoom = ZOOM_LEVELS[zoom_idx]

                elif event.key == pygame.K_e:
                    entity_tool = not entity_tool
                    status_msg = f"Entity tool: {'ON' if entity_tool else 'OFF'}"

                elif event.key == pygame.K_DELETE:
                    mx, my = pygame.mouse.get_pos()
                    remove_entity_at(mx, my)
                    status_msg = "Entity removed"

                elif event.key == pygame.K_s and ctrl:
                    if save_path is None:
                        root = tk.Tk(); root.withdraw()
                        save_path = filedialog.asksaveasfilename(
                            defaultextension=".json",
                            filetypes=[("Map JSON", "*.json")])
                        root.destroy()
                    if save_path:
                        tilemap.save(save_path)
                        status_msg = f"Saved: {os.path.basename(save_path)}"

                elif event.key == pygame.K_o and ctrl:
                    root = tk.Tk(); root.withdraw()
                    path = filedialog.askopenfilename(filetypes=[("Map JSON", "*.json")])
                    root.destroy()
                    if path:
                        tilemap = TileMap.load(path)
                        save_path = path
                        cam_x = cam_y = 0.0
                        status_msg = f"Loaded: {os.path.basename(path)}"

                elif event.key == pygame.K_n and ctrl:
                    tilemap = TileMap.blank(20, 15, "new_map")
                    save_path = None
                    cam_x = cam_y = 0.0
                    status_msg = "New map 20×15"

                elif event.key == pygame.K_r and ctrl:
                    root = tk.Tk(); root.withdraw()
                    w_str = simpledialog.askstring("Resize", "Width:", initialvalue=str(tilemap.width), parent=root)
                    h_str = simpledialog.askstring("Resize", "Height:", initialvalue=str(tilemap.height), parent=root)
                    root.destroy()
                    try:
                        new_w = max(5, min(200, int(w_str)))
                        new_h = max(5, min(200, int(h_str)))
                        # Preserve existing tiles within new bounds
                        new_tiles = [[tilemap.get(x, y) for x in range(new_w)]
                                     for y in range(new_h)]
                        tilemap.width  = new_w
                        tilemap.height = new_h
                        tilemap.tiles  = new_tiles
                        tilemap.revealed = [[False] * new_w for _ in range(new_h)]
                        tilemap.entities = [
                            e for e in tilemap.entities
                            if 0 <= e.x < new_w and 0 <= e.y < new_h
                        ]
                        status_msg = f"Resized to {new_w}×{new_h}"
                    except (TypeError, ValueError):
                        status_msg = "Resize cancelled"

            # ---- Mouse button down ----
            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos

                # Middle button: start pan
                if event.button == 2:
                    mid_drag = True
                    mid_drag_start = (mx, my)
                    cam_drag_start = (cam_x, cam_y)

                # Left button
                elif event.button == 1:
                    # Sidebar click: select tile or entity type
                    if mx < SIDEBAR_W:
                        hit_y = my - CANVAS_Y - 20
                        if hit_y >= 0:
                            row = hit_y // 24
                            if row < len(TILE_PALETTE):
                                selected_tile = TILE_PALETTE[row][0]
                                entity_tool = False
                            else:
                                ei = row - len(TILE_PALETTE) - 1  # -1 for header
                                if 0 <= ei < len(ENTITY_TYPES):
                                    entity_type_idx = ei
                                    entity_tool = True
                    else:
                        dragging = True
                        if entity_tool:
                            place_entity(mx, my)
                        else:
                            paint_tile(mx, my, selected_tile)

                # Right button: erase (set floor)
                elif event.button == 3:
                    if mx >= CANVAS_X:
                        dragging = True
                        paint_tile(mx, my, FLOOR)

            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 2:
                    mid_drag = False
                elif event.button in (1, 3):
                    dragging = False

            elif event.type == pygame.MOUSEMOTION:
                mx, my = event.pos

                if mid_drag and mid_drag_start and cam_drag_start:
                    dx = mx - mid_drag_start[0]
                    dy = my - mid_drag_start[1]
                    cam_x = cam_drag_start[0] + dx
                    cam_y = cam_drag_start[1] + dy
                    clamp_camera()

                elif dragging:
                    btn = pygame.mouse.get_pressed()
                    if btn[0] and mx >= CANVAS_X:  # left
                        if not entity_tool:
                            paint_tile(mx, my, selected_tile)
                    elif btn[2] and mx >= CANVAS_X:  # right
                        paint_tile(mx, my, FLOOR)

                # Update status with tile coords
                tx, ty = canvas_to_tile(mx, my)
                if 0 <= tx < tilemap.width and 0 <= ty < tilemap.height:
                    tid = tilemap.get(tx, ty)
                    tname = TILE_DEFS.get(tid, {}).get("name", "?")
                    ents = tilemap.entities_at(tx, ty)
                    ent_str = " | " + ", ".join(e.entity_type for e in ents) if ents else ""
                    status_msg = f"({tx},{ty})  {tname}{ent_str}"

        clock.tick(30)

    pygame.quit()
    result = tilemap
    return result


if __name__ == "__main__":
    run()
