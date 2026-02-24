"""
Scene and narrative system for the Dungeon Crawl Engine.

A scene is the fundamental unit of gameplay: a location, situation, or moment
that presents the player with a description and a set of choices.

Choices can require skill checks, items, or flags, and trigger cascading
effects like moving to a new scene, giving/removing items, dealing damage, etc.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

if TYPE_CHECKING:
    from .character import Character
    from .dungeon import DungeonMap


# ---------------------------------------------------------------------------
# Effect types
# ---------------------------------------------------------------------------

class EffectType:
    GOTO         = "goto"          # move to scene_id
    GIVE_ITEM    = "give_item"     # add item_id to inventory
    REMOVE_ITEM  = "remove_item"   # remove item_id from inventory
    DAMAGE       = "damage"        # deal dice/amount damage to player
    HEAL         = "heal"          # heal dice/amount HP
    SET_FLAG     = "set_flag"      # set a story flag
    CLEAR_FLAG   = "clear_flag"    # remove a story flag
    GAIN_XP      = "gain_xp"      # award XP
    GIVE_GOLD    = "give_gold"     # award gold
    TAKE_GOLD    = "take_gold"     # deduct gold
    COMBAT       = "combat"        # start a combat encounter
    SAY          = "say"           # display a message line
    GAME_OVER    = "game_over"     # player dies / game over
    VICTORY      = "victory"       # player wins the game


@dataclass
class Effect:
    """A single game-state mutation triggered by a choice or event."""
    type: str
    params: Dict[str, Any] = field(default_factory=dict)

    # ---------------------------------------------------------------------------
    # Factory helpers for readable scene authoring
    # ---------------------------------------------------------------------------

    @staticmethod
    def goto(scene_id: str) -> "Effect":
        return Effect(EffectType.GOTO, {"scene_id": scene_id})

    @staticmethod
    def give_item(item_id: str) -> "Effect":
        return Effect(EffectType.GIVE_ITEM, {"item_id": item_id})

    @staticmethod
    def remove_item(item_id: str) -> "Effect":
        return Effect(EffectType.REMOVE_ITEM, {"item_id": item_id})

    @staticmethod
    def damage(amount: int = 0, dice: str = "") -> "Effect":
        return Effect(EffectType.DAMAGE, {"amount": amount, "dice": dice})

    @staticmethod
    def heal(amount: int = 0, dice: str = "") -> "Effect":
        return Effect(EffectType.HEAL, {"amount": amount, "dice": dice})

    @staticmethod
    def set_flag(key: str, value: Any = True) -> "Effect":
        return Effect(EffectType.SET_FLAG, {"key": key, "value": value})

    @staticmethod
    def clear_flag(key: str) -> "Effect":
        return Effect(EffectType.CLEAR_FLAG, {"key": key})

    @staticmethod
    def gain_xp(amount: int) -> "Effect":
        return Effect(EffectType.GAIN_XP, {"amount": amount})

    @staticmethod
    def give_gold(amount: int) -> "Effect":
        return Effect(EffectType.GIVE_GOLD, {"amount": amount})

    @staticmethod
    def take_gold(amount: int) -> "Effect":
        return Effect(EffectType.TAKE_GOLD, {"amount": amount})

    @staticmethod
    def combat(enemies: List[Any]) -> "Effect":
        return Effect(EffectType.COMBAT, {"enemies": enemies})

    @staticmethod
    def say(message: str) -> "Effect":
        return Effect(EffectType.SAY, {"message": message})

    @staticmethod
    def game_over(message: str = "You have died.") -> "Effect":
        return Effect(EffectType.GAME_OVER, {"message": message})

    @staticmethod
    def victory(message: str = "Victory!") -> "Effect":
        return Effect(EffectType.VICTORY, {"message": message})


# ---------------------------------------------------------------------------
# Skill check within a choice
# ---------------------------------------------------------------------------

@dataclass
class SkillCheck:
    """
    A dice-based check embedded in a Choice.

    On success/failure, distinct effect lists are applied.
    """
    skill: str                         # e.g. "Perception", "Athletics"
    dc: int                            # Difficulty Class
    on_success: List[Effect] = field(default_factory=list)
    on_failure: List[Effect] = field(default_factory=list)
    advantage: bool = False
    disadvantage: bool = False

    def label(self) -> str:
        """Short label for display, e.g. '[Perception DC 12]'."""
        return f"[{self.skill} DC {self.dc}]"


# ---------------------------------------------------------------------------
# Choice requirement (gate)
# ---------------------------------------------------------------------------

@dataclass
class Requirement:
    """
    Defines when a choice is available to the player.

    All specified conditions must be true for the choice to appear.
    """
    has_item: Optional[str] = None          # must have this item
    no_item: Optional[str] = None           # must NOT have this item
    has_flag: Optional[str] = None          # flag must be set (truthy)
    no_flag: Optional[str] = None           # flag must NOT be set
    flag_value: Optional[Dict[str, Any]] = None  # {key: exact_value}
    min_attribute: Optional[Dict[str, int]] = None  # {"STR": 15, ...}
    min_level: Optional[int] = None
    min_gold: Optional[int] = None
    min_hp_ratio: Optional[float] = None    # min HP fraction (0.0-1.0)
    max_hp_ratio: Optional[float] = None    # max HP fraction (0.0-1.0)

    def is_met(self, character: "Character") -> bool:
        """Return True if all conditions are satisfied."""
        if self.has_item and not character.has_item(self.has_item):
            return False
        if self.no_item and character.has_item(self.no_item):
            return False
        if self.has_flag and not character.has_flag(self.has_flag):
            return False
        if self.no_flag and character.has_flag(self.no_flag):
            return False
        if self.flag_value:
            for k, v in self.flag_value.items():
                if character.get_flag(k) != v:
                    return False
        if self.min_attribute:
            for attr, minimum in self.min_attribute.items():
                if character.get_attribute(attr) < minimum:
                    return False
        if self.min_level and character.level < self.min_level:
            return False
        if self.min_gold and character.gold < self.min_gold:
            return False
        if self.min_hp_ratio and character.hp_ratio < self.min_hp_ratio:
            return False
        if self.max_hp_ratio and character.hp_ratio > self.max_hp_ratio:
            return False
        return True

    def hint(self) -> str:
        """Human-readable hint about why this choice is gated."""
        parts = []
        if self.has_item:
            parts.append(f"requires {self.has_item}")
        if self.min_attribute:
            for attr, val in self.min_attribute.items():
                parts.append(f"{attr} {val}+")
        if self.min_level:
            parts.append(f"Level {self.min_level}+")
        if self.min_gold:
            parts.append(f"{self.min_gold} GP")
        return ", ".join(parts) if parts else ""


# ---------------------------------------------------------------------------
# Choice
# ---------------------------------------------------------------------------

@dataclass
class Choice:
    """
    A single player option within a scene.

    Can have a requirement gate, an optional skill check, and
    a list of effects that execute when chosen.
    """
    text: str
    effects: List[Effect] = field(default_factory=list)
    skill_check: Optional[SkillCheck] = None
    requirement: Optional[Requirement] = None
    key: str = ""  # auto-assigned by Scene if empty

    def is_available(self, character: "Character") -> bool:
        if self.requirement is None:
            return True
        return self.requirement.is_met(character)

    def display_text(self, character: "Character") -> str:
        """
        Return the choice text with appended hints about requirements
        and skill checks.
        """
        text = self.text
        if self.skill_check:
            text += f"  {self.skill_check.label()}"
        if self.requirement and not self.requirement.is_met(character):
            hint = self.requirement.hint()
            text += f"  [Requires: {hint}]" if hint else "  [Unavailable]"
        return text

    # Convenience constructors
    @staticmethod
    def go(text: str, scene_id: str, **kwargs) -> "Choice":
        """Simple navigation choice."""
        return Choice(text=text, effects=[Effect.goto(scene_id)], **kwargs)

    @staticmethod
    def checked(
        text: str,
        skill: str,
        dc: int,
        on_success: List[Effect],
        on_failure: List[Effect],
        **kwargs,
    ) -> "Choice":
        """Choice that requires a skill check."""
        return Choice(
            text=text,
            skill_check=SkillCheck(
                skill=skill,
                dc=dc,
                on_success=on_success,
                on_failure=on_failure,
            ),
            **kwargs,
        )


# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------

@dataclass
class Scene:
    """
    A single scene/location in the game.

    scene_id must be unique across the game.
    """
    scene_id: str
    title: str
    description: str                          # supports {player.name} substitution
    ascii_map: Optional[str] = None           # multiline string OR DungeonMap
    choices: List[Choice] = field(default_factory=list)
    on_enter: List[Effect] = field(default_factory=list)  # effects on arrival
    tags: List[str] = field(default_factory=list)         # e.g. ["combat", "rest"]

    def get_description(self, character: "Character") -> str:
        """Return description with player-specific substitutions."""
        try:
            return self.description.format(player=character)
        except (KeyError, AttributeError):
            return self.description

    def available_choices(self, character: "Character") -> List[Choice]:
        """Return only choices whose requirements are satisfied."""
        return [c for c in self.choices if c.is_available(character)]

    def numbered_choices(self, character: "Character") -> List[Choice]:
        """
        Return available choices with auto-assigned numeric keys.
        Keys are set as side-effects on the Choice objects.
        """
        available = self.available_choices(character)
        for idx, choice in enumerate(available, 1):
            choice.key = str(idx)
        return available

    def find_choice(self, key: str, character: "Character") -> Optional[Choice]:
        """Look up an available choice by its key."""
        for choice in self.numbered_choices(character):
            if choice.key == key:
                return choice
        return None


# ---------------------------------------------------------------------------
# Scene registry
# ---------------------------------------------------------------------------

class SceneRegistry:
    """Global registry of all scenes in the game."""
    _scenes: Dict[str, Scene] = {}

    @classmethod
    def register(cls, scene: Scene) -> None:
        cls._scenes[scene.scene_id] = scene

    @classmethod
    def register_many(cls, scenes: List[Scene]) -> None:
        for scene in scenes:
            cls.register(scene)

    @classmethod
    def get(cls, scene_id: str) -> Optional[Scene]:
        return cls._scenes.get(scene_id)

    @classmethod
    def require(cls, scene_id: str) -> Scene:
        scene = cls._scenes.get(scene_id)
        if scene is None:
            raise KeyError(f"Unknown scene ID: '{scene_id}'")
        return scene

    @classmethod
    def clear(cls) -> None:
        cls._scenes.clear()

    @classmethod
    def all_scenes(cls) -> List[Scene]:
        return list(cls._scenes.values())
