"""
Main game engine for the Dungeon Crawl Engine.

GameEngine manages the main loop: loading scenes, applying effects,
handling combat, and coordinating the renderer.
"""
from __future__ import annotations
import json
import os
from typing import Any, Dict, List, Optional

from .character import Character
from .combat import CombatEngine, Enemy
from .dice import Dice
from .inventory import Inventory, ItemRegistry
from .renderer import Renderer, Theme
from .scene import Effect, EffectType, Scene, SceneRegistry


# ---------------------------------------------------------------------------
# GameEngine
# ---------------------------------------------------------------------------

class GameEngine:
    """
    The central coordinator for a dungeon crawl game.

    Typical usage::

        from engine import GameEngine, SceneRegistry, ItemRegistry
        from my_game.content import register_all

        register_all()  # populate SceneRegistry and ItemRegistry

        engine = GameEngine(start_scene="intro", game_title="My Dungeon")
        engine.run()

    The engine reads scenes from SceneRegistry and items from ItemRegistry.
    """

    def __init__(
        self,
        start_scene: str = "start",
        game_title: str = "DUNGEON CRAWL",
        theme: Optional[Theme] = None,
        classes: Optional[Dict[str, Any]] = None,
        save_file: str = "savegame.json",
    ) -> None:
        self.start_scene  = start_scene
        self.game_title   = game_title
        self.save_file    = save_file
        self.classes      = classes or {}

        self.renderer     = Renderer(theme=theme, game_title=game_title)
        self.player:      Optional[Character] = None
        self.current_scene_id: str = start_scene
        self.messages:    List[str] = []   # recent narrative messages
        self._running:    bool = False
        self._game_over:  bool = False
        self._victory:    bool = False

    # ---------------------------------------------------------------------------
    # Entry points
    # ---------------------------------------------------------------------------

    def run(self) -> None:
        """Start and run the game loop until the player wins, dies, or quits."""
        self._running = True
        self._show_title()

        # Offer load if save exists
        if os.path.exists(self.save_file):
            if self.renderer.ask_yes_no("Load saved game?"):
                self.load_game()

        if not self.player:
            self._create_player()

        # Trigger on_enter effects for the starting scene
        self._enter_scene(self.current_scene_id)

        while self._running and not self._game_over and not self._victory:
            self._main_loop_step()

        if self._game_over:
            self.renderer.print_game_over()
            self.renderer.press_any_key()
        elif self._victory:
            self.renderer.print_victory()
            self.renderer.press_any_key()

    def _show_title(self) -> None:
        art = r"""
  ____  _   _ _   _  ____ _____ ___  _   _
 |  _ \| | | | \ | |/ ___| ____/ _ \| \ | |
 | | | | | | |  \| | |  _|  _|| | | |  \| |
 | |_| | |_| | |\  | |_| | |__| |_| | |\  |
 |____/ \___/|_| \_|\____|_____\___/|_| \_|
        """
        self.renderer.print_title_screen(
            title=self.game_title,
            subtitle="A Text-Driven TTRPG Dungeon Crawl Engine",
            art=art,
        )
        self.renderer.press_any_key()

    # ---------------------------------------------------------------------------
    # Character creation
    # ---------------------------------------------------------------------------

    def _create_player(self) -> None:
        """Run the character creation flow."""
        name, class_key = self.renderer.render_character_creation(
            classes=self.classes,
            game_title=self.game_title,
        )
        cls_data = self.classes.get(class_key, {})
        self.player = self._build_character(name, class_key, cls_data)
        self._add_message(
            f"Welcome, {self.player.name} the {self.player.character_class}! "
            f"Your adventure begins..."
        )

    def _build_character(
        self, name: str, class_key: str, cls_data: dict
    ) -> Character:
        """Build a Character from class definition data."""
        char = Character(
            name=name,
            character_class=cls_data.get("display_name", class_key),
        )
        if "attributes" in cls_data:
            char.attributes = dict(cls_data["attributes"])
        if "max_hp" in cls_data:
            char.max_hp     = cls_data["max_hp"]
            char.current_hp = cls_data["max_hp"]
        if "armor_class" in cls_data:
            char.armor_class  = cls_data["armor_class"]
        if "attack_bonus" in cls_data:
            char.attack_bonus = cls_data["attack_bonus"]
        if "damage_dice" in cls_data:
            char.damage_dice  = cls_data["damage_dice"]
        if "proficiencies" in cls_data:
            char.proficiencies = list(cls_data["proficiencies"])
        if "save_proficiencies" in cls_data:
            char.save_proficiencies = list(cls_data["save_proficiencies"])
        if "starting_items" in cls_data:
            for item_id in cls_data["starting_items"]:
                char.add_item(item_id)
        if "gold" in cls_data:
            char.gold = cls_data["gold"]
        return char

    # ---------------------------------------------------------------------------
    # Scene management
    # ---------------------------------------------------------------------------

    def _enter_scene(self, scene_id: str) -> None:
        """Set current scene and apply on_enter effects."""
        self.current_scene_id = scene_id
        scene = SceneRegistry.get(scene_id)
        if scene is None:
            raise RuntimeError(f"Scene not found: '{scene_id}'")
        for effect in scene.on_enter:
            self._apply_effect(effect)

    def _main_loop_step(self) -> None:
        """Render the current scene and process one player input."""
        scene = SceneRegistry.get(self.current_scene_id)
        if scene is None:
            self._add_message(f"ERROR: Missing scene '{self.current_scene_id}'")
            self._game_over = True
            return

        assert self.player is not None

        self.renderer.render_scene(scene, self.player, self.messages)

        choices = scene.numbered_choices(self.player)
        if not choices:
            self._add_message("(No choices available – story ends here.)")
            self._game_over = True
            return

        raw = self.renderer._get_input(
            f"{self.renderer.theme.accent}> {self.renderer.theme.primary}"
        ).strip()

        # Special commands
        if raw.lower() in ("q", "quit", "exit"):
            if self.renderer.ask_yes_no("Save and quit?"):
                self.save_game()
            self._running = False
            return
        if raw.lower() in ("s", "save"):
            self.save_game()
            self._add_message("Game saved.")
            return
        if raw.lower() in ("i", "inv", "inventory"):
            self._show_inventory()
            return

        choice = scene.find_choice(raw, self.player)
        if choice is None:
            self._add_message("Invalid choice. Enter a number from the list.")
            return

        # Clear old messages when making a new choice
        self.messages = []
        self._process_choice(choice)

    def _process_choice(self, choice) -> None:
        """Apply a choice's effects (with optional skill check)."""
        assert self.player is not None

        if choice.skill_check:
            sc = choice.skill_check
            result, success = self.player.roll_skill_check(
                sc.skill, sc.dc,
                advantage=sc.advantage,
                disadvantage=sc.disadvantage,
            )
            mod = self.player.get_skill_modifier(sc.skill)
            self._add_message(
                f"{sc.skill} check DC {sc.dc}: rolled {result}  "
                f"→ {'SUCCESS!' if success else 'FAILURE.'}"
            )
            effects = sc.on_success if success else sc.on_failure
            for effect in effects:
                self._apply_effect(effect)
        else:
            for effect in choice.effects:
                self._apply_effect(effect)

    # ---------------------------------------------------------------------------
    # Effect processor
    # ---------------------------------------------------------------------------

    def _apply_effect(self, effect: Effect) -> None:
        """Apply a single Effect to the game state."""
        assert self.player is not None
        t  = effect.type
        p  = effect.params

        if t == EffectType.GOTO:
            scene_id = p["scene_id"]
            self._enter_scene(scene_id)

        elif t == EffectType.GIVE_ITEM:
            item_id = p["item_id"]
            item = ItemRegistry.get(item_id)
            name = item.name if item else item_id
            self.player.add_item(item_id)
            self._add_message(f"You obtain: {name}.")

        elif t == EffectType.REMOVE_ITEM:
            item_id = p["item_id"]
            item = ItemRegistry.get(item_id)
            name = item.name if item else item_id
            if self.player.remove_item(item_id):
                self._add_message(f"You lose: {name}.")

        elif t == EffectType.DAMAGE:
            amount = p.get("amount", 0)
            dice   = p.get("dice", "")
            if dice:
                roll = Dice.parse(dice)
                total = roll.total + amount
                self._add_message(f"You take {total} damage! [{roll}]")
            else:
                total = amount
                self._add_message(f"You take {total} damage!")
            self.player.take_damage(total)
            if not self.player.is_alive:
                self._game_over = True

        elif t == EffectType.HEAL:
            amount = p.get("amount", 0)
            dice   = p.get("dice", "")
            if dice:
                healed, roll = self.player.heal_dice(dice)
                healed += amount
                self._add_message(f"You heal {healed} HP! [{roll}]")
            else:
                healed = self.player.heal(amount)
                self._add_message(f"You heal {healed} HP!")

        elif t == EffectType.SET_FLAG:
            self.player.set_flag(p["key"], p.get("value", True))

        elif t == EffectType.CLEAR_FLAG:
            self.player.flags.pop(p["key"], None)

        elif t == EffectType.GAIN_XP:
            xp = p["amount"]
            leveled = self.player.gain_experience(xp)
            self._add_message(f"You gain {xp} XP!")
            if leveled:
                self._add_message(
                    f"*** LEVEL UP! You are now level {self.player.level}! ***"
                )

        elif t == EffectType.GIVE_GOLD:
            self.player.gold += p["amount"]
            self._add_message(f"You find {p['amount']} gold pieces!")

        elif t == EffectType.TAKE_GOLD:
            amount = p["amount"]
            self.player.gold = max(0, self.player.gold - amount)
            self._add_message(f"You spend {amount} gold pieces.")

        elif t == EffectType.COMBAT:
            enemies: List[Enemy] = p["enemies"]
            self._run_combat(enemies)

        elif t == EffectType.SAY:
            self._add_message(p["message"])

        elif t == EffectType.GAME_OVER:
            self._add_message(p.get("message", "You have died."))
            self._game_over = True

        elif t == EffectType.VICTORY:
            self._add_message(p.get("message", "Victory!"))
            self._victory = True

    # ---------------------------------------------------------------------------
    # Combat
    # ---------------------------------------------------------------------------

    def _run_combat(self, enemies: List[Enemy]) -> None:
        assert self.player is not None
        combat = CombatEngine(
            player=self.player,
            enemies=enemies,
            renderer=self.renderer,
            on_log=self._add_message,
        )
        result = combat.run()

        if result.player_won:
            leveled = self.player.gain_experience(result.xp_gained)
            if leveled:
                self._add_message(
                    f"*** LEVEL UP! You are now level {self.player.level}! ***"
                )
            for item_id in result.loot:
                item = ItemRegistry.get(item_id)
                name = item.name if item else item_id
                self.player.add_item(item_id)
                self._add_message(f"You find: {name}.")
        elif result.fled:
            self._add_message("You escaped from combat!")
        else:
            self._game_over = True

        self.renderer.press_any_key()

    # ---------------------------------------------------------------------------
    # Inventory display
    # ---------------------------------------------------------------------------

    def _show_inventory(self) -> None:
        assert self.player is not None
        inv = Inventory(self.player)
        self.renderer.clear()
        t = self.renderer.theme
        r = self.renderer

        print(r._c(t.accent, "═" * r.width))
        print(r._c(t.accent, "  INVENTORY".center(r.width)))
        print(r._c(t.accent, "═" * r.width))
        print()
        for line in inv.display_list():
            print(r._c(t.primary, f"  · {line}"))
        print()
        print(r._c(t.dim, f"  Gold: {self.player.gold} GP"))
        print()
        r.press_any_key()

    # ---------------------------------------------------------------------------
    # Messages
    # ---------------------------------------------------------------------------

    def _add_message(self, msg: str) -> None:
        self.messages.append(msg)

    # ---------------------------------------------------------------------------
    # Save / Load
    # ---------------------------------------------------------------------------

    def save_game(self) -> None:
        assert self.player is not None
        data = {
            "player": self.player.to_dict(),
            "current_scene": self.current_scene_id,
            "messages": self.messages[-20:],
        }
        with open(self.save_file, "w") as f:
            json.dump(data, f, indent=2)

    def load_game(self) -> bool:
        try:
            with open(self.save_file) as f:
                data = json.load(f)
            self.player = Character.from_dict(data["player"])
            self.current_scene_id = data.get("current_scene", self.start_scene)
            self.messages = data.get("messages", [])
            return True
        except (FileNotFoundError, KeyError, json.JSONDecodeError):
            return False
