"""
Call of Cthulhu 7th Edition rules engine.

Implements:
  - 8 characteristics (STR, CON, SIZ, DEX, APP, INT, POW, EDU)
  - Derived statistics (HP, MP, SAN, Luck, Damage Bonus, Build, Move)
  - Percentile skill system with Regular/Hard/Extreme/Fumble success levels
  - Bonus and Penalty dice
  - Sanity mechanics (temporary & indefinite insanity)
  - Push mechanic
  - Basic combat (Fighting, Dodge, firearms)
  - Investigator character sheet
"""
from __future__ import annotations
import json
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Dice helpers
# ---------------------------------------------------------------------------

def _d(sides: int, count: int = 1, bonus: int = 0) -> int:
    return sum(random.randint(1, sides) for _ in range(count)) + bonus

def d3()  -> int: return _d(3)
def d4()  -> int: return _d(4)
def d6()  -> int: return _d(6)
def d8()  -> int: return _d(8)
def d10() -> int: return _d(10)
def d100() -> int: return _d(100)


def roll_percentile() -> Tuple[int, int]:
    """
    Roll d100 using the two-die method.
    Returns (total, tens_digit_raw) where tens_digit_raw ∈ {0,10,…,90}.
    """
    tens   = random.randint(0, 9) * 10
    units  = random.randint(0, 9)
    total  = tens + units if (tens + units) != 0 else 100
    return total, tens


def roll_with_bonus(bonus_dice: int = 0) -> int:
    """
    Roll d100 with bonus or penalty dice.
    bonus_dice > 0 = bonus dice (take lowest tens), < 0 = penalty dice (take highest tens).
    """
    units  = random.randint(0, 9)
    count  = abs(bonus_dice) + 1
    tens_rolls = [random.randint(0, 9) * 10 for _ in range(count)]

    if bonus_dice > 0:
        tens = min(tens_rolls)   # bonus: take best (lowest)
    elif bonus_dice < 0:
        tens = max(tens_rolls)   # penalty: take worst (highest)
    else:
        tens = tens_rolls[0]

    result = tens + units
    return result if result != 0 else 100


# ---------------------------------------------------------------------------
# Skill check result
# ---------------------------------------------------------------------------

class SuccessLevel(Enum):
    EXTREME_SUCCESS  = 4  # roll ≤ skill / 5
    HARD_SUCCESS     = 3  # roll ≤ skill / 2
    REGULAR_SUCCESS  = 2  # roll ≤ skill
    FAILURE          = 1  # roll > skill
    FUMBLE           = 0  # ≥ 96 (skill ≤ 50) or = 100 (skill > 50)

    def is_success(self) -> bool:
        return self.value >= 2

    def label(self) -> str:
        return {
            4: "EXTREME SUCCESS",
            3: "HARD SUCCESS",
            2: "SUCCESS",
            1: "FAILURE",
            0: "FUMBLE",
        }[self.value]


@dataclass
class CheckResult:
    skill_name:    str
    skill_value:   int
    roll:          int
    level:         SuccessLevel
    bonus_dice:    int = 0
    pushed:        bool = False

    def is_success(self) -> bool:
        return self.level.is_success()

    def __str__(self) -> str:
        bonus_str = ""
        if self.bonus_dice > 0:
            bonus_str = f" (+{self.bonus_dice} Bonus)"
        elif self.bonus_dice < 0:
            bonus_str = f" ({self.bonus_dice} Penalty)"
        pushed_str = " [PUSHED]" if self.pushed else ""
        return (
            f"{self.skill_name} {self.skill_value}%{bonus_str}: "
            f"rolled {self.roll} → {self.level.label()}{pushed_str}"
        )


def check_skill(
    skill_value: int,
    skill_name: str = "Skill",
    bonus_dice: int = 0,
) -> CheckResult:
    """
    Perform a percentile skill check.

    bonus_dice > 0: roll extra tens dice, use lowest (advantageous)
    bonus_dice < 0: roll extra tens dice, use highest (disadvantageous)
    """
    roll = roll_with_bonus(bonus_dice)

    if skill_value > 50:
        fumble_threshold = 100
    else:
        fumble_threshold = 96

    if roll >= fumble_threshold:
        level = SuccessLevel.FUMBLE
    elif roll <= (skill_value // 5):
        level = SuccessLevel.EXTREME_SUCCESS
    elif roll <= (skill_value // 2):
        level = SuccessLevel.HARD_SUCCESS
    elif roll <= skill_value:
        level = SuccessLevel.REGULAR_SUCCESS
    else:
        level = SuccessLevel.FAILURE

    return CheckResult(skill_name, skill_value, roll, level, bonus_dice)


def opposed_check(
    a_skill: int, a_name: str,
    b_skill: int, b_name: str,
) -> Tuple[CheckResult, CheckResult, bool]:
    """
    Opposed skill check between two parties.
    Returns (result_a, result_b, a_wins).
    """
    ra = check_skill(a_skill, a_name)
    rb = check_skill(b_skill, b_name)

    # Compare success levels; ties go to higher skill
    if ra.level.value > rb.level.value:
        a_wins = True
    elif ra.level.value < rb.level.value:
        a_wins = False
    else:
        # Tie: higher raw skill wins
        a_wins = a_skill >= b_skill

    return ra, rb, a_wins


def sanity_check(san_value: int, loss_on_fail: str, loss_on_success: str = "0") -> Tuple[CheckResult, int]:
    """
    Roll a Sanity check.
    loss_on_fail/success are dice notation strings like "1d6" or "1".
    Returns (check_result, sanity_lost).
    """
    result = check_skill(san_value, "Sanity (SAN)")
    if result.is_success():
        san_lost = _parse_dice_notation(loss_on_success)
    else:
        san_lost = _parse_dice_notation(loss_on_fail)
    return result, san_lost


def _parse_dice_notation(notation: str) -> int:
    """Parse '1d6', '2d4+1', or plain '3' and return a rolled value."""
    import re
    notation = notation.strip().lower()
    if notation == "0":
        return 0
    # Try 'XdY+Z'
    m = re.match(r'^(\d+)d(\d+)([+-]\d+)?$', notation)
    if m:
        count, sides, modifier = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
        return sum(random.randint(1, sides) for _ in range(count)) + modifier
    # Plain integer
    try:
        return int(notation)
    except ValueError:
        return 0


# ---------------------------------------------------------------------------
# Characteristics
# ---------------------------------------------------------------------------

CHARACTERISTIC_NAMES = ["STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"]

# Which characteristics use 2d6+6 (range 40-130) vs 3d6 (range 15-90)
_HIGH_BASE = {"SIZ", "INT", "EDU"}


def roll_characteristic(name: str) -> int:
    """Roll a characteristic using CoC 7e standard method."""
    if name in _HIGH_BASE:
        return (_d(6, 2) + 6) * 5   # 2d6+6, ×5 → 40-130
    return _d(6, 3) * 5              # 3d6,   ×5 → 15-90


def roll_all_characteristics() -> Dict[str, int]:
    return {name: roll_characteristic(name) for name in CHARACTERISTIC_NAMES}


# ---------------------------------------------------------------------------
# Damage Bonus and Build lookup
# ---------------------------------------------------------------------------

def _damage_bonus_and_build(str_val: int, siz_val: int) -> Tuple[str, int]:
    total = str_val + siz_val
    if total <= 64:   return "-2",       -2
    if total <= 84:   return "-1",       -1
    if total <= 124:  return "0",         0
    if total <= 164:  return "+1d4",      1
    if total <= 204:  return "+1d6",      2
    if total <= 284:  return "+2d6",      3
    return "+3d6", 4


# ---------------------------------------------------------------------------
# Skill definitions  (name → base %)
# ---------------------------------------------------------------------------

BASE_SKILLS: Dict[str, int] = {
    # Investigation
    "Appraise":               5,
    "Archaeology":            1,
    "History":               5,
    "Library Use":           20,
    "Occult":                 5,
    "Cthulhu Mythos":         0,
    # Social
    "Charm":                 15,
    "Fast Talk":              5,
    "Intimidate":            15,
    "Persuade":              10,
    "Psychology":            10,
    # Physical
    "Climb":                 20,
    "Dodge":                  0,   # set to DEX/2 on creation
    "Jump":                  20,
    "Swim":                  20,
    "Throw":                 20,
    "Stealth":               20,
    "Sleight of Hand":       10,
    # Combat
    "Fighting (Brawl)":      25,
    "Firearms (Handgun)":    20,
    "Firearms (Rifle/Shotgun)": 25,
    # Knowledge
    "Accounting":             5,
    "Anthropology":           1,
    "Arcane":                 1,
    "Art/Craft":              5,
    "Computer Use":            5,
    "Drive Auto":            20,
    "Electrical Repair":     10,
    "First Aid":             30,
    "Language (Own)":         0,   # set to EDU on creation
    "Language (Other)":       1,
    "Law":                    5,
    "Locksmith":              1,
    "Mechanical Repair":     10,
    "Medicine":               1,
    "Natural World":         10,
    "Navigate":              10,
    "Operate Heavy Machinery": 1,
    "Pilot":                  1,
    "Ride":                   5,
    "Science":                1,
    "Spot Hidden":           25,
    "Survival":              10,
    "Track":                 10,
    # Misc
    "Disguise":               5,
    "Credit Rating":          0,   # set by occupation
}

# Skills that are marked to improve on success
IMPROVABLE = set(BASE_SKILLS.keys()) - {"Cthulhu Mythos", "Language (Own)", "Credit Rating"}


# ---------------------------------------------------------------------------
# Investigator (player character)
# ---------------------------------------------------------------------------

@dataclass
class Investigator:
    """
    A Call of Cthulhu investigator (player character).
    """
    name:             str
    player:           str         = "Player"
    occupation:       str         = "Private Investigator"
    age:              int         = 30
    residence:        str         = "Arkham, MA"
    birthplace:       str         = "United States"

    # Core characteristics
    characteristics: Dict[str, int] = field(default_factory=dict)

    # Derived (computed on creation, can be modified)
    max_hp:           int         = 0
    current_hp:       int         = 0
    max_mp:           int         = 0
    current_mp:       int         = 0
    max_san:          int         = 0
    current_san:      int         = 0
    luck:             int         = 0
    damage_bonus:     str         = "0"
    build:            int         = 0
    move_rate:        int         = 8

    # Skills: name → current %
    skills:          Dict[str, int] = field(default_factory=dict)

    # Checked skills (for session-end improvement rolls)
    skill_checks_made: List[str]  = field(default_factory=list)

    # Inventory: list of item dicts
    inventory:       List[Dict[str, Any]] = field(default_factory=list)

    # Money
    cash:            int          = 0
    assets:          int          = 0

    # Conditions
    conditions:      List[str]    = field(default_factory=list)
    insanities:      List[str]    = field(default_factory=list)
    temp_insanity:   bool         = False
    indef_insanity:  bool         = False

    # Wounds
    major_wound:     bool         = False

    # Story flags (arbitrary key→value)
    flags:           Dict[str, Any] = field(default_factory=dict)

    # -----------------------------------------------------------------------
    # Factory
    # -----------------------------------------------------------------------

    @classmethod
    def create(
        cls,
        name: str,
        occupation: str = "Private Investigator",
        characteristics: Optional[Dict[str, int]] = None,
        rolled: bool = True,
        **kwargs,
    ) -> "Investigator":
        """Create an investigator, rolling or using provided characteristics."""
        if characteristics is None:
            if rolled:
                chars = roll_all_characteristics()
            else:
                chars = {n: 50 for n in CHARACTERISTIC_NAMES}
        else:
            chars = dict(characteristics)

        inv = cls(name=name, occupation=occupation, characteristics=chars, **kwargs)
        inv._compute_derived()
        inv._init_skills()
        return inv

    # -----------------------------------------------------------------------
    # Derived stats
    # -----------------------------------------------------------------------

    def _compute_derived(self) -> None:
        c = self.characteristics
        self.max_hp       = (c.get("CON", 50) + c.get("SIZ", 65)) // 10
        self.current_hp   = self.max_hp
        self.max_mp       = c.get("POW", 50) // 5
        self.current_mp   = self.max_mp
        self.max_san      = c.get("POW", 50)
        self.current_san  = self.max_san
        self.luck         = _d(6, 3) * 5
        db_str, build_val = _damage_bonus_and_build(
            c.get("STR", 50), c.get("SIZ", 65)
        )
        self.damage_bonus = db_str
        self.build        = build_val
        dex, str_v, siz = c.get("DEX", 50), c.get("STR", 50), c.get("SIZ", 65)
        if dex < siz and str_v < siz:
            self.move_rate = 7
        elif dex >= siz and str_v >= siz:
            self.move_rate = 9
        else:
            self.move_rate = 8

    def _init_skills(self) -> None:
        """Populate skills dict from base values, adjusted for characteristics."""
        c = self.characteristics
        self.skills = dict(BASE_SKILLS)
        self.skills["Dodge"]          = c.get("DEX", 50) // 2
        self.skills["Language (Own)"] = c.get("EDU", 65)

    # -----------------------------------------------------------------------
    # Characteristic helpers
    # -----------------------------------------------------------------------

    def char(self, name: str) -> int:
        return self.characteristics.get(name.upper(), 0)

    def half(self, name: str) -> int:
        return self.char(name) // 2

    def fifth(self, name: str) -> int:
        return self.char(name) // 5

    # -----------------------------------------------------------------------
    # Skill checks
    # -----------------------------------------------------------------------

    def roll_skill(
        self,
        skill_name: str,
        bonus_dice: int = 0,
    ) -> CheckResult:
        """Perform a skill check and record it for improvement tracking."""
        value = self.skills.get(skill_name, 0)
        result = check_skill(value, skill_name, bonus_dice)
        if result.is_success() and skill_name in IMPROVABLE:
            if skill_name not in self.skill_checks_made:
                self.skill_checks_made.append(skill_name)
        return result

    def roll_characteristic_check(
        self, name: str, difficulty: str = "regular", bonus_dice: int = 0
    ) -> CheckResult:
        """
        Check against a characteristic (e.g., STR×5 regular, STR×2 hard).
        difficulty: 'regular', 'hard', 'extreme'
        """
        base = self.char(name)
        if difficulty == "hard":
            value = base // 2
        elif difficulty == "extreme":
            value = base // 5
        else:
            value = base
        return check_skill(value, f"{name} ({difficulty})", bonus_dice)

    def roll_luck(self) -> CheckResult:
        return check_skill(self.luck, "Luck")

    def roll_sanity(
        self, loss_on_fail: str, loss_on_success: str = "0"
    ) -> Tuple[CheckResult, int, List[str]]:
        """
        Perform a Sanity check.
        Returns (result, san_lost, [narrative messages]).
        """
        result, san_lost = sanity_check(self.current_san, loss_on_fail, loss_on_success)
        messages = [str(result)]
        events = []

        if san_lost > 0:
            prev_san = self.current_san
            self.current_san = max(0, self.current_san - san_lost)
            messages.append(f"Lost {san_lost} Sanity ({prev_san} → {self.current_san}).")

            # Temporary insanity: lose 5+ SAN in one roll
            if san_lost >= 5 and not self.temp_insanity:
                self.temp_insanity = True
                insanity = _random_insanity("temporary")
                self.insanities.append(f"[Temp] {insanity}")
                messages.append(f"TEMPORARY INSANITY: {insanity}")
                events.append("temp_insanity")

            # Indefinite insanity: lose ≥1/5 of current SAN in one session
            if san_lost >= (prev_san // 5) and not self.indef_insanity:
                self.indef_insanity = True
                insanity = _random_insanity("indefinite")
                self.insanities.append(f"[Indef] {insanity}")
                messages.append(f"INDEFINITE INSANITY: {insanity}")
                events.append("indef_insanity")

            if self.current_san == 0:
                messages.append("PERMANENT INSANITY – the investigator is lost.")
                events.append("permanent_insanity")

        return result, san_lost, messages

    # -----------------------------------------------------------------------
    # HP management
    # -----------------------------------------------------------------------

    def take_damage(self, amount: int) -> List[str]:
        messages = []
        self.current_hp = max(0, self.current_hp - amount)
        messages.append(f"{self.name} takes {amount} damage. HP: {self.current_hp}/{self.max_hp}")

        if amount >= (self.max_hp // 2):
            self.major_wound = True
            messages.append("Major wound! Must make CON check or fall unconscious.")

        if self.current_hp == 0:
            messages.append(f"{self.name} is DYING.")
        elif self.current_hp <= (self.max_hp // 2):
            messages.append(f"{self.name} is badly wounded.")
        return messages

    def heal(self, amount: int) -> int:
        healed = min(amount, self.max_hp - self.current_hp)
        self.current_hp += healed
        return healed

    # -----------------------------------------------------------------------
    # MP
    # -----------------------------------------------------------------------

    def spend_mp(self, amount: int) -> bool:
        if self.current_mp < amount:
            return False
        self.current_mp -= amount
        return True

    # -----------------------------------------------------------------------
    # Flag helpers
    # -----------------------------------------------------------------------

    def set_flag(self, key: str, value: Any = True) -> None:
        self.flags[key] = value

    def has_flag(self, key: str) -> bool:
        return bool(self.flags.get(key))

    def get_flag(self, key: str, default: Any = None) -> Any:
        return self.flags.get(key, default)

    # -----------------------------------------------------------------------
    # Inventory helpers
    # -----------------------------------------------------------------------

    def add_item(self, name: str, **props) -> None:
        self.inventory.append({"name": name, **props})

    def remove_item(self, name: str) -> bool:
        for item in self.inventory:
            if item["name"] == name:
                self.inventory.remove(item)
                return True
        return False

    def has_item(self, name: str) -> bool:
        return any(i["name"] == name for i in self.inventory)

    # -----------------------------------------------------------------------
    # Serialization
    # -----------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "name": self.name, "player": self.player,
            "occupation": self.occupation, "age": self.age,
            "residence": self.residence, "birthplace": self.birthplace,
            "characteristics": self.characteristics,
            "max_hp": self.max_hp, "current_hp": self.current_hp,
            "max_mp": self.max_mp, "current_mp": self.current_mp,
            "max_san": self.max_san, "current_san": self.current_san,
            "luck": self.luck, "damage_bonus": self.damage_bonus,
            "build": self.build, "move_rate": self.move_rate,
            "skills": self.skills,
            "skill_checks_made": self.skill_checks_made,
            "inventory": self.inventory,
            "cash": self.cash, "assets": self.assets,
            "conditions": self.conditions, "insanities": self.insanities,
            "temp_insanity": self.temp_insanity,
            "indef_insanity": self.indef_insanity,
            "major_wound": self.major_wound,
            "flags": self.flags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Investigator":
        inv = cls.__new__(cls)
        inv.__dict__.update(d)
        return inv


# ---------------------------------------------------------------------------
# Combat
# ---------------------------------------------------------------------------

@dataclass
class Combatant:
    """Anything that can fight (investigator or creature)."""
    name:        str
    hp:          int
    max_hp:      int
    san_loss:    str = "0/1d3"   # san loss for witnesses on death (e.g. "0/1d3")
    dodge_skill: int = 0
    attack_skill: int = 25       # Fighting (Brawl) or weapon skill
    damage_dice: str = "1d3"     # fist default
    armor:       int = 0         # points of armor
    is_npc:      bool = True
    build:       int = 0
    damage_bonus: str = "0"

    @property
    def is_alive(self) -> bool:
        return self.hp > 0

    def roll_damage(self) -> int:
        base = _parse_dice_notation(self.damage_dice)
        bonus = _parse_dice_notation(self.damage_bonus)
        return max(1, base + bonus)

    def take_damage(self, amount: int) -> int:
        actual = max(0, amount - self.armor)
        self.hp = max(0, self.hp - actual)
        return actual


class CombatAction(Enum):
    ATTACK      = "attack"
    DODGE       = "dodge"
    FIGHT_BACK  = "fight_back"
    FLEE        = "flee"
    USE_ITEM    = "use_item"
    MANEUVER    = "maneuver"


@dataclass
class CombatRound:
    """Result of one combat exchange."""
    attacker:       str
    defender:       str
    attack_roll:    CheckResult
    damage:         int = 0
    damage_taken:   int = 0
    defended:       bool = False
    defense_roll:   Optional[CheckResult] = None
    messages:       List[str] = field(default_factory=list)


def resolve_combat(
    attacker: Combatant,
    defender: Combatant,
    action: CombatAction = CombatAction.ATTACK,
    defender_action: CombatAction = CombatAction.DODGE,
) -> CombatRound:
    """
    Resolve one round of combat between two combatants.
    """
    messages = []
    attack_result = check_skill(attacker.attack_skill, f"{attacker.name} attacks")
    round_ = CombatRound(attacker=attacker.name, defender=defender.name, attack_roll=attack_result)
    messages.append(str(attack_result))

    if attack_result.level == SuccessLevel.FUMBLE:
        messages.append(f"{attacker.name} fumbles!")
        round_.messages = messages
        return round_

    if not attack_result.is_success():
        messages.append(f"{attacker.name} misses {defender.name}.")
        round_.messages = messages
        return round_

    # Defender reacts
    if defender_action == CombatAction.DODGE and defender.dodge_skill > 0:
        dodge_result = check_skill(defender.dodge_skill, f"{defender.name} dodges")
        round_.defense_roll = dodge_result
        messages.append(str(dodge_result))

        if dodge_result.is_success():
            # Must beat attacker's success level to dodge
            if dodge_result.level.value >= attack_result.level.value:
                messages.append(f"{defender.name} successfully dodges!")
                round_.defended = True
                round_.messages = messages
                return round_

    elif defender_action == CombatAction.FIGHT_BACK and defender.attack_skill > 0:
        fb_result = check_skill(defender.attack_skill, f"{defender.name} fights back")
        round_.defense_roll = fb_result
        messages.append(str(fb_result))

        if fb_result.is_success() and fb_result.level.value >= attack_result.level.value:
            messages.append(f"{defender.name} successfully fights back!")
            round_.defended = True
            # Counter-damage
            counter_dmg = defender.roll_damage()
            actual = attacker.take_damage(counter_dmg)
            messages.append(f"{defender.name} deals {actual} damage to {attacker.name}!")
            round_.damage_taken = actual
            round_.messages = messages
            return round_

    # Apply damage
    raw_dmg = attacker.roll_damage()
    actual = defender.take_damage(raw_dmg)

    # Impale on extreme success
    if attack_result.level == SuccessLevel.EXTREME_SUCCESS:
        extra = _parse_dice_notation(attacker.damage_dice)
        total_extra = defender.take_damage(extra)
        actual += total_extra
        messages.append(f"IMPALE! Extra {extra} damage!")

    messages.append(f"{attacker.name} hits {defender.name} for {actual} damage! (HP: {defender.hp}/{defender.max_hp})")
    if not defender.is_alive:
        messages.append(f"{defender.name} is DEAD.")

    round_.damage = actual
    round_.messages = messages
    return round_


# ---------------------------------------------------------------------------
# Sanity / Insanity helpers
# ---------------------------------------------------------------------------

_TEMP_INSANITIES = [
    "Amnesia (1d10 hours)",
    "Psychosomatic blindness (1d10 hours)",
    "Fits of shaking and weeping",
    "Catatonia (1d10 minutes)",
    "Hysterical screaming",
    "Paralysis (1d10 minutes)",
    "Compulsive hand washing",
    "Phantom voices",
    "Claustrophobia",
    "Uncontrollable laughter",
]

_INDEF_INSANITIES = [
    "Phobia of the Mythos entity",
    "Delusion: being watched",
    "Obsessive behaviour",
    "Multiple personality disorder",
    "Paranoia",
    "Mania (specify obsession)",
    "Persecution complex",
    "Dissociative fugue states",
    "Intermittent explosive disorder",
    "Suicidal ideation",
]


def _random_insanity(kind: str) -> str:
    if kind == "temporary":
        return random.choice(_TEMP_INSANITIES)
    return random.choice(_INDEF_INSANITIES)


# ---------------------------------------------------------------------------
# Pre-made investigators for quick start
# ---------------------------------------------------------------------------

PREMADE_INVESTIGATORS = {
    "doctor": {
        "display": "Dr. Morgan",
        "occupation": "Physician",
        "description": "A compassionate doctor drawn into darkness by a patient's ravings.",
        "characteristics": {
            "STR": 45, "CON": 55, "SIZ": 60,
            "DEX": 55, "APP": 60, "INT": 75,
            "POW": 65, "EDU": 85,
        },
        "bonus_skills": {
            "First Aid": 70, "Medicine": 65, "Psychology": 55,
            "Library Use": 50, "Spot Hidden": 45,
        },
        "cash": 150, "age": 38,
    },
    "reporter": {
        "display": "Miss Carter",
        "occupation": "Journalist",
        "description": "A tenacious reporter who follows the story wherever it leads.",
        "characteristics": {
            "STR": 40, "CON": 50, "SIZ": 50,
            "DEX": 65, "APP": 65, "INT": 70,
            "POW": 60, "EDU": 70,
        },
        "bonus_skills": {
            "Fast Talk": 65, "Persuade": 60, "Library Use": 60,
            "Spot Hidden": 55, "Psychology": 50,
        },
        "cash": 50, "age": 29,
    },
    "professor": {
        "display": "Prof. Walters",
        "occupation": "Professor of Archaeology",
        "description": "An academic whose research has led him to terrifying conclusions.",
        "characteristics": {
            "STR": 40, "CON": 45, "SIZ": 55,
            "DEX": 50, "APP": 50, "INT": 80,
            "POW": 70, "EDU": 90,
        },
        "bonus_skills": {
            "Archaeology": 65, "History": 70, "Library Use": 70,
            "Occult": 45, "Language (Other)": 60,
        },
        "cash": 80, "age": 52,
    },
    "detective": {
        "display": "Mr. Harper",
        "occupation": "Private Detective",
        "description": "A world-weary detective who has seen too much and forgotten nothing.",
        "characteristics": {
            "STR": 55, "CON": 60, "SIZ": 65,
            "DEX": 60, "APP": 50, "INT": 65,
            "POW": 55, "EDU": 65,
        },
        "bonus_skills": {
            "Fighting (Brawl)": 50, "Firearms (Handgun)": 55,
            "Spot Hidden": 65, "Psychology": 60, "Intimidate": 55,
        },
        "cash": 40, "age": 42,
    },
}


def build_premade(key: str) -> Investigator:
    """Create an Investigator from a premade template."""
    data = PREMADE_INVESTIGATORS[key]
    inv = Investigator.create(
        name=data["display"],
        occupation=data["occupation"],
        characteristics=data["characteristics"],
        rolled=False,
        age=data.get("age", 30),
    )
    for skill, value in data.get("bonus_skills", {}).items():
        if skill in inv.skills:
            inv.skills[skill] = value
    inv.cash = data.get("cash", 50)
    return inv
