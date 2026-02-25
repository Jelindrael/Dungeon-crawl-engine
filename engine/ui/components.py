"""
Reusable pygame UI components: buttons, borders, bars, etc.

All components render in exactly two colors (palette.fg / palette.bg).
"""
from __future__ import annotations
import pygame
from typing import Callable, List, Optional, Tuple

from .font import get_font, render_text, render_wrapped, text_height, text_width
from ..palette import Palette

Color = Tuple[int, int, int]


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def draw_border(surface: pygame.Surface, rect: pygame.Rect, color: Color, width: int = 1) -> None:
    pygame.draw.rect(surface, color, rect, width)


def draw_filled(surface: pygame.Surface, rect: pygame.Rect, color: Color) -> None:
    pygame.draw.rect(surface, color, rect)


def draw_h_line(surface: pygame.Surface, x1: int, x2: int, y: int, color: Color) -> None:
    pygame.draw.line(surface, color, (x1, y), (x2, y))


def draw_v_line(surface: pygame.Surface, x1: int, y1: int, y2: int, color: Color) -> None:
    pygame.draw.line(surface, color, (x1, y1), (x1, y2))


def draw_hp_bar(
    surface: pygame.Surface,
    x: int, y: int, width: int, height: int,
    current: int, maximum: int,
    palette: Palette,
    label: str = "",
) -> None:
    """Render an HP/SAN/MP bar with block fill."""
    bg, fg, dim = palette.bg, palette.fg, palette.dim
    ratio = current / max(maximum, 1)
    filled = int(width * ratio)

    draw_border(surface, pygame.Rect(x, y, width, height), dim)
    if filled > 0:
        inner_color = (
            (200, 0, 0) if False  # placeholder
            else fg
        )
        # Low HP → use a dim version
        if ratio <= 0.25:
            inner_color = palette.blend(0.3)
        elif ratio <= 0.5:
            inner_color = palette.blend(0.6)
        draw_filled(surface, pygame.Rect(x + 1, y + 1, filled - 2, height - 2), inner_color)

    if label:
        font = get_font(10)
        lbl = font.render(label, False, fg)
        surface.blit(lbl, (x + width + 4, y))


def draw_scanlines(surface: pygame.Surface, alpha: int = 50) -> None:
    """Overlay dark horizontal scanlines for CRT effect."""
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    w, h = surface.get_size()
    for y in range(0, h, 2):
        pygame.draw.line(overlay, (0, 0, 0, alpha), (0, y), (w, y))
    surface.blit(overlay, (0, 0))


def draw_dither_rect(
    surface: pygame.Surface,
    rect: pygame.Rect,
    palette: Palette,
    density: float = 0.5,
) -> None:
    """
    Fill a rect with a checkerboard dither between bg and fg.
    density 0.0 = bg, 1.0 = fg, 0.5 = 50% mix.
    """
    for y in range(rect.top, rect.bottom):
        for x in range(rect.left, rect.right):
            use_fg = ((x + y) % 2 == 0) if density >= 0.5 else False
            if density < 0.5:
                use_fg = ((x + y) % 4 == 0)
            color = palette.fg if use_fg else palette.bg
            surface.set_at((x, y), color)


def draw_decorative_border(
    surface: pygame.Surface,
    rect: pygame.Rect,
    palette: Palette,
    title: str = "",
) -> None:
    """Draw a double-line decorative border around a rect with optional title."""
    fg  = palette.fg
    dim = palette.dim

    # Outer border
    pygame.draw.rect(surface, dim, rect, 1)
    # Inner border (inset 2px)
    inner = rect.inflate(-4, -4)
    pygame.draw.rect(surface, fg, inner, 1)

    # Corner decorations
    for corner_x, corner_y in [
        (rect.left, rect.top), (rect.right - 6, rect.top),
        (rect.left, rect.bottom - 6), (rect.right - 6, rect.bottom - 6),
    ]:
        pygame.draw.rect(surface, fg, pygame.Rect(corner_x, corner_y, 6, 6), 1)

    # Title
    if title:
        font = get_font(12, bold=True)
        lbl  = font.render(f" {title} ", False, fg, palette.bg)
        surface.blit(lbl, (rect.left + 12, rect.top - lbl.get_height() // 2))


# ---------------------------------------------------------------------------
# Button
# ---------------------------------------------------------------------------

class Button:
    """A simple two-color clickable button."""

    def __init__(
        self,
        rect: pygame.Rect,
        label: str,
        on_click: Optional[Callable] = None,
        key: str = "",
        palette: Optional[Palette] = None,
    ) -> None:
        self.rect     = rect
        self.label    = label
        self.on_click = on_click
        self.key      = key
        self.palette  = palette
        self.hovered  = False
        self.pressed  = False
        self.enabled  = True

    def handle_event(self, event: pygame.event.Event) -> bool:
        """Returns True if clicked."""
        if not self.enabled:
            return False
        if event.type == pygame.MOUSEMOTION:
            self.hovered = self.rect.collidepoint(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.pressed = True
                return False
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            was_pressed = self.pressed
            self.pressed = False
            if was_pressed and self.rect.collidepoint(event.pos):
                if self.on_click:
                    self.on_click()
                return True
        return False

    def draw(self, surface: pygame.Surface, palette: Optional[Palette] = None) -> None:
        p = palette or self.palette
        if p is None:
            return
        fg, bg, dim = p.fg, p.bg, p.dim

        if not self.enabled:
            box_color = bg
            text_color = dim
            border_color = dim
        elif self.pressed:
            box_color = fg
            text_color = bg
            border_color = fg
        elif self.hovered:
            box_color = p.blend(0.15)
            text_color = fg
            border_color = fg
        else:
            box_color = bg
            text_color = fg
            border_color = dim

        draw_filled(surface, self.rect, box_color)
        draw_border(surface, self.rect, border_color)

        font  = get_font(12, bold=True)
        label = font.render(self.label, False, text_color)
        lx = self.rect.centerx - label.get_width() // 2
        ly = self.rect.centery - label.get_height() // 2
        surface.blit(label, (lx, ly))

        if self.key:
            key_surf = get_font(10).render(f"[{self.key}]", False, dim)
            surface.blit(key_surf, (self.rect.left + 3, self.rect.centery - key_surf.get_height()//2))


# ---------------------------------------------------------------------------
# DPad widget
# ---------------------------------------------------------------------------

class DPad:
    """Directional pad widget (5 buttons: N/S/E/W + center action)."""

    DIRS = {
        "n": (0, -1), "s": (0, 1),
        "e": (1, 0),  "w": (-1, 0),
        "c": (0, 0),  # center / action
    }

    def __init__(
        self,
        center_x: int,
        center_y: int,
        btn_size: int = 44,
        gap: int = 4,
        on_move: Optional[Callable] = None,
        on_action: Optional[Callable] = None,
    ) -> None:
        self.btn_size  = btn_size
        self.gap       = gap
        self.on_move   = on_move
        self.on_action = on_action
        self.buttons: List[Button] = []
        step = btn_size + gap
        positions = {
            "n": (center_x, center_y - step),
            "s": (center_x, center_y + step),
            "e": (center_x + step, center_y),
            "w": (center_x - step, center_y),
            "c": (center_x, center_y),
        }
        labels = {"n": "N", "s": "S", "e": "E", "w": "W", "c": "·"}
        for d, (bx, by) in positions.items():
            rect = pygame.Rect(bx - btn_size//2, by - btn_size//2, btn_size, btn_size)
            btn = Button(rect, labels[d], key=d)
            self.buttons.append(btn)
        self._dir_map = {self.buttons[i]: list(self.DIRS.keys())[i]
                         for i in range(len(self.buttons))}

    def handle_event(self, event: pygame.event.Event) -> None:
        for btn in self.buttons:
            if btn.handle_event(event):
                direction = self._dir_map.get(btn, "c")
                if direction == "c" and self.on_action:
                    self.on_action()
                elif direction != "c" and self.on_move:
                    dx, dy = self.DIRS[direction]
                    self.on_move(dx, dy)

    def draw(self, surface: pygame.Surface, palette: Palette) -> None:
        for btn in self.buttons:
            btn.draw(surface, palette)
