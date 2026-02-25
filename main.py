"""
Dungeon Crawl Engine – Main Launcher

Two-color pixel dungeon crawl engine with Call of Cthulhu 7e rules.

Usage:
    python main.py              # Show main menu
    python main.py play         # Start / continue game
    python main.py map          # Open map editor
    python main.py sprite       # Open sprite/pixel art editor
    python main.py dialogue     # Open dialogue editor
    python main.py palette      # Open palette chooser
"""
from __future__ import annotations
import os
import sys
import argparse

os.environ.setdefault("SDL_VIDEO_CENTERED", "1")

import pygame

from engine.palette import PRESETS, Palette

# ---------------------------------------------------------------------------
# Launcher window
# ---------------------------------------------------------------------------
W, H = 640, 480


def _run_launcher(palette: Palette) -> str:
    """Show the main launcher menu and return the chosen action string."""
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Dungeon Crawl Engine")
    clock  = pygame.time.Clock()

    fg, bg = palette.fg, palette.bg
    font_xl  = pygame.font.SysFont("monospace", 32, bold=True)
    font_lg  = pygame.font.SysFont("monospace", 18, bold=True)
    font_md  = pygame.font.SysFont("monospace", 14)
    font_sm  = pygame.font.SysFont("monospace", 11)

    MENU_ITEMS = [
        ("Play Demo",           "play"),
        ("Map Editor",          "map"),
        ("Sprite / Art Editor", "sprite"),
        ("Dialogue Editor",     "dialogue"),
        ("Palette Chooser",     "palette"),
        ("Quit",                "quit"),
    ]

    selected = 0
    action   = None

    # Simple scanline surface
    scanlines = pygame.Surface((W, H), pygame.SRCALPHA)
    for y in range(0, H, 2):
        pygame.draw.line(scanlines, (0, 0, 0, 40), (0, y), (W, y))

    while action is None:
        screen.fill(bg)

        # Title
        title = font_xl.render("DUNGEON CRAWL ENGINE", False, fg)
        screen.blit(title, (W // 2 - title.get_width() // 2, 60))

        sub = font_md.render("Call of Cthulhu 7e  ·  Two-Color Pixel Art", False,
                             palette.blend(0.55))
        screen.blit(sub, (W // 2 - sub.get_width() // 2, 102))

        # Decorative separator line
        sep_y = 125
        pygame.draw.line(screen, palette.blend(0.3), (60, sep_y), (W - 60, sep_y), 1)

        # Menu items
        item_x = W // 2
        item_y_start = 160
        item_gap     = 46

        for i, (label, _action) in enumerate(MENU_ITEMS):
            y_pos = item_y_start + i * item_gap
            is_sel = (i == selected)

            # Highlight box
            if is_sel:
                box = pygame.Rect(item_x - 160, y_pos - 6, 320, 36)
                pygame.draw.rect(screen, tuple(c // 5 for c in fg), box, border_radius=4)
                pygame.draw.rect(screen, fg, box, border_radius=4, width=1)

            color  = bg if is_sel else palette.blend(0.8)
            lsurf  = font_lg.render(label, False, color)
            screen.blit(lsurf, (item_x - lsurf.get_width() // 2, y_pos))

        # Footer hints
        screen.blit(font_sm.render("↑↓ / mouse  ·  Enter / click to select  ·  Esc to quit",
                                   False, palette.blend(0.35)),
                    (W // 2 - 210, H - 28))

        # Scanlines
        screen.blit(scanlines, (0, 0))
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                action = "quit"

            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_UP, pygame.K_w):
                    selected = (selected - 1) % len(MENU_ITEMS)
                elif event.key in (pygame.K_DOWN, pygame.K_s):
                    selected = (selected + 1) % len(MENU_ITEMS)
                elif event.key in (pygame.K_RETURN, pygame.K_SPACE, pygame.K_KP_ENTER):
                    action = MENU_ITEMS[selected][1]
                elif event.key == pygame.K_ESCAPE:
                    action = "quit"

            elif event.type == pygame.MOUSEMOTION:
                mx, my = event.pos
                for i in range(len(MENU_ITEMS)):
                    y_pos = item_y_start + i * item_gap
                    box = pygame.Rect(item_x - 160, y_pos - 6, 320, 36)
                    if box.collidepoint(mx, my):
                        selected = i
                        break

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                for i, (_, _action) in enumerate(MENU_ITEMS):
                    y_pos = item_y_start + i * item_gap
                    box = pygame.Rect(item_x - 160, y_pos - 6, 320, 36)
                    if box.collidepoint(mx, my):
                        action = _action
                        break

        clock.tick(30)

    pygame.quit()
    return action


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Dungeon Crawl Engine")
    parser.add_argument(
        "mode",
        nargs="?",
        choices=["play", "map", "sprite", "dialogue", "palette"],
        help="Launch directly into a specific mode",
    )
    args = parser.parse_args()

    palette = PRESETS["phosphor_green"]

    if args.mode:
        _dispatch(args.mode, palette)
        return

    # Interactive launcher loop
    while True:
        action = _run_launcher(palette)
        if action == "quit":
            break
        elif action == "palette":
            result = _dispatch(action, palette)
            if result is not None:
                palette = result
        else:
            _dispatch(action, palette)


def _dispatch(action: str, palette: Palette):
    if action == "play":
        from games.demo.run import run as play_game
        play_game(palette=palette)

    elif action == "map":
        from editor.map_editor import run as map_editor
        map_editor(palette=palette)

    elif action == "sprite":
        from editor.sprite_editor import run as sprite_editor
        sprite_editor(palette=palette)

    elif action == "dialogue":
        from editor.dialogue_editor import run as dialogue_editor
        dialogue_editor(palette=palette)

    elif action == "palette":
        from editor.palette_chooser import run as palette_chooser
        result = palette_chooser()
        return result

    return None


if __name__ == "__main__":
    main()
