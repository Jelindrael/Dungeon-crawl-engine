"""
Item and inventory system for the Dungeon Crawl Engine.

Items are registered globally via ItemRegistry, then referenced by ID.
Characters store item IDs in their inventory list.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Item types
# ---------------------------------------------------------------------------

class ItemType:
    WEAPON    = "weapon"
    ARMOR     = "armor"
    SHIELD    = "shield"
    POTION    = "potion"
    SCROLL    = "scroll"
    KEY       = "key"
    TOOL      = "tool"
    MISC      = "misc"
    QUEST     = "quest"
    LIGHT     = "light"


# ---------------------------------------------------------------------------
# Item definition
# ---------------------------------------------------------------------------

@dataclass
class Item:
    """
    Defines a game item.

    Properties dict can contain:
        damage_dice  (str)  – weapon damage, e.g. "1d8"
        attack_bonus (int)  – bonus to attack rolls when wielded
        ac_bonus     (int)  – armor/shield bonus to AC
        heal_dice    (str)  – healing when consumed, e.g. "2d4+2"
        light_radius (int)  – illumination radius (for torches, lanterns)
        charges      (int)  – number of uses (for scrolls/wands)
        consumable   (bool) – removed from inventory after use
        two_handed   (bool) – requires both hands
        weight       (float)– encumbrance weight
    """
    item_id: str
    name: str
    description: str
    item_type: str = ItemType.MISC
    value: int = 0              # base value in gold pieces
    properties: Dict[str, Any] = field(default_factory=dict)

    # Shortcut properties
    @property
    def is_weapon(self) -> bool:
        return self.item_type == ItemType.WEAPON

    @property
    def is_armor(self) -> bool:
        return self.item_type in (ItemType.ARMOR, ItemType.SHIELD)

    @property
    def is_consumable(self) -> bool:
        return self.properties.get("consumable", self.item_type == ItemType.POTION)

    @property
    def damage_dice(self) -> Optional[str]:
        return self.properties.get("damage_dice")

    @property
    def attack_bonus(self) -> int:
        return self.properties.get("attack_bonus", 0)

    @property
    def ac_bonus(self) -> int:
        return self.properties.get("ac_bonus", 0)

    @property
    def heal_dice(self) -> Optional[str]:
        return self.properties.get("heal_dice")

    def __str__(self) -> str:
        parts = [self.name]
        if self.damage_dice:
            parts.append(f"[{self.damage_dice}]")
        if self.ac_bonus:
            parts.append(f"[AC+{self.ac_bonus}]")
        if self.heal_dice:
            parts.append(f"[Heals {self.heal_dice}]")
        return " ".join(parts)


# ---------------------------------------------------------------------------
# Global item registry
# ---------------------------------------------------------------------------

class ItemRegistry:
    """
    Global registry of all item definitions.
    Game creators register items here; the engine looks them up by ID.
    """
    _items: Dict[str, Item] = {}

    @classmethod
    def register(cls, item: Item) -> None:
        """Register an item definition."""
        cls._items[item.item_id] = item

    @classmethod
    def register_many(cls, items: List[Item]) -> None:
        """Register a list of item definitions."""
        for item in items:
            cls.register(item)

    @classmethod
    def get(cls, item_id: str) -> Optional[Item]:
        """Look up an item by ID. Returns None if not found."""
        return cls._items.get(item_id)

    @classmethod
    def require(cls, item_id: str) -> Item:
        """Look up an item by ID. Raises KeyError if not found."""
        item = cls._items.get(item_id)
        if item is None:
            raise KeyError(f"Unknown item ID: '{item_id}'")
        return item

    @classmethod
    def all_items(cls) -> List[Item]:
        return list(cls._items.values())

    @classmethod
    def clear(cls) -> None:
        """Clear the registry (useful for testing)."""
        cls._items.clear()


# ---------------------------------------------------------------------------
# Inventory helper (operates on a Character)
# ---------------------------------------------------------------------------

class Inventory:
    """
    Utility class for working with a character's inventory.
    Does not store state itself – all data lives on the Character.
    """

    def __init__(self, character) -> None:
        self._char = character

    def items(self) -> List[Item]:
        """Return a list of Item objects in the character's inventory."""
        result = []
        for item_id in self._char.inventory:
            item = ItemRegistry.get(item_id)
            if item:
                result.append(item)
        return result

    def add(self, item_id: str) -> bool:
        """Add an item by ID. Returns True if item exists in registry."""
        if ItemRegistry.get(item_id) is None:
            return False
        self._char.inventory.append(item_id)
        return True

    def remove(self, item_id: str) -> bool:
        """Remove first occurrence of item. Returns True if removed."""
        return self._char.remove_item(item_id)

    def has(self, item_id: str) -> bool:
        return item_id in self._char.inventory

    def count(self, item_id: str) -> int:
        return self._char.inventory.count(item_id)

    def total_value(self) -> int:
        return sum(i.value for i in self.items())

    def weapons(self) -> List[Item]:
        return [i for i in self.items() if i.is_weapon]

    def consumables(self) -> List[Item]:
        return [i for i in self.items() if i.is_consumable]

    def display_list(self) -> List[str]:
        """Return formatted strings for display."""
        if not self._char.inventory:
            return ["(empty)"]
        seen: Dict[str, int] = {}
        for iid in self._char.inventory:
            seen[iid] = seen.get(iid, 0) + 1
        lines = []
        for iid, qty in seen.items():
            item = ItemRegistry.get(iid)
            if item:
                name = item.name if qty == 1 else f"{item.name} x{qty}"
                lines.append(name)
        return lines
