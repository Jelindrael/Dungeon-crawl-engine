"""
Game state and effect processor.

GameState holds all runtime state (investigator, current scene/map, message log,
story flags) and processes Effects from the scene/dialogue system.
"""
from __future__ import annotations
import json
import os
from typing import Any, Callable, Dict, List, Optional, TYPE_CHECKING

from .coc import Investigator, check_skill, sanity_check, _parse_dice_notation, Combatant
from .scene import FX, Effect, Scene, SceneRegistry
from .dialogue import DialogueRegistry, DialogueTree, DialogueNode

if TYPE_CHECKING:
    from .tilemap import TileMap


# ---------------------------------------------------------------------------
# Combat encounter definition (lightweight, for scene scripting)
# ---------------------------------------------------------------------------

class CombatEncounter:
    """Simple list of enemies for a combat encounter."""
    def __init__(self, enemies: List[Dict[str, Any]]) -> None:
        self.enemies = enemies  # list of dicts with name, hp, attack_skill, damage_dice...

    def to_combatants(self) -> List[Combatant]:
        result = []
        for e in self.enemies:
            c = Combatant(
                name=e["name"],
                hp=e.get("hp", 10),
                max_hp=e.get("hp", 10),
                san_loss=e.get("san_loss", "0/1d3"),
                dodge_skill=e.get("dodge_skill", 0),
                attack_skill=e.get("attack_skill", 30),
                damage_dice=e.get("damage_dice", "1d6"),
                armor=e.get("armor", 0),
                damage_bonus=e.get("damage_bonus", "0"),
                is_npc=True,
            )
            result.append(c)
        return result


# ---------------------------------------------------------------------------
# Game mode
# ---------------------------------------------------------------------------

class Mode:
    SCENE    = "scene"
    MAP      = "map"
    DIALOGUE = "dialogue"
    COMBAT   = "combat"
    MENU     = "menu"
    GAME_OVER = "game_over"
    VICTORY   = "victory"


# ---------------------------------------------------------------------------
# GameState
# ---------------------------------------------------------------------------

class GameState:
    """
    Central game state.  All game logic flows through this class.
    The renderer reads from it; player input is sent to it.
    """

    def __init__(
        self,
        investigator: Investigator,
        start_scene: str = "start",
    ) -> None:
        self.investigator       = investigator
        self.current_scene_id   = start_scene
        self.mode               = Mode.SCENE
        self.messages: List[str] = []
        self.max_messages       = 200

        # Map state
        self.current_map: Optional["TileMap"] = None
        self.player_x: int = 0
        self.player_y: int = 0

        # Dialogue state
        self.current_dialogue: Optional[DialogueTree] = None
        self.current_node: Optional[DialogueNode] = None

        # Combat state
        self.combat_enemies: List[Combatant] = []
        self.combat_round: int = 0
        self.combat_log: List[str] = []

        # Scene skill check pending push
        self._pending_push_skill: Optional[str] = None

        # Callbacks (set by renderer)
        self.on_combat_start: Optional[Callable] = None
        self.on_victory: Optional[Callable] = None
        self.on_game_over: Optional[Callable] = None

    # -----------------------------------------------------------------------
    # Message log
    # -----------------------------------------------------------------------

    def log(self, msg: str) -> None:
        self.messages.append(msg)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

    def recent_messages(self, n: int = 12) -> List[str]:
        return self.messages[-n:]

    # -----------------------------------------------------------------------
    # Scene management
    # -----------------------------------------------------------------------

    def current_scene(self) -> Optional[Scene]:
        return SceneRegistry.get(self.current_scene_id)

    def enter_scene(self, scene_id: str) -> None:
        self.current_scene_id = scene_id
        self.mode = Mode.SCENE
        scene = SceneRegistry.get(scene_id)
        if scene is None:
            self.log(f"[ERROR] Scene not found: {scene_id!r}")
            return
        self.log(f"― {scene.title} ―")
        for effect in scene.on_enter:
            self.apply_effect(effect)

    def process_choice(self, key: str) -> None:
        """Handle player input (a choice key like '1', '2', ...)."""
        scene = self.current_scene()
        if scene is None:
            return
        inv = self.investigator
        choice = scene.find_choice(key, inv)
        if choice is None:
            return

        self.messages = self.messages  # keep log; scene description will redraw
        if choice.skill_check:
            sc = choice.skill_check
            skill_val = inv.skills.get(sc.skill, 0)
            result = inv.roll_skill(sc.skill, sc.bonus_dice)
            self.log(str(result))
            effects = sc.on_success if result.is_success() else sc.on_failure
            for eff in effects:
                self.apply_effect(eff)
        else:
            for eff in choice.effects:
                self.apply_effect(eff)

    # -----------------------------------------------------------------------
    # Dialogue management
    # -----------------------------------------------------------------------

    def start_dialogue(self, dialogue_id: str) -> None:
        tree = DialogueRegistry.get(dialogue_id)
        if tree is None:
            self.log(f"[ERROR] Dialogue not found: {dialogue_id!r}")
            return
        self.current_dialogue = tree
        node = tree.get_node(tree.start_node)
        if node:
            self.current_node = node
            self.mode = Mode.DIALOGUE
            for eff in node.on_enter:
                self.apply_effect(Effect.from_dict(eff))
            self.log(f'{node.speaker}: "{node.text}"')

    def process_dialogue_choice(self, key: str) -> None:
        if not self.current_node or not self.current_dialogue:
            return
        inv = self.investigator
        choices = self.current_node.available_choices(inv)
        try:
            idx = int(key) - 1
            choice = choices[idx]
        except (ValueError, IndexError):
            return

        for eff in choice.effects:
            self.apply_effect(Effect.from_dict(eff))

        if choice.skill_check:
            sc = choice.skill_check
            result = inv.roll_skill(sc.skill)
            self.log(str(result))
            next_id = sc.on_success if result.is_success() else sc.on_failure
        else:
            next_id = choice.next_node

        if next_id:
            node = self.current_dialogue.get_node(next_id)
            if node:
                self.current_node = node
                for eff in node.on_enter:
                    self.apply_effect(Effect.from_dict(eff))
                self.log(f'{node.speaker}: "{node.text}"')
            else:
                self._end_dialogue()
        else:
            self._end_dialogue()

    def _end_dialogue(self) -> None:
        self.current_dialogue = None
        self.current_node = None
        self.mode = Mode.SCENE

    # -----------------------------------------------------------------------
    # Map movement
    # -----------------------------------------------------------------------

    def move_player(self, dx: int, dy: int) -> None:
        if self.current_map is None:
            return
        nx, ny = self.player_x + dx, self.player_y + dy
        if self.current_map.is_passable(nx, ny):
            self.player_x, self.player_y = nx, ny
            self.current_map.reveal_radius(nx, ny, radius=5)
            # Check for entities at new position
            for entity in self.current_map.entities_at(nx, ny):
                if entity.entity_type == "trigger":
                    sid = entity.properties.get("scene_id")
                    if sid:
                        self.enter_scene(sid)
                elif entity.entity_type == "npc":
                    did = entity.properties.get("dialogue_id")
                    if did:
                        self.start_dialogue(did)

    # -----------------------------------------------------------------------
    # Effect processor
    # -----------------------------------------------------------------------

    def apply_effect(self, effect: Effect) -> None:
        t, p = effect.type, effect.params
        inv = self.investigator

        if t == FX.GOTO:
            self.enter_scene(p["scene_id"])

        elif t == FX.GIVE_ITEM:
            inv.add_item(p["name"])
            self.log(f"You obtain: {p['name']}.")

        elif t == FX.REMOVE_ITEM:
            if inv.remove_item(p["name"]):
                self.log(f"You lose: {p['name']}.")

        elif t == FX.DAMAGE:
            amount = p.get("amount", 0)
            if p.get("dice"):
                amount += _parse_dice_notation(p["dice"])
            msgs = inv.take_damage(amount)
            for m in msgs:
                self.log(m)
            if inv.current_hp <= 0:
                self.apply_effect(Effect.game_over(
                    f"{inv.name} succumbs to their wounds."
                ))

        elif t == FX.HEAL:
            amount = p.get("amount", 0)
            if p.get("dice"):
                amount += _parse_dice_notation(p["dice"])
            healed = inv.heal(amount)
            self.log(f"You recover {healed} HP. ({inv.current_hp}/{inv.max_hp})")

        elif t == FX.SET_FLAG:
            inv.set_flag(p["key"], p.get("value", True))

        elif t == FX.CLEAR_FLAG:
            inv.flags.pop(p["key"], None)

        elif t == FX.SAN_LOSS:
            result, lost, msgs = inv.roll_sanity(p["fail_dice"], p.get("success_dice", "0"))
            for m in msgs:
                self.log(m)
            if inv.current_san <= 0:
                self.apply_effect(Effect.game_over("Your mind shatters completely."))

        elif t == FX.GIVE_GOLD:
            inv.cash += p["amount"]
            self.log(f"You gain ${p['amount']}.")

        elif t == FX.TAKE_GOLD:
            inv.cash = max(0, inv.cash - p["amount"])
            self.log(f"You spend ${p['amount']}.")

        elif t == FX.SAY:
            self.log(p["message"])

        elif t == FX.DIALOGUE:
            self.start_dialogue(p["dialogue_id"])

        elif t == FX.LOAD_MAP:
            from .tilemap import TileMap
            try:
                path = f"assets/maps/{p['map_id']}.json"
                tm = TileMap.load(path)
                self.current_map = tm
                px, py = tm.player_start()
                self.player_x, self.player_y = px, py
                tm.reveal_radius(px, py, radius=5)
                self.mode = Mode.MAP
                self.log(f"Entered: {tm.name}")
            except FileNotFoundError:
                self.log(f"[ERROR] Map not found: {p['map_id']}")

        elif t == FX.SHOW_ART:
            # Tell the renderer to display this illustration
            self._pending_art = p.get("illustration_id", "")

        elif t == FX.COMBAT:
            enc = CombatEncounter(p.get("enemies", []))
            self.combat_enemies = enc.to_combatants()
            self.combat_round = 0
            self.combat_log = []
            self.mode = Mode.COMBAT
            names = ", ".join(e.name for e in self.combat_enemies)
            self.log(f"*** COMBAT: {names} ***")
            if self.on_combat_start:
                self.on_combat_start()

        elif t == FX.GAME_OVER:
            msg = p.get("message", "You are dead.")
            self.log(f"GAME OVER: {msg}")
            self.mode = Mode.GAME_OVER
            if self.on_game_over:
                self.on_game_over(msg)

        elif t == FX.VICTORY:
            msg = p.get("message", "You have prevailed.")
            self.log(f"VICTORY: {msg}")
            self.mode = Mode.VICTORY
            if self.on_victory:
                self.on_victory(msg)

    # -----------------------------------------------------------------------
    # Serialization
    # -----------------------------------------------------------------------

    def save(self, path: str) -> None:
        data = {
            "investigator": self.investigator.to_dict(),
            "current_scene": self.current_scene_id,
            "messages": self.messages[-50:],
            "mode": self.mode,
        }
        os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        self.log("Game saved.")

    @classmethod
    def load(cls, path: str) -> "GameState":
        with open(path) as f:
            data = json.load(f)
        inv = Investigator.from_dict(data["investigator"])
        state = cls(inv, start_scene=data.get("current_scene", "start"))
        state.messages = data.get("messages", [])
        state.mode = data.get("mode", Mode.SCENE)
        return state
