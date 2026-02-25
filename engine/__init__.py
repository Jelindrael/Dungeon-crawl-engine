"""
Dungeon Crawl Engine – Graphical edition
=========================================

A two-color pixel graphics TTRPG dungeon crawl engine using pygame.
Ruleset: Call of Cthulhu 7th Edition.

Quick start::

    from engine import (
        GameRenderer, GameState, Investigator,
        Scene, Choice, Effect, SceneRegistry,
    )
    from engine.palette import PRESETS

    # 1. Register scenes
    SceneRegistry.register(Scene(
        scene_id="start",
        title="The Arkham Hotel",
        description="A dreary room. Rain streaks the window.",
        choices=[
            Choice.go("Step outside", "street"),
        ],
    ))

    # 2. Create investigator
    inv = Investigator.create("Alice Marsh", occupation="Reporter")

    # 3. Create game state + renderer and run
    gs = GameState(inv, start_scene="start")
    renderer = GameRenderer(gs, palette=PRESETS["amber"],
                            game_title="DARK ARKHAM")
    renderer.run()
"""

from .coc import (
    Investigator, build_premade, PREMADE_INVESTIGATORS,
    check_skill, opposed_check, sanity_check, SuccessLevel, CheckResult,
    Combatant, CombatAction, resolve_combat, CombatRound,
    roll_all_characteristics, CHARACTERISTIC_NAMES,
    BASE_SKILLS,
)
from .palette  import Palette, PRESETS, get_preset, list_preset_names, DEFAULT
from .scene    import Scene, Choice, SkillCheck, Effect, FX, Requirement, SceneRegistry
from .dialogue import (
    DialogueTree, DialogueNode, DialogueChoice, DialogueSkillCheck,
    DialogueRequirement, DialogueRegistry,
)
from .tilemap  import TileMap, MapEntity, TILE_DEFS
from .sprite   import Sprite, SpriteFrame, Illustration, SpriteRegistry, import_png
from .game_state import GameState, Mode
from .renderer import GameRenderer

__version__ = "2.0.0"

__all__ = [
    # CoC rules
    "Investigator", "build_premade", "PREMADE_INVESTIGATORS",
    "check_skill", "opposed_check", "sanity_check",
    "SuccessLevel", "CheckResult",
    "Combatant", "CombatAction", "resolve_combat", "CombatRound",
    "roll_all_characteristics", "CHARACTERISTIC_NAMES", "BASE_SKILLS",
    # Palette
    "Palette", "PRESETS", "get_preset", "list_preset_names", "DEFAULT",
    # Scene / narrative
    "Scene", "Choice", "SkillCheck", "Effect", "FX", "Requirement", "SceneRegistry",
    # Dialogue
    "DialogueTree", "DialogueNode", "DialogueChoice", "DialogueSkillCheck",
    "DialogueRequirement", "DialogueRegistry",
    # Map
    "TileMap", "MapEntity", "TILE_DEFS",
    # Sprite
    "Sprite", "SpriteFrame", "Illustration", "SpriteRegistry", "import_png",
    # Game state
    "GameState", "Mode",
    # Renderer
    "GameRenderer",
]
