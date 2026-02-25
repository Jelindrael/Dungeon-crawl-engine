# Dungeon Crawl Engine

A two-color pixel-art dungeon crawl game engine written in Python with pygame,
using **Call of Cthulhu 7th Edition** TTRPG rules.

Inspired by the aesthetic of games like *Cyclopean* — monochrome phosphor-screen
rendering, hand-crafted pixel art, and atmospheric investigative gameplay.

---

## Features

- **Two-color rendering** — every element drawn with exactly two colors (bg + fg),
  with CRT scanline overlay and dithering for intermediate tones
- **8 palette presets** — Phosphor Green, Amber, Cyan, White Phosphor, Red Alert,
  Blue Terminal, Magenta, Neon Yellow
- **Call of Cthulhu 7e rules** — d100 percentile system, Hard/Extreme/Fumble
  success levels, bonus/penalty dice, Sanity mechanics, full Investigator sheets
- **Scene/narrative graph** — Choice → Effect pipeline with skill checks,
  item requirements, flag gates, SAN loss, and combat triggers
- **Tile map system** — fog-of-war, entity placement, JSON persistence
- **Pixel art sprite system** — 2-bit (0/1) frame animation, PNG import
- **Dialogue tree system** — branching NPC conversations with skill checks
- **4 built-in editor tools** — Map Editor, Sprite Editor, Dialogue Editor,
  Palette Chooser (all pygame-based)
- **Demo scenario** — "The Blackwood Manor Affair", a complete CoC investigation

---

## Requirements

```
pygame >= 2.1.0
Pillow          # optional, for PNG import in sprite editor
```

Install:

```bash
pip install pygame
pip install Pillow   # optional
```

---

## Quick Start

```bash
# Launch the main menu
python main.py

# Jump straight into the demo game
python main.py play

# Open the map editor
python main.py map

# Open the pixel art / sprite editor
python main.py sprite

# Open the node-based dialogue editor
python main.py dialogue

# Open the palette chooser
python main.py palette
```

---

## Project Structure

```
Dungeon-crawl-engine/
├── main.py                    # Main launcher (menu → game or editors)
├── requirements.txt
│
├── engine/
│   ├── __init__.py            # Public API
│   ├── palette.py             # Two-color palette system + 8 presets
│   ├── coc.py                 # CoC 7e rules: dice, skill checks, Investigator
│   ├── tilemap.py             # Tile map + fog-of-war + entity placement
│   ├── sprite.py              # Pixel art sprite (2-bit frame animation)
│   ├── dialogue.py            # Dialogue tree system
│   ├── scene.py               # Scene/narrative graph + Effect vocabulary
│   ├── game_state.py          # Central game state + effect processor
│   ├── renderer.py            # Main pygame renderer (Cyclopean-style layout)
│   └── ui/
│       ├── layout.py          # Panel geometry constants (1280×720)
│       ├── font.py            # Font cache + render helpers
│       └── components.py      # Button, DPad, HP bars, dithering utilities
│
├── editor/
│   ├── palette_chooser.py     # Pygame palette chooser with RGB sliders
│   ├── sprite_editor.py       # Pixel art editor (pencil/eraser/fill, undo/redo)
│   ├── map_editor.py          # Tile map editor (paint, entities, resize)
│   └── dialogue_editor.py     # Node-based dialogue editor (drag & drop)
│
├── games/
│   └── demo/
│       ├── content.py         # "The Blackwood Manor Affair" — scenes + dialogues
│       └── run.py             # Demo game entry point (character select + renderer)
│
└── assets/
    ├── palettes/              # Saved palette JSON files
    ├── sprites/               # Saved sprite JSON files
    ├── maps/                  # Saved map JSON files
    └── dialogues/             # Saved dialogue tree JSON files
```

---

## Window Layout (1280×720)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BANNER (title + scene name)                  │
├──────────────┬──────────────────────────────────┬──────────────┤
│ LEFT PANEL   │                                  │ RIGHT PANEL  │
│              │         VIEWPORT                 │              │
│ · Location   │    (tilemap or illustration)     │ · Menu btns  │
│ · Mini-map   │                                  │ · D-Pad      │
│ · Items      ├──────────────────────────────────┤              │
│ · HP/SAN/MP  │       TEXT LOG + CHOICES         │              │
│ · Stats      │                                  │              │
└──────────────┴──────────────────────────────────┴──────────────┘
```

Exact pixel bounds:
- Banner:   `(0,0)` → `1280×60`
- Left:     `(0,60)` → `200×660`
- Viewport: `(200,60)` → `920×420`
- Log:      `(200,480)` → `920×240`
- Right:    `(1120,60)` → `160×660`

---

## CoC 7e Rules Summary

### Characteristics
`STR` `CON` `SIZ` `DEX` `APP` `INT` `POW` `EDU`

### Derived Stats
| Stat | Formula |
|------|---------|
| HP | `(CON + SIZ) / 10` |
| MP | `POW / 5` |
| SAN | `POW` |
| Luck | `3d6 × 5` |

### Skill Checks (d100)
| Roll | Result |
|------|--------|
| ≤ skill / 5 | **Extreme Success** |
| ≤ skill / 2 | **Hard Success** |
| ≤ skill | **Regular Success** |
| > skill | **Failure** |
| ≥ 96 (skill ≤ 50) or = 100 | **Fumble** |

**Bonus dice** — roll an extra tens die, take the lower result.
**Penalty dice** — roll an extra tens die, take the higher result.

### Sanity
- `SAN` = `POW` at character creation (max 99)
- Failing a SAN check costs `fail_dice` sanity; passing costs `success_dice`
- Losing ≥ 5 SAN in one check = temporary insanity
- Reaching 0 SAN = permanent insanity (game over)

---

## Editor Controls

### Map Editor (`python main.py map`)
| Input | Action |
|-------|--------|
| Left click | Paint selected tile |
| Right click | Erase (set to floor) |
| Middle drag | Pan canvas |
| `+` / `-` | Zoom in/out |
| `E` | Toggle entity placement mode |
| `Del` | Remove entity under cursor |
| `Ctrl+S` | Save map JSON |
| `Ctrl+O` | Load map JSON |
| `Ctrl+N` | New blank map |
| `Ctrl+R` | Resize map |

### Sprite Editor (`python main.py sprite`)
| Input | Action |
|-------|--------|
| Left click | Draw foreground (1) |
| Right click | Draw background (0) |
| `P` / `E` / `F` | Pencil / Eraser / Fill |
| `+` / `-` | Zoom in/out |
| `N` | New animation frame |
| `,` / `.` | Previous / Next frame |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save sprite JSON |
| `Ctrl+O` | Open sprite JSON |
| `Ctrl+I` | Import PNG (threshold conversion) |

### Dialogue Editor (`python main.py dialogue`)
| Input | Action |
|-------|--------|
| Left click node | Select node |
| Drag node | Move node on canvas |
| Double-click node | Edit text/speaker |
| `N` | New node at cursor |
| `C` | Add choice to selected node |
| `Del` | Delete selected node |
| Middle drag / Arrows | Pan canvas |
| `Ctrl+S` | Save dialogue JSON |
| `Ctrl+O` | Load dialogue JSON |

### Palette Chooser (`python main.py palette`)
Click a preset swatch or use the RGB sliders to customize foreground/background colors.

---

## Demo Scenario: The Blackwood Manor Affair

A one-session CoC investigation set in Arkham, Massachusetts — October 1926.

**Premise:** Professor Ellison has gone missing while researching an obscure
pre-colonial cult at an isolated manor. The investigators must find him,
uncover the truth about the manor's ritual chamber, and deal with the entity
that slumbers behind a warded door.

**Investigators (pre-made):**
- Dr. Alice Hayes — Doctor (Medicine, Psychology, First Aid)
- Prof. Harold Webb — Professor (Library Use, Occult, History)
- Rita Caldwell — Reporter (Persuade, Fast Talk, Spot Hidden)
- Jack Malone — Detective (Spot Hidden, Track, Fighting)

**Key mechanics demonstrated:**
- Library Use skill check to find research notes (+bonus die)
- Spot Hidden to find Ellison's hidden satchel
- Dialogue tree with Old Thomas (gardener NPC)
- SAN loss on entering the ritual chamber
- Occult skill check (with/without bonus die) for banishment
- Push mechanic on failed incantation
- Combat encounter with a Dimensional Shambler
- Multiple endings: full victory, partial victory, consumed/game-over

---

## Writing Your Own Game

### 1. Define scenes

```python
from engine.scene import Scene, Choice, Effect, SkillCheck

scene = Scene(
    scene_id="tavern",
    title="The Rusty Anchor",
    description="A fog-laden harbour tavern...",
    choices=[
        Choice.go("Go upstairs", "upstairs"),
        Choice(
            text="Ask the barkeep [Persuade]",
            skill_check=SkillCheck(
                skill="Persuade",
                on_success=[Effect.give_item("Rumour"), Effect.goto("barkeep_talk")],
                on_failure=[Effect.say("He ignores you."), Effect.goto("tavern")],
            ),
        ),
    ],
)
```

### 2. Register and run

```python
from engine.scene import SceneRegistry
from engine.game_state import GameState
from engine.renderer import GameRenderer
from engine.coc import build_premade
from engine.palette import PRESETS
import pygame

SceneRegistry.register(scene)
investigator = build_premade("reporter")
state = GameState(investigator, start_scene="tavern")
state.enter_scene("tavern")

pygame.init()
renderer = GameRenderer(state, palette=PRESETS["amber"], game_title="MY GAME")
renderer.run()
```

### 3. Effect vocabulary

| Effect | Description |
|--------|-------------|
| `Effect.goto(scene_id)` | Navigate to another scene |
| `Effect.give_item(name)` | Add item to inventory |
| `Effect.remove_item(name)` | Remove item |
| `Effect.damage(amount)` | Deal HP damage |
| `Effect.heal(amount)` | Restore HP |
| `Effect.san_loss("1d6", "1")` | SAN check (fail dice, success dice) |
| `Effect.set_flag(key)` | Set a story flag |
| `Effect.clear_flag(key)` | Clear a story flag |
| `Effect.say(message)` | Add message to log |
| `Effect.dialogue(dialogue_id)` | Start a dialogue tree |
| `Effect.game_over(message)` | End the game (loss) |
| `Effect.victory(message)` | End the game (win) |

---

## License

MIT
