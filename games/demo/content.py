"""
Demo scenario: "The Blackwood Manor Affair"

A Call of Cthulhu 7e investigation set in 1920s New England.
The investigators are summoned to a remote manor after a colleague
disappears while researching an obscure cult.

Scene graph:
    intro
      └─ start
           ├─ examine_letter
           ├─ study_library   [Library Use]
           ├─ investigate_grounds
           │    ├─ find_satchel   [Spot Hidden]
           │    └─ meet_gardener  → dialogue: gardener
           └─ descend_cellar
                └─ cellar_chamber
                     ├─ banish_success  [Occult ≥ 40]  → victory
                     ├─ banish_fail     → flee / push
                     └─ flee_manor      → partial_victory
"""
from __future__ import annotations

from engine.scene import (
    Scene, Choice, Effect, FX, SkillCheck, Requirement, SceneRegistry
)
from engine.dialogue import (
    DialogueTree, DialogueNode, DialogueChoice, DialogueRegistry
)
from engine.tilemap import TileMap


# ---------------------------------------------------------------------------
# Tilemap: Manor Ground Floor (ASCII)
# ---------------------------------------------------------------------------
_MANOR_ASCII = """\
####################################
#..................................#
#..@.......#......#................#
#..........#......#................#
#..........+......+................#
#..........#......#................#
################.###################
#..............#....#..............#
#..............+....+..............#
#..............#....#..............#
####################################
"""


def _build_manor_map() -> TileMap:
    return TileMap.from_string(_MANOR_ASCII, map_id="manor_ground")


# ---------------------------------------------------------------------------
# Dialogue: Old Thomas the Gardener
# ---------------------------------------------------------------------------

def _build_gardener_dialogue() -> DialogueTree:
    tree = DialogueTree(dialogue_id="gardener", start_node="greet")

    greet = DialogueNode(
        node_id="greet",
        speaker="Thomas",
        text=(
            "You're not from around here, are ya? "
            "Come to poke about the old manor, same as that professor fella?"
        ),
    )
    greet.editor_x = 50
    greet.editor_y = 50
    greet.choices = [
        DialogueChoice("c1", "Yes. Did you see what happened to him?", next_node="saw_it"),
        DialogueChoice("c2", "We mean no harm. What can you tell us?", next_node="warn"),
    ]

    saw_it = DialogueNode(
        node_id="saw_it",
        speaker="Thomas",
        text=(
            "I seen him go down the cellar steps three nights back. "
            "Heard screaming after midnight. He never came up again. "
            "Stay away from that cellar, friends. It ain't natural."
        ),
    )
    saw_it.editor_x = 350
    saw_it.editor_y = -50
    saw_it.choices = [
        DialogueChoice("c3", "Thank you, Thomas. We'll be careful.", next_node="farewell"),
        DialogueChoice("c4", "Did he leave anything — notes, a journal?", next_node="journal_clue"),
    ]

    warn = DialogueNode(
        node_id="warn",
        speaker="Thomas",
        text=(
            "Stay out of the east wing and don't go into the cellar after dark. "
            "Strange lights down there. Strange sounds. I've worked here forty years "
            "and I've never once opened that cellar door at night."
        ),
    )
    warn.editor_x = 350
    warn.editor_y = 150
    warn.choices = [
        DialogueChoice("c5", "What's in the cellar?", next_node="cellar_info"),
        DialogueChoice("c6", "We understand. Thank you.", next_node="farewell"),
    ]

    journal_clue = DialogueNode(
        node_id="journal_clue",
        speaker="Thomas",
        text=(
            "Aye — he dropped his satchel near the old apple tree out back. "
            "I didn't touch it. Felt wrong somehow."
        ),
    )
    journal_clue.editor_x = 650
    journal_clue.editor_y = -120
    journal_clue.on_enter = [
        {"type": FX.SET_FLAG, "params": {"key": "knows_journal_location", "value": True}},
    ]
    journal_clue.choices = [
        DialogueChoice("c7", "Thank you. We'll look for it.", next_node="farewell"),
    ]

    cellar_info = DialogueNode(
        node_id="cellar_info",
        speaker="Thomas",
        text=(
            "Some kind of old chamber. Older than the manor, I reckon. "
            "The family that built this place — the Blackwoods — they used to "
            "hold 'ceremonies' down there. Came to a bad end, the lot of them."
        ),
    )
    cellar_info.editor_x = 650
    cellar_info.editor_y = 100
    cellar_info.choices = [
        DialogueChoice("c8", "That sounds dangerous. Thank you.", next_node="farewell"),
    ]

    farewell = DialogueNode(
        node_id="farewell",
        speaker="Thomas",
        text=(
            "Take care, friends. And if you hear anything — anything at all — "
            "from down below, run. Don't try to be heroes."
        ),
    )
    farewell.editor_x = 950
    farewell.editor_y = 50
    farewell.choices = []

    for node in [greet, saw_it, warn, journal_clue, cellar_info, farewell]:
        tree.nodes[node.node_id] = node

    return tree


# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------

def _build_scenes() -> list:
    scenes = []

    # ------------------------------------------------------------------ intro
    scenes.append(Scene(
        scene_id="intro",
        title="THE BLACKWOOD MANOR AFFAIR",
        description=(
            "Arkham, Massachusetts — October, 1926.\n\n"
            "You receive a telegram from Professor Ellison of Miskatonic University:\n\n"
            "\"URGENT. GONE TO BLACKWOOD MANOR RE: CULT RESEARCH. FEAR FOR MY "
            "SAFETY. COME AT ONCE. DO NOT DELAY. — ELLISON\"\n\n"
            "Three days later, Ellison has not returned. His department chair "
            "has begged you to investigate. The manor lies twelve miles north "
            "of Arkham, alone on a wooded hill."
        ),
        choices=[
            Choice.go("Travel to Blackwood Manor", "start"),
        ],
    ))

    # ------------------------------------------------------------------ start
    scenes.append(Scene(
        scene_id="start",
        title="Blackwood Manor — Front Hall",
        description=(
            "The iron gate groans as you push it open. The manor looms against "
            "a slate-grey sky, its windows dark. The front door stands ajar.\n\n"
            "Inside, the entrance hall smells of mildew and burned wax. "
            "A guttered candelabra sits on the mantelpiece. "
            "Beside it — a crumpled letter addressed to Ellison."
        ),
        map_id="manor_ground",
        choices=[
            Choice.go("Examine the letter on the mantelpiece", "examine_letter"),
            Choice(
                text="Search the library [Library Use]",
                skill_check=SkillCheck(
                    skill="Library Use",
                    on_success=[Effect.goto("study_library_success")],
                    on_failure=[Effect.goto("study_library_fail")],
                ),
            ),
            Choice.go("Explore the grounds outside", "investigate_grounds"),
            Choice.go("Head toward the cellar stairs", "descend_cellar"),
        ],
    ))

    # ---------------------------------------------------------- examine_letter
    scenes.append(Scene(
        scene_id="examine_letter",
        title="A Cryptic Letter",
        description=(
            "The letter is dated three weeks ago. The handwriting is hurried:\n\n"
            "\"Ellison — The glyphs in Blackwood's private journal match those "
            "in the Nargthoth Fragments. I believe the cellar chamber was used "
            "for summoning. Do NOT open the warded door unless you have completed "
            "the binding incantation first. The entity is still BOUND — but barely. "
            "For God's sake be careful.\n\n— Armitage\"\n\n"
            "A chill runs down your spine."
        ),
        on_enter=[
            Effect.set_flag("read_warning_letter"),
            Effect.say("You now know: the entity must be bound before the warded door is opened."),
        ],
        choices=[
            Choice.go("Return to the front hall", "start"),
        ],
    ))

    # ------------------------------------------------ study_library (success)
    scenes.append(Scene(
        scene_id="study_library_success",
        title="The Library — Forbidden Texts",
        description=(
            "The library shelves hold an unusual number of occult volumes. "
            "A leather-bound journal lies open on the reading table — "
            "Ellison's handwriting.\n\n"
            "His notes describe a pre-colonial ritual chamber beneath the manor, "
            "used by Obadiah Blackwood to 'commune with that which sleeps in the "
            "angles between spaces.' A marginal note reads:\n\n"
            "\"Banishment incantation — pg. 247 of the Nargthoth Fragments. "
            "Must be spoken with Occult knowledge to be effective.\""
        ),
        on_enter=[
            Effect.set_flag("studied_library"),
            Effect.give_item("Ellison's Journal"),
        ],
        choices=[
            Choice.go("Return to the front hall", "start"),
        ],
    ))

    # ------------------------------------------------- study_library (failure)
    scenes.append(Scene(
        scene_id="study_library_fail",
        title="The Library — Dense Pages",
        description=(
            "The books are written in a bewildering mix of Latin, Greek, and "
            "stranger tongues. Most of it is beyond you.\n\n"
            "You find Ellison's journal but can only make out fragments — "
            "something about a 'warded door' and a 'binding that must not be broken.'"
        ),
        on_enter=[
            Effect.give_item("Ellison's Journal (partial)"),
        ],
        choices=[
            Choice.go("Return to the front hall", "start"),
        ],
    ))

    # ------------------------------------------------- investigate_grounds
    scenes.append(Scene(
        scene_id="investigate_grounds",
        title="The Grounds",
        description=(
            "The overgrown garden is wrapped in fog. Dead roses claw at a "
            "rusted trellis. A path leads around the east wing.\n\n"
            "Near an ancient apple tree, you notice something half-buried "
            "in the leaf litter."
        ),
        choices=[
            Choice(
                text="Search carefully near the apple tree [Spot Hidden]",
                skill_check=SkillCheck(
                    skill="Spot Hidden",
                    on_success=[Effect.goto("find_satchel")],
                    on_failure=[Effect.goto("miss_satchel")],
                ),
            ),
            Choice.go("Speak with the old gardener near the gate", "meet_gardener"),
            Choice.go("Return to the manor", "start"),
        ],
    ))

    # ----------------------------------------------------------- find_satchel
    scenes.append(Scene(
        scene_id="find_satchel",
        title="Ellison's Satchel",
        description=(
            "Half-hidden under a mound of leaves you find a leather satchel — "
            "Ellison's. Inside: a flashlight, a vial of smelling salts, and a "
            "hand-drawn map of the manor's lower level.\n\n"
            "The map marks a 'warded door' in the ritual chamber and scrawls "
            "a warning: BINDING HOLDS — DO NOT DISTURB THE SEALS."
        ),
        on_enter=[
            Effect.give_item("Flashlight"),
            Effect.give_item("Smelling Salts"),
            Effect.give_item("Manor Basement Map"),
            Effect.set_flag("found_satchel"),
        ],
        choices=[
            Choice.go("Return to the garden", "investigate_grounds"),
        ],
    ))

    # ----------------------------------------------------------- miss_satchel
    scenes.append(Scene(
        scene_id="miss_satchel",
        title="Nothing Found",
        description=(
            "You search but find only dead leaves and a broken garden ornament. "
            "Whatever might have been here, if anything, remains hidden from you."
        ),
        choices=[
            Choice.go("Return to the garden", "investigate_grounds"),
        ],
    ))

    # --------------------------------------------------------- meet_gardener
    scenes.append(Scene(
        scene_id="meet_gardener",
        title="Old Thomas",
        description=(
            "Near the rusted gate crouches an ancient man in a wide-brimmed hat, "
            "pulling weeds with gnarled hands despite the cold. He eyes you "
            "suspiciously as you approach."
        ),
        on_enter=[
            Effect.say("You can speak with old Thomas, the manor's groundskeeper."),
        ],
        choices=[
            Choice(
                text="Speak with him",
                effects=[Effect.dialogue("gardener")],
            ),
            Choice.go("Return to the manor", "start"),
        ],
    ))

    # --------------------------------------------------------- descend_cellar
    scenes.append(Scene(
        scene_id="descend_cellar",
        title="The Cellar Stairs",
        description=(
            "The cellar door is set into the floor near the kitchen. "
            "A cold, damp smell drifts up from below — earth, old stone, "
            "and something else. Something sweet and wrong.\n\n"
            "Stone steps descend into darkness. Faint phosphorescent light "
            "pulses far below."
        ),
        choices=[
            Choice(
                text="Descend with the flashlight [Need: Flashlight]",
                requirement=Requirement(has_item="Flashlight"),
                effects=[Effect.goto("cellar_chamber")],
            ),
            Choice(
                text="Descend in the dark (risky)",
                requirement=Requirement(no_item="Flashlight"),
                effects=[
                    Effect.say("You stumble in the darkness, scraping your hands on rough stone."),
                    Effect.damage(1),
                    Effect.goto("cellar_chamber"),
                ],
            ),
            Choice.go("Turn back — you need more information", "start"),
        ],
    ))

    # ------------------------------------------------------- cellar_chamber
    scenes.append(Scene(
        scene_id="cellar_chamber",
        title="The Ritual Chamber",
        description=(
            "At the bottom of the stairs stretches a vaulted stone chamber "
            "that predates the manor by centuries. Carved glyphs cover every "
            "surface, pulsing with a sickly inner light.\n\n"
            "In the center: a warded iron door, its surface blazing with sigils. "
            "Before it — what was Professor Ellison. He kneels, eyes blank, "
            "muttering in a language no living tongue should speak.\n\n"
            "The ward is failing. One of the binding seals has been scraped away."
        ),
        on_enter=[
            Effect.san_loss("1d6", "1"),
            Effect.say("The sight of Ellison's broken mind costs you Sanity."),
        ],
        choices=[
            Choice(
                text="Attempt the banishment incantation (with journal) [Occult +bonus]",
                requirement=Requirement(has_flag="studied_library"),
                skill_check=SkillCheck(
                    skill="Occult",
                    on_success=[Effect.goto("banish_success")],
                    on_failure=[Effect.goto("banish_fail")],
                    bonus_dice=1,
                ),
            ),
            Choice(
                text="Attempt the banishment incantation [Occult]",
                requirement=Requirement(no_flag="studied_library"),
                skill_check=SkillCheck(
                    skill="Occult",
                    on_success=[Effect.goto("banish_success")],
                    on_failure=[Effect.goto("banish_fail")],
                ),
            ),
            Choice(
                text="Pull Ellison away from the door and flee",
                effects=[
                    Effect.say("You drag the catatonic professor toward the stairs."),
                    Effect.goto("flee_manor"),
                ],
            ),
            Choice(
                text="Open the warded door [EXTREMELY DANGEROUS]",
                effects=[
                    Effect.san_loss("1d10", "1d3"),
                    Effect(FX.COMBAT, {
                        "enemies": [{
                            "name": "Dimensional Shambler",
                            "hp": 14,
                            "attack_skill": 55,
                            "damage_dice": "2d6",
                            "san_loss": "1d6/1d20",
                            "armor": 0,
                        }]
                    }),
                ],
            ),
        ],
    ))

    # ---------------------------------------------------------- banish_success
    scenes.append(Scene(
        scene_id="banish_success",
        title="The Ward Holds",
        description=(
            "Your voice rises, the incantation forming from the notes "
            "in Ellison's journal. The glyphs flare blinding white.\n\n"
            "A shriek of protest tears through dimensions not accessible "
            "to human senses. The warded door glows red-hot, then fades to cold iron.\n\n"
            "Ellison collapses. He is alive — broken, but alive. "
            "The phosphorescent light fades. The chamber is quiet.\n\n"
            "It is over. For now."
        ),
        on_enter=[
            Effect.set_flag("banished_entity"),
            Effect.say("Your sanity holds. You feel clarity return."),
        ],
        choices=[
            Choice.go("Carry Ellison out of the manor", "victory"),
        ],
    ))

    # ----------------------------------------------------------- banish_fail
    scenes.append(Scene(
        scene_id="banish_fail",
        title="The Incantation Fails",
        description=(
            "The words die in your throat. The sigils pulse mockingly.\n\n"
            "A crack runs through the warded door. Something vast and cold "
            "presses against it from the other side. Ellison begins to scream.\n\n"
            "You have seconds to act."
        ),
        on_enter=[
            Effect.san_loss("1d4", "0"),
        ],
        choices=[
            Choice.go("Grab Ellison and run for the stairs", "flee_manor"),
            Choice(
                text="Try again — push the roll [Occult PUSH]",
                skill_check=SkillCheck(
                    skill="Occult",
                    on_success=[Effect.goto("banish_success")],
                    on_failure=[
                        Effect.san_loss("1d10", "0"),
                        Effect.damage(3),
                        Effect.goto("game_over_consumed"),
                    ],
                    push=True,
                ),
            ),
        ],
    ))

    # ------------------------------------------------------------- flee_manor
    scenes.append(Scene(
        scene_id="flee_manor",
        title="Flight",
        description=(
            "You half-carry the catatonic Ellison up the cellar stairs, "
            "through the dark manor, and out into the cold night air.\n\n"
            "Behind you, the manor shudders. Glass shatters in every window. "
            "Then — silence.\n\n"
            "Ellison will need months of care at Arkham Sanitarium. "
            "He may never speak again about what he saw.\n\n"
            "The entity remains bound — but the seal is weakening. "
            "You have bought the world time. How much, you cannot say."
        ),
        on_enter=[
            Effect.san_loss("1", "0"),
        ],
        choices=[
            Choice.go("Report to Dr. Armitage — Partial Victory", "partial_victory"),
        ],
    ))

    # --------------------------------------------------------- partial_victory
    scenes.append(Scene(
        scene_id="partial_victory",
        title="Report to Armitage",
        description=(
            "Armitage listens grimly to your report in his study at the "
            "university. He nods, his face grave.\n\n"
            "\"You did what you could. The binding will hold for years, perhaps "
            "decades. By then... we may know more.\"\n\n"
            "He hands you a glass of brandy. Through the window, Arkham looks "
            "peaceful. You know better now."
        ),
        choices=[
            Choice(
                text="It is enough. For now.",
                effects=[Effect.victory(
                    "You survived the Blackwood Manor Affair. "
                    "The entity remains bound. Ellison recovers slowly. "
                    "Arkham sleeps, unknowing."
                )],
            ),
        ],
    ))

    # ------------------------------------------------------------ victory
    scenes.append(Scene(
        scene_id="victory",
        title="The Darkness Driven Back",
        description=(
            "You and Ellison emerge into the cold October night. "
            "The stars wheel overhead, indifferent as always.\n\n"
            "Ellison clutches your arm, trembling. "
            "'It's still there,' he whispers. 'It will always be there. "
            "We only locked the door.'\n\n"
            "You drive back to Arkham in silence."
        ),
        choices=[
            Choice(
                text="Deliver your report to Dr. Armitage",
                effects=[Effect.victory(
                    "The Blackwood Manor Affair — Resolved. "
                    "The entity is re-sealed. Ellison lives. "
                    "The world continues, ignorant of what almost was."
                )],
            ),
        ],
    ))

    # ------------------------------------------------------- game_over_consumed
    scenes.append(Scene(
        scene_id="game_over_consumed",
        title="Consumed",
        description=(
            "The warded door shatters. In the blinding non-light that pours through, "
            "you see — briefly — something that exists in angles and impossibilities.\n\n"
            "Your mind does not survive the encounter intact.\n\n"
            "When the authorities finally enter the manor, they find only "
            "a catatonic figure kneeling beside a shattered iron door, "
            "muttering in no known language. The cellar is cold and dark.\n\n"
            "Professor Ellison is never found."
        ),
        on_enter=[
            Effect.san_loss("5d10", "0"),
        ],
        choices=[
            Choice(
                text="The darkness claims you.",
                effects=[Effect.game_over(
                    "Consumed by an entity beyond human comprehension. "
                    "The investigation ends here."
                )],
            ),
        ],
    ))

    return scenes


# ---------------------------------------------------------------------------
# Registration entry point
# ---------------------------------------------------------------------------

def register_all() -> TileMap:
    """
    Register all scenes, dialogues, and return the manor map.
    Call this once before creating a GameState.
    """
    SceneRegistry.clear()
    DialogueRegistry.clear()

    for scene in _build_scenes():
        SceneRegistry.register(scene)

    gardener_tree = _build_gardener_dialogue()
    DialogueRegistry.register(gardener_tree)

    manor_map = _build_manor_map()
    return manor_map
