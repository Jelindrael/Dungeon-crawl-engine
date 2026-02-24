# Dungeon Crawl Engine

A two-color, text-focused TTRPG dungeon crawl game engine written in Python.

Build old-school dungeon crawlers that run in any terminal, with a strong emphasis on
narrative choices, TTRPG mechanics (attributes, skill checks, dice), and ASCII dungeon
maps rendered in two vivid colors on a black background.

```
═══════════════════════════════════════════════════════════════════════════
 THE DUNGEON OF AELORIA                    HP: ██████░░░░ 6/10  AC:13  GP:5
 Aryn the Rogue                                                    Lvl 1 Rogue
═══════════════════════════════════════════════════════════════════════════
 ENTRANCE HALL

  #########    You stand in a rectangular chamber of ancient stone.
  #.......#    Crumbled pillars line the walls, and goblin graffiti
  #.O...O.#    mars the carved reliefs. A crude campfire smoulders in
  #...@...#    one corner. Two doorways lead further into the dungeon:
  #.......#    a heavy wooden door to the north (the guard room) and
  ###+#####    a narrow crack in the eastern wall.

─────────────────────────────────────────────────────────────────────────
 STR:10(+0)  DEX:17(+3)  CON:12(+1)  INT:13(+1)  WIS:11(+0)  CHA:12(+1)
─────────────────────────────────────────────────────────────────────────
 WHAT DO YOU DO?
  [1] Go north through the wooden door (toward the guard room)
  [2] Squeeze through the crack in the eastern wall  [Athletics DC 12]
  [3] Examine the goblin graffiti  [History DC 11]
  [4] Search the campfire area  [Perception DC 10]
  [5] Retreat to the dungeon entrance
```

---

## Features

### TTRPG Mechanics
- **6 Core attributes** – STR, DEX, CON, INT, WIS, CHA (D&D 5e-style)
- **Attribute modifiers** – `(score − 10) / 2`
- **18 skills** – each linked to a governing attribute, with proficiency bonus support
- **Skill checks** – `d20 + modifier + proficiency` vs Difficulty Class
- **Saving throws** – attribute-based, with proficiency support
- **Advantage/Disadvantage** – roll twice, take best/worst
- **Critical hits** (nat 20) and fumbles (nat 1)
- **XP & Leveling** – D&D 5e XP thresholds, proficiency bonus scaling

### Dice System (`engine.Dice`)
```python
from engine import Dice

Dice.d20(modifier=3)                        # 1d20+3
Dice.roll(sides=8, count=2, modifier=-1)    # 2d8-1
Dice.parse("3d6+2")                         # parse notation
Dice.advantage(20, modifier=2)              # roll twice, take higher
result, success = Dice.skill_check(modifier=5, dc=14)
Dice.roll_stats()                           # 4d6 drop lowest x6
```

### Scene & Narrative System
Scenes are the core building block. Each scene has a description, optional ASCII map,
and a list of player choices:

```python
from engine import Scene, Choice, Effect, SkillCheck, Requirement, SceneRegistry

SceneRegistry.register(Scene(
    scene_id="dark_corridor",
    title="A Dark Corridor",
    description="The passage stretches ahead, black as pitch.",
    ascii_map="""
########
#......#
#..@...#
#......#
########""",
    choices=[
        # Simple navigation
        Choice.go("Press forward", "next_room"),

        # Gated by item requirement
        Choice(
            text="Light your torch and look around",
            effects=[
                Effect.say("The torchlight reveals a hidden door!"),
                Effect.set_flag("found_door"),
            ],
            requirement=Requirement(has_item="torch"),
        ),

        # Skill check with branching outcomes
        Choice.checked(
            text="Listen carefully  [Perception DC 12]",
            skill="Perception",
            dc=12,
            on_success=[
                Effect.say("You hear breathing ahead – something is waiting."),
                Effect.set_flag("heard_enemy"),
            ],
            on_failure=[
                Effect.say("Only silence."),
            ],
        ),
    ],
))
```

### Effects (Game State Mutations)
| Effect | Description |
|---|---|
| `Effect.goto(scene_id)` | Navigate to a scene |
| `Effect.give_item(item_id)` | Add item to inventory |
| `Effect.remove_item(item_id)` | Remove item |
| `Effect.damage(amount, dice)` | Deal damage to player |
| `Effect.heal(amount, dice)` | Restore player HP |
| `Effect.give_gold(amount)` | Award gold |
| `Effect.set_flag(key, value)` | Set story flag |
| `Effect.gain_xp(amount)` | Award experience |
| `Effect.combat(enemies)` | Start a combat encounter |
| `Effect.say(message)` | Display a message |
| `Effect.game_over(message)` | Trigger game over |
| `Effect.victory(message)` | Trigger victory screen |

### Choice Requirements
Control which choices are visible using `Requirement`:

```python
Requirement(has_item="rope")          # must carry item
Requirement(no_flag="door_locked")    # flag must be absent
Requirement(has_flag="met_wizard")    # flag must be set
Requirement(min_attribute={"STR":15}) # min attribute score
Requirement(min_gold=50)              # afford something
Requirement(min_level=3)              # character level gate
```

### Combat System
Turn-based combat with initiative, attack rolls, and damage:

```python
from engine import Enemy, Effect

# Define an enemy
wolf = Enemy(
    name="Grey Wolf",
    max_hp=11, armor_class=13,
    attack_bonus=2, damage_dice="2d4+2",
    xp_reward=100,
    loot_table=["wolf_pelt"],
)

# Trigger from a scene choice
Choice(
    text="Fight the wolf!",
    effects=[Effect.combat([wolf])],
)
```

Combat features:
- Initiative (d20 + DEX modifier)
- Attack roll (d20 + attack_bonus vs AC)
- Critical hits (nat 20 = double damage dice)
- Use items mid-combat
- Flee attempt (Athletics/Acrobatics DC 13)
- Auto-loot on victory

### Items
```python
from engine import Item, ItemRegistry, ItemType

ItemRegistry.register(Item(
    item_id="magic_sword",
    name="Sword of Flames",
    description="A blade wreathed in eternal fire.",
    item_type=ItemType.WEAPON,
    value=150,
    properties={
        "damage_dice": "1d8+2",
        "attack_bonus": 2,
    },
))
```

### ASCII Dungeon Maps
Define maps as multiline strings using standard tile characters:

| Char | Tile |
|---|---|
| `#` | Wall |
| `.` | Floor |
| `@` | Player |
| `+` | Closed door |
| `/` | Open door |
| `>` | Stairs down |
| `<` | Stairs up |
| `$` | Chest |
| `!` | Item |
| `^` | Trap |
| `~` | Water |
| `g`, `o`, `T`… | Enemy glyphs |

### Two-Color Themes
```python
from engine import Theme

Theme.GREEN()   # classic green phosphor monitor
Theme.AMBER()   # amber monitor look
Theme.CYAN()    # matrix-style cyan
```

---

## Running the Demo Game

**The Dungeon of Aeloria** – a short dungeon crawl adventure:

```bash
python games/demo/run.py
```

The demo features:
- 3 character classes (Warrior, Rogue, Mage) with distinct stats
- 12 scenes across Millhaven town and the dungeon
- Skill checks: Perception, Stealth, Athletics, Arcana, History, Persuasion, Intimidation
- Multiple paths through the dungeon (combat, stealth, persuasion)
- Combat encounters (Goblin, Scout, Guard, Hobgoblin, Chieftain boss)
- 17 item types (weapons, armor, potions, keys, quest items)
- Story flags that persist across scenes
- Save/load game

---

## Quick Start: Build Your Own Game

```python
# my_game.py
from engine import (
    GameEngine, Scene, Choice, Effect, SkillCheck,
    Item, ItemRegistry, SceneRegistry, Enemy, Theme,
)

# 1. Register items
ItemRegistry.register(Item(
    "silver_key", "Silver Key", "An ornate silver key.",
    properties={"consumable": False},
))

# 2. Register scenes
SceneRegistry.register_many([
    Scene(
        scene_id="start",
        title="The Village",
        description="You stand in a sleepy village. A dark forest looms to the north.",
        choices=[
            Choice.go("Enter the forest", "forest"),
            Choice.go("Visit the blacksmith", "blacksmith"),
        ],
    ),
    Scene(
        scene_id="blacksmith",
        title="The Blacksmith",
        description="The smith hands you a silver key. 'Opens the forest shrine,' he says.",
        on_enter=[Effect.give_item("silver_key")],
        choices=[Choice.go("Head to the forest", "forest")],
    ),
    Scene(
        scene_id="forest",
        title="The Dark Forest",
        description="Ancient trees close in. A stone shrine stands ahead, locked tight.",
        choices=[
            Choice(
                text="Unlock the shrine with the silver key",
                effects=[
                    Effect.remove_item("silver_key"),
                    Effect.victory("The shrine opens, flooding the forest with light. You win!"),
                ],
                requirement=__import__('engine').Requirement(has_item="silver_key"),
            ),
            Choice.go("Return to the village", "start"),
        ],
    ),
])

# 3. Define character classes
CLASSES = {
    "hero": {
        "display_name": "Hero",
        "description": "A brave adventurer.",
        "attributes": {"STR":14,"DEX":12,"CON":13,"INT":10,"WIS":10,"CHA":12},
        "max_hp": 10, "armor_class": 13, "attack_bonus": 3,
        "damage_dice": "1d6+2",
        "proficiencies": ["Athletics", "Perception"],
        "save_proficiencies": ["STR", "CON"],
        "gold": 10,
    }
}

# 4. Run
GameEngine(
    start_scene="start",
    game_title="THE FOREST SHRINE",
    theme=Theme.AMBER(),
    classes=CLASSES,
).run()
```

---

## Project Structure

```
Dungeon-crawl-engine/
├── engine/
│   ├── __init__.py      # public API
│   ├── core.py          # GameEngine – main loop, effect processor, save/load
│   ├── scene.py         # Scene, Choice, SkillCheck, Effect, Requirement, SceneRegistry
│   ├── character.py     # Character – attributes, skills, HP, leveling
│   ├── dice.py          # Dice – d4-d20, skill checks, advantage/disadvantage
│   ├── combat.py        # CombatEngine, Enemy – turn-based combat
│   ├── inventory.py     # Item, ItemRegistry, Inventory
│   ├── dungeon.py       # DungeonMap, Tile, MapTemplates
│   └── renderer.py      # Renderer, Theme – two-color ANSI terminal UI
├── games/
│   └── demo/
│       ├── content.py   # All demo game content (scenes, items, enemies, classes)
│       └── run.py       # Entry point for the demo
└── README.md
```

---

## Requirements

- Python 3.8+
- No external dependencies (uses stdlib only: `random`, `json`, `os`, `textwrap`, `shutil`)
