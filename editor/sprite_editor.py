"""
Pixel Art Editor

Two-color bitmap sprite editor with:
  - Zoomable canvas (pencil, eraser, fill)
  - Multiple animation frames
  - PNG import (threshold conversion to 2-color)
  - Save/Load as JSON (.spr)

Run standalone:  python -m editor.sprite_editor
Controls:
  Left click  – draw foreground (1)
  Right click – draw background (0)
  F           – flood fill with current color
  Z/Y         – undo/redo
  +/-         – zoom in/out
  N           – new frame
  < >         – prev/next frame
  Ctrl+S      – save
  Ctrl+O      – open
  Ctrl+I      – import PNG
"""
from __future__ import annotations
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import copy
import tkinter as tk
from tkinter import filedialog
from collections import deque
from typing import List, Optional, Tuple

import pygame

from engine.sprite import Sprite, SpriteFrame
from engine.palette import PRESETS, Palette

# Layout
TOOL_W   = 140
CANVAS_X = TOOL_W + 8
CANVAS_Y = 40
W, H     = 1024, 680

ZOOM_LEVELS = [1, 2, 4, 6, 8, 10, 12, 16]


def run(palette: Optional[Palette] = None) -> Optional[Sprite]:
    palette = palette or PRESETS["phosphor_green"]
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Sprite / Pixel Art Editor")
    clock  = pygame.time.Clock()

    # State
    sprite: Sprite = Sprite.blank("new_sprite", width=16, height=16, pixel_scale=4)
    frame_idx: int = 0
    zoom: int = 8
    zoom_idx: int = ZOOM_LEVELS.index(zoom) if zoom in ZOOM_LEVELS else 3

    tool: str = "pencil"       # pencil | eraser | fill
    draw_value: int = 1        # 1=fg, 0=bg (right click = 0)
    canvas_offset = [0, 0]    # scroll offset

    undo_stack: deque = deque(maxlen=50)
    redo_stack: deque = deque(maxlen=50)

    save_path: Optional[str] = None
    status_msg: str = "New sprite 16x16"

    font_md = pygame.font.SysFont("monospace", 13)
    font_sm = pygame.font.SysFont("monospace", 11)

    # -----------
    def current_frame() -> SpriteFrame:
        while len(sprite.frames) <= frame_idx:
            sprite.add_frame()
        return sprite.frames[frame_idx]

    def push_undo() -> None:
        undo_stack.append(copy.deepcopy(current_frame().data))
        redo_stack.clear()

    def canvas_to_pixel(mx: int, my: int) -> Tuple[int, int]:
        px = (mx - CANVAS_X - canvas_offset[0]) // zoom
        py = (my - CANVAS_Y - canvas_offset[1]) // zoom
        return px, py

    def draw_pixel(px: int, py: int, value: int) -> None:
        frame = current_frame()
        if 0 <= px < sprite.width and 0 <= py < sprite.height:
            frame.set_pixel(px, py, value)

    def flood_fill(px: int, py: int, fill_val: int) -> None:
        frame = current_frame()
        target = frame.get_pixel(px, py)
        if target == fill_val:
            return
        stack = [(px, py)]
        visited = set()
        while stack:
            x, y = stack.pop()
            if (x, y) in visited:
                continue
            if not (0 <= x < sprite.width and 0 <= y < sprite.height):
                continue
            if frame.get_pixel(x, y) != target:
                continue
            visited.add((x, y))
            frame.set_pixel(x, y, fill_val)
            for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                stack.append((x+dx, y+dy))

    def draw_frame() -> None:
        bg, fg = palette.bg, palette.fg
        screen.fill(bg)

        # --- Canvas area ---
        frame = current_frame()
        for py in range(sprite.height):
            for px in range(sprite.width):
                bit = frame.get_pixel(px, py)
                color = fg if bit else bg
                rx = CANVAS_X + canvas_offset[0] + px * zoom
                ry = CANVAS_Y + canvas_offset[1] + py * zoom
                if zoom > 1:
                    pygame.draw.rect(screen, color, pygame.Rect(rx, ry, zoom, zoom))
                else:
                    screen.set_at((rx, ry), color)
                # Grid
                if zoom >= 4:
                    grid_col = tuple(min(255, c + 20) if bit == 0 else max(0, c - 30) for c in color)
                    pygame.draw.rect(screen, grid_col, pygame.Rect(rx, ry, zoom, zoom), 1)

        # Canvas border
        canvas_w = sprite.width  * zoom
        canvas_h = sprite.height * zoom
        pygame.draw.rect(screen, tuple(c//2 for c in fg),
                         pygame.Rect(CANVAS_X + canvas_offset[0] - 1,
                                     CANVAS_Y + canvas_offset[1] - 1,
                                     canvas_w + 2, canvas_h + 2), 1)

        # --- Preview (actual scale) ---
        prev_x = CANVAS_X + canvas_w + 20
        prev_y = CANVAS_Y
        prev_label = font_sm.render("Preview (1:1)", False, fg)
        screen.blit(prev_label, (prev_x, prev_y - 16))
        ps = sprite.pixel_scale or 1
        for py in range(sprite.height):
            for px in range(sprite.width):
                bit = frame.get_pixel(px, py)
                color = fg if bit else bg
                rx = prev_x + px * ps
                ry = prev_y + py * ps
                pygame.draw.rect(screen, color, pygame.Rect(rx, ry, max(1, ps), max(1, ps)))

        # --- Tool panel ---
        tx, ty = 8, CANVAS_Y
        pygame.draw.rect(screen, tuple(c//8 for c in fg),
                         pygame.Rect(0, 0, TOOL_W, H))

        lbl = font_md.render("TOOLS", False, fg)
        screen.blit(lbl, (tx, ty))
        ty += 20

        for tool_name, key in [("Pencil [P]","P"), ("Eraser [E]","E"), ("Fill [F]","F")]:
            sel = tool in tool_name.lower()
            r = pygame.Rect(tx, ty, TOOL_W - 16, 24)
            pygame.draw.rect(screen, (fg if sel else bg), r)
            pygame.draw.rect(screen, (fg if sel else tuple(c//3 for c in fg)), r, 1)
            s = font_sm.render(tool_name, False, (bg if sel else fg))
            screen.blit(s, (tx + 4, ty + 4))
            ty += 28

        ty += 8
        lbl = font_sm.render(f"Zoom: {zoom}x [+/-]", False, fg)
        screen.blit(lbl, (tx, ty)); ty += 16
        lbl = font_sm.render(f"Size: {sprite.width}x{sprite.height}", False, tuple(c//2 for c in fg))
        screen.blit(lbl, (tx, ty)); ty += 16

        ty += 8
        lbl = font_sm.render(f"Frame: {frame_idx+1}/{len(sprite.frames)}", False, fg)
        screen.blit(lbl, (tx, ty)); ty += 16
        lbl = font_sm.render("< > frame   [N] new", False, tuple(c//2 for c in fg))
        screen.blit(lbl, (tx, ty)); ty += 16

        ty += 8
        for label_b, col in [("FG (L.click)", fg), ("BG (R.click)", bg)]:
            sw_r = pygame.Rect(tx, ty, 20, 20)
            pygame.draw.rect(screen, col, sw_r)
            pygame.draw.rect(screen, fg, sw_r, 1)
            screen.blit(font_sm.render(label_b, False, fg), (tx + 24, ty + 3))
            ty += 26

        ty += 8
        for label_b, key_hint in [
            ("Ctrl+S  Save", ""), ("Ctrl+O  Open", ""), ("Ctrl+I  Import PNG", "")
        ]:
            screen.blit(font_sm.render(label_b, False, tuple(c//2 for c in fg)), (tx, ty))
            ty += 16

        # Status bar
        pygame.draw.rect(screen, tuple(c//8 for c in fg), pygame.Rect(0, H-20, W, 20))
        status_s = font_sm.render(status_msg, False, fg)
        screen.blit(status_s, (8, H - 17))

        pygame.display.flip()

    dragging = False
    result: Optional[Sprite] = None
    running = True

    while running:
        draw_frame()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                ctrl = event.mod & pygame.KMOD_CTRL
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_p:
                    tool = "pencil"
                elif event.key == pygame.K_e:
                    tool = "eraser"
                elif event.key == pygame.K_f:
                    tool = "fill"
                elif event.key == pygame.K_PLUS or event.key == pygame.K_EQUALS:
                    zoom_idx = min(len(ZOOM_LEVELS)-1, zoom_idx+1); zoom = ZOOM_LEVELS[zoom_idx]
                elif event.key == pygame.K_MINUS:
                    zoom_idx = max(0, zoom_idx-1); zoom = ZOOM_LEVELS[zoom_idx]
                elif event.key == pygame.K_n:
                    sprite.add_frame(); frame_idx = len(sprite.frames) - 1; status_msg = f"Frame {frame_idx+1} added"
                elif event.key == pygame.K_COMMA:
                    frame_idx = (frame_idx - 1) % len(sprite.frames)
                elif event.key == pygame.K_PERIOD:
                    frame_idx = (frame_idx + 1) % len(sprite.frames)
                elif event.key == pygame.K_z and ctrl:
                    if undo_stack:
                        redo_stack.append(copy.deepcopy(current_frame().data))
                        current_frame().data = undo_stack.pop()
                elif event.key == pygame.K_y and ctrl:
                    if redo_stack:
                        undo_stack.append(copy.deepcopy(current_frame().data))
                        current_frame().data = redo_stack.pop()
                elif event.key == pygame.K_s and ctrl:
                    if save_path is None:
                        root = tk.Tk(); root.withdraw()
                        save_path = filedialog.asksaveasfilename(
                            defaultextension=".json", filetypes=[("Sprite","*.json")])
                        root.destroy()
                    if save_path:
                        sprite.save(save_path); status_msg = f"Saved: {os.path.basename(save_path)}"
                elif event.key == pygame.K_o and ctrl:
                    root = tk.Tk(); root.withdraw()
                    path = filedialog.askopenfilename(filetypes=[("Sprite","*.json")])
                    root.destroy()
                    if path:
                        sprite = Sprite.load(path); frame_idx = 0; save_path = path
                        status_msg = f"Loaded: {os.path.basename(path)}"
                elif event.key == pygame.K_i and ctrl:
                    root = tk.Tk(); root.withdraw()
                    path = filedialog.askopenfilename(
                        filetypes=[("PNG Image","*.png"),("Image","*.jpg *.png *.bmp")])
                    root.destroy()
                    if path:
                        try:
                            from engine.sprite import import_png
                            sprite = import_png(path, "imported", pixel_scale=4)
                            frame_idx = 0; status_msg = f"Imported: {os.path.basename(path)}"
                        except Exception as ex:
                            status_msg = f"Import failed: {ex}"

            elif event.type == pygame.MOUSEBUTTONDOWN:
                px, py = canvas_to_pixel(event.pos[0], event.pos[1])
                if 0 <= px < sprite.width and 0 <= py < sprite.height:
                    push_undo()
                    draw_value = 0 if event.button == 3 else 1
                    if tool == "fill":
                        flood_fill(px, py, draw_value)
                    else:
                        val = draw_value if tool == "pencil" else 0
                        draw_pixel(px, py, val)
                    dragging = True

            elif event.type == pygame.MOUSEBUTTONUP:
                dragging = False

            elif event.type == pygame.MOUSEMOTION and dragging:
                px, py = canvas_to_pixel(event.pos[0], event.pos[1])
                if 0 <= px < sprite.width and 0 <= py < sprite.height:
                    val = draw_value if tool == "pencil" else 0
                    draw_pixel(px, py, val)

        clock.tick(30)

    pygame.quit()
    result = sprite
    return result


if __name__ == "__main__":
    run()
