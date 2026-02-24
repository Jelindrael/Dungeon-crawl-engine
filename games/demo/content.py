"""
The Dungeon of Aeloria – demo game content.

Demonstrates all major engine features:
  - Character classes with distinct stats and proficiencies
  - Scene navigation with branching choices
  - Skill checks (Perception, Stealth, Arcana, Athletics, Persuasion)
  - Gated choices (item requirements, flags, attributes)
  - Combat encounters with loot
  - Items (weapons, potions, keys, quest items)
  - Story flags that change scene descriptions
  - XP, leveling, and gold
  - Victory and game-over states
"""
from engine import (
    Choice, Effect, Enemy, Item, ItemRegistry,
    ItemType, Requirement, Scene, SceneRegistry, SkillCheck,
)


# ---------------------------------------------------------------------------
# Character classes
# ---------------------------------------------------------------------------

CLASSES = {
    "warrior": {
        "display_name": "Warrior",
        "description": (
            "Hardy fighter trained in heavy arms. High STR and CON, "
            "d8 weapon damage, proficient in Athletics and Intimidation."
        ),
        "attributes": {
            "STR": 16, "DEX": 12, "CON": 15,
            "INT": 8,  "WIS": 10, "CHA": 8,
        },
        "max_hp": 14,
        "armor_class": 15,
        "attack_bonus": 4,
        "damage_dice": "1d8+3",
        "proficiencies": ["Athletics", "Intimidation", "Perception"],
        "save_proficiencies": ["STR", "CON"],
        "starting_items": ["short_sword", "health_potion", "torch"],
        "gold": 15,
    },
    "rogue": {
        "display_name": "Rogue",
        "description": (
            "Cunning shadow-walker skilled in stealth and trickery. "
            "High DEX, d6 damage with sneak bonus, proficient in Stealth and Perception."
        ),
        "attributes": {
            "STR": 10, "DEX": 17, "CON": 12,
            "INT": 13, "WIS": 11, "CHA": 12,
        },
        "max_hp": 9,
        "armor_class": 14,
        "attack_bonus": 3,
        "damage_dice": "1d6+2",
        "proficiencies": [
            "Stealth", "Acrobatics", "Sleight of Hand",
            "Perception", "Deception", "Investigation",
        ],
        "save_proficiencies": ["DEX", "INT"],
        "starting_items": ["dagger", "dagger", "health_potion", "thieves_tools"],
        "gold": 20,
    },
    "mage": {
        "display_name": "Mage",
        "description": (
            "Scholar of the arcane arts. High INT and WIS, d4+INT magic damage, "
            "proficient in Arcana, History, and Investigation."
        ),
        "attributes": {
            "STR": 8,  "DEX": 12, "CON": 10,
            "INT": 17, "WIS": 14, "CHA": 11,
        },
        "max_hp": 7,
        "armor_class": 12,
        "attack_bonus": 2,
        "damage_dice": "1d4+3",
        "proficiencies": [
            "Arcana", "History", "Investigation",
            "Perception", "Insight",
        ],
        "save_proficiencies": ["INT", "WIS"],
        "starting_items": ["staff", "health_potion", "spellbook", "torch"],
        "gold": 10,
    },
}


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------

def register_items() -> None:
    ItemRegistry.register_many([
        # Weapons
        Item("short_sword",  "Short Sword",   "A well-balanced one-handed blade.",
             ItemType.WEAPON,  value=10,
             properties={"damage_dice": "1d6+1", "attack_bonus": 1}),
        Item("dagger",       "Dagger",        "Small, quick, and deadly at close range.",
             ItemType.WEAPON,  value=5,
             properties={"damage_dice": "1d4+1", "attack_bonus": 1, "consumable": False}),
        Item("staff",        "Arcane Staff",  "A gnarled staff etched with runes. Channels magical force.",
             ItemType.WEAPON,  value=8,
             properties={"damage_dice": "1d6", "attack_bonus": 1}),
        Item("goblin_axe",   "Goblin Axe",   "A crude but effective iron axe. Smells of goblin.",
             ItemType.WEAPON,  value=4,
             properties={"damage_dice": "1d6", "attack_bonus": 0}),

        # Armor / Protection
        Item("leather_armor", "Leather Armor", "Cured hide armor. Offers basic protection.",
             ItemType.ARMOR, value=15,
             properties={"ac_bonus": 2}),
        Item("goblin_shield",  "Goblin Shield",  "A battered wooden shield taken from a goblin.",
             ItemType.SHIELD, value=3,
             properties={"ac_bonus": 1}),

        # Potions & Consumables
        Item("health_potion", "Health Potion", "A vial of glowing red liquid. Restores 2d4+2 HP.",
             ItemType.POTION, value=25,
             properties={"heal_dice": "2d4+2", "consumable": True}),
        Item("strong_potion", "Strong Potion", "A large flask of crimson liquid. Restores 3d6+3 HP.",
             ItemType.POTION, value=50,
             properties={"heal_dice": "3d6+3", "consumable": True}),
        Item("poison_vial",   "Vial of Poison", "A dark, viscous liquid. One-time use.",
             ItemType.POTION, value=20,
             properties={"consumable": True}),

        # Tools
        Item("torch",         "Torch",         "A wooden torch. Burns for an hour. Illuminates dark passages.",
             ItemType.LIGHT, value=1,
             properties={"light_radius": 3, "consumable": False}),
        Item("thieves_tools", "Thieves' Tools", "Lockpicks and tension wrenches. Proficiency required.",
             ItemType.TOOL, value=25,
             properties={"consumable": False}),
        Item("rope",          "Rope (50ft)",   "Hempen rope. Surprisingly useful.",
             ItemType.TOOL, value=1,
             properties={"consumable": False}),

        # Keys & Quest Items
        Item("goblin_key",    "Goblin Key",    "A crude iron key. Probably opens something important.",
             ItemType.KEY, value=0,
             properties={"consumable": False}),
        Item("ancient_amulet", "Ancient Amulet",
             "A silver amulet engraved with glowing runes. This must be the artifact!",
             ItemType.QUEST, value=500,
             properties={"consumable": False}),
        Item("spellbook",     "Spellbook",     "Your personal spellbook. Contains fire bolt and shield.",
             ItemType.MISC, value=50,
             properties={"consumable": False}),
        Item("goblin_note",   "Crumpled Note",
             "A dirty scrap of parchment with crude goblin script. 'Cheef say kepp amulet safe in vault.'",
             ItemType.MISC, value=0,
             properties={"consumable": False}),
        Item("gold_coins",    "Bag of Coins",  "A heavy bag of gold coins.",
             ItemType.MISC, value=30,
             properties={"consumable": False}),
    ])


# ---------------------------------------------------------------------------
# Enemy templates (functions to create fresh instances)
# ---------------------------------------------------------------------------

def goblin() -> Enemy:
    return Enemy(
        name="Goblin",
        max_hp=7, armor_class=13,
        attack_bonus=2, damage_dice="1d6",
        xp_reward=50,
        initiative_bonus=1,
        description="A small, sneaky creature with beady yellow eyes.",
        loot_table=["goblin_axe"],
    )

def goblin_scout() -> Enemy:
    return Enemy(
        name="Goblin Scout",
        max_hp=10, armor_class=14,
        attack_bonus=3, damage_dice="1d6+1",
        xp_reward=75,
        initiative_bonus=2,
        description="A nimble goblin with a notched shortbow.",
        loot_table=["goblin_key"],
    )

def goblin_guard() -> Enemy:
    return Enemy(
        name="Goblin Guard",
        max_hp=12, armor_class=15,
        attack_bonus=3, damage_dice="1d8+1",
        xp_reward=100,
        initiative_bonus=0,
        description="A stocky goblin in mismatched armour.",
        loot_table=[],
    )

def hobgoblin() -> Enemy:
    return Enemy(
        name="Hobgoblin",
        max_hp=18, armor_class=16,
        attack_bonus=4, damage_dice="1d10+2",
        xp_reward=200,
        initiative_bonus=0,
        description="A disciplined, militaristic relative of the goblin.",
        loot_table=["strong_potion"],
    )

def chieftain() -> Enemy:
    return Enemy(
        name="Grak the Goblin Chieftain",
        max_hp=30, armor_class=16,
        attack_bonus=5, damage_dice="2d6+3",
        xp_reward=600,
        initiative_bonus=1,
        description=(
            "A massive goblin draped in crude trophies and stolen plate armour. "
            "His eyes burn with cunning malice."
        ),
        loot_table=["strong_potion", "gold_coins"],
    )


# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------

def register_scenes() -> None:

    # ------------------------------------------------------------------ INTRO

    SceneRegistry.register(Scene(
        scene_id="intro",
        title="The Town of Millhaven",
        description=(
            "The town of Millhaven is a muddy cluster of thatch-roofed buildings "
            "on the edge of the Greywood. You are {player.name}, a wandering "
            "{player.character_class} who arrived three days ago looking for work. "
            "Word has reached the inn that goblins have overrun the old ruins to "
            "the east – the Dungeon of Aeloria – and stolen a powerful magical "
            "artifact known as the Amulet of Aeloria. The town elder has posted "
            "a reward of 200 gold for its return."
        ),
        ascii_map=MapTemplates.ENTRANCE,
        choices=[
            Choice.go("Head to the Rusty Flagon inn to learn more", "tavern"),
        ],
    ))

    # ----------------------------------------------------------------- TAVERN

    SceneRegistry.register(Scene(
        scene_id="tavern",
        title="The Rusty Flagon Inn",
        description=(
            "The inn is dim and smoky. A grizzled woman named Hilda cleans mugs "
            "behind the bar. A hunched old man in the corner waves you over – "
            "Elder Aldric, the man who posted the reward. 'The amulet must not "
            "fall into the chieftain's hands,' he says. 'The goblins will use its "
            "power to summon darkness upon us all. Take it from Grak the Chieftain. "
            "He lairs deep in the dungeon.'"
        ),
        choices=[
            Choice(
                text="Ask Hilda if she has any supplies for sale",
                effects=[
                    Effect.say(
                        "Hilda sells you a health potion for 15 gold."
                    ),
                    Effect.give_item("health_potion"),
                    Effect.take_gold(15),
                ],
                requirement=Requirement(min_gold=15, no_flag="bought_potion"),
                skill_check=None,
            ),
            Choice(
                text="Buy information from the Elder about the dungeon layout",
                effects=[
                    Effect.say(
                        "The Elder sketches a rough map. 'The entrance hall leads "
                        "north to the guard room, then east to the vault where Grak "
                        "keeps the amulet. His chamber is beyond the vault.'"
                    ),
                    Effect.set_flag("knows_layout"),
                    Effect.take_gold(5),
                ],
                requirement=Requirement(min_gold=5, no_flag="knows_layout"),
            ),
            Choice(
                text="Try to persuade Hilda for a free potion  [Persuasion DC 14]",
                skill_check=SkillCheck(
                    skill="Persuasion",
                    dc=14,
                    on_success=[
                        Effect.say("Hilda sighs and slips you a potion. 'Just this once.'"),
                        Effect.give_item("health_potion"),
                        Effect.set_flag("charmed_hilda"),
                    ],
                    on_failure=[
                        Effect.say("Hilda glares. 'Do I look like a charity?'"),
                    ],
                ),
                requirement=Requirement(no_flag="charmed_hilda"),
            ),
            Choice.go("Set out for the Dungeon of Aeloria", "dungeon_entrance"),
        ],
        on_enter=[
            Effect.set_flag("visited_tavern"),
        ],
    ))

    # --------------------------------------------------- DUNGEON ENTRANCE

    SceneRegistry.register(Scene(
        scene_id="dungeon_entrance",
        title="The Dungeon Entrance",
        description=(
            "A crumbling stone archway marks the entrance to the Dungeon of Aeloria. "
            "Ancient carvings of serpents and stars frame the doorway. The smell of "
            "damp earth and goblin musk drifts from within. Faint torchlight flickers "
            "beyond the threshold."
        ),
        ascii_map="""\
   ####
  ##..##
 ##....##
##..@@..##
###....###
 ##....##
  ##++##
   ####""",
        choices=[
            Choice(
                text="Enter the dungeon",
                effects=[Effect.goto("entrance_hall")],
            ),
            Choice(
                text="Listen at the entrance  [Perception DC 10]",
                skill_check=SkillCheck(
                    skill="Perception",
                    dc=10,
                    on_success=[
                        Effect.say(
                            "You hear guttural goblin voices arguing about card games, "
                            "and the scrape of boots on stone. At least two guards."
                        ),
                        Effect.set_flag("heard_guards"),
                    ],
                    on_failure=[
                        Effect.say("You strain your ears but hear only the wind."),
                    ],
                ),
                requirement=Requirement(no_flag="heard_guards"),
            ),
            Choice(
                text="Search the entrance for traps  [Investigation DC 13]",
                skill_check=SkillCheck(
                    skill="Investigation",
                    dc=13,
                    on_success=[
                        Effect.say(
                            "A tripwire! You dismantle it carefully, disabling a pit "
                            "trap just inside the entrance. You gain 25 XP."
                        ),
                        Effect.gain_xp(25),
                        Effect.set_flag("trap_disabled"),
                    ],
                    on_failure=[
                        Effect.say("You find nothing of interest."),
                    ],
                ),
                requirement=Requirement(no_flag="trap_disabled"),
            ),
            Choice.go("Return to Millhaven", "tavern"),
        ],
    ))

    # --------------------------------------------------- ENTRANCE HALL

    SceneRegistry.register(Scene(
        scene_id="entrance_hall",
        title="Entrance Hall",
        description=(
            "You stand in a rectangular chamber of ancient stone. Crumbled pillars "
            "line the walls, and goblin graffiti mars the carved reliefs. A crude "
            "campfire smoulders in one corner. Two doorways lead further into the "
            "dungeon: a heavy wooden door to the north (the guard room) and a narrow "
            "crack in the eastern wall."
        ),
        ascii_map="""\
#########
#.......#
#.O...O.#
#...@...#
#.......#
###+#####""",
        on_enter=[
            Effect.gain_xp(20),
        ],
        choices=[
            Choice(
                text="Go north through the wooden door (toward the guard room)",
                effects=[Effect.goto("guard_room")],
                requirement=Requirement(no_flag="trap_disabled"),
            ),
            Choice(
                text="Go north carefully – you know there was a trap",
                effects=[Effect.goto("guard_room")],
                requirement=Requirement(has_flag="trap_disabled"),
            ),
            Choice(
                text="Squeeze through the crack in the eastern wall  [Athletics DC 12]",
                skill_check=SkillCheck(
                    skill="Athletics",
                    dc=12,
                    on_success=[
                        Effect.say("You slip through the crack into a side passage."),
                        Effect.goto("secret_passage"),
                    ],
                    on_failure=[
                        Effect.say("You're too broad-shouldered. The crack is too tight."),
                    ],
                ),
                requirement=Requirement(no_flag="knows_secret"),
            ),
            Choice(
                text="Examine the goblin graffiti  [History DC 11]",
                skill_check=SkillCheck(
                    skill="History",
                    dc=11,
                    on_success=[
                        Effect.say(
                            "Some of it is territorial marking, but one inscription "
                            "reads (in crude Goblin): 'Vault east of guard room, key "
                            "on scout.' Useful information."
                        ),
                        Effect.set_flag("knows_vault_location"),
                        Effect.gain_xp(10),
                    ],
                    on_failure=[
                        Effect.say("It's just goblin scrawl. Probably insults."),
                    ],
                ),
                requirement=Requirement(no_flag="knows_vault_location"),
            ),
            Choice(
                text="Search the campfire area  [Perception DC 10]",
                skill_check=SkillCheck(
                    skill="Perception",
                    dc=10,
                    on_success=[
                        Effect.say(
                            "Buried in the ash you find a small iron key! "
                            "You pocket it."
                        ),
                        Effect.give_item("goblin_key"),
                        Effect.set_flag("found_ash_key"),
                        Effect.gain_xp(15),
                    ],
                    on_failure=[
                        Effect.say("Just old campfire ash and gnawed bones."),
                    ],
                ),
                requirement=Requirement(no_flag="found_ash_key"),
            ),
            Choice.go("Retreat to the dungeon entrance", "dungeon_entrance"),
        ],
    ))

    # --------------------------------------------------- SECRET PASSAGE

    SceneRegistry.register(Scene(
        scene_id="secret_passage",
        title="Secret Passage",
        description=(
            "A narrow tunnel cuts behind the guard room. Dust and cobwebs suggest "
            "the goblins don't know it exists. You can hear raised voices through "
            "the thin wall – the guards arguing. The passage continues east, "
            "emerging near the vault."
        ),
        ascii_map="""\
##########
#........#
#.@......#
#........#
####>####""",
        on_enter=[
            Effect.set_flag("knows_secret"),
            Effect.gain_xp(30),
        ],
        choices=[
            Choice(
                text="Continue east toward the vault (bypass the guards)",
                effects=[Effect.goto("vault_exterior")],
            ),
            Choice(
                text="Eavesdrop on the guards  [Stealth DC 12, then Perception DC 10]",
                skill_check=SkillCheck(
                    skill="Stealth",
                    dc=12,
                    on_success=[
                        Effect.say(
                            "Silent as shadow, you press your ear to the wall. "
                            "The scouts bicker: 'Chieftain say don't lose the vault key!' "
                            "So the scout near the vault has a key."
                        ),
                        Effect.set_flag("eavesdropped"),
                        Effect.gain_xp(20),
                    ],
                    on_failure=[
                        Effect.say("You knock a stone loose. The voices stop briefly, then resume."),
                    ],
                ),
                requirement=Requirement(no_flag="eavesdropped"),
            ),
            Choice.go("Go back to the entrance hall", "entrance_hall"),
        ],
    ))

    # --------------------------------------------------- GUARD ROOM

    SceneRegistry.register(Scene(
        scene_id="guard_room",
        title="The Guard Room",
        description=(
            "A wide chamber that reeks of goblin. Three bedrolls are scattered on "
            "the floor, surrounded by gnawed bones and crude weapons. Two goblin "
            "guards snap to attention as you enter. 'Intruder!' one shrieks, "
            "reaching for its axe."
        ),
        ascii_map="""\
#########
#.g...g.#
#.......#
#...@...#
####.####""",
        on_enter=[
            Effect.set_flag("in_guard_room"),
        ],
        choices=[
            Choice(
                text="Fight the goblins!",
                effects=[
                    Effect.combat([goblin_guard(), goblin_scout()]),
                    Effect.set_flag("guards_defeated"),
                    Effect.goto("guard_room_cleared"),
                ],
                requirement=Requirement(no_flag="guards_defeated"),
            ),
            Choice(
                text="Try to intimidate them into surrendering  [Intimidation DC 14]",
                skill_check=SkillCheck(
                    skill="Intimidation",
                    dc=14,
                    on_success=[
                        Effect.say(
                            "You draw yourself to full height and let out a fearsome "
                            "roar. The goblins drop their weapons and flee shrieking "
                            "into the darkness. You find a key on the dropped belt."
                        ),
                        Effect.give_item("goblin_key"),
                        Effect.set_flag("guards_defeated"),
                        Effect.gain_xp(150),
                        Effect.goto("guard_room_cleared"),
                    ],
                    on_failure=[
                        Effect.say("The goblins laugh. 'Kill the funny man!'"),
                        Effect.combat([goblin_guard(), goblin_scout()]),
                        Effect.set_flag("guards_defeated"),
                        Effect.goto("guard_room_cleared"),
                    ],
                ),
                requirement=Requirement(no_flag="guards_defeated"),
            ),
            Choice(
                text="Attempt to sneak past them  [Stealth DC 16]",
                skill_check=SkillCheck(
                    skill="Stealth",
                    dc=16,
                    on_success=[
                        Effect.say("You press against the wall and slip by, holding your breath."),
                        Effect.set_flag("sneaked_past"),
                        Effect.gain_xp(75),
                        Effect.goto("guard_room_cleared"),
                    ],
                    on_failure=[
                        Effect.say("'OI! Get it!' They spot you."),
                        Effect.combat([goblin_guard(), goblin_scout()]),
                        Effect.set_flag("guards_defeated"),
                        Effect.goto("guard_room_cleared"),
                    ],
                ),
                requirement=Requirement(no_flag="guards_defeated"),
            ),
            Choice.go("Retreat to the entrance hall", "entrance_hall"),
        ],
    ))

    # ---------------------------------------- GUARD ROOM (CLEARED)

    SceneRegistry.register(Scene(
        scene_id="guard_room_cleared",
        title="The Guard Room",
        description=(
            "The guard room is quiet now. Overturned furniture and scattered weapons "
            "tell the tale of what happened here. Passages lead east toward the "
            "vault and west back to the entrance hall."
        ),
        ascii_map="""\
#########
#.......#
#.......#
#...@...#
####.####""",
        choices=[
            Choice(
                text="Search the room for loot  [Perception DC 11]",
                skill_check=SkillCheck(
                    skill="Perception",
                    dc=11,
                    on_success=[
                        Effect.say("Behind a loose stone you find a leather pouch of coins!"),
                        Effect.give_gold(25),
                        Effect.give_item("goblin_note"),
                        Effect.set_flag("searched_guard_room"),
                        Effect.gain_xp(15),
                    ],
                    on_failure=[
                        Effect.say("Nothing useful among the goblin junk."),
                        Effect.set_flag("searched_guard_room"),
                    ],
                ),
                requirement=Requirement(no_flag="searched_guard_room"),
            ),
            Choice.go("Go east toward the vault", "vault_exterior"),
            Choice.go("Go west back to the entrance hall", "entrance_hall"),
        ],
    ))

    # ---------------------------------------- VAULT EXTERIOR

    SceneRegistry.register(Scene(
        scene_id="vault_exterior",
        title="Vault Corridor",
        description=(
            "A short corridor ends at a heavy iron door reinforced with crude iron "
            "bands. A large keyhole is visible. Through the door you can sense a "
            "faint magical aura – the amulet must be inside. Beyond the vault "
            "corridor, a further passage leads to the chieftain's chamber."
        ),
        ascii_map="""\
###########
#.........#
#....@....#
#.........#
####+#+####""",
        choices=[
            Choice(
                text="Use the goblin key to unlock the door",
                effects=[
                    Effect.say("The key turns with a satisfying clunk. The vault opens."),
                    Effect.remove_item("goblin_key"),
                    Effect.goto("vault"),
                ],
                requirement=Requirement(has_item="goblin_key"),
            ),
            Choice(
                text="Pick the lock with Thieves' Tools  [Sleight of Hand DC 16]",
                skill_check=SkillCheck(
                    skill="Sleight of Hand",
                    dc=16,
                    on_success=[
                        Effect.say("With careful hands, you work the tumblers. Click!"),
                        Effect.gain_xp(30),
                        Effect.goto("vault"),
                    ],
                    on_failure=[
                        Effect.say("The mechanism is too complex. You'll need a key – or more tries."),
                    ],
                ),
                requirement=Requirement(has_item="thieves_tools"),
            ),
            Choice(
                text="Break down the door  [Athletics DC 18]",
                skill_check=SkillCheck(
                    skill="Athletics",
                    dc=18,
                    on_success=[
                        Effect.say("You slam your shoulder into the door. It buckles and swings open!"),
                        Effect.gain_xp(25),
                        Effect.goto("vault"),
                    ],
                    on_failure=[
                        Effect.say("The door holds firm. You bruise your shoulder for nothing."),
                        Effect.damage(1),
                    ],
                ),
            ),
            Choice(
                text="Study the door's magical aura  [Arcana DC 13]",
                skill_check=SkillCheck(
                    skill="Arcana",
                    dc=13,
                    on_success=[
                        Effect.say(
                            "The ward is keyed to a specific iron key. However, "
                            "you detect a minor flaw in the enchantment – a Sleight of "
                            "Hand check of DC 14 (rather than 16) would exploit it."
                        ),
                        Effect.set_flag("studied_door"),
                        Effect.gain_xp(20),
                    ],
                    on_failure=[
                        Effect.say("The magical emanations are too subtle to interpret."),
                    ],
                ),
                requirement=Requirement(no_flag="studied_door"),
            ),
            Choice.go("Go back to the guard room", "guard_room_cleared"),
            Choice.go("Advance toward the chieftain's chamber (without the amulet)",
                      "chieftain_approach",
                      requirement=Requirement(no_flag="has_amulet")),
        ],
    ))

    # ---------------------------------------- VAULT

    SceneRegistry.register(Scene(
        scene_id="vault",
        title="The Treasure Vault",
        description=(
            "A small chamber crammed with goblin loot: piles of copper coins, "
            "broken weapons, and stolen trinkets. At the center, on a crude stone "
            "pedestal, rests the Ancient Amulet of Aeloria. It glows with soft "
            "silver light, runes shifting across its surface."
        ),
        ascii_map="""\
#######
#.$.$!#
#.....#
#..@..#
#######""",
        on_enter=[
            Effect.gain_xp(50),
        ],
        choices=[
            Choice(
                text="Take the Amulet of Aeloria!",
                effects=[
                    Effect.give_item("ancient_amulet"),
                    Effect.give_gold(40),
                    Effect.set_flag("has_amulet"),
                    Effect.say(
                        "The moment your fingers close around the amulet, it flashes "
                        "with brilliant light. You feel ancient power hum through you. "
                        "You also help yourself to the coin piles – 40 gold pieces."
                    ),
                    Effect.gain_xp(100),
                ],
                requirement=Requirement(no_flag="has_amulet"),
            ),
            Choice(
                text="Examine the other items in the vault  [Investigation DC 12]",
                skill_check=SkillCheck(
                    skill="Investigation",
                    dc=12,
                    on_success=[
                        Effect.say(
                            "Hidden beneath a loose flagstone you find a Strong Potion "
                            "and a fine pair of Leather Armor!"
                        ),
                        Effect.give_item("strong_potion"),
                        Effect.give_item("leather_armor"),
                        Effect.set_flag("searched_vault"),
                        Effect.gain_xp(25),
                    ],
                    on_failure=[
                        Effect.say("Just goblin junk and old bones."),
                        Effect.set_flag("searched_vault"),
                    ],
                ),
                requirement=Requirement(no_flag="searched_vault"),
            ),
            Choice.go("Leave the vault and face the chieftain", "chieftain_approach",
                      requirement=Requirement(has_flag="has_amulet")),
            Choice.go("Leave the vault (return to corridor)", "vault_exterior"),
        ],
    ))

    # ---------------------------------------- CHIEFTAIN APPROACH

    SceneRegistry.register(Scene(
        scene_id="chieftain_approach",
        title="The Chieftain's Antechamber",
        description=(
            "A wide passage opens into a vaulted antechamber. Crude war trophies "
            "line the walls – shields, bones, and the weapons of fallen adventurers. "
            "Beyond a beaded curtain you hear a deep, guttural voice barking orders. "
            "Grak is inside."
        ),
        ascii_map="""\
###########
#.........#
#.B.....@.#
#.........#
###########""",
        choices=[
            Choice(
                text="Charge in with weapons drawn!",
                effects=[
                    Effect.say("You burst through the curtain with a war cry!"),
                    Effect.combat([chieftain()]),
                    Effect.set_flag("grak_defeated"),
                    Effect.goto("victory_scene"),
                ],
                requirement=Requirement(no_flag="grak_defeated"),
            ),
            Choice(
                text="Try to reason with Grak  [Persuasion DC 18]",
                skill_check=SkillCheck(
                    skill="Persuasion",
                    dc=18,
                    on_success=[
                        Effect.say(
                            "Against all odds, you appeal to Grak's pragmatic side. "
                            "'Fine,' he rumbles. 'Take the shiny thing. But you owe "
                            "Grak a favour.' He lets you pass."
                        ),
                        Effect.gain_xp(400),
                        Effect.set_flag("grak_persuaded"),
                        Effect.set_flag("grak_defeated"),
                        Effect.goto("victory_scene"),
                    ],
                    on_failure=[
                        Effect.say("Grak throws a chair at you. 'Words are weak! Steel speaks!'"),
                        Effect.combat([chieftain()]),
                        Effect.set_flag("grak_defeated"),
                        Effect.goto("victory_scene"),
                    ],
                ),
                requirement=Requirement(no_flag="grak_defeated"),
            ),
            Choice(
                text="Scout the room before entering  [Stealth DC 14, Perception DC 12]",
                skill_check=SkillCheck(
                    skill="Stealth",
                    dc=14,
                    on_success=[
                        Effect.say(
                            "You peer through the curtain. Grak sits on a throne of "
                            "bones, distracted by a map. Two weak goblin minions guard "
                            "the sides – but Grak's back is momentarily turned. "
                            "You gain advantage on your first attack."
                        ),
                        Effect.set_flag("grak_scouted"),
                        Effect.gain_xp(30),
                    ],
                    on_failure=[
                        Effect.say("A bead rattles. Grak's eyes snap to the curtain. The element of surprise is lost."),
                    ],
                ),
                requirement=Requirement(no_flag="grak_scouted"),
            ),
            Choice.go("Retreat to the vault corridor", "vault_exterior"),
        ],
    ))

    # ---------------------------------------- VICTORY

    SceneRegistry.register(Scene(
        scene_id="victory_scene",
        title="Triumph!",
        description=(
            "The dungeon is silent. You stand victorious amid the wreckage of "
            "Grak's throne room, the Ancient Amulet of Aeloria pulsing warmly "
            "in your pack. The goblin threat is broken. You make your way back "
            "through the dungeon and out into the cool night air of Millhaven."
        ),
        ascii_map=MapTemplates.BOSS_CHAMBER,
        on_enter=[
            Effect.gain_xp(200),
            Effect.give_gold(200),
            Effect.victory(
                "You return the Amulet of Aeloria to Elder Aldric. "
                "The town cheers. You are hailed as the Hero of Millhaven. "
                "Aldric presses 200 gold into your hands. "
                "The dungeon is cleared, the artifact is safe, and your legend "
                "has only just begun."
            ),
        ],
        choices=[],
    ))

    # ---------------------------------------- DEATH SCENES

    SceneRegistry.register(Scene(
        scene_id="death_combat",
        title="Fallen",
        description="Your wounds are too great. Darkness takes you.",
        on_enter=[
            Effect.game_over("You have been slain in the Dungeon of Aeloria."),
        ],
        choices=[],
    ))


# ---------------------------------------------------------------------------
# Map templates import
# ---------------------------------------------------------------------------

from engine.dungeon import MapTemplates


# ---------------------------------------------------------------------------
# Registration entry point
# ---------------------------------------------------------------------------

def register_all() -> None:
    """Register all items and scenes. Call this before creating the GameEngine."""
    register_items()
    register_scenes()
