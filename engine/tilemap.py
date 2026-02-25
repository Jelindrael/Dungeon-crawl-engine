"""
Tile-based map system.

Maps are stored as JSON and rendered in the viewport as a 2D overhead view.
Each tile is 20×20 pixels in the viewport (configurable).
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Tile definitions
# ---------------------------------------------------------------------------

TILE_DEFS: Dict[int, Dict[str, Any]] = {
    0:  {"id": 0, "name": "floor",       "passable": True,  "glyph": ".",  "art": "FLOOR"},
    1:  {"id": 1, "name": "wall",        "passable": False, "glyph": "#",  "art": "WALL"},
    2:  {"id": 2, "name": "door_closed", "passable": True,  "glyph": "+",  "art": "DOOR"},
    3:  {"id": 3, "name": "door_open",   "passable": True,  "glyph": "/",  "art": "FLOOR"},
    4:  {"id": 4, "name": "stairs_down", "passable": True,  "glyph": ">",  "art": "STAIRS"},
    5:  {"id": 5, "name": "stairs_up",   "passable": True,  "glyph": "<",  "art": "STAIRS"},
    6:  {"id": 6, "name": "water",       "passable": False, "glyph": "~",  "art": "WATER"},
    7:  {"id": 7, "name": "chest",       "passable": True,  "glyph": "$",  "art": "CHEST"},
    8:  {"id": 8, "name": "altar",       "passable": True,  "glyph": "&",  "art": "SPECIAL"},
    9:  {"id": 9, "name": "pillar",      "passable": False, "glyph": "O",  "art": "WALL"},
    10: {"id":10, "name": "void",        "passable": False, "glyph": " ",  "art": "VOID"},
    11: {"id":11, "name": "fireplace",   "passable": False, "glyph": "*",  "art": "SPECIAL"},
}

WALL    = 1
FLOOR   = 0
DOOR    = 2
STAIRS_D = 4
STAIRS_U = 5
WATER   = 6


# ---------------------------------------------------------------------------
# Map entity
# ---------------------------------------------------------------------------

@dataclass
class MapEntity:
    entity_type: str       # "npc", "item", "player_start", "trigger"
    entity_id:   str
    x:           int
    y:           int
    properties:  Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Tilemap
# ---------------------------------------------------------------------------

@dataclass
class TileMap:
    """
    A 2D grid of tile IDs with entity placements.
    """
    map_id:     str
    name:       str
    width:      int
    height:     int
    tiles:      List[List[int]]              # tiles[y][x]
    entities:   List[MapEntity]             = field(default_factory=list)
    connections: Dict[str, Optional[str]]   = field(default_factory=dict)
    scene_id:   Optional[str]              = None
    metadata:   Dict[str, Any]             = field(default_factory=dict)

    # Runtime state
    revealed:   List[List[bool]]           = field(default_factory=list)  # fog of war

    def __post_init__(self) -> None:
        if not self.revealed:
            self.revealed = [[False] * self.width for _ in range(self.height)]

    # -----------------------------------------------------------------------
    # Tile access
    # -----------------------------------------------------------------------

    def get(self, x: int, y: int) -> int:
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.tiles[y][x]
        return WALL  # out-of-bounds is a wall

    def set(self, x: int, y: int, tile_id: int) -> None:
        if 0 <= x < self.width and 0 <= y < self.height:
            self.tiles[y][x] = tile_id

    def is_passable(self, x: int, y: int) -> bool:
        td = TILE_DEFS.get(self.get(x, y), {})
        if not td.get("passable", False):
            return False
        for e in self.entities:
            if e.x == x and e.y == y and e.entity_type == "npc":
                return False
        return True

    def tile_name(self, x: int, y: int) -> str:
        return TILE_DEFS.get(self.get(x, y), {}).get("name", "unknown")

    def tile_glyph(self, x: int, y: int) -> str:
        return TILE_DEFS.get(self.get(x, y), {}).get("glyph", "?")

    # -----------------------------------------------------------------------
    # Fog of war
    # -----------------------------------------------------------------------

    def reveal_radius(self, cx: int, cy: int, radius: int = 5) -> None:
        """Mark tiles within radius as revealed."""
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if dx*dx + dy*dy <= radius*radius:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < self.width and 0 <= ny < self.height:
                        self.revealed[ny][nx] = True

    def is_revealed(self, x: int, y: int) -> bool:
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.revealed[y][x]
        return False

    # -----------------------------------------------------------------------
    # Entity helpers
    # -----------------------------------------------------------------------

    def entities_at(self, x: int, y: int) -> List[MapEntity]:
        return [e for e in self.entities if e.x == x and e.y == y]

    def find_entity(self, entity_id: str) -> Optional[MapEntity]:
        for e in self.entities:
            if e.entity_id == entity_id:
                return e
        return None

    def remove_entity(self, entity_id: str) -> bool:
        for e in list(self.entities):
            if e.entity_id == entity_id:
                self.entities.remove(e)
                return True
        return False

    def player_start(self) -> Tuple[int, int]:
        for e in self.entities:
            if e.entity_type == "player_start":
                return e.x, e.y
        return self.width // 2, self.height // 2

    # -----------------------------------------------------------------------
    # Serialization
    # -----------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.map_id,
            "name": self.name,
            "width": self.width,
            "height": self.height,
            "tiles": self.tiles,
            "entities": [
                {
                    "type": e.entity_type,
                    "id": e.entity_id,
                    "x": e.x,
                    "y": e.y,
                    "properties": e.properties,
                }
                for e in self.entities
            ],
            "connections": self.connections,
            "scene_id": self.scene_id,
            "metadata": self.metadata,
        }

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, d: dict) -> "TileMap":
        entities = [
            MapEntity(
                entity_type=e["type"],
                entity_id=e["id"],
                x=e["x"],
                y=e["y"],
                properties=e.get("properties", {}),
            )
            for e in d.get("entities", [])
        ]
        return cls(
            map_id=d.get("id", "map"),
            name=d.get("name", "Unnamed"),
            width=d["width"],
            height=d["height"],
            tiles=d["tiles"],
            entities=entities,
            connections=d.get("connections", {}),
            scene_id=d.get("scene_id"),
            metadata=d.get("metadata", {}),
        )

    @classmethod
    def load(cls, path: str) -> "TileMap":
        with open(path) as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def blank(cls, width: int = 20, height: int = 15, map_id: str = "new_map") -> "TileMap":
        """Create an empty map filled with walls, with a floor room inside."""
        tiles = [[WALL] * width for _ in range(height)]
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                tiles[y][x] = FLOOR
        return cls(
            map_id=map_id,
            name="New Map",
            width=width,
            height=height,
            tiles=tiles,
            entities=[MapEntity("player_start", "player_start", width//2, height//2)],
        )

    @classmethod
    def from_string(cls, s: str, map_id: str = "map") -> "TileMap":
        """
        Parse a map from an ASCII string.
        '#'=wall  '.'=floor  '+'=door  '>'=stairs_down  '<'=stairs_up
        '~'=water  '@'=player start
        """
        CHAR_TO_TILE = {
            '#': WALL, '.': FLOOR, '+': DOOR, '>': STAIRS_D,
            '<': STAIRS_U, '~': WATER, ' ': 10, '@': FLOOR,
            '*': 11, '&': 8, '$': 7, 'O': 9,
        }
        lines = s.strip("\n").splitlines()
        height = len(lines)
        width  = max(len(l) for l in lines)
        tiles  = []
        entities = []
        for y, line in enumerate(lines):
            row = []
            for x, ch in enumerate(line.ljust(width)):
                row.append(CHAR_TO_TILE.get(ch, WALL))
                if ch == '@':
                    entities.append(MapEntity("player_start", "player_start", x, y))
            tiles.append(row)
        return cls(
            map_id=map_id, name=map_id,
            width=width, height=height,
            tiles=tiles, entities=entities,
        )
