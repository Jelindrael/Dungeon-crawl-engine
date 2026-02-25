"""
Two-color palette system.

Every element in the engine renders using exactly two colors:
  - bg  : dark background color
  - fg  : bright foreground color

Intermediate tones are achieved via checkerboard dithering.
"""
from __future__ import annotations
import json
from typing import Dict, List, Tuple

Color = Tuple[int, int, int]


class Palette:
    """A strict two-color palette (background + foreground)."""

    def __init__(self, bg: Color, fg: Color, name: str = "Custom") -> None:
        self.bg   = tuple(bg)   # dark / off
        self.fg   = tuple(fg)   # bright / on
        self.name = name

    # Derived tones used for UI (still within the 2-color spirit)
    @property
    def dim(self) -> Color:
        """50% foreground – used for borders and secondary text."""
        return tuple(c // 2 for c in self.fg)

    @property
    def bright(self) -> Color:
        """Slightly brighter than fg (clamped) – for titles."""
        return tuple(min(255, int(c * 1.15)) for c in self.fg)

    @property
    def mid(self) -> Color:
        """Midpoint between bg and fg – for 50% dither simulation."""
        return tuple((b + f) // 2 for b, f in zip(self.bg, self.fg))

    def blend(self, t: float) -> Color:
        """Linear interpolation between bg (t=0) and fg (t=1)."""
        t = max(0.0, min(1.0, t))
        return tuple(int(b + (f - b) * t) for b, f in zip(self.bg, self.fg))

    def to_dict(self) -> dict:
        return {"name": self.name, "bg": list(self.bg), "fg": list(self.fg)}

    @classmethod
    def from_dict(cls, d: dict) -> "Palette":
        return cls(tuple(d["bg"]), tuple(d["fg"]), d.get("name", "Custom"))

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, path: str) -> "Palette":
        with open(path) as f:
            return cls.from_dict(json.load(f))

    def __repr__(self) -> str:
        return f"Palette({self.name!r}, bg={self.bg}, fg={self.fg})"


# ---------------------------------------------------------------------------
# Built-in palette presets
# ---------------------------------------------------------------------------

PRESETS: Dict[str, Palette] = {
    "phosphor_green": Palette(
        bg=(0, 12, 2),
        fg=(0, 230, 70),
        name="Phosphor Green",
    ),
    "amber": Palette(
        bg=(14, 9, 0),
        fg=(255, 175, 0),
        name="Amber",
    ),
    "cyan": Palette(
        bg=(0, 10, 14),
        fg=(0, 210, 240),
        name="Cyan",
    ),
    "white": Palette(
        bg=(0, 0, 0),
        fg=(210, 215, 210),
        name="White Phosphor",
    ),
    "red": Palette(
        bg=(14, 0, 0),
        fg=(255, 55, 30),
        name="Red Alert",
    ),
    "blue": Palette(
        bg=(0, 0, 14),
        fg=(60, 130, 255),
        name="Blue Terminal",
    ),
    "magenta": Palette(
        bg=(10, 0, 10),
        fg=(230, 0, 230),
        name="Magenta",
    ),
    "neon_yellow": Palette(
        bg=(8, 10, 0),
        fg=(210, 255, 0),
        name="Neon Yellow",
    ),
}

DEFAULT = "phosphor_green"


def list_preset_names() -> List[str]:
    return list(PRESETS.keys())


def get_preset(name: str) -> Palette:
    if name not in PRESETS:
        raise KeyError(f"Unknown palette preset: {name!r}")
    return PRESETS[name]
