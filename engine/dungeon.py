"""
ASCII dungeon map system for the Dungeon Crawl Engine.

Provides tile-based dungeon maps that render in two-color ASCII art.
Maps can be defined as multiline strings or programmatically.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Tile definitions
# ---------------------------------------------------------------------------

class Tile:
    """Standard dungeon tile characters."""
    WALL            = "#"
    FLOOR           = "."
    DOOR_CLOSED     = "+"
    DOOR_OPEN       = "/"
    STAIRS_DOWN     = ">"
    STAIRS_UP       = "<"
    PLAYER          = "@"
    CHEST           = "$"
    ITEM            = "!"
    TRAP            = "^"
    WATER           = "~"
    VOID            = " "
    PILLAR          = "O"
    ALTAR           = "&"
    FIREPLACE       = "*"

    # Enemy glyphs (use first letter of name, or override)
    GOBLIN          = "g"
    ORC             = "o"
    SKELETON        = "s"
    TROLL           = "T"
    DRAGON          = "D"
    BOSS            = "B"

    # Tile display categories (for coloring)
    STRUCTURAL = {WALL, PILLAR}
    PASSABLE   = {FLOOR, DOOR_OPEN, STAIRS_DOWN, STAIRS_UP}
    SPECIAL    = {CHEST, ITEM, TRAP, ALTAR, FIREPLACE}
    WATER_TILES = {WATER}


# ---------------------------------------------------------------------------
# Map entity (things on the map that aren't tiles)
# ---------------------------------------------------------------------------

@dataclass
class MapEntity:
    glyph: str
    name: str
    x: int
    y: int


# ---------------------------------------------------------------------------
# Dungeon map
# ---------------------------------------------------------------------------

@dataclass
class DungeonMap:
    """
    A 2D ASCII dungeon map.

    Define via a multiline string where each character is a tile::

        map_str = '''
        #########
        #.......#
        #..@....#
        #.......#
        ####.####
        '''
    """
    raw: str = ""
    player_x: int = 0
    player_y: int = 0
    entities: List[MapEntity] = field(default_factory=list)
    legend: Dict[str, str] = field(default_factory=dict)  # glyph -> description

    # Cached grid
    _grid: List[List[str]] = field(default_factory=list, init=False, repr=False)

    def __post_init__(self) -> None:
        self._parse()

    def _parse(self) -> None:
        """Parse the raw string into a grid and locate the player (@)."""
        lines = self.raw.strip("\n").splitlines()
        self._grid = [list(line) for line in lines]

        # Find player position
        for y, row in enumerate(self._grid):
            for x, ch in enumerate(row):
                if ch == Tile.PLAYER:
                    self.player_x = x
                    self.player_y = y

    @property
    def width(self) -> int:
        if not self._grid:
            return 0
        return max(len(row) for row in self._grid)

    @property
    def height(self) -> int:
        return len(self._grid)

    def get_tile(self, x: int, y: int) -> str:
        if 0 <= y < len(self._grid) and 0 <= x < len(self._grid[y]):
            return self._grid[y][x]
        return Tile.VOID

    def set_tile(self, x: int, y: int, tile: str) -> None:
        if 0 <= y < len(self._grid) and 0 <= x < len(self._grid[y]):
            self._grid[y][x] = tile

    def move_player(self, dx: int, dy: int) -> bool:
        """Attempt to move the player. Returns True if successful."""
        nx, ny = self.player_x + dx, self.player_y + dy
        target = self.get_tile(nx, ny)
        if target in Tile.PASSABLE or target == Tile.FLOOR:
            # Clear old position
            self.set_tile(self.player_x, self.player_y, Tile.FLOOR)
            self.player_x = nx
            self.player_y = ny
            self.set_tile(nx, ny, Tile.PLAYER)
            return True
        return False

    def place_entity(self, entity: MapEntity) -> None:
        self.entities.append(entity)
        self.set_tile(entity.x, entity.y, entity.glyph)

    def remove_entity(self, name: str) -> None:
        for entity in list(self.entities):
            if entity.name == name:
                self.set_tile(entity.x, entity.y, Tile.FLOOR)
                self.entities.remove(entity)

    def rows(self) -> List[str]:
        """Return map rows as strings (normalized to same width)."""
        w = self.width
        return ["".join(row).ljust(w) for row in self._grid]

    def render_lines(self) -> List[Tuple[str, str]]:
        """
        Return list of (char, category) pairs per row for colored rendering.

        Categories: 'wall', 'floor', 'player', 'special', 'enemy', 'void'
        """
        result = []
        for row in self._grid:
            row_data = []
            for ch in row:
                if ch == Tile.PLAYER:
                    row_data.append((ch, "player"))
                elif ch in Tile.STRUCTURAL:
                    row_data.append((ch, "wall"))
                elif ch in Tile.SPECIAL:
                    row_data.append((ch, "special"))
                elif ch in Tile.WATER_TILES:
                    row_data.append((ch, "water"))
                elif ch == Tile.VOID:
                    row_data.append((ch, "void"))
                elif ch.islower() or ch.isupper() and ch not in {
                    Tile.FLOOR, Tile.DOOR_CLOSED, Tile.DOOR_OPEN,
                    Tile.STAIRS_DOWN, Tile.STAIRS_UP,
                }:
                    row_data.append((ch, "enemy"))
                else:
                    row_data.append((ch, "floor"))
            result.append(row_data)
        return result


# ---------------------------------------------------------------------------
# Pre-built map templates
# ---------------------------------------------------------------------------

class MapTemplates:
    """Ready-made small dungeon rooms for quick scene use."""

    ENTRANCE = """\
#########
#.......#
#..@....#
#.......#
####.####"""

    CORRIDOR_NS = """\
###.###
###.###
###@###
###.###
###.###"""

    LARGE_ROOM = """\
###########
#.........#
#.........#
#....@....#
#.........#
#.........#
#####.#####"""

    BOSS_CHAMBER = """\
#############
#...........#
#.####.####.#
#.#       #.#
#.# B   @ #.#
#.#       #.#
#.####.####.#
#...........#
######.######"""

    TREASURE_VAULT = """\
#######
#.$.$!#
#.....#
#..@..#
#######"""
