"""
Dice rolling system for the Dungeon Crawl Engine.

Supports standard polyhedral dice (d4, d6, d8, d10, d12, d20, d100)
with modifiers, advantage/disadvantage, and skill checks.
"""
import random
import re
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class RollResult:
    """Result of a dice roll with full breakdown."""
    dice_notation: str       # e.g. "2d6+3"
    rolls: List[int]         # individual die results
    modifier: int            # flat modifier applied
    total: int               # final total
    natural: int = 0         # highest single die rolled (for nat20 checks)
    is_advantage: bool = False
    is_disadvantage: bool = False

    def is_critical_success(self) -> bool:
        """Natural 20 on d20 roll."""
        return self.natural == 20

    def is_critical_failure(self) -> bool:
        """Natural 1 on d20 roll."""
        return self.natural == 1

    def __str__(self) -> str:
        rolls_str = ", ".join(str(r) for r in self.rolls)
        suffix = ""
        if self.is_advantage:
            suffix = " (Advantage)"
        elif self.is_disadvantage:
            suffix = " (Disadvantage)"
        if self.modifier != 0:
            sign = "+" if self.modifier > 0 else ""
            return f"[{rolls_str}]{sign}{self.modifier} = {self.total}{suffix}"
        return f"[{rolls_str}] = {self.total}{suffix}"


class Dice:
    """Core dice rolling engine. All methods are static."""

    @staticmethod
    def roll(sides: int, count: int = 1, modifier: int = 0) -> RollResult:
        """Roll `count` dice with `sides` faces and add `modifier`."""
        if sides < 1:
            raise ValueError(f"Dice must have at least 1 side, got {sides}")
        if count < 1:
            raise ValueError(f"Must roll at least 1 die, got {count}")

        rolls = [random.randint(1, sides) for _ in range(count)]
        total = sum(rolls) + modifier
        notation = f"{count}d{sides}"
        if modifier != 0:
            notation += f"{'+' if modifier >= 0 else ''}{modifier}"

        return RollResult(
            dice_notation=notation,
            rolls=rolls,
            modifier=modifier,
            total=total,
            natural=rolls[0] if count == 1 else max(rolls),
        )

    @staticmethod
    def d4(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(4, count, modifier)

    @staticmethod
    def d6(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(6, count, modifier)

    @staticmethod
    def d8(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(8, count, modifier)

    @staticmethod
    def d10(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(10, count, modifier)

    @staticmethod
    def d12(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(12, count, modifier)

    @staticmethod
    def d20(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(20, count, modifier)

    @staticmethod
    def d100(count: int = 1, modifier: int = 0) -> RollResult:
        return Dice.roll(100, count, modifier)

    @staticmethod
    def advantage(sides: int, modifier: int = 0) -> RollResult:
        """Roll twice, take the higher result (advantage)."""
        r1 = random.randint(1, sides)
        r2 = random.randint(1, sides)
        chosen = max(r1, r2)
        total = chosen + modifier
        notation = f"2d{sides}(adv)"
        if modifier != 0:
            notation += f"{'+' if modifier >= 0 else ''}{modifier}"
        return RollResult(
            dice_notation=notation,
            rolls=[r1, r2],
            modifier=modifier,
            total=total,
            natural=chosen,
            is_advantage=True,
        )

    @staticmethod
    def disadvantage(sides: int, modifier: int = 0) -> RollResult:
        """Roll twice, take the lower result (disadvantage)."""
        r1 = random.randint(1, sides)
        r2 = random.randint(1, sides)
        chosen = min(r1, r2)
        total = chosen + modifier
        notation = f"2d{sides}(dis)"
        if modifier != 0:
            notation += f"{'+' if modifier >= 0 else ''}{modifier}"
        return RollResult(
            dice_notation=notation,
            rolls=[r1, r2],
            modifier=modifier,
            total=total,
            natural=chosen,
            is_disadvantage=True,
        )

    @staticmethod
    def skill_check(
        modifier: int,
        dc: int,
        advantage: bool = False,
        disadvantage: bool = False,
    ) -> Tuple[RollResult, bool]:
        """
        Perform a d20 skill check against a Difficulty Class.

        Returns (RollResult, success: bool).
        Advantage and disadvantage cancel each other out.
        """
        if advantage and not disadvantage:
            result = Dice.advantage(20, modifier)
        elif disadvantage and not advantage:
            result = Dice.disadvantage(20, modifier)
        else:
            result = Dice.roll(20, 1, modifier)

        # Natural 20 always succeeds, natural 1 always fails
        if result.natural == 20:
            return result, True
        if result.natural == 1:
            return result, False

        return result, result.total >= dc

    @staticmethod
    def attribute_modifier(score: int) -> int:
        """Calculate D&D-style attribute modifier: (score - 10) // 2."""
        return (score - 10) // 2

    @staticmethod
    def parse(notation: str) -> RollResult:
        """
        Parse and roll standard dice notation.

        Supports: "d6", "2d6", "2d6+3", "3d8-2"
        """
        notation = notation.strip().lower()
        # Handle bare "dX" notation
        if notation.startswith("d"):
            notation = "1" + notation

        pattern = r'^(\d+)d(\d+)([+-]\d+)?$'
        match = re.match(pattern, notation)
        if not match:
            raise ValueError(f"Invalid dice notation: '{notation}'")

        count = int(match.group(1))
        sides = int(match.group(2))
        modifier = int(match.group(3)) if match.group(3) else 0

        return Dice.roll(sides, count, modifier)

    @staticmethod
    def roll_stat() -> int:
        """
        Roll a character stat using 4d6 drop lowest (standard D&D method).
        Returns a value between 3 and 18.
        """
        rolls = [random.randint(1, 6) for _ in range(4)]
        return sum(sorted(rolls)[1:])  # drop lowest

    @staticmethod
    def roll_stats() -> dict:
        """Roll all 6 core attributes. Returns dict of STR/DEX/CON/INT/WIS/CHA."""
        attrs = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
        return {attr: Dice.roll_stat() for attr in attrs}
