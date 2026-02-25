"""
Main pygame game renderer.

Implements the Cyclopean-style two-panel layout:
  ┌── BANNER (title + game name) ───────────────────────────────────────┐
  │ LEFT PANEL    │        VIEWPORT (map or illustration)  │ RIGHT PANEL │
  │ location      │                                        │ menu buttons│
  │ mini-map      │                                        │             │
  │ keys/items    ├────────────────────────────────────────┤ dpad        │
  │ stats         │        TEXT LOG                        │             │
  └───────────────┴────────────────────────────────────────┴─────────────┘
"""
from __future__ import annotations
import os
import sys
import textwrap
from typing import Any, Callable, Dict, List, Optional, Tuple

import pygame
import pygame.gfxdraw

from .palette import Palette, PRESETS, DEFAULT
from .game_state import GameState, Mode
from .scene import SceneRegistry
from .dialogue import DialogueRegistry
from .sprite import SpriteRegistry, Sprite
from .tilemap import TileMap, TILE_DEFS
from .ui.layout import (
    W, H, BANNER, LEFT, VIEWPORT, LOG, RIGHT,
    LEFT_LOCATION_Y, LEFT_LOCATION_H, LEFT_MINIMAP_Y, LEFT_MINIMAP_H,
    LEFT_KEYS_Y, LEFT_KEYS_H, LEFT_STATUS_Y,
    MINIMAP_RECT, TILE_SIZE, TILES_W, TILES_H,
    FONT_SM, FONT_MD, FONT_LG, FONT_XL, FONT_XXL, PAD,
    BTN_W, BTN_H, BTN_GAP, DPAD_BTN, DPAD_GAP,
    RIGHT_BUTTONS_TOP, RIGHT_DPAD_TOP,
)
from .ui.font import render_text, render_wrapped, text_height, text_width, get_font
from .ui.components import (
    Button, DPad, draw_border, draw_filled, draw_h_line, draw_v_line,
    draw_decorative_border, draw_scanlines, draw_hp_bar,
)


# ---------------------------------------------------------------------------
# Tile drawing helpers
# ---------------------------------------------------------------------------

def _draw_tile(surface: pygame.Surface, tile_id: int, x: int, y: int,
               size: int, palette: Palette, revealed: bool = True) -> None:
    """Draw a single tile as a colored rectangle with a glyph."""
    rect = pygame.Rect(x, y, size, size)
    td = TILE_DEFS.get(tile_id, {})
    art = td.get("art", "FLOOR")
    fg, bg, dim = palette.fg, palette.bg, palette.dim

    if not revealed:
        draw_filled(surface, rect, bg)
        return

    if art == "WALL":
        draw_filled(surface, rect, dim)
        pygame.draw.rect(surface, bg, rect.inflate(-4, -4))
    elif art == "FLOOR":
        draw_filled(surface, rect, bg)
        # corner dots
        dot_color = palette.blend(0.15)
        for dx, dy in [(2,2),(size-3,2),(2,size-3),(size-3,size-3)]:
            surface.set_at((x+dx, y+dy), dot_color)
    elif art == "DOOR":
        draw_filled(surface, rect, bg)
        mid_y = y + size // 2
        pygame.draw.line(surface, fg, (x, mid_y), (x + size, mid_y), 2)
        pygame.draw.line(surface, fg, (x + size//2, y), (x + size//2, y + size), 2)
    elif art == "STAIRS":
        draw_filled(surface, rect, bg)
        glyph = td.get("glyph", ">")
        font = get_font(size - 4)
        s = font.render(glyph, False, fg)
        surface.blit(s, (x + (size - s.get_width())//2, y + (size - s.get_height())//2))
    elif art == "WATER":
        for yy in range(y, y + size):
            for xx in range(x, x + size):
                surface.set_at((xx, yy), fg if (xx + yy) % 3 == 0 else bg)
    elif art == "SPECIAL":
        draw_filled(surface, rect, bg)
        glyph = td.get("glyph", "&")
        font = get_font(size - 2, bold=True)
        s = font.render(glyph, False, fg)
        surface.blit(s, (x + (size - s.get_width())//2, y + (size - s.get_height())//2))
    elif art == "CHEST":
        draw_filled(surface, rect, bg)
        cr = rect.inflate(-6, -4)
        draw_border(surface, cr, fg)
        pygame.draw.line(surface, fg, (cr.left, cr.centery), (cr.right, cr.centery))
    elif art == "VOID":
        draw_filled(surface, rect, bg)
    else:
        draw_filled(surface, rect, bg)


# ---------------------------------------------------------------------------
# Game Renderer
# ---------------------------------------------------------------------------

class GameRenderer:
    """
    Owns the pygame window and draws all game panels each frame.
    """

    MENU_BUTTONS = [
        ("Main Menu",  "M"),
        ("Character",  "C"),
        ("Inventory",  "I"),
        ("Map",        "X"),
        ("Skills",     "K"),
        ("Clues",      "U"),
        ("Options",    "O"),
    ]

    def __init__(
        self,
        game_state: GameState,
        palette: Optional[Palette] = None,
        game_title: str = "DUNGEON CRAWL",
        scanlines: bool = True,
    ) -> None:
        self.game_state  = game_state
        self.palette     = palette or PRESETS[DEFAULT]
        self.game_title  = game_title
        self.scanlines   = scanlines

        # Pending overlay mode
        self._overlay: Optional[str] = None   # "character", "inventory", "skills", "map"

        # Menu button objects
        self._menu_buttons: List[Button] = []
        self._dpad: Optional[DPad] = None

        # Sub-screen open/close callback (set externally)
        self.on_menu_action: Optional[Callable[[str], None]] = None

        # Animation tick
        self._tick = 0

        # Pending illustration id
        self._current_art: Optional[str] = None

    # -----------------------------------------------------------------------
    # Pygame init
    # -----------------------------------------------------------------------

    def init(self) -> None:
        pygame.init()
        pygame.display.set_caption(self.game_title)
        self.screen = pygame.display.set_mode((W, H))
        self._build_buttons()

    def _build_buttons(self) -> None:
        p = self.palette
        x = RIGHT.left + 8
        y = RIGHT_BUTTONS_TOP
        for label, key in self.MENU_BUTTONS:
            rect = pygame.Rect(x, y, BTN_W, BTN_H)

            def _make_cb(k=key, l=label):
                def cb():
                    if self.on_menu_action:
                        self.on_menu_action(l)
                return cb

            btn = Button(rect, label, on_click=_make_cb(), key=key, palette=p)
            self._menu_buttons.append(btn)
            y += BTN_H + BTN_GAP

        cx = RIGHT.centerx
        cy = RIGHT_DPAD_TOP + 80
        self._dpad = DPad(
            center_x=cx, center_y=cy,
            btn_size=DPAD_BTN, gap=DPAD_GAP,
            on_move=self._on_dpad_move,
            on_action=self._on_dpad_action,
        )

    def _on_dpad_move(self, dx: int, dy: int) -> None:
        gs = self.game_state
        if gs.mode == Mode.MAP:
            gs.move_player(dx, dy)
        elif gs.mode == Mode.SCENE:
            # Navigate choice list
            if dy == -1:
                self._choice_cursor = max(0, self._choice_cursor - 1)
            elif dy == 1:
                choices = self._current_choices()
                self._choice_cursor = min(len(choices) - 1, self._choice_cursor + 1)

    def _on_dpad_action(self) -> None:
        if self.game_state.mode == Mode.SCENE:
            c = self._current_choices()
            if 0 <= self._choice_cursor < len(c):
                self.game_state.process_choice(c[self._choice_cursor].key)
        elif self.game_state.mode == Mode.MAP:
            # Interact with entity in front of player
            pass

    def _current_choices(self):
        scene = self.game_state.current_scene()
        if scene:
            return scene.numbered_choices(self.game_state.investigator)
        return []

    # -----------------------------------------------------------------------
    # Main render entry
    # -----------------------------------------------------------------------

    def render_frame(self) -> None:
        self._tick += 1
        p = self.palette
        self.screen.fill(p.bg)

        self._draw_banner()
        self._draw_left_panel()
        self._draw_viewport()
        self._draw_log()
        self._draw_right_panel()
        self._draw_panel_borders()

        if self.scanlines:
            draw_scanlines(self.screen, alpha=35)

        if self._overlay:
            self._draw_overlay(self._overlay)

        pygame.display.flip()

    # -----------------------------------------------------------------------
    # Banner
    # -----------------------------------------------------------------------

    def _draw_banner(self) -> None:
        p = self.palette
        draw_filled(self.screen, BANNER, p.bg)

        # Dither strips left and right of title
        strip_w = 300
        for x in range(BANNER.left, BANNER.left + strip_w):
            for y in range(BANNER.top, BANNER.bottom):
                if (x + y) % 2 == 0:
                    self.screen.set_at((x, y), p.blend(0.12))
        for x in range(BANNER.right - strip_w, BANNER.right):
            for y in range(BANNER.top, BANNER.bottom):
                if (x + y) % 2 == 0:
                    self.screen.set_at((x, y), p.blend(0.12))

        # Horizontal lines top and bottom
        draw_h_line(self.screen, BANNER.left, BANNER.right, BANNER.top, p.dim)
        draw_h_line(self.screen, BANNER.left, BANNER.right, BANNER.bottom - 1, p.fg)

        # Game title
        font_title = get_font(FONT_XXL, bold=True)
        title_surf = font_title.render(self.game_title, False, p.fg)
        tx = BANNER.centerx - title_surf.get_width() // 2
        ty = BANNER.centery - title_surf.get_height() // 2
        self.screen.blit(title_surf, (tx, ty))

        # Decorative side text
        font_sm = get_font(FONT_SM)
        inv = self.game_state.investigator
        left_tag = font_sm.render(f" {inv.name} ", False, p.dim)
        right_tag = font_sm.render(f" {inv.occupation} ", False, p.dim)
        self.screen.blit(left_tag, (BANNER.left + strip_w // 2 - left_tag.get_width() // 2,
                                     BANNER.centery - left_tag.get_height() // 2))
        self.screen.blit(right_tag, (BANNER.right - strip_w // 2 - right_tag.get_width() // 2,
                                      BANNER.centery - right_tag.get_height() // 2))

    # -----------------------------------------------------------------------
    # Left panel
    # -----------------------------------------------------------------------

    def _draw_left_panel(self) -> None:
        p    = self.palette
        surf = self.screen
        inv  = self.game_state.investigator

        # Background
        draw_filled(surf, LEFT, p.bg)

        y = LEFT_LOCATION_Y
        x = LEFT.left + PAD

        # --- Location ---
        render_text(surf, "LOCATION", x, y, p.fg, FONT_SM, bold=True)
        y += text_height(FONT_SM) + 2

        scene = self.game_state.current_scene()
        location_name = scene.title if scene else "Unknown"
        if self.game_state.mode == Mode.MAP and self.game_state.current_map:
            location_name = self.game_state.current_map.name

        font_loc = get_font(FONT_SM)
        for line in textwrap.wrap(location_name, 22) or ["---"]:
            surf.blit(font_loc.render(line, False, p.fg), (x, y))
            y += text_height(FONT_SM) + 1

        # Floor indicator
        floor_s = font_loc.render("Floor: 1", False, p.dim)
        surf.blit(floor_s, (x, y))
        y += text_height(FONT_SM) + 4

        draw_h_line(surf, LEFT.left + 2, LEFT.right - 2, y, p.dim)
        y += 4

        # --- Mini-map ---
        render_text(surf, "MAP", x, y, p.fg, FONT_SM, bold=True)
        y += text_height(FONT_SM) + 2

        mini_rect = pygame.Rect(LEFT.left + 4, y, LEFT.width - 8, LEFT_MINIMAP_H)
        self._draw_minimap(mini_rect)
        y += LEFT_MINIMAP_H + 4

        draw_h_line(surf, LEFT.left + 2, LEFT.right - 2, y, p.dim)
        y += 4

        # --- Items (key inventory) ---
        render_text(surf, "ITEMS", x, y, p.fg, FONT_SM, bold=True)
        y += text_height(FONT_SM) + 2

        if inv.inventory:
            shown = inv.inventory[:6]
            for item in shown:
                name = item["name"][:20] if isinstance(item, dict) else str(item)[:20]
                surf.blit(font_loc.render(f"· {name}", False, p.fg), (x, y))
                y += text_height(FONT_SM) + 1
        else:
            surf.blit(font_loc.render("(empty)", False, p.dim), (x, y))
            y += text_height(FONT_SM) + 1

        draw_h_line(surf, LEFT.left + 2, LEFT.right - 2, y + 4, p.dim)
        y += 8

        # --- Status ---
        render_text(surf, "STATUS", x, y, p.fg, FONT_SM, bold=True)
        y += text_height(FONT_SM) + 4

        # HP bar
        bar_w = LEFT.width - 16
        self._draw_stat_bar(surf, x, y, bar_w, "HP",
                            inv.current_hp, inv.max_hp, p)
        y += 20

        # SAN bar
        self._draw_stat_bar(surf, x, y, bar_w, "SAN",
                            inv.current_san, inv.max_san, p)
        y += 20

        # MP bar
        self._draw_stat_bar(surf, x, y, bar_w, "MP",
                            inv.current_mp, inv.max_mp, p)
        y += 24

        # Cash
        cash_s = font_loc.render(f"$  {inv.cash}", False, p.fg)
        surf.blit(cash_s, (x, y))
        y += text_height(FONT_SM) + 4

        # Characteristics compact
        chars = inv.characteristics
        for row_attrs in [["STR","CON","SIZ","DEX"],["APP","INT","POW","EDU"]]:
            parts = "  ".join(f"{a}:{chars.get(a,0)//10}" for a in row_attrs)
            s = font_loc.render(parts, False, p.dim)
            surf.blit(s, (x, y))
            y += text_height(FONT_SM) + 2

    def _draw_stat_bar(
        self, surf: pygame.Surface, x: int, y: int, width: int,
        label: str, current: int, maximum: int, p: Palette
    ) -> None:
        bar_w = width - 40
        font  = get_font(FONT_SM)
        lbl   = font.render(f"{label}", False, p.dim)
        surf.blit(lbl, (x, y + 2))
        bx = x + 30
        ratio  = current / max(maximum, 1)
        filled = int(bar_w * ratio)
        pygame.draw.rect(surf, p.dim, pygame.Rect(bx, y, bar_w, 12), 1)
        if filled > 2:
            bar_color = p.fg if ratio > 0.5 else p.blend(0.5)
            pygame.draw.rect(surf, bar_color, pygame.Rect(bx + 1, y + 1, filled - 2, 10))
        val_s = font.render(f"{current}/{maximum}", False, p.fg)
        surf.blit(val_s, (bx + bar_w + 2, y + 1))

    def _draw_minimap(self, rect: pygame.Rect) -> None:
        p  = self.palette
        gs = self.game_state
        draw_filled(self.screen, rect, p.bg)
        draw_border(self.screen, rect, p.dim)

        tm = gs.current_map
        if tm is None:
            font = get_font(FONT_SM)
            s = font.render("no map", False, p.dim)
            self.screen.blit(s, (rect.centerx - s.get_width()//2,
                                  rect.centery - s.get_height()//2))
            return

        # Scale tile to fit minimap
        scale = min(rect.width / tm.width, rect.height / tm.height)
        ts = max(1, int(scale))
        ox = rect.left + (rect.width  - tm.width  * ts) // 2
        oy = rect.top  + (rect.height - tm.height * ts) // 2

        for y in range(tm.height):
            for x in range(tm.width):
                if not tm.is_revealed(x, y):
                    color = p.bg
                elif tm.tiles[y][x] == 1:   # wall
                    color = p.dim
                else:
                    color = p.blend(0.25)
                px, py = ox + x * ts, oy + y * ts
                pygame.draw.rect(self.screen, color, pygame.Rect(px, py, ts, ts))

        # Player dot
        if ts >= 2:
            px = ox + gs.player_x * ts
            py = oy + gs.player_y * ts
            pygame.draw.rect(self.screen, p.fg, pygame.Rect(px, py, ts, ts))

    # -----------------------------------------------------------------------
    # Viewport
    # -----------------------------------------------------------------------

    def _draw_viewport(self) -> None:
        p  = self.palette
        gs = self.game_state
        draw_filled(self.screen, VIEWPORT, p.bg)

        if gs.mode == Mode.MAP and gs.current_map:
            self._draw_tilemap(gs.current_map)
        elif gs.mode in (Mode.SCENE, Mode.DIALOGUE, Mode.COMBAT):
            self._draw_scene_view()
        elif gs.mode in (Mode.GAME_OVER, Mode.VICTORY):
            self._draw_end_screen()

    def _draw_tilemap(self, tm: TileMap) -> None:
        gs = self.game_state
        p  = self.palette

        # Camera: center on player
        half_w = TILES_W // 2
        half_h = TILES_H // 2
        cam_x = max(0, min(gs.player_x - half_w, tm.width  - TILES_W))
        cam_y = max(0, min(gs.player_y - half_h, tm.height - TILES_H))

        for ty in range(TILES_H):
            for tx in range(TILES_W):
                mx, my = cam_x + tx, cam_y + ty
                px = VIEWPORT.left + tx * TILE_SIZE
                py = VIEWPORT.top  + ty * TILE_SIZE
                revealed = tm.is_revealed(mx, my)
                tile_id  = tm.get(mx, my)
                _draw_tile(self.screen, tile_id, px, py, TILE_SIZE, p, revealed)

        # Draw entities
        for entity in tm.entities:
            ex = entity.x - cam_x
            ey = entity.y - cam_y
            if 0 <= ex < TILES_W and 0 <= ey < TILES_H:
                if tm.is_revealed(entity.x, entity.y):
                    px = VIEWPORT.left + ex * TILE_SIZE
                    py = VIEWPORT.top  + ey * TILE_SIZE
                    glyph = {"npc": "☺", "item": "!", "trigger": "?"}.get(entity.entity_type, "?")
                    font  = get_font(TILE_SIZE - 4, bold=True)
                    s = font.render(glyph, False, p.fg)
                    self.screen.blit(s, (px + (TILE_SIZE - s.get_width())//2,
                                         py + (TILE_SIZE - s.get_height())//2))

        # Draw player
        ppx = VIEWPORT.left + (gs.player_x - cam_x) * TILE_SIZE
        ppy = VIEWPORT.top  + (gs.player_y - cam_y) * TILE_SIZE
        # Player sprite
        font = get_font(TILE_SIZE - 2, bold=True)
        at_surf = font.render("@", False, p.fg)
        self.screen.blit(at_surf, (ppx + (TILE_SIZE - at_surf.get_width())//2,
                                    ppy + (TILE_SIZE - at_surf.get_height())//2))

    def _draw_scene_view(self) -> None:
        p  = self.palette
        gs = self.game_state

        # Try to render an illustration
        art_id = getattr(gs, "_pending_art", None)
        if gs.mode == Mode.SCENE:
            scene = gs.current_scene()
            if scene and scene.illustration:
                art_id = scene.illustration

        if art_id:
            sprite = SpriteRegistry.get(art_id)
            if sprite:
                self._draw_illustration(sprite)
                return

        # Fallback: ASCII art room sketch
        self._draw_scene_art_fallback()

    def _draw_illustration(self, sprite: Sprite) -> None:
        """Render a 2-color bit-array illustration in the viewport."""
        p    = self.palette
        frame = sprite.get_frame(self._tick // 8)
        scale = sprite.pixel_scale or 4
        sw   = sprite.width  * scale
        sh   = sprite.height * scale
        ox   = VIEWPORT.left + (VIEWPORT.width  - sw) // 2
        oy   = VIEWPORT.top  + (VIEWPORT.height - sh) // 2

        for fy in range(frame.height):
            for fx in range(frame.width):
                bit   = frame.get_pixel(fx, fy)
                color = p.fg if bit else p.bg
                px, py = ox + fx * scale, oy + fy * scale
                pygame.draw.rect(self.screen, color,
                                 pygame.Rect(px, py, scale, scale))

    def _draw_scene_art_fallback(self) -> None:
        """Draw a simple decorative placeholder when no art is set."""
        p = self.palette
        vr = VIEWPORT
        # Subtle dithered background
        for y in range(vr.top, vr.bottom, 2):
            for x in range(vr.left, vr.right):
                if (x + y // 2) % 8 == 0:
                    self.screen.set_at((x, y), p.blend(0.08))

        # Scene description text in the viewport
        gs = self.game_state
        if gs.mode == Mode.SCENE:
            scene = gs.current_scene()
            if scene:
                font_title = get_font(FONT_LG, bold=True)
                title_s = font_title.render(scene.title.upper(), False, p.fg)
                tx = vr.left + (vr.width - title_s.get_width()) // 2
                self.screen.blit(title_s, (tx, vr.top + PAD * 2))

                desc_y = vr.top + PAD * 2 + text_height(FONT_LG) + PAD * 2
                render_wrapped(self.screen, scene.get_description(gs.investigator),
                                vr.left + PAD * 2, desc_y, p.fg,
                                vr.width - PAD * 4, FONT_MD)

        elif gs.mode == Mode.DIALOGUE and gs.current_node:
            node = gs.current_node
            font_sp = get_font(FONT_SM, bold=True)
            sp_surf = font_sp.render(f"[ {node.speaker.upper()} ]", False, p.fg)
            self.screen.blit(sp_surf, (vr.left + PAD * 2, vr.top + PAD * 2))
            render_wrapped(self.screen, node.text,
                           vr.left + PAD * 2,
                           vr.top + PAD * 2 + text_height(FONT_SM) + PAD * 2,
                           p.fg, vr.width - PAD * 4, FONT_MD)

        elif gs.mode == Mode.COMBAT:
            self._draw_combat_view()

    def _draw_combat_view(self) -> None:
        p = self.palette
        vr = VIEWPORT
        font_h = get_font(FONT_LG, bold=True)
        title = font_h.render("⚔  COMBAT  ⚔", False, p.fg)
        self.screen.blit(title, (vr.centerx - title.get_width()//2, vr.top + PAD * 2))

        y = vr.top + PAD * 2 + text_height(FONT_LG) + PAD * 2
        font = get_font(FONT_MD)
        for enemy in self.game_state.combat_enemies:
            ratio = enemy.hp / max(enemy.max_hp, 1)
            bar_w = 200
            filled = int(bar_w * ratio)
            draw_s = font.render(f"{enemy.name}", False, p.fg)
            self.screen.blit(draw_s, (vr.left + PAD * 2, y))
            by = y + text_height(FONT_MD)
            pygame.draw.rect(self.screen, p.dim, pygame.Rect(vr.left + PAD * 2, by, bar_w, 10), 1)
            if filled > 2:
                pygame.draw.rect(self.screen, p.fg,
                                 pygame.Rect(vr.left + PAD * 2 + 1, by + 1, filled - 2, 8))
            hp_s = font.render(f"{enemy.hp}/{enemy.max_hp}", False, p.dim)
            self.screen.blit(hp_s, (vr.left + PAD * 2 + bar_w + 4, by))
            y += text_height(FONT_MD) + 14 + PAD

    def _draw_end_screen(self) -> None:
        p  = self.palette
        gs = self.game_state
        vr = VIEWPORT
        msg = "GAME OVER"
        color = p.fg
        if gs.mode == Mode.VICTORY:
            msg = "VICTORY"

        font_big = get_font(FONT_XXL, bold=True)
        s = font_big.render(msg, False, color)
        self.screen.blit(s, (vr.centerx - s.get_width()//2, vr.centery - s.get_height()//2))

    # -----------------------------------------------------------------------
    # Text log
    # -----------------------------------------------------------------------

    def _draw_log(self) -> None:
        p    = self.palette
        gs   = self.game_state
        draw_filled(self.screen, LOG, p.bg)

        font   = get_font(FONT_MD)
        line_h = font.get_height() + 2
        max_lines = (LOG.height - PAD * 2) // line_h

        # In scene mode show choices; in dialogue show choices; otherwise show combat options
        choice_lines = self._build_choice_lines(gs)

        # Recent log messages
        avail_msg_lines = max_lines - len(choice_lines) - (1 if choice_lines else 0)
        msg_lines = self._wrap_log_messages(avail_msg_lines)

        y = LOG.top + PAD
        for line, bright in msg_lines:
            color = p.fg if bright else p.dim
            s = font.render(line, False, color)
            self.screen.blit(s, (LOG.left + PAD, y))
            y += line_h

        if choice_lines:
            draw_h_line(self.screen, LOG.left + PAD, LOG.right - PAD, y, p.dim)
            y += 3
            for line, bright in choice_lines:
                color = p.fg if bright else p.dim
                s = font.render(line, False, color)
                self.screen.blit(s, (LOG.left + PAD, y))
                y += line_h

    def _wrap_log_messages(self, max_lines: int) -> List[Tuple[str, bool]]:
        """Return up to max_lines of recent messages, word-wrapped."""
        font   = get_font(FONT_MD)
        char_w = font.size("W")[0]
        cols   = max(1, (LOG.width - PAD * 2) // char_w)
        result: List[Tuple[str, bool]] = []

        messages = self.game_state.recent_messages(30)
        for msg in reversed(messages):
            wrapped = textwrap.wrap(msg, cols) or [""]
            for line in reversed(wrapped):
                result.insert(0, (line, True))
                if len(result) >= max_lines:
                    return result
        return result

    def _build_choice_lines(self, gs: GameState) -> List[Tuple[str, bool]]:
        lines: List[Tuple[str, bool]] = []
        if gs.mode == Mode.SCENE:
            scene = gs.current_scene()
            if scene:
                choices = scene.numbered_choices(gs.investigator)
                for c in choices:
                    text = c.display_text(gs.investigator)
                    lines.append((f"[{c.key}] {text}", True))
        elif gs.mode == Mode.DIALOGUE and gs.current_node:
            node = gs.current_node
            choices = node.available_choices(gs.investigator)
            for i, c in enumerate(choices, 1):
                lines.append((f"[{i}] {c.text}", True))
        elif gs.mode == Mode.COMBAT:
            for label, key in [("Attack","1"), ("Dodge","2"), ("Use Item","3"), ("Flee","4")]:
                lines.append((f"[{key}] {label}", True))
        return lines

    # -----------------------------------------------------------------------
    # Right panel
    # -----------------------------------------------------------------------

    def _draw_right_panel(self) -> None:
        p = self.palette
        draw_filled(self.screen, RIGHT, p.bg)
        draw_v_line(self.screen, RIGHT.left, RIGHT.top, RIGHT.bottom, p.dim)

        for btn in self._menu_buttons:
            btn.draw(self.screen, p)

        if self._dpad:
            self._dpad.draw(self.screen, p)

    # -----------------------------------------------------------------------
    # Panel borders
    # -----------------------------------------------------------------------

    def _draw_panel_borders(self) -> None:
        p = self.palette
        # Vertical separators
        draw_v_line(self.screen, LEFT.right, LEFT.top, LEFT.bottom, p.dim)
        draw_v_line(self.screen, RIGHT.left, RIGHT.top, RIGHT.bottom, p.dim)
        # Horizontal separator between viewport and log
        draw_h_line(self.screen, VIEWPORT.left, VIEWPORT.right, VIEWPORT.bottom, p.dim)
        # Outer border
        draw_border(self.screen, pygame.Rect(0, 0, W, H), p.dim)

    # -----------------------------------------------------------------------
    # Overlays (character sheet, inventory, map, skills)
    # -----------------------------------------------------------------------

    def _draw_overlay(self, overlay_type: str) -> None:
        p   = self.palette
        inv = self.game_state.investigator

        overlay_rect = pygame.Rect(100, 80, W - 200, H - 160)
        overlay_surf = pygame.Surface((overlay_rect.width, overlay_rect.height), pygame.SRCALPHA)
        overlay_surf.fill((*p.bg, 240))
        self.screen.blit(overlay_surf, overlay_rect.topleft)
        draw_border(self.screen, overlay_rect, p.fg, 2)

        x = overlay_rect.left + PAD * 2
        y = overlay_rect.top  + PAD * 2

        if overlay_type == "Character":
            y = render_text(self.screen, f"CHARACTER: {inv.name}", x, y, p.fg, FONT_LG, bold=True) + 4
            y = render_text(self.screen, f"Occupation: {inv.occupation}  Age: {inv.age}", x, y, p.fg, FONT_MD) + 4
            y = render_text(self.screen, f"HP: {inv.current_hp}/{inv.max_hp}  MP: {inv.current_mp}/{inv.max_mp}  SAN: {inv.current_san}/{inv.max_san}", x, y, p.fg, FONT_MD) + 4
            y = render_text(self.screen, f"Luck: {inv.luck}  DB: {inv.damage_bonus}  Build: {inv.build}  MOV: {inv.move_rate}", x, y, p.dim, FONT_MD) + 8
            # Characteristics
            y = render_text(self.screen, "CHARACTERISTICS:", x, y, p.fg, FONT_MD, bold=True) + 4
            chars = inv.characteristics
            col_w = (overlay_rect.width - PAD*4) // 4
            for i, attr in enumerate(["STR","CON","SIZ","DEX","APP","INT","POW","EDU"]):
                col = i % 4
                row = i // 4
                cx = x + col * col_w
                cy = y + row * (text_height(FONT_MD) + 4)
                render_text(self.screen, f"{attr}: {chars.get(attr,0)}", cx, cy, p.fg, FONT_MD)
            y += 2 * (text_height(FONT_MD) + 4) + 8

        elif overlay_type == "Inventory":
            y = render_text(self.screen, "INVENTORY", x, y, p.fg, FONT_LG, bold=True) + 8
            if inv.inventory:
                for item in inv.inventory:
                    name = item.get("name", str(item)) if isinstance(item, dict) else str(item)
                    y = render_text(self.screen, f"· {name}", x, y, p.fg, FONT_MD) + 2
            else:
                y = render_text(self.screen, "(empty)", x, y, p.dim, FONT_MD) + 2
            y += 8
            y = render_text(self.screen, f"Cash: ${inv.cash}", x, y, p.fg, FONT_MD) + 4

        elif overlay_type == "Skills":
            y = render_text(self.screen, "SKILLS", x, y, p.fg, FONT_LG, bold=True) + 4
            skills_sorted = sorted(inv.skills.items())
            col_w = (overlay_rect.width - PAD * 4) // 3
            for i, (skill, val) in enumerate(skills_sorted):
                col = i % 3
                row = i // 3
                cx = x + col * col_w
                cy = y + row * (text_height(FONT_SM) + 2)
                color = p.fg if val > 50 else p.dim
                render_text(self.screen, f"{skill[:18]:18s} {val:3d}%", cx, cy, color, FONT_SM)

        elif overlay_type == "Map":
            y = render_text(self.screen, "DUNGEON MAP", x, y, p.fg, FONT_LG, bold=True) + 8
            big_map = pygame.Rect(overlay_rect.left + PAD*2, y,
                                  overlay_rect.width - PAD*4, overlay_rect.height - (y - overlay_rect.top) - PAD*2)
            self._draw_minimap(big_map)

        # Close instruction
        close_y = overlay_rect.bottom - PAD * 2 - text_height(FONT_SM)
        render_text(self.screen, "[ESC] Close", overlay_rect.right - 80, close_y, p.dim, FONT_SM)

    # -----------------------------------------------------------------------
    # Event handling
    # -----------------------------------------------------------------------

    def handle_event(self, event: pygame.event.Event) -> bool:
        """
        Handle a pygame event. Returns False if the game should quit.
        """
        gs = self.game_state

        # Global quit
        if event.type == pygame.QUIT:
            return False
        if event.type == pygame.KEYDOWN and event.key == pygame.K_F4 and \
           event.mod & pygame.KMOD_ALT:
            return False

        # Close overlay
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            if self._overlay:
                self._overlay = None
                return True

        # Menu buttons
        if not self._overlay:
            for btn in self._menu_buttons:
                if btn.handle_event(event):
                    break
            if self._dpad:
                self._dpad.handle_event(event)

        # Keyboard shortcuts
        if event.type == pygame.KEYDOWN:
            if self._overlay is None:
                self._handle_key(event, gs)
            elif event.key == pygame.K_ESCAPE:
                self._overlay = None

        return True

    def _handle_key(self, event: pygame.event.Event, gs: GameState) -> None:
        key = event.key
        unicode = event.unicode

        # Menu shortcut keys
        key_map = {
            pygame.K_c: "Character",
            pygame.K_i: "Inventory",
            pygame.K_k: "Skills",
            pygame.K_x: "Map",
        }
        if key in key_map:
            self.toggle_overlay(key_map[key])
            return

        if gs.mode == Mode.SCENE:
            if unicode in "123456789":
                gs.process_choice(unicode)
            elif key == pygame.K_RETURN or key == pygame.K_SPACE:
                choices = self._current_choices()
                if choices:
                    gs.process_choice(choices[0].key)

        elif gs.mode == Mode.DIALOGUE:
            if unicode in "123456789":
                gs.process_dialogue_choice(unicode)

        elif gs.mode == Mode.MAP:
            move_keys = {
                pygame.K_UP: (0, -1), pygame.K_w: (0, -1),
                pygame.K_DOWN: (0, 1), pygame.K_s: (0, 1),
                pygame.K_LEFT: (-1, 0), pygame.K_a: (-1, 0),
                pygame.K_RIGHT: (1, 0), pygame.K_d: (1, 0),
            }
            if key in move_keys:
                dx, dy = move_keys[key]
                gs.move_player(dx, dy)

        elif gs.mode == Mode.COMBAT:
            if unicode == "1":
                self._combat_attack(gs)
            elif unicode == "4":
                gs.log(f"{gs.investigator.name} flees the combat!")
                gs.mode = Mode.SCENE

        # Save/Load
        if key == pygame.K_F5:
            gs.save("savegame.json")
        elif key == pygame.K_F9:
            try:
                loaded = GameState.load("savegame.json")
                self.game_state = loaded
                gs.log("Game loaded.")
            except Exception as e:
                gs.log(f"Load failed: {e}")

    def _combat_attack(self, gs: GameState) -> None:
        from .coc import resolve_combat, Combatant, CombatAction
        inv = gs.investigator
        enemies = [e for e in gs.combat_enemies if e.is_alive]
        if not enemies:
            gs.mode = Mode.SCENE
            return

        target = enemies[0]
        attacker = Combatant(
            name=inv.name,
            hp=inv.current_hp,
            max_hp=inv.max_hp,
            attack_skill=inv.skills.get("Fighting (Brawl)", 25),
            dodge_skill=inv.skills.get("Dodge", 20),
            damage_dice="1d3",
            damage_bonus=inv.damage_bonus,
            is_npc=False,
        )
        result = resolve_combat(attacker, target)
        for msg in result.messages:
            gs.log(msg)

        # Enemy counter
        for enemy in enemies:
            if enemy.is_alive:
                counter_attacker = enemy
                counter_defender = Combatant(
                    name=inv.name,
                    hp=inv.current_hp,
                    max_hp=inv.max_hp,
                    dodge_skill=inv.skills.get("Dodge", 20),
                    attack_skill=inv.skills.get("Fighting (Brawl)", 25),
                    damage_dice="1d3",
                    damage_bonus=inv.damage_bonus,
                    is_npc=False,
                )
                from .coc import resolve_combat as rc
                r2 = rc(counter_attacker, counter_defender, CombatAction.ATTACK, CombatAction.DODGE)
                for msg in r2.messages:
                    gs.log(msg)
                if r2.damage > 0:
                    msgs = inv.take_damage(r2.damage)
                    for m in msgs:
                        gs.log(m)

        # Check if all enemies dead
        if all(not e.is_alive for e in gs.combat_enemies):
            gs.log("All enemies defeated!")
            from .scene import Effect, FX
            for enemy in gs.combat_enemies:
                if enemy.san_loss and enemy.san_loss != "0/0":
                    parts = enemy.san_loss.split("/")
                    if len(parts) == 2:
                        from .coc import sanity_check
                        result_san, lost, msgs = inv.roll_sanity(parts[1], parts[0])
                        for m in msgs:
                            gs.log(m)
            gs.combat_enemies = []
            gs.mode = Mode.SCENE

        if inv.current_hp <= 0:
            gs.mode = Mode.GAME_OVER

    def toggle_overlay(self, overlay_type: str) -> None:
        if self._overlay == overlay_type:
            self._overlay = None
        else:
            self._overlay = overlay_type
        if self.on_menu_action:
            pass  # already handled by button callbacks

    # -----------------------------------------------------------------------
    # Helper
    # -----------------------------------------------------------------------

    @property
    def _choice_cursor(self) -> int:
        return getattr(self, "_cursor", 0)

    @_choice_cursor.setter
    def _choice_cursor(self, v: int) -> None:
        self._cursor = v

    # -----------------------------------------------------------------------
    # Main loop (standalone)
    # -----------------------------------------------------------------------

    def run(self, fps: int = 30) -> None:
        """Run the game loop until the window is closed."""
        self.init()
        clock = pygame.time.Clock()
        running = True

        # Set up menu action handler
        def menu_action(label: str) -> None:
            self.toggle_overlay(label)

        self.on_menu_action = menu_action

        # Enter start scene
        self.game_state.enter_scene(self.game_state.current_scene_id)

        while running:
            for event in pygame.event.get():
                if not self.handle_event(event):
                    running = False

            self.render_frame()
            clock.tick(fps)

        pygame.quit()
