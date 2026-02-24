"""
Dungeon Crawl Engine
====================

A two-color, text-focused TTRPG dungeon crawl game engine.

Key classes:
    GameEngine      – main game loop and state manager
    Character       – player/NPC with D&D-style attributes and skills
    Dice            – polyhedral dice rolling (d4-d20, skill checks)
    Scene           – narrative location with choices and effects
    Effect          – game-state mutation (goto, give_item, damage, ...)
    Choice          – player option within a scene
    SkillCheck      – d20 vs DC check embedded in a choice
    Enemy           – combat adversary
    Item            – inventory item definition
    ItemRegistry    – global item lookup
    SceneRegistry   – global scene lookup
    DungeonMap      – ASCII tile-based dungeon map
    Renderer        – two-color ANSI terminal renderer
    Theme           – color theme (GREEN, AMBER, CYAN)

Quick start::

    from engine import (
        GameEngine, Scene, Choice, Effect,
        Item, ItemRegistry, SceneRegistry,
    )

    ItemRegistry.register(Item("torch", "Torch", "Lights the way.", item_type="light"))

    SceneRegistry.register_many([
        Scene(
            scene_id="start",
            title="The Cave Entrance",
            description="You stand before a dark cave. Torchlight flickers inside.",
            choices=[
                Choice.go("Enter the cave", "inside"),
                Choice.go("Turn back home", "ending_coward"),
            ],
        ),
        Scene(
            scene_id="inside",
            title="Inside the Cave",
            description="It is pitch black. You are likely to be eaten by a grue.",
            choices=[
                Choice.go("Retreat to safety", "start"),
            ],
            on_enter=[Effect.gain_xp(10)],
        ),
        Scene(
            scene_id="ending_coward",
            title="Home Again",
            description="You return home without glory.",
            on_enter=[Effect.victory("A safe, if uneventful, ending.")],
        ),
    ])

    GameEngine(start_scene="start", game_title="MY CAVE ADVENTURE").run()
"""

from .core      import GameEngine
from .character import Character, ATTRIBUTES, SKILL_ATTRIBUTES
from .dice      import Dice, RollResult
from .scene     import Scene, Choice, SkillCheck, Effect, EffectType, Requirement, SceneRegistry
from .inventory import Item, ItemRegistry, Inventory, ItemType
from .combat    import Enemy, CombatEngine, CombatResult
from .dungeon   import DungeonMap, Tile, MapTemplates
from .renderer  import Renderer, Theme, ANSI

__version__ = "1.0.0"
__author__  = "Dungeon Crawl Engine"

__all__ = [
    # Core
    "GameEngine",
    # Character
    "Character", "ATTRIBUTES", "SKILL_ATTRIBUTES",
    # Dice
    "Dice", "RollResult",
    # Scene / narrative
    "Scene", "Choice", "SkillCheck", "Effect", "EffectType",
    "Requirement", "SceneRegistry",
    # Items
    "Item", "ItemRegistry", "Inventory", "ItemType",
    # Combat
    "Enemy", "CombatEngine", "CombatResult",
    # Dungeon map
    "DungeonMap", "Tile", "MapTemplates",
    # Renderer
    "Renderer", "Theme", "ANSI",
]
