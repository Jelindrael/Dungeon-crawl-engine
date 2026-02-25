"""
Pixel art sprite system.

Sprites are stored as JSON files containing 2D arrays of 0/1 values.
0 = background color (palette.bg)
1 = foreground color (palette.fg)

Illustration format (for encounter art): larger bitmap (e.g. 200×100)
Entity sprite format: smaller bitmap (e.g. 8×16 or 16×16)
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class SpriteFrame:
    """One animation frame: a 2D bit array (list of rows)."""
    data:     List[List[int]]   # data[y][x] = 0 or 1
    duration: int = 100         # ms to display this frame

    @property
    def width(self) -> int:
        return max((len(row) for row in self.data), default=0)

    @property
    def height(self) -> int:
        return len(self.data)

    def get_pixel(self, x: int, y: int) -> int:
        if 0 <= y < len(self.data) and 0 <= x < len(self.data[y]):
            return self.data[y][x]
        return 0

    def set_pixel(self, x: int, y: int, value: int) -> None:
        while len(self.data) <= y:
            self.data.append([0] * self.width)
        while len(self.data[y]) <= x:
            self.data[y].append(0)
        self.data[y][x] = value & 1

    def clone(self) -> "SpriteFrame":
        return SpriteFrame([list(row) for row in self.data], self.duration)

    def to_dict(self) -> dict:
        return {"data": self.data, "duration": self.duration}

    @classmethod
    def from_dict(cls, d: dict) -> "SpriteFrame":
        return cls(data=d["data"], duration=d.get("duration", 100))

    @classmethod
    def blank(cls, width: int, height: int) -> "SpriteFrame":
        return cls(data=[[0] * width for _ in range(height)])


@dataclass
class Sprite:
    """
    A named pixel art sprite with one or more animation frames.
    Stored as JSON.
    """
    sprite_id:   str
    name:        str
    width:       int
    height:      int
    frames:      List[SpriteFrame] = field(default_factory=list)
    pixel_scale: int = 1           # display scale (1 = 1:1, 4 = 4×4 pixels per bit)
    tags:        List[str] = field(default_factory=list)

    def get_frame(self, index: int = 0) -> SpriteFrame:
        if not self.frames:
            return SpriteFrame.blank(self.width, self.height)
        return self.frames[index % len(self.frames)]

    def add_frame(self) -> SpriteFrame:
        f = SpriteFrame.blank(self.width, self.height)
        self.frames.append(f)
        return f

    def to_dict(self) -> dict:
        return {
            "id": self.sprite_id,
            "name": self.name,
            "width": self.width,
            "height": self.height,
            "pixel_scale": self.pixel_scale,
            "tags": self.tags,
            "frames": [f.to_dict() for f in self.frames],
        }

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, d: dict) -> "Sprite":
        frames = [SpriteFrame.from_dict(f) for f in d.get("frames", [])]
        return cls(
            sprite_id=d.get("id", "sprite"),
            name=d.get("name", "Sprite"),
            width=d["width"],
            height=d["height"],
            pixel_scale=d.get("pixel_scale", 1),
            tags=d.get("tags", []),
            frames=frames,
        )

    @classmethod
    def load(cls, path: str) -> "Sprite":
        with open(path) as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def blank(cls, sprite_id: str, width: int, height: int, pixel_scale: int = 1) -> "Sprite":
        s = cls(sprite_id=sprite_id, name=sprite_id, width=width, height=height,
                pixel_scale=pixel_scale)
        s.add_frame()
        return s


# ---------------------------------------------------------------------------
# Global sprite registry
# ---------------------------------------------------------------------------

class SpriteRegistry:
    _sprites: Dict[str, Sprite] = {}

    @classmethod
    def register(cls, sprite: Sprite) -> None:
        cls._sprites[sprite.sprite_id] = sprite

    @classmethod
    def get(cls, sprite_id: str) -> Optional[Sprite]:
        return cls._sprites.get(sprite_id)

    @classmethod
    def clear(cls) -> None:
        cls._sprites.clear()


# ---------------------------------------------------------------------------
# Illustration (large encounter art)
# ---------------------------------------------------------------------------

class Illustration(Sprite):
    """
    A full-scene pixel art illustration for the main viewport.
    Typically 200×100 bits rendered at pixel_scale=4 → 800×400 display.
    """

    @classmethod
    def blank_illustration(
        cls, illustration_id: str, width: int = 200, height: int = 100
    ) -> "Illustration":
        ill = cls(
            sprite_id=illustration_id,
            name=illustration_id,
            width=width,
            height=height,
            pixel_scale=4,
            tags=["illustration"],
        )
        ill.add_frame()
        return ill


# ---------------------------------------------------------------------------
# PNG import helper (requires Pillow)
# ---------------------------------------------------------------------------

def import_png(
    path: str,
    sprite_id: str,
    pixel_scale: int = 1,
    threshold: int = 128,
) -> Sprite:
    """
    Import a PNG file as a two-color sprite via threshold conversion.
    Requires Pillow (PIL).
    """
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow is required for PNG import: pip install Pillow")

    img = Image.open(path).convert("L")  # grayscale
    w, h = img.size
    pixels = list(img.getdata())

    frame_data: List[List[int]] = []
    for row_idx in range(h):
        row = []
        for col_idx in range(w):
            lum = pixels[row_idx * w + col_idx]
            row.append(0 if lum < threshold else 1)
        frame_data.append(row)

    sprite = Sprite(
        sprite_id=sprite_id,
        name=sprite_id,
        width=w,
        height=h,
        pixel_scale=pixel_scale,
        frames=[SpriteFrame(data=frame_data)],
    )
    return sprite
