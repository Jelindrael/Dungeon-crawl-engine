#!/usr/bin/env python3
"""
The Blackwood Manor Affair
==========================

Demo game for the Dungeon Crawl Engine (Call of Cthulhu 7e).

Run with:
    python -m games.demo.run
    # or from project root:
    python games/demo/run.py
    # or through the launcher:
    python main.py play
"""
from __future__ import annotations
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

import pygame

from engine.palette import PRESETS, Palette
from engine.coc import build_premade, Investigator
from engine.game_state import GameState, Mode
from engine.renderer import GameRenderer
from games.demo.content import register_all


# ---------------------------------------------------------------------------
# Character selection screen
# ---------------------------------------------------------------------------

_PREMADES = [
    ("doctor",     "Dr. Alice Hayes",    "Medicine 70, First Aid 60, Psychology 60"),
    ("professor",  "Prof. Harold Webb",  "Library Use 75, Occult 50, History 65"),
    ("reporter",   "Rita Caldwell",      "Persuade 65, Spot Hidden 60, Fast Talk 55"),
    ("detective",  "Jack Malone",        "Spot Hidden 65, Track 50, Fighting 55"),
]


def _character_select(palette: Palette) -> Investigator:
    """Fullscreen character selection before the game starts."""
    pygame.init()
    W, H = 1280, 720
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("The Blackwood Manor Affair -- Choose Investigator")
    clock  = pygame.time.Clock()

    fg, bg = palette.fg, palette.bg
    font_xl = pygame.font.SysFont("monospace", 28, bold=True)
    font_lg = pygame.font.SysFont("monospace", 16, bold=True)
    font_md = pygame.font.SysFont("monospace", 13)
    font_sm = pygame.font.SysFont("monospace", 11)

    # Scanline surface
    scanlines = pygame.Surface((W, H), pygame.SRCALPHA)
    for y in range(0, H, 2):
        pygame.draw.line(scanlines, (0, 0, 0, 45), (0, y), (W, y))

    investigators = [build_premade(key) for key, *_ in _PREMADES]
    selected = 0

    CARD_W   = 240
    CARD_H   = 340
    CARD_GAP = 28
    total_w  = len(_PREMADES) * CARD_W + (len(_PREMADES) - 1) * CARD_GAP
    start_x  = (W - total_w) // 2

    while True:
        screen.fill(bg)

        # Title
        title = font_xl.render("THE BLACKWOOD MANOR AFFAIR", False, fg)
        screen.blit(title, (W // 2 - title.get_width() // 2, 40))
        sub = font_md.render(
            "Choose Your Investigator  |  Arkham, Massachusetts -- October 1926",
            False, palette.blend(0.5))
        screen.blit(sub, (W // 2 - sub.get_width() // 2, 80))
        pygame.draw.line(screen, palette.blend(0.3), (60, 108), (W - 60, 108))

        for i, (key, display_name, skills_hint) in enumerate(_PREMADES):
            inv = investigators[i]
            is_sel = (i == selected)
            cx = start_x + i * (CARD_W + CARD_GAP)
            cy = 130

            card = pygame.Rect(cx, cy, CARD_W, CARD_H)
            card_bg = tuple(c // 5 for c in fg) if is_sel else tuple(c // 10 for c in fg)
            pygame.draw.rect(screen, card_bg, card, border_radius=6)
            border_col = fg if is_sel else palette.blend(0.35)
            pygame.draw.rect(screen, border_col, card, border_radius=6,
                             width=2 if is_sel else 1)

            # Portrait placeholder
            portrait_r = pygame.Rect(cx + 12, cy + 12, CARD_W - 24, 100)
            pygame.draw.rect(screen, tuple(c // 8 for c in fg), portrait_r,
                             border_radius=3)
            pygame.draw.rect(screen, palette.blend(0.3), portrait_r,
                             border_radius=3, width=1)
            pname = font_md.render(key.upper(), False, palette.blend(0.6))
            screen.blit(pname, (portrait_r.centerx - pname.get_width() // 2,
                                portrait_r.centery - pname.get_height() // 2))

            # Name
            stat_y = cy + 124
            name_surf = font_lg.render(display_name, False,
                                       fg if is_sel else palette.blend(0.7))
            if name_surf.get_width() <= CARD_W - 16:
                screen.blit(name_surf, (cx + 8, stat_y)); stat_y += 20
            else:
                parts = display_name.split()
                mid = len(parts) // 2
                s1 = font_lg.render(" ".join(parts[:mid]), False,
                                    fg if is_sel else palette.blend(0.7))
                s2 = font_lg.render(" ".join(parts[mid:]), False,
                                    fg if is_sel else palette.blend(0.7))
                screen.blit(s1, (cx + 8, stat_y)); stat_y += 18
                screen.blit(s2, (cx + 8, stat_y)); stat_y += 18

            # Occupation
            screen.blit(font_sm.render(key.capitalize(), False, palette.blend(0.5)),
                        (cx + 8, stat_y)); stat_y += 18

            # Characteristics
            chars = inv.characteristics
            for line in [
                f"STR {chars.get('STR',10):3d}  CON {chars.get('CON',10):3d}",
                f"SIZ {chars.get('SIZ',10):3d}  DEX {chars.get('DEX',10):3d}",
                f"INT {chars.get('INT',10):3d}  POW {chars.get('POW',10):3d}",
                f"EDU {chars.get('EDU',10):3d}  APP {chars.get('APP',10):3d}",
                f"HP {inv.max_hp:3d}   SAN {inv.max_san:3d}",
            ]:
                screen.blit(font_sm.render(line, False, palette.blend(0.65)),
                            (cx + 8, stat_y)); stat_y += 14

            # Skill highlights
            stat_y += 4
            pygame.draw.line(screen, palette.blend(0.25),
                             (cx + 8, stat_y), (cx + CARD_W - 8, stat_y))
            stat_y += 6
            for chunk in [skills_hint[j:j+28] for j in range(0, len(skills_hint), 28)]:
                screen.blit(font_sm.render(chunk, False, palette.blend(0.45)),
                            (cx + 8, stat_y)); stat_y += 13

        # Bottom hint
        hint = font_md.render(
            "Left/Right or mouse to select  |  Enter or click to confirm",
            False, palette.blend(0.4))
        screen.blit(hint, (W // 2 - hint.get_width() // 2, H - 40))

        screen.blit(scanlines, (0, 0))
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_LEFT, pygame.K_a):
                    selected = (selected - 1) % len(_PREMADES)
                elif event.key in (pygame.K_RIGHT, pygame.K_d):
                    selected = (selected + 1) % len(_PREMADES)
                elif event.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE):
                    pygame.quit()
                    return investigators[selected]
                elif event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
            elif event.type == pygame.MOUSEMOTION:
                mx, my = event.pos
                for i in range(len(_PREMADES)):
                    cx = start_x + i * (CARD_W + CARD_GAP)
                    if pygame.Rect(cx, 130, CARD_W, CARD_H).collidepoint(mx, my):
                        selected = i
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                for i in range(len(_PREMADES)):
                    cx = start_x + i * (CARD_W + CARD_GAP)
                    if pygame.Rect(cx, 130, CARD_W, CARD_H).collidepoint(mx, my):
                        if i == selected:
                            pygame.quit()
                            return investigators[i]
                        selected = i

        clock.tick(30)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run(palette: "Palette | None" = None) -> None:
    palette = palette or PRESETS["phosphor_green"]

    # Register all game content (scenes, dialogues)
    manor_map = register_all()

    # Character selection
    investigator = _character_select(palette)

    # Build game state
    state = GameState(investigator=investigator, start_scene="intro")
    state.current_map = manor_map
    px, py = manor_map.player_start()
    state.player_x, state.player_y = px, py
    manor_map.reveal_radius(px, py, radius=5)

    # Enter starting scene
    state.enter_scene("intro")

    # Create renderer and run
    pygame.init()
    renderer = GameRenderer(
        game_state=state,
        palette=palette,
        game_title="THE BLACKWOOD MANOR AFFAIR",
        scanlines=True,
    )
    renderer.run(fps=30)


if __name__ == "__main__":
    run()
