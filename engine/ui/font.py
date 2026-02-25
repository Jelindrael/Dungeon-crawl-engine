"""
Font loading and text rendering helpers.

All text is rendered in one of two colors: palette.fg (bright) or palette.dim.
Anti-aliasing is disabled for the pixel-authentic look.
"""
from __future__ import annotations
import pygame
from typing import Optional, Tuple

# Module-level font cache
_fonts: dict = {}

Color = Tuple[int, int, int]


def get_font(size: int, bold: bool = False) -> pygame.font.Font:
    key = (size, bold)
    if key not in _fonts:
        font = pygame.font.SysFont("monospace", size, bold=bold)
        _fonts[key] = font
    return _fonts[key]


def render_text(
    surface: pygame.Surface,
    text: str,
    x: int,
    y: int,
    color: Color,
    size: int = 13,
    bold: bool = False,
    bg: Optional[Color] = None,
    max_width: Optional[int] = None,
) -> int:
    """
    Render a single line of text at (x, y). Returns the bottom y-coordinate.
    If max_width is given, text is clipped.
    """
    font = get_font(size, bold)
    if bg is not None:
        surf = font.render(text, False, color, bg)
    else:
        surf = font.render(text, False, color)
    if max_width and surf.get_width() > max_width:
        surf = surf.subsurface(pygame.Rect(0, 0, max_width, surf.get_height()))
    surface.blit(surf, (x, y))
    return y + surf.get_height()


def render_wrapped(
    surface: pygame.Surface,
    text: str,
    x: int,
    y: int,
    color: Color,
    max_width: int,
    size: int = 13,
    bold: bool = False,
    line_spacing: int = 2,
) -> int:
    """
    Render word-wrapped text. Returns the bottom y-coordinate after the last line.
    """
    import textwrap
    font = get_font(size, bold)
    char_w = font.size("W")[0]
    chars_per_line = max(1, max_width // char_w)
    lines = []
    for paragraph in text.split("\n"):
        if paragraph.strip() == "":
            lines.append("")
        else:
            lines.extend(textwrap.wrap(paragraph, chars_per_line) or [""])

    cy = y
    for line in lines:
        surf = font.render(line, False, color)
        surface.blit(surf, (x, cy))
        cy += font.get_height() + line_spacing
    return cy


def text_height(size: int = 13) -> int:
    return get_font(size).get_height()


def text_width(text: str, size: int = 13, bold: bool = False) -> int:
    return get_font(size, bold).size(text)[0]
