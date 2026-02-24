"""
Turn-based combat system for the Dungeon Crawl Engine.

Initiative → attack rolls → damage → status checks → repeat.
Supports advantage/disadvantage, critical hits, and flee attempts.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Callable, List, Optional, Tuple

from .dice import Dice, RollResult

if TYPE_CHECKING:
    from .character import Character
    from .renderer import Renderer


# ---------------------------------------------------------------------------
# Enemy definition
# ---------------------------------------------------------------------------

@dataclass
class Enemy:
    """A combat encounter enemy (not a full Character for simplicity)."""
    name: str
    max_hp: int
    armor_class: int
    attack_bonus: int
    damage_dice: str          # e.g. "1d6+2"
    xp_reward: int = 50
    initiative_bonus: int = 0
    description: str = ""
    loot_table: List[str] = field(default_factory=list)  # item IDs

    # Runtime state
    current_hp: int = field(init=False)

    def __post_init__(self) -> None:
        self.current_hp = self.max_hp

    @property
    def is_alive(self) -> bool:
        return self.current_hp > 0

    @property
    def hp_ratio(self) -> float:
        return self.current_hp / max(self.max_hp, 1)

    def take_damage(self, amount: int) -> int:
        actual = min(amount, self.current_hp)
        self.current_hp = max(0, self.current_hp - amount)
        return actual

    def roll_initiative(self) -> RollResult:
        return Dice.roll(20, 1, self.initiative_bonus)

    def roll_attack(self) -> RollResult:
        return Dice.roll(20, 1, self.attack_bonus)

    def roll_damage(self) -> RollResult:
        return Dice.parse(self.damage_dice)


# ---------------------------------------------------------------------------
# Combat result
# ---------------------------------------------------------------------------

@dataclass
class CombatResult:
    player_won: bool
    fled: bool = False
    xp_gained: int = 0
    loot: List[str] = field(default_factory=list)  # item IDs dropped
    rounds: int = 0


# ---------------------------------------------------------------------------
# Combat engine
# ---------------------------------------------------------------------------

class CombatEngine:
    """
    Manages a single combat encounter between the player and enemies.

    Usage::

        result = CombatEngine(player, enemies, renderer).run()
    """

    def __init__(
        self,
        player: "Character",
        enemies: List[Enemy],
        renderer: "Renderer",
        on_log: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.player = player
        self.enemies = [e for e in enemies]  # copy list, not enemies
        self.renderer = renderer
        self.log: List[str] = []
        self._on_log = on_log or (lambda msg: None)
        self.rounds = 0

    # ---------------------------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------------------------

    def _msg(self, text: str) -> None:
        self.log.append(text)
        self._on_log(text)

    def _living_enemies(self) -> List[Enemy]:
        return [e for e in self.enemies if e.is_alive]

    def _roll_initiative_order(self) -> List[Tuple[int, str, object]]:
        """
        Return a list of (initiative_roll, name, actor) sorted high-to-low.
        actor is the Character or Enemy object.
        """
        order = []
        p_init = self.player.roll_initiative()
        order.append((p_init.total, "player", self.player))

        for enemy in self._living_enemies():
            e_init = enemy.roll_initiative()
            order.append((e_init.total, enemy.name, enemy))

        order.sort(key=lambda x: x[0], reverse=True)
        return order

    # ---------------------------------------------------------------------------
    # Player actions
    # ---------------------------------------------------------------------------

    def _player_attack(self, target: Enemy) -> str:
        attack = self.player.roll_attack()
        if attack.natural == 20:
            # Critical hit: double the damage dice
            dmg1 = self.player.roll_damage()
            dmg2 = self.player.roll_damage()
            total_dmg = dmg1.total + dmg2.total
            target.take_damage(total_dmg)
            return (
                f"CRITICAL HIT! {self.player.name} strikes {target.name} "
                f"for {total_dmg} damage! ({dmg1} + {dmg2})"
            )
        if attack.natural == 1:
            return f"{self.player.name} fumbles the attack! (Natural 1)"
        if attack.total >= target.armor_class:
            dmg = self.player.roll_damage()
            target.take_damage(dmg.total)
            return (
                f"{self.player.name} hits {target.name} "
                f"[roll:{attack.total} vs AC:{target.armor_class}] "
                f"for {dmg.total} damage! {dmg}"
            )
        return (
            f"{self.player.name} misses {target.name}. "
            f"[roll:{attack.total} vs AC:{target.armor_class}]"
        )

    def _player_use_item(self, item_id: str) -> str:
        from .inventory import ItemRegistry
        item = ItemRegistry.get(item_id)
        if item is None:
            return "You fumble through your pack but find nothing useful."
        if item.heal_dice:
            healed, roll = self.player.heal_dice(item.heal_dice)
            if item.is_consumable:
                self.player.remove_item(item_id)
            return (
                f"{self.player.name} uses {item.name}: heals {healed} HP! "
                f"{roll}"
            )
        return f"{item.name} cannot be used in combat."

    def _try_flee(self) -> bool:
        """Attempt to flee combat. Uses Acrobatics or Athletics check DC 13."""
        result, success = Dice.skill_check(
            modifier=max(
                self.player.get_skill_modifier("Acrobatics"),
                self.player.get_skill_modifier("Athletics"),
            ),
            dc=13,
        )
        self._msg(
            f"{self.player.name} attempts to flee! "
            f"[DC 13, roll: {result.total}] "
            + ("SUCCESS – escaped!" if success else "FAILED – cornered!")
        )
        return success

    # ---------------------------------------------------------------------------
    # Enemy actions
    # ---------------------------------------------------------------------------

    def _enemy_attack(self, enemy: Enemy) -> str:
        attack = enemy.roll_attack()
        if attack.natural == 20:
            dmg1 = enemy.roll_damage()
            dmg2 = enemy.roll_damage()
            total_dmg = dmg1.total + dmg2.total
            self.player.take_damage(total_dmg)
            return (
                f"CRITICAL! {enemy.name} strikes {self.player.name} "
                f"for {total_dmg} damage!"
            )
        if attack.natural == 1:
            return f"{enemy.name} fumbles its attack!"
        if attack.total >= self.player.armor_class:
            dmg = enemy.roll_damage()
            self.player.take_damage(dmg.total)
            return (
                f"{enemy.name} hits {self.player.name} "
                f"[roll:{attack.total} vs AC:{self.player.armor_class}] "
                f"for {dmg.total} damage!"
            )
        return (
            f"{enemy.name} misses {self.player.name}. "
            f"[roll:{attack.total} vs AC:{self.player.armor_class}]"
        )

    # ---------------------------------------------------------------------------
    # Main combat loop
    # ---------------------------------------------------------------------------

    def run(self) -> CombatResult:
        """Run the full combat encounter. Returns a CombatResult."""
        self._msg(f"\n*** COMBAT BEGINS ***")
        enemy_names = ", ".join(e.name for e in self.enemies)
        self._msg(f"Enemies: {enemy_names}")

        while self.player.is_alive and self._living_enemies():
            self.rounds += 1
            self._msg(f"\n--- Round {self.rounds} ---")

            # Re-roll initiative each round for simplicity
            order = self._roll_initiative_order()

            for _init, name, actor in order:
                if not self.player.is_alive:
                    break
                if not self._living_enemies():
                    break

                if actor is self.player:
                    action = self._get_player_action()
                    if action == "flee":
                        if self._try_flee():
                            return CombatResult(
                                player_won=False,
                                fled=True,
                                xp_gained=0,
                                rounds=self.rounds,
                            )
                        # Failed flee – enemies get opportunity attacks
                        for enemy in self._living_enemies():
                            msg = self._enemy_attack(enemy)
                            self._msg(msg)
                    elif action == "attack":
                        targets = self._living_enemies()
                        if targets:
                            target = targets[0]  # auto-target first enemy
                            msg = self._player_attack(target)
                            self._msg(msg)
                            if not target.is_alive:
                                self._msg(f"{target.name} is defeated!")
                    elif action and action.startswith("item:"):
                        item_id = action[5:]
                        msg = self._player_use_item(item_id)
                        self._msg(msg)
                    self._render_combat_state()
                else:
                    enemy = actor  # type: ignore[assignment]
                    if enemy.is_alive:
                        msg = self._enemy_attack(enemy)
                        self._msg(msg)

        # Collect results
        if self.player.is_alive:
            total_xp = sum(e.xp_reward for e in self.enemies if not e.is_alive)
            loot = []
            for e in self.enemies:
                if not e.is_alive:
                    loot.extend(e.loot_table)
            self._msg(f"\n*** VICTORY! *** Gained {total_xp} XP.")
            return CombatResult(
                player_won=True,
                xp_gained=total_xp,
                loot=loot,
                rounds=self.rounds,
            )
        else:
            self._msg(f"\n*** {self.player.name.upper()} HAS FALLEN ***")
            return CombatResult(player_won=False, rounds=self.rounds)

    # ---------------------------------------------------------------------------
    # UI helpers (delegate to renderer)
    # ---------------------------------------------------------------------------

    def _render_combat_state(self) -> None:
        self.renderer.render_combat(self.player, self._living_enemies(), self.log)

    def _get_player_action(self) -> str:
        """Render the combat screen and prompt the player for an action."""
        self._render_combat_state()
        return self.renderer.get_combat_action(self.player)
