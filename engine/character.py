"""
Character system for the Dungeon Crawl Engine.

Implements D&D 5e-inspired attributes, skills, proficiencies,
hit points, leveling, and dice-based checks.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .dice import Dice, RollResult


# ---------------------------------------------------------------------------
# Attribute metadata
# ---------------------------------------------------------------------------

ATTRIBUTES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]

ATTRIBUTE_NAMES = {
    "STR": "Strength",
    "DEX": "Dexterity",
    "CON": "Constitution",
    "INT": "Intelligence",
    "WIS": "Wisdom",
    "CHA": "Charisma",
}

# Skill -> governing attribute
SKILL_ATTRIBUTES: Dict[str, str] = {
    "Athletics":       "STR",
    "Acrobatics":      "DEX",
    "Sleight of Hand": "DEX",
    "Stealth":         "DEX",
    "Arcana":          "INT",
    "History":         "INT",
    "Investigation":   "INT",
    "Nature":          "INT",
    "Religion":        "INT",
    "Animal Handling": "WIS",
    "Insight":         "WIS",
    "Medicine":        "WIS",
    "Perception":      "WIS",
    "Survival":        "WIS",
    "Deception":       "CHA",
    "Intimidation":    "CHA",
    "Performance":     "CHA",
    "Persuasion":      "CHA",
}

# Proficiency bonus by character level
PROFICIENCY_BY_LEVEL = {
    1: 2,  2: 2,  3: 2,  4: 2,
    5: 3,  6: 3,  7: 3,  8: 3,
    9: 4,  10: 4, 11: 4, 12: 4,
    13: 5, 14: 5, 15: 5, 16: 5,
    17: 6, 18: 6, 19: 6, 20: 6,
}

# XP thresholds for each level
XP_THRESHOLDS = {
    1: 0,     2: 300,   3: 900,   4: 2700,
    5: 6500,  6: 14000, 7: 23000, 8: 34000,
    9: 48000, 10: 64000,
}


# ---------------------------------------------------------------------------
# Character class
# ---------------------------------------------------------------------------

@dataclass
class Character:
    """
    Represents a player character or NPC.

    Attributes follow D&D 5e conventions (3-20 range, modifier = (score-10)//2).
    """
    name: str
    character_class: str = "Adventurer"
    level: int = 1
    experience: int = 0

    # Core attributes (STR/DEX/CON/INT/WIS/CHA)
    attributes: Dict[str, int] = field(default_factory=lambda: {
        "STR": 10, "DEX": 10, "CON": 10,
        "INT": 10, "WIS": 10, "CHA": 10,
    })

    # Hit points
    max_hp: int = 10
    current_hp: int = 10

    # Combat
    armor_class: int = 10
    attack_bonus: int = 0
    damage_dice: str = "1d4"

    # Proficiencies: list of skill names the character is trained in
    proficiencies: List[str] = field(default_factory=list)

    # Saving throw proficiencies (list of attribute abbreviations)
    save_proficiencies: List[str] = field(default_factory=list)

    # Item IDs currently in inventory
    inventory: List[str] = field(default_factory=list)

    # Gold pieces
    gold: int = 0

    # Active conditions (e.g. "poisoned", "blinded")
    conditions: List[str] = field(default_factory=list)

    # Story flags - arbitrary key/value pairs for narrative tracking
    flags: Dict[str, Any] = field(default_factory=dict)

    # ---------------------------------------------------------------------------
    # Properties
    # ---------------------------------------------------------------------------

    @property
    def is_alive(self) -> bool:
        return self.current_hp > 0

    @property
    def hp_ratio(self) -> float:
        """Current HP as a fraction of max HP (0.0 - 1.0)."""
        return self.current_hp / max(self.max_hp, 1)

    @property
    def proficiency_bonus(self) -> int:
        return PROFICIENCY_BY_LEVEL.get(self.level, 2)

    @property
    def xp_to_next_level(self) -> int:
        """XP required to reach the next level (0 if at max)."""
        next_lvl = self.level + 1
        return XP_THRESHOLDS.get(next_lvl, 0) - self.experience

    # ---------------------------------------------------------------------------
    # Attribute helpers
    # ---------------------------------------------------------------------------

    def get_attribute(self, attr: str) -> int:
        """Return the raw score for an attribute abbreviation (e.g. 'STR')."""
        return self.attributes.get(attr.upper(), 10)

    def get_modifier(self, attr: str) -> int:
        """Return the D&D modifier for an attribute: (score - 10) // 2."""
        return Dice.attribute_modifier(self.get_attribute(attr))

    def modifier_str(self, attr: str) -> str:
        """Return modifier as a signed string, e.g. '+2' or '-1'."""
        mod = self.get_modifier(attr)
        return f"{'+' if mod >= 0 else ''}{mod}"

    # ---------------------------------------------------------------------------
    # Skill helpers
    # ---------------------------------------------------------------------------

    def get_skill_modifier(self, skill: str) -> int:
        """Return total skill modifier including proficiency bonus if applicable."""
        governing = SKILL_ATTRIBUTES.get(skill)
        if governing is None:
            return 0
        base = self.get_modifier(governing)
        if skill in self.proficiencies:
            return base + self.proficiency_bonus
        return base

    def skill_modifier_str(self, skill: str) -> str:
        mod = self.get_skill_modifier(skill)
        return f"{'+' if mod >= 0 else ''}{mod}"

    # ---------------------------------------------------------------------------
    # Rolls
    # ---------------------------------------------------------------------------

    def roll_skill_check(
        self,
        skill: str,
        dc: int,
        advantage: bool = False,
        disadvantage: bool = False,
    ) -> Tuple[RollResult, bool]:
        """Roll a skill check. Returns (RollResult, success)."""
        modifier = self.get_skill_modifier(skill)
        return Dice.skill_check(modifier, dc, advantage, disadvantage)

    def roll_saving_throw(
        self,
        attribute: str,
        dc: int,
        advantage: bool = False,
        disadvantage: bool = False,
    ) -> Tuple[RollResult, bool]:
        """Roll a saving throw for an attribute. Returns (RollResult, success)."""
        modifier = self.get_modifier(attribute)
        if attribute.upper() in self.save_proficiencies:
            modifier += self.proficiency_bonus
        return Dice.skill_check(modifier, dc, advantage, disadvantage)

    def roll_initiative(self) -> RollResult:
        """Roll initiative: d20 + DEX modifier."""
        return Dice.roll(20, 1, self.get_modifier("DEX"))

    def roll_attack(self) -> RollResult:
        """Roll an attack: d20 + attack_bonus."""
        return Dice.roll(20, 1, self.attack_bonus)

    def roll_damage(self) -> RollResult:
        """Roll weapon damage using damage_dice notation."""
        return Dice.parse(self.damage_dice)

    # ---------------------------------------------------------------------------
    # HP management
    # ---------------------------------------------------------------------------

    def take_damage(self, amount: int) -> int:
        """Apply damage. Returns the actual damage taken."""
        actual = min(amount, self.current_hp)
        self.current_hp = max(0, self.current_hp - amount)
        return actual

    def heal(self, amount: int) -> int:
        """Restore HP up to maximum. Returns the actual amount healed."""
        actual = min(amount, self.max_hp - self.current_hp)
        self.current_hp = min(self.max_hp, self.current_hp + amount)
        return actual

    def heal_dice(self, notation: str) -> Tuple[int, RollResult]:
        """Roll heal dice and apply healing. Returns (healed, roll)."""
        result = Dice.parse(notation)
        healed = self.heal(result.total)
        return healed, result

    # ---------------------------------------------------------------------------
    # Leveling
    # ---------------------------------------------------------------------------

    def gain_experience(self, xp: int) -> bool:
        """Add XP. Returns True if the character leveled up."""
        self.experience += xp
        new_level = self.level
        for lvl in sorted(XP_THRESHOLDS.keys(), reverse=True):
            if self.experience >= XP_THRESHOLDS[lvl]:
                new_level = lvl
                break
        if new_level > self.level:
            self.level = new_level
            return True
        return False

    # ---------------------------------------------------------------------------
    # Inventory helpers
    # ---------------------------------------------------------------------------

    def has_item(self, item_id: str) -> bool:
        return item_id in self.inventory

    def add_item(self, item_id: str) -> None:
        self.inventory.append(item_id)

    def remove_item(self, item_id: str) -> bool:
        if item_id in self.inventory:
            self.inventory.remove(item_id)
            return True
        return False

    # ---------------------------------------------------------------------------
    # Flags (story state)
    # ---------------------------------------------------------------------------

    def set_flag(self, key: str, value: Any = True) -> None:
        self.flags[key] = value

    def get_flag(self, key: str, default: Any = None) -> Any:
        return self.flags.get(key, default)

    def has_flag(self, key: str) -> bool:
        return key in self.flags and bool(self.flags[key])

    # ---------------------------------------------------------------------------
    # Serialization
    # ---------------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "character_class": self.character_class,
            "level": self.level,
            "experience": self.experience,
            "attributes": self.attributes,
            "max_hp": self.max_hp,
            "current_hp": self.current_hp,
            "armor_class": self.armor_class,
            "attack_bonus": self.attack_bonus,
            "damage_dice": self.damage_dice,
            "proficiencies": self.proficiencies,
            "save_proficiencies": self.save_proficiencies,
            "inventory": self.inventory,
            "gold": self.gold,
            "conditions": self.conditions,
            "flags": self.flags,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Character":
        return cls(**data)

    def __str__(self) -> str:
        attrs = "  ".join(
            f"{k}:{self.get_attribute(k)}({self.modifier_str(k)})"
            for k in ATTRIBUTES
        )
        return (
            f"{self.name}  Lvl {self.level} {self.character_class}  "
            f"HP:{self.current_hp}/{self.max_hp}  AC:{self.armor_class}  "
            f"GP:{self.gold}\n{attrs}"
        )
