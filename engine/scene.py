"""
Scene / narrative system.

A Scene is a location or situation. It has:
  - A title and description
  - An optional tile map and/or illustration
  - A list of player choices
  - Entry effects

Effects use a simple string-keyed vocabulary that GameState interprets.
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Effect vocabulary
# ---------------------------------------------------------------------------

class FX:
    """Effect type constants."""
    GOTO        = "goto"
    GIVE_ITEM   = "give_item"
    REMOVE_ITEM = "remove_item"
    DAMAGE      = "damage"
    HEAL        = "heal"
    SET_FLAG    = "set_flag"
    CLEAR_FLAG  = "clear_flag"
    GAIN_XP     = "gain_xp"
    GIVE_GOLD   = "give_gold"
    TAKE_GOLD   = "take_gold"
    SAN_LOSS    = "san_loss"        # params: fail_dice, success_dice
    COMBAT      = "combat"          # params: enemies (list of enemy dicts)
    DIALOGUE    = "dialogue"        # params: dialogue_id
    SAY         = "say"             # params: message
    GAME_OVER   = "game_over"       # params: message
    VICTORY     = "victory"         # params: message
    SKILL_CHECK = "skill_check"     # inline skill check with branches
    LOAD_MAP    = "load_map"        # params: map_id
    SHOW_ART    = "show_art"        # params: illustration_id


@dataclass
class Effect:
    """A single game-state mutation."""
    type:   str
    params: Dict[str, Any] = field(default_factory=dict)

    # Factories
    @staticmethod
    def goto(scene_id: str) -> "Effect":
        return Effect(FX.GOTO, {"scene_id": scene_id})

    @staticmethod
    def give_item(name: str) -> "Effect":
        return Effect(FX.GIVE_ITEM, {"name": name})

    @staticmethod
    def remove_item(name: str) -> "Effect":
        return Effect(FX.REMOVE_ITEM, {"name": name})

    @staticmethod
    def damage(amount: int = 0, dice: str = "") -> "Effect":
        return Effect(FX.DAMAGE, {"amount": amount, "dice": dice})

    @staticmethod
    def heal(amount: int = 0, dice: str = "") -> "Effect":
        return Effect(FX.HEAL, {"amount": amount, "dice": dice})

    @staticmethod
    def set_flag(key: str, value: Any = True) -> "Effect":
        return Effect(FX.SET_FLAG, {"key": key, "value": value})

    @staticmethod
    def clear_flag(key: str) -> "Effect":
        return Effect(FX.CLEAR_FLAG, {"key": key})

    @staticmethod
    def san_loss(fail_dice: str, success_dice: str = "0") -> "Effect":
        return Effect(FX.SAN_LOSS, {"fail_dice": fail_dice, "success_dice": success_dice})

    @staticmethod
    def give_gold(amount: int) -> "Effect":
        return Effect(FX.GIVE_GOLD, {"amount": amount})

    @staticmethod
    def take_gold(amount: int) -> "Effect":
        return Effect(FX.TAKE_GOLD, {"amount": amount})

    @staticmethod
    def say(message: str) -> "Effect":
        return Effect(FX.SAY, {"message": message})

    @staticmethod
    def game_over(message: str = "The darkness claims you.") -> "Effect":
        return Effect(FX.GAME_OVER, {"message": message})

    @staticmethod
    def victory(message: str = "You have survived.") -> "Effect":
        return Effect(FX.VICTORY, {"message": message})

    @staticmethod
    def dialogue(dialogue_id: str) -> "Effect":
        return Effect(FX.DIALOGUE, {"dialogue_id": dialogue_id})

    @staticmethod
    def load_map(map_id: str) -> "Effect":
        return Effect(FX.LOAD_MAP, {"map_id": map_id})

    @staticmethod
    def show_art(illustration_id: str) -> "Effect":
        return Effect(FX.SHOW_ART, {"illustration_id": illustration_id})

    def to_dict(self) -> dict:
        return {"type": self.type, "params": self.params}

    @classmethod
    def from_dict(cls, d: dict) -> "Effect":
        return cls(type=d["type"], params=d.get("params", {}))


# ---------------------------------------------------------------------------
# Requirement gate
# ---------------------------------------------------------------------------

@dataclass
class Requirement:
    has_item:       Optional[str]        = None
    no_item:        Optional[str]        = None
    has_flag:       Optional[str]        = None
    no_flag:        Optional[str]        = None
    min_gold:       Optional[int]        = None
    skill_check:    Optional[Dict[str, Any]] = None   # {"skill": "...", "on_success": [...], "on_failure": [...]}
    min_skill:      Optional[Dict[str, int]] = None

    def is_met(self, investigator) -> bool:
        if self.has_item and not investigator.has_item(self.has_item):
            return False
        if self.no_item and investigator.has_item(self.no_item):
            return False
        if self.has_flag and not investigator.has_flag(self.has_flag):
            return False
        if self.no_flag and investigator.has_flag(self.no_flag):
            return False
        if self.min_gold and investigator.cash < self.min_gold:
            return False
        if self.min_skill:
            for skill, minimum in self.min_skill.items():
                if investigator.skills.get(skill, 0) < minimum:
                    return False
        return True

    def hint(self) -> str:
        parts = []
        if self.has_item:
            parts.append(f"Need: {self.has_item}")
        if self.min_gold:
            parts.append(f"${self.min_gold}")
        if self.min_skill:
            for s, v in self.min_skill.items():
                parts.append(f"{s} {v}%")
        if self.has_flag:
            parts.append(f"[{self.has_flag}]")
        return ", ".join(parts)

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}

    @classmethod
    def from_dict(cls, d: dict) -> "Requirement":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# ---------------------------------------------------------------------------
# Skill check embedded in a choice
# ---------------------------------------------------------------------------

@dataclass
class SkillCheck:
    skill:          str
    on_success:     List[Effect]    = field(default_factory=list)
    on_failure:     List[Effect]    = field(default_factory=list)
    bonus_dice:     int             = 0     # positive = bonus, negative = penalty
    push:           bool            = False

    def label(self) -> str:
        bonus = ""
        if self.bonus_dice > 0:
            bonus = f" +{self.bonus_dice}B"
        elif self.bonus_dice < 0:
            bonus = f" {self.bonus_dice}P"
        return f"[{self.skill}{bonus}]"

    def to_dict(self) -> dict:
        return {
            "skill": self.skill,
            "on_success": [e.to_dict() for e in self.on_success],
            "on_failure": [e.to_dict() for e in self.on_failure],
            "bonus_dice": self.bonus_dice,
            "push": self.push,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "SkillCheck":
        return cls(
            skill=d["skill"],
            on_success=[Effect.from_dict(e) for e in d.get("on_success", [])],
            on_failure=[Effect.from_dict(e) for e in d.get("on_failure", [])],
            bonus_dice=d.get("bonus_dice", 0),
            push=d.get("push", False),
        )


# ---------------------------------------------------------------------------
# Choice
# ---------------------------------------------------------------------------

@dataclass
class Choice:
    text:        str
    effects:     List[Effect]           = field(default_factory=list)
    skill_check: Optional[SkillCheck]   = None
    requirement: Optional[Requirement]  = None
    key:         str                    = ""

    def is_available(self, investigator) -> bool:
        if self.requirement is None:
            return True
        return self.requirement.is_met(investigator)

    def display_text(self, investigator) -> str:
        text = self.text
        if self.skill_check:
            text += f"  {self.skill_check.label()}"
        if self.requirement and not self.requirement.is_met(investigator):
            hint = self.requirement.hint()
            text += f"  [Locked: {hint}]" if hint else "  [Unavailable]"
        return text

    # Factories
    @staticmethod
    def go(text: str, scene_id: str, **kwargs) -> "Choice":
        return Choice(text=text, effects=[Effect.goto(scene_id)], **kwargs)

    @staticmethod
    def checked(
        text: str, skill: str,
        on_success: List[Effect], on_failure: List[Effect], **kwargs
    ) -> "Choice":
        return Choice(
            text=text,
            skill_check=SkillCheck(skill=skill, on_success=on_success, on_failure=on_failure),
            **kwargs,
        )

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "effects": [e.to_dict() for e in self.effects],
            "skill_check": self.skill_check.to_dict() if self.skill_check else None,
            "requirement": self.requirement.to_dict() if self.requirement else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Choice":
        sc  = SkillCheck.from_dict(d["skill_check"]) if d.get("skill_check") else None
        req = Requirement.from_dict(d["requirement"]) if d.get("requirement") else None
        return cls(
            text=d["text"],
            effects=[Effect.from_dict(e) for e in d.get("effects", [])],
            skill_check=sc,
            requirement=req,
        )


# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------

@dataclass
class Scene:
    scene_id:      str
    title:         str
    description:   str
    choices:       List[Choice]     = field(default_factory=list)
    on_enter:      List[Effect]     = field(default_factory=list)
    illustration:  Optional[str]    = None    # sprite/illustration id
    map_id:        Optional[str]    = None    # tile map id
    ambient:       Optional[str]    = None    # ambient sound name
    tags:          List[str]        = field(default_factory=list)

    def get_description(self, investigator=None) -> str:
        try:
            return self.description.format(inv=investigator) if investigator else self.description
        except (KeyError, AttributeError):
            return self.description

    def available_choices(self, investigator) -> List[Choice]:
        return [c for c in self.choices if c.is_available(investigator)]

    def numbered_choices(self, investigator) -> List[Choice]:
        choices = self.available_choices(investigator)
        for i, c in enumerate(choices, 1):
            c.key = str(i)
        return choices

    def find_choice(self, key: str, investigator) -> Optional[Choice]:
        for c in self.numbered_choices(investigator):
            if c.key == key:
                return c
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.scene_id,
            "title": self.title,
            "description": self.description,
            "choices": [c.to_dict() for c in self.choices],
            "on_enter": [e.to_dict() for e in self.on_enter],
            "illustration": self.illustration,
            "map_id": self.map_id,
            "tags": self.tags,
        }

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, d: dict) -> "Scene":
        choices = [Choice.from_dict(c) for c in d.get("choices", [])]
        on_enter = [Effect.from_dict(e) for e in d.get("on_enter", [])]
        return cls(
            scene_id=d["id"],
            title=d["title"],
            description=d["description"],
            choices=choices,
            on_enter=on_enter,
            illustration=d.get("illustration"),
            map_id=d.get("map_id"),
            tags=d.get("tags", []),
        )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

class SceneRegistry:
    _scenes: Dict[str, Scene] = {}

    @classmethod
    def register(cls, scene: Scene) -> None:
        cls._scenes[scene.scene_id] = scene

    @classmethod
    def register_many(cls, scenes: List[Scene]) -> None:
        for s in scenes:
            cls.register(s)

    @classmethod
    def get(cls, scene_id: str) -> Optional[Scene]:
        return cls._scenes.get(scene_id)

    @classmethod
    def require(cls, scene_id: str) -> Scene:
        s = cls._scenes.get(scene_id)
        if s is None:
            raise KeyError(f"Scene not found: {scene_id!r}")
        return s

    @classmethod
    def clear(cls) -> None:
        cls._scenes.clear()
