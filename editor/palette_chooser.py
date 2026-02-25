"""
Palette Chooser Editor

Lets the user pick two colors (background + foreground) for the game palette.
Shows preset phosphor-monitor themes and an RGB-slider custom picker.

Run standalone:  python -m editor.palette_chooser
"""
from __future__ import annotations
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pygame

from engine.palette import Palette, PRESETS

W, H = 640, 560


def run() -> Palette:
    """Open the palette chooser window. Returns the chosen Palette."""
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Palette Chooser")
    clock  = pygame.time.Clock()

    selected_palette = PRESETS["phosphor_green"]
    custom_fg = list(selected_palette.fg)
    custom_bg = list(selected_palette.bg)

    # Slider drag state
    dragging_slider: tuple = ()  # (channel, "fg"/"bg")

    font_lg = pygame.font.SysFont("monospace", 18, bold=True)
    font_md = pygame.font.SysFont("monospace", 13)
    font_sm = pygame.font.SysFont("monospace", 11)

    preset_keys = list(PRESETS.keys())
    preset_rects = []

    def draw() -> None:
        bg, fg = selected_palette.bg, selected_palette.fg
        screen.fill(bg)

        # Title
        title = font_lg.render("PALETTE CHOOSER", False, fg)
        screen.blit(title, (W//2 - title.get_width()//2, 12))

        # Separator
        pygame.draw.line(screen, tuple(c//2 for c in fg), (20, 40), (W-20, 40))

        # --- Preset swatches ---
        y_p = 55
        label = font_md.render("PRESETS:", False, fg)
        screen.blit(label, (20, y_p))
        y_p += 22

        preset_rects.clear()
        sw, sh = 90, 50
        for i, key in enumerate(preset_keys):
            p = PRESETS[key]
            col = i % 6
            row = i // 6
            x = 20 + col * (sw + 8)
            y = y_p + row * (sh + 28)
            rect = pygame.Rect(x, y, sw, sh)
            pygame.draw.rect(screen, p.bg, rect)
            border_color = (200, 200, 0) if p is selected_palette else p.fg
            pygame.draw.rect(screen, border_color, rect, 2)
            # FG stripe
            stripe = pygame.Rect(x+2, y+2, sw-4, sh//3)
            pygame.draw.rect(screen, p.fg, stripe)
            lbl = font_sm.render(p.name[:10], False, p.fg)
            screen.blit(lbl, (x + 2, y + sh - lbl.get_height() - 2))
            preset_rects.append((rect, key))

        # --- Custom sliders ---
        sy = 280
        pygame.draw.line(screen, tuple(c//2 for c in fg), (20, sy - 8), (W-20, sy - 8))
        custom_lbl = font_md.render("CUSTOM:", False, fg)
        screen.blit(custom_lbl, (20, sy))
        sy += 24

        def draw_sliders(label: str, color_list: list, y_start: int, tag: str) -> int:
            y = y_start
            ch_names = ["R", "G", "B"]
            lbl_s = font_md.render(f"{label}  #{color_list[0]:02X}{color_list[1]:02X}{color_list[2]:02X}",
                                   False, fg)
            screen.blit(lbl_s, (20, y))
            swatch = pygame.Rect(W - 90, y, 60, 18)
            pygame.draw.rect(screen, tuple(color_list), swatch)
            pygame.draw.rect(screen, fg, swatch, 1)
            y += 20
            for ch_idx, ch_name in enumerate(ch_names):
                bar_rect = pygame.Rect(60, y, 300, 14)
                pygame.draw.rect(screen, tuple(c//3 for c in fg), bar_rect)
                fill_w = int(300 * color_list[ch_idx] / 255)
                pygame.draw.rect(screen, tuple(color_list), pygame.Rect(60, y, fill_w, 14))
                pygame.draw.rect(screen, tuple(c//2 for c in fg), bar_rect, 1)
                ch_lbl = font_sm.render(f"{ch_name}:{color_list[ch_idx]:3d}", False, fg)
                screen.blit(ch_lbl, (20, y))
                val_lbl = font_sm.render(str(color_list[ch_idx]), False, fg)
                screen.blit(val_lbl, (365, y))
                y += 20
            return y + 4

        sy = draw_sliders("BG:", custom_bg, sy, "bg")
        sy = draw_sliders("FG:", custom_fg, sy, "fg")

        # Preview
        py_ = sy + 8
        pygame.draw.line(screen, tuple(c//2 for c in fg), (20, py_), (W-20, py_))
        py_ += 8
        preview_rect = pygame.Rect(20, py_, W - 40, 60)
        pygame.draw.rect(screen, tuple(custom_bg), preview_rect)
        pygame.draw.rect(screen, tuple(custom_fg), preview_rect, 2)
        prev_text = font_lg.render("PREVIEW  ###..@..###  PREVIEW", False, tuple(custom_fg))
        screen.blit(prev_text, (preview_rect.left + 8, preview_rect.centery - prev_text.get_height()//2))

        # Buttons
        btn_y = py_ + 70
        for label_b, cx, action in [
            ("APPLY CUSTOM", W//2 - 160, "apply"),
            ("SAVE",         W//2 + 10,  "save"),
        ]:
            r = pygame.Rect(cx, btn_y, 140, 32)
            pygame.draw.rect(screen, tuple(c//5 for c in fg), r)
            pygame.draw.rect(screen, tuple(c//2 for c in fg), r, 2)
            s = font_md.render(label_b, False, fg)
            screen.blit(s, (r.centerx - s.get_width()//2, r.centery - s.get_height()//2))

        pygame.display.flip()

    running = True
    result  = selected_palette

    while running:
        draw()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_RETURN:
                    result = Palette(tuple(custom_bg), tuple(custom_fg), "Custom")
                    running = False

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                # Check preset swatches
                for rect, key in preset_rects:
                    if rect.collidepoint(mx, my):
                        selected_palette = PRESETS[key]
                        custom_bg = list(selected_palette.bg)
                        custom_fg = list(selected_palette.fg)

                # Check sliders
                for tag, color_list, base_y in [
                    ("bg", custom_bg, 304), ("fg", custom_fg, 372)
                ]:
                    for ch_idx in range(3):
                        bar_y = base_y + ch_idx * 20
                        bar_rect = pygame.Rect(60, bar_y, 300, 14)
                        if bar_rect.collidepoint(mx, my):
                            color_list[ch_idx] = int((mx - 60) / 300 * 255)
                            dragging_slider = (ch_idx, tag)

                # Check apply button
                apply_rect = pygame.Rect(W//2 - 160, H - 60, 140, 32)
                if apply_rect.collidepoint(mx, my):
                    result = Palette(tuple(custom_bg), tuple(custom_fg), "Custom")
                    running = False

                # Check save button
                save_rect = pygame.Rect(W//2 + 10, H - 60, 140, 32)
                if save_rect.collidepoint(mx, my):
                    p = Palette(tuple(custom_bg), tuple(custom_fg), "Custom")
                    os.makedirs("assets/palettes", exist_ok=True)
                    p.save("assets/palettes/custom.json")

            elif event.type == pygame.MOUSEBUTTONUP:
                dragging_slider = ()

            elif event.type == pygame.MOUSEMOTION and dragging_slider:
                ch_idx, tag = dragging_slider
                color_list = custom_bg if tag == "bg" else custom_fg
                color_list[ch_idx] = max(0, min(255, int((event.pos[0] - 60) / 300 * 255)))

        clock.tick(30)

    pygame.quit()
    return result


if __name__ == "__main__":
    chosen = run()
    print(f"Selected palette: {chosen}")
