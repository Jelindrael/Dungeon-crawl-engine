"""
Two-color terminal renderer for the Dungeon Crawl Engine.

Renders the game UI using ANSI escape codes in a classic old-school style:
  - Primary color (GREEN): structural elements, map, regular text
  - Accent color (AMBER/YELLOW): choices, highlights, important text
  - On a black background

Layout:
  ┌─ Header ──────────────────────────────── stats ─┐
  │ Map (optional)  │  Scene title + description     │
  ├─────────────────────────────────────────────────┤
  │ Attribute bar                                    │
  ├─────────────────────────────────────────────────┤
  │ [1] Choice one                                   │
  │ [2] Choice two  [Perception DC 12]               │
  └─────────────────────────────────────────────────┘
"""
from __future__ import annotations
import os
import shutil
import textwrap
from typing import TYPE_CHECKING, List, Optional, Tuple

if TYPE_CHECKING:
    from .character import Character
    from .combat import Enemy
    from .scene import Choice, Scene


# ---------------------------------------------------------------------------
# ANSI codes
# ---------------------------------------------------------------------------

class ANSI:
    RESET          = "\033[0m"
    BOLD           = "\033[1m"
    DIM            = "\033[2m"
    ITALIC         = "\033[3m"

    # Foreground colors
    BLACK          = "\033[30m"
    RED            = "\033[31m"
    GREEN          = "\033[32m"
    YELLOW         = "\033[33m"
    BLUE           = "\033[34m"
    MAGENTA        = "\033[35m"
    CYAN           = "\033[36m"
    WHITE          = "\033[37m"

    BRIGHT_RED     = "\033[91m"
    BRIGHT_GREEN   = "\033[92m"
    BRIGHT_YELLOW  = "\033[93m"
    BRIGHT_BLUE    = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN    = "\033[96m"
    BRIGHT_WHITE   = "\033[97m"

    # Background
    BG_BLACK       = "\033[40m"
    BG_RED         = "\033[41m"
    BG_GREEN       = "\033[42m"

    CLEAR_SCREEN   = "\033[2J\033[H"
    CLEAR_LINE     = "\033[2K"

    @staticmethod
    def move(row: int, col: int) -> str:
        return f"\033[{row};{col}H"


# ---------------------------------------------------------------------------
# Theme
# ---------------------------------------------------------------------------

class Theme:
    """
    Visual theme: a pair of primary/accent colors on black.

    Built-in themes:
        GREEN  – classic green phosphor monitor
        AMBER  – amber phosphor monitor
        BLUE   – blue terminal
        CYAN   – matrix-inspired cyan
    """

    def __init__(
        self,
        primary: str,
        accent: str,
        dim: str,
        danger: str,
        special: str,
        map_wall: str,
        map_floor: str,
        map_player: str,
    ) -> None:
        self.primary    = primary
        self.accent     = accent
        self.dim        = dim
        self.danger     = danger
        self.special    = special
        self.map_wall   = map_wall
        self.map_floor  = map_floor
        self.map_player = map_player

    @classmethod
    def GREEN(cls) -> "Theme":
        return cls(
            primary    = ANSI.BRIGHT_GREEN,
            accent     = ANSI.BRIGHT_YELLOW,
            dim        = ANSI.GREEN,
            danger     = ANSI.BRIGHT_RED,
            special    = ANSI.BRIGHT_CYAN,
            map_wall   = ANSI.GREEN,
            map_floor  = ANSI.DIM + ANSI.GREEN,
            map_player = ANSI.BOLD + ANSI.BRIGHT_WHITE,
        )

    @classmethod
    def AMBER(cls) -> "Theme":
        return cls(
            primary    = ANSI.BRIGHT_YELLOW,
            accent     = ANSI.BRIGHT_WHITE,
            dim        = ANSI.YELLOW,
            danger     = ANSI.BRIGHT_RED,
            special    = ANSI.BRIGHT_MAGENTA,
            map_wall   = ANSI.YELLOW,
            map_floor  = ANSI.DIM + ANSI.YELLOW,
            map_player = ANSI.BOLD + ANSI.BRIGHT_WHITE,
        )

    @classmethod
    def CYAN(cls) -> "Theme":
        return cls(
            primary    = ANSI.BRIGHT_CYAN,
            accent     = ANSI.BRIGHT_WHITE,
            dim        = ANSI.CYAN,
            danger     = ANSI.BRIGHT_RED,
            special    = ANSI.BRIGHT_YELLOW,
            map_wall   = ANSI.CYAN,
            map_floor  = ANSI.DIM + ANSI.CYAN,
            map_player = ANSI.BOLD + ANSI.BRIGHT_WHITE,
        )


# ---------------------------------------------------------------------------
# Renderer
# ---------------------------------------------------------------------------

class Renderer:
    """
    Renders the game to the terminal using two-color ANSI styling.

    All rendering writes to stdout. Input is collected via input().
    """

    BORDER_H  = "─"
    BORDER_V  = "│"
    CORNER_TL = "╔"
    CORNER_TR = "╗"
    CORNER_BL = "╚"
    CORNER_BR = "╝"
    JOIN_L    = "╠"
    JOIN_R    = "╣"
    DOUBLE_H  = "═"
    DOUBLE_V  = "║"

    # Minimum terminal width – content is clamped to this
    MIN_WIDTH = 60

    def __init__(self, theme: Optional[Theme] = None, game_title: str = "DUNGEON CRAWL") -> None:
        self.theme = theme or Theme.GREEN()
        self.game_title = game_title
        self._width = 0
        self._refresh_width()

    # ---------------------------------------------------------------------------
    # Terminal helpers
    # ---------------------------------------------------------------------------

    def _refresh_width(self) -> None:
        self._width = max(shutil.get_terminal_size((80, 24)).columns, self.MIN_WIDTH)

    @property
    def width(self) -> int:
        return self._width

    def _c(self, color: str, text: str) -> str:
        """Wrap text in a color code + reset."""
        return f"{color}{text}{ANSI.RESET}"

    def _p(self, color: str, text: str) -> None:
        """Print colored text."""
        print(f"{color}{text}{ANSI.RESET}")

    def clear(self) -> None:
        print(ANSI.CLEAR_SCREEN, end="", flush=True)

    # ---------------------------------------------------------------------------
    # HP bar
    # ---------------------------------------------------------------------------

    def _hp_bar(self, current: int, maximum: int, bar_width: int = 10) -> str:
        ratio = current / max(maximum, 1)
        filled = round(ratio * bar_width)
        empty = bar_width - filled
        color = (
            self.theme.danger if ratio <= 0.25
            else self.theme.accent if ratio <= 0.5
            else self.theme.primary
        )
        bar = self._c(color, "█" * filled) + self._c(self.theme.dim, "░" * empty)
        label = self._c(self.theme.accent, f" {current}/{maximum}")
        return f"HP: {bar}{label}"

    # ---------------------------------------------------------------------------
    # Header / stats
    # ---------------------------------------------------------------------------

    def _render_header(self, player: "Character") -> None:
        self._refresh_width()
        t = self.theme
        w = self.width

        title = f" {self.game_title} "
        hp_bar = self._hp_bar(player.current_hp, player.max_hp)
        ac_str  = self._c(t.accent, f"AC:{player.armor_class}")
        gp_str  = self._c(t.special, f"GP:{player.gold}")
        xp_str  = self._c(t.dim, f"XP:{player.experience}")
        lvl_str = self._c(t.accent, f"Lvl {player.level} {player.character_class}")

        # Top border
        border_color = t.primary
        print(self._c(border_color, "═" * w))

        # Title line
        left  = f" {self._c(t.accent, self.game_title)}"
        right_plain = (
            f"  {hp_bar}  {ac_str}  {gp_str}  {xp_str} "
        )
        # Pad to fill width (strip ANSI for length calculation)
        visible_len = len(_strip_ansi(left)) + len(_strip_ansi(right_plain))
        padding = " " * max(0, w - visible_len)
        print(f"{left}{padding}{right_plain}")

        # Character name / level line
        name_str = self._c(t.primary, f" {player.name}")
        right2 = self._c(t.dim, f"  {lvl_str} ")
        vis2 = len(_strip_ansi(name_str)) + len(_strip_ansi(right2))
        pad2 = " " * max(0, w - vis2)
        print(f"{name_str}{pad2}{right2}")

        print(self._c(border_color, "═" * w))

    def _render_attr_bar(self, player: "Character") -> None:
        """Render the attribute scores in a horizontal bar."""
        from .character import ATTRIBUTES
        t = self.theme
        parts = []
        for attr in ATTRIBUTES:
            score = player.get_attribute(attr)
            mod   = player.get_modifier(attr)
            mod_s = f"{'+' if mod >= 0 else ''}{mod}"
            parts.append(
                f"{self._c(t.dim, attr)}:{self._c(t.primary, str(score))}"
                f"{self._c(t.accent, f'({mod_s})')}"
            )
        bar = "  ".join(parts)
        print(f" {bar}")
        print(self._c(t.primary, "─" * self.width))

    # ---------------------------------------------------------------------------
    # Map rendering
    # ---------------------------------------------------------------------------

    MAP_WIDTH = 20   # columns reserved for the map panel

    def _render_map_line(self, line_chars: list) -> str:
        """Render a single map row with tile coloring."""
        t = self.theme
        result = []
        for ch, category in line_chars:
            if category == "wall":
                result.append(self._c(t.map_wall, ch))
            elif category == "player":
                result.append(self._c(t.map_player, ch))
            elif category == "special":
                result.append(self._c(t.special, ch))
            elif category == "enemy":
                result.append(self._c(t.danger, ch))
            elif category == "water":
                result.append(self._c(t.accent, ch))
            else:
                result.append(self._c(t.map_floor, ch))
        return "".join(result)

    # ---------------------------------------------------------------------------
    # Scene rendering
    # ---------------------------------------------------------------------------

    def render_scene(
        self,
        scene: "Scene",
        player: "Character",
        messages: Optional[List[str]] = None,
    ) -> None:
        """Full scene render: header, map+description, attrs, choices."""
        self.clear()
        self._render_header(player)

        t = self.theme
        w = self.width
        messages = messages or []

        # --- Map + description panel ---
        has_map = bool(scene.ascii_map)
        map_lines: List[str] = []
        colored_map_lines: List[str] = []

        if has_map:
            from .dungeon import DungeonMap
            if isinstance(scene.ascii_map, DungeonMap):
                render_data = scene.ascii_map.render_lines()
                for row_data in render_data:
                    colored_map_lines.append(
                        self._render_map_line(row_data).ljust(self.MAP_WIDTH)
                    )
                    map_lines.append(
                        "".join(ch for ch, _ in row_data).ljust(self.MAP_WIDTH)
                    )
            else:
                for raw_line in str(scene.ascii_map).strip("\n").splitlines():
                    from .dungeon import Tile
                    row_data = []
                    for ch in raw_line:
                        if ch == Tile.PLAYER:
                            row_data.append((ch, "player"))
                        elif ch == "#":
                            row_data.append((ch, "wall"))
                        elif ch in "$!&*":
                            row_data.append((ch, "special"))
                        elif ch in "gostTDB":
                            row_data.append((ch, "enemy"))
                        else:
                            row_data.append((ch, "floor"))
                    colored_map_lines.append(
                        self._render_map_line(row_data).ljust(self.MAP_WIDTH)
                    )
                    map_lines.append(raw_line.ljust(self.MAP_WIDTH))

        # Scene title
        print(f" {self._c(t.accent, scene.title.upper())}")
        print(self._c(t.dim, " " + "·" * (w - 2)))

        # Description – word-wrapped
        desc = scene.get_description(player)
        text_width = w - (self.MAP_WIDTH + 3) if has_map else w - 4
        desc_lines = _wrap(desc, text_width)

        # Recent messages below description
        msg_lines = []
        for msg in messages[-6:]:
            msg_lines.extend(_wrap(msg, text_width))

        all_text = desc_lines + ([""] if msg_lines else []) + [
            self._c(t.accent, l) if i < len(msg_lines) else l
            for i, l in enumerate(msg_lines)
        ]

        max_rows = max(len(colored_map_lines), len(all_text))
        MAP_COL_W = self.MAP_WIDTH + 2

        for i in range(max_rows):
            if has_map:
                map_col = colored_map_lines[i] if i < len(colored_map_lines) else " " * self.MAP_WIDTH
                sep = self._c(t.dim, " │ ")
                text_col = all_text[i] if i < len(all_text) else ""
                if i < len(desc_lines):
                    text_col = self._c(t.primary, text_col)
                else:
                    text_col = self._c(t.accent, _strip_ansi(text_col))
                print(f" {map_col}{sep}{text_col}")
            else:
                text_col = all_text[i] if i < len(all_text) else ""
                if i < len(desc_lines):
                    print(f"  {self._c(t.primary, text_col)}")
                else:
                    print(f"  {self._c(t.accent, _strip_ansi(text_col))}")

        print()
        print(self._c(t.primary, "─" * w))
        self._render_attr_bar(player)

        # --- Choices ---
        print(f" {self._c(t.dim, 'WHAT DO YOU DO?')}")
        choices = scene.numbered_choices(player)
        for choice in choices:
            available = choice.is_available(player)
            key_c   = self._c(t.accent, f"[{choice.key}]")
            text    = choice.display_text(player)
            if available:
                text_c = self._c(t.primary, text)
            else:
                text_c = self._c(t.dim, text)
            print(f"  {key_c} {text_c}")

        print(self._c(t.dim, "─" * w))

    # ---------------------------------------------------------------------------
    # Combat rendering
    # ---------------------------------------------------------------------------

    def render_combat(
        self,
        player: "Character",
        enemies: List["Enemy"],
        log: List[str],
    ) -> None:
        """Render the combat screen."""
        self.clear()
        self._render_header(player)
        t = self.theme
        w = self.width

        print(f" {self._c(t.danger, '*** COMBAT ***')}")
        print(self._c(t.dim, " " + "─" * (w - 2)))

        # Enemies
        for enemy in enemies:
            bar = self._hp_bar(enemy.current_hp, enemy.max_hp, 8)
            status = "ALIVE" if enemy.is_alive else "DEAD"
            color  = t.danger if enemy.is_alive else t.dim
            print(f"  {self._c(color, enemy.name.upper()):30s}  {bar}  AC:{enemy.armor_class}")

        print(self._c(t.dim, " " + "─" * (w - 2)))

        # Combat log (last 8 lines)
        for msg in log[-8:]:
            wrapped = _wrap(msg, w - 4)
            for line in wrapped:
                # Color lines containing player/enemy keywords
                if any(k in msg for k in ("hits", "CRITICAL", "VICTORY", "FALLEN")):
                    print(f"  {self._c(t.accent, line)}")
                elif any(k in msg for k in ("misses", "fumbles", "fled")):
                    print(f"  {self._c(t.dim, line)}")
                else:
                    print(f"  {self._c(t.primary, line)}")

        print(self._c(t.primary, "─" * w))
        self._render_attr_bar(player)

    def get_combat_action(self, player: "Character") -> str:
        """
        Show the combat action menu and return the player's choice.

        Returns: 'attack', 'flee', or 'item:<item_id>'
        """
        t = self.theme
        print(f" {self._c(t.dim, 'YOUR TURN:')}")
        print(f"  {self._c(t.accent, '[1]')} {self._c(t.primary, 'Attack')}")
        print(f"  {self._c(t.accent, '[2]')} {self._c(t.primary, 'Use item')}")
        print(f"  {self._c(t.accent, '[3]')} {self._c(t.danger, 'Flee')}")
        print(self._c(t.dim, "─" * self.width))

        while True:
            raw = self._get_input("> ").strip()
            if raw == "1":
                return "attack"
            if raw == "2":
                # Show inventory sub-menu
                from .inventory import ItemRegistry
                consumables = [
                    iid for iid in player.inventory
                    if ItemRegistry.get(iid) and ItemRegistry.get(iid).is_consumable  # type: ignore[union-attr]
                ]
                if not consumables:
                    print(self._c(t.dim, "  (No usable items)"))
                    continue
                print(f" {self._c(t.dim, 'USE WHICH ITEM?')}")
                for idx, iid in enumerate(consumables, 1):
                    item = ItemRegistry.get(iid)
                    print(f"  {self._c(t.accent, f'[{idx}]')} {self._c(t.primary, item.name if item else iid)}")  # type: ignore[union-attr]
                sub = self._get_input("> ").strip()
                try:
                    chosen = consumables[int(sub) - 1]
                    return f"item:{chosen}"
                except (ValueError, IndexError):
                    print(self._c(t.dim, "  Invalid choice."))
                    continue
            if raw == "3":
                return "flee"
            print(self._c(t.dim, "  Please enter 1, 2, or 3."))

    # ---------------------------------------------------------------------------
    # Character creation
    # ---------------------------------------------------------------------------

    def render_character_creation(
        self, classes: dict, game_title: str = ""
    ) -> Tuple[str, str]:
        """
        Interactive character creation screen.

        Returns (player_name, chosen_class_key).
        """
        self.clear()
        t = self.theme
        w = self.width
        title = game_title or self.game_title

        print(self._c(t.accent, "═" * w))
        print(self._c(t.accent, f"  {title}".center(w)))
        print(self._c(t.accent, "═" * w))
        print()
        print(self._c(t.primary, "  CREATE YOUR CHARACTER"))
        print(self._c(t.dim, "  " + "─" * (w - 4)))
        print()

        name = ""
        while not name.strip():
            raw = self._get_input(
                self._c(t.accent, "  Enter your name: ") + self._c(t.primary, "")
            )
            name = raw.strip()

        print()
        print(self._c(t.primary, "  CHOOSE YOUR CLASS:"))
        print()
        keys = list(classes.keys())
        for idx, key in enumerate(keys, 1):
            cls_data = classes[key]
            print(f"  {self._c(t.accent, f'[{idx}]')} {self._c(t.primary, key.upper())}")
            if isinstance(cls_data, dict) and "description" in cls_data:
                for line in _wrap(cls_data["description"], w - 10):
                    print(f"      {self._c(t.dim, line)}")
            print()

        chosen_key = ""
        while chosen_key not in keys:
            raw = self._get_input(self._c(t.accent, "  Your choice: ")).strip()
            try:
                idx = int(raw) - 1
                if 0 <= idx < len(keys):
                    chosen_key = keys[idx]
            except ValueError:
                if raw.upper() in [k.upper() for k in keys]:
                    chosen_key = next(k for k in keys if k.upper() == raw.upper())
            if not chosen_key:
                print(self._c(t.dim, "  Invalid choice. Try again."))

        return name, chosen_key

    # ---------------------------------------------------------------------------
    # Misc display helpers
    # ---------------------------------------------------------------------------

    def print_message(self, message: str, style: str = "primary") -> None:
        """Print a styled message line."""
        color_map = {
            "primary": self.theme.primary,
            "accent":  self.theme.accent,
            "dim":     self.theme.dim,
            "danger":  self.theme.danger,
            "special": self.theme.special,
        }
        color = color_map.get(style, self.theme.primary)
        for line in _wrap(message, self.width - 4):
            self._p(color, f"  {line}")

    def print_title_screen(self, title: str, subtitle: str = "", art: str = "") -> None:
        """Display a title/splash screen."""
        self.clear()
        t = self.theme
        w = self.width
        print()
        print(self._c(t.accent, "═" * w))
        if art:
            for line in art.strip("\n").splitlines():
                print(self._c(t.primary, line.center(w)))
        print()
        print(self._c(t.accent, title.upper().center(w)))
        if subtitle:
            print(self._c(t.dim, subtitle.center(w)))
        print(self._c(t.accent, "═" * w))
        print()

    def print_game_over(self, message: str = "YOU HAVE DIED") -> None:
        t = self.theme
        w = self.width
        self.clear()
        print()
        print(self._c(t.danger, "█" * w))
        print(self._c(t.danger, "  GAME OVER  ".center(w)))
        print(self._c(t.danger, "█" * w))
        print()
        for line in _wrap(message, w - 4):
            print(self._c(t.accent, f"  {line}"))
        print()

    def print_victory(self, message: str = "VICTORY!") -> None:
        t = self.theme
        w = self.width
        self.clear()
        print()
        print(self._c(t.accent, "★" * w))
        print(self._c(t.accent, "  VICTORY!  ".center(w)))
        print(self._c(t.accent, "★" * w))
        print()
        for line in _wrap(message, w - 4):
            print(self._c(t.primary, f"  {line}"))
        print()

    def ask_yes_no(self, question: str) -> bool:
        t = self.theme
        while True:
            raw = self._get_input(
                f"  {self._c(t.accent, question)} {self._c(t.dim, '[y/n]')} "
            ).strip().lower()
            if raw in ("y", "yes"):
                return True
            if raw in ("n", "no"):
                return False

    def press_any_key(self) -> None:
        self._get_input(
            self._c(self.theme.dim, "  [ Press ENTER to continue ] ")
        )

    def _get_input(self, prompt: str = "") -> str:
        try:
            return input(prompt)
        except (EOFError, KeyboardInterrupt):
            return ""


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from a string for length calculation."""
    import re
    return re.sub(r"\033\[[0-9;]*m", "", text)


def _wrap(text: str, width: int) -> List[str]:
    """Word-wrap text to the given width."""
    if width < 10:
        return [text]
    return textwrap.wrap(text, width=width) if text else [""]
