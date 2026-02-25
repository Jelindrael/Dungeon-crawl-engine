// content.js – "The Blackwood Manor Affair" demo scenario
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

// ---------------------------------------------------------------------------
// Tilemap
// ---------------------------------------------------------------------------
const _MANOR_ASCII = [
  '####################################',
  '#..................................#',
  '#..@.......#......#................#',
  '#..........#......#................#',
  '#..........+......+................#',
  '#..........#......#................#',
  '################.###################',
  '#..............#....#..............#',
  '#..............+....+..............#',
  '#..............#....#..............#',
  '####################################',
].join('\n');

// ---------------------------------------------------------------------------
// Gardener dialogue
// ---------------------------------------------------------------------------
function _buildGardenerDialogue() {
  const tree = new DCE.DialogueTree({dialogueId:'gardener', startNode:'greet'});

  const greet = new DCE.DialogueNode({nodeId:'greet', speaker:'Thomas',
    text:"You're not from around here, are ya? Come to poke about the old manor, same as that professor fella?",
    choices:[
      new DCE.DialogueChoice({choiceId:'c1', text:"Yes. Did you see what happened to him?", nextNode:'saw_it'}),
      new DCE.DialogueChoice({choiceId:'c2', text:"We mean no harm. What can you tell us?", nextNode:'warn'}),
    ],
    editorX:50, editorY:50,
  });

  const sawIt = new DCE.DialogueNode({nodeId:'saw_it', speaker:'Thomas',
    text:"I seen him go down the cellar steps three nights back. Heard screaming after midnight. He never came up again. Stay away from that cellar, friends. It ain't natural.",
    choices:[
      new DCE.DialogueChoice({choiceId:'c3', text:"Thank you, Thomas. We'll be careful.", nextNode:'farewell'}),
      new DCE.DialogueChoice({choiceId:'c4', text:"Did he leave anything — notes, a journal?", nextNode:'journal_clue'}),
    ],
    editorX:350, editorY:-50,
  });

  const warn = new DCE.DialogueNode({nodeId:'warn', speaker:'Thomas',
    text:"Stay out of the east wing and don't go into the cellar after dark. Strange lights down there. Strange sounds. I've worked here forty years and I've never once opened that cellar door at night.",
    choices:[
      new DCE.DialogueChoice({choiceId:'c5', text:"What's in the cellar?", nextNode:'cellar_info'}),
      new DCE.DialogueChoice({choiceId:'c6', text:"We understand. Thank you.", nextNode:'farewell'}),
    ],
    editorX:350, editorY:150,
  });

  const journalClue = new DCE.DialogueNode({nodeId:'journal_clue', speaker:'Thomas',
    text:"Aye — he dropped his satchel near the old apple tree out back. I didn't touch it. Felt wrong somehow.",
    choices:[new DCE.DialogueChoice({choiceId:'c7', text:"Thank you. We'll look for it.", nextNode:'farewell'})],
    onEnter:[{type:DCE.FX.SET_FLAG, params:{key:'knows_journal_location',value:true}}],
    editorX:650, editorY:-120,
  });

  const cellarInfo = new DCE.DialogueNode({nodeId:'cellar_info', speaker:'Thomas',
    text:"Some kind of old chamber. Older than the manor, I reckon. The family that built this place — the Blackwoods — they used to hold 'ceremonies' down there. Came to a bad end, the lot of them.",
    choices:[new DCE.DialogueChoice({choiceId:'c8', text:"That sounds dangerous. Thank you.", nextNode:'farewell'})],
    editorX:650, editorY:100,
  });

  const farewell = new DCE.DialogueNode({nodeId:'farewell', speaker:'Thomas',
    text:"Take care, friends. And if you hear anything — anything at all — from down below, run. Don't try to be heroes.",
    choices:[],
    editorX:950, editorY:50,
  });

  for (const n of [greet,sawIt,warn,journalClue,cellarInfo,farewell])
    tree.addNode(n);
  return tree;
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
function _buildScenes() {
  return [
    new DCE.Scene({
      sceneId:'intro', title:'THE BLACKWOOD MANOR AFFAIR',
      description:'Arkham, Massachusetts — October, 1926.\n\nYou receive a telegram from Professor Ellison of Miskatonic University:\n\n"URGENT. GONE TO BLACKWOOD MANOR RE: CULT RESEARCH. FEAR FOR MY SAFETY. COME AT ONCE. DO NOT DELAY. — ELLISON"\n\nThree days later, Ellison has not returned. His department chair has begged you to investigate. The manor lies twelve miles north of Arkham, alone on a wooded hill.',
      choices:[DCE.Choice.go('Travel to Blackwood Manor','start')],
    }),

    new DCE.Scene({
      sceneId:'start', title:'Blackwood Manor — Front Hall',
      description:"The iron gate groans as you push it open. The manor looms against a slate-grey sky, its windows dark. The front door stands ajar.\n\nInside, the entrance hall smells of mildew and burned wax. A guttered candelabra sits on the mantelpiece. Beside it — a crumpled letter addressed to Ellison.",
      mapId:'manor_ground',
      choices:[
        DCE.Choice.go('Examine the letter on the mantelpiece','examine_letter'),
        new DCE.Choice({text:'Search the library [Library Use]',
          skillCheck:new DCE.SkillCheck({skill:'Library Use',
            onSuccess:[DCE.Effect.goto('study_library_success')],
            onFailure:[DCE.Effect.goto('study_library_fail')],
          }),
        }),
        DCE.Choice.go('Explore the grounds outside','investigate_grounds'),
        DCE.Choice.go('Head toward the cellar stairs','descend_cellar'),
      ],
    }),

    new DCE.Scene({
      sceneId:'examine_letter', title:'A Cryptic Letter',
      description:'The letter is dated three weeks ago. The handwriting is hurried:\n\n"Ellison — The glyphs in Blackwood\'s private journal match those in the Nargthoth Fragments. I believe the cellar chamber was used for summoning. Do NOT open the warded door unless you have completed the binding incantation first. The entity is still BOUND — but barely. For God\'s sake be careful.\n\n— Armitage"\n\nA chill runs down your spine.',
      onEnter:[DCE.Effect.setFlag('read_warning_letter'), DCE.Effect.say('You now know: the entity must be bound before the warded door is opened.')],
      choices:[DCE.Choice.go('Return to the front hall','start')],
    }),

    new DCE.Scene({
      sceneId:'study_library_success', title:'The Library — Forbidden Texts',
      description:'The library shelves hold an unusual number of occult volumes. A leather-bound journal lies open on the reading table — Ellison\'s handwriting.\n\nHis notes describe a pre-colonial ritual chamber, used by Obadiah Blackwood to "commune with that which sleeps in the angles between spaces." A marginal note reads:\n\n"Banishment incantation — pg. 247 of the Nargthoth Fragments. Must be spoken with Occult knowledge to be effective."',
      onEnter:[DCE.Effect.setFlag('studied_library'), DCE.Effect.giveItem("Ellison's Journal")],
      choices:[DCE.Choice.go('Return to the front hall','start')],
    }),

    new DCE.Scene({
      sceneId:'study_library_fail', title:'The Library — Dense Pages',
      description:"The books are written in a bewildering mix of Latin, Greek, and stranger tongues. Most of it is beyond you.\n\nYou find Ellison's journal but can only make out fragments — something about a 'warded door' and a 'binding that must not be broken.'",
      onEnter:[DCE.Effect.giveItem("Ellison's Journal (partial)")],
      choices:[DCE.Choice.go('Return to the front hall','start')],
    }),

    new DCE.Scene({
      sceneId:'investigate_grounds', title:'The Grounds',
      description:'The overgrown garden is wrapped in fog. Dead roses claw at a rusted trellis. A path leads around the east wing.\n\nNear an ancient apple tree, you notice something half-buried in the leaf litter.',
      choices:[
        new DCE.Choice({text:'Search carefully near the apple tree [Spot Hidden]',
          skillCheck:new DCE.SkillCheck({skill:'Spot Hidden',
            onSuccess:[DCE.Effect.goto('find_satchel')],
            onFailure:[DCE.Effect.goto('miss_satchel')],
          }),
        }),
        DCE.Choice.go('Speak with the old gardener near the gate','meet_gardener'),
        DCE.Choice.go('Return to the manor','start'),
      ],
    }),

    new DCE.Scene({
      sceneId:'find_satchel', title:"Ellison's Satchel",
      description:"Half-hidden under a mound of leaves you find a leather satchel — Ellison's. Inside: a flashlight, a vial of smelling salts, and a hand-drawn map of the manor's lower level.\n\nThe map marks a 'warded door' in the ritual chamber and scrawls a warning: BINDING HOLDS — DO NOT DISTURB THE SEALS.",
      onEnter:[DCE.Effect.giveItem('Flashlight'), DCE.Effect.giveItem('Smelling Salts'), DCE.Effect.giveItem('Manor Basement Map'), DCE.Effect.setFlag('found_satchel')],
      choices:[DCE.Choice.go('Return to the garden','investigate_grounds')],
    }),

    new DCE.Scene({
      sceneId:'miss_satchel', title:'Nothing Found',
      description:'You search but find only dead leaves and a broken garden ornament.',
      choices:[DCE.Choice.go('Return to the garden','investigate_grounds')],
    }),

    new DCE.Scene({
      sceneId:'meet_gardener', title:'Old Thomas',
      description:'Near the rusted gate crouches an ancient man in a wide-brimmed hat, pulling weeds with gnarled hands despite the cold. He eyes you suspiciously as you approach.',
      onEnter:[DCE.Effect.say('You can speak with old Thomas, the manor\'s groundskeeper.')],
      choices:[
        new DCE.Choice({text:'Speak with him', effects:[DCE.Effect.dialogue('gardener')]}),
        DCE.Choice.go('Return to the manor','start'),
      ],
    }),

    new DCE.Scene({
      sceneId:'descend_cellar', title:'The Cellar Stairs',
      description:"The cellar door is set into the floor near the kitchen. A cold, damp smell drifts up from below — earth, old stone, and something else. Something sweet and wrong.\n\nStone steps descend into darkness. Faint phosphorescent light pulses far below.",
      choices:[
        new DCE.Choice({text:'Descend with the flashlight [Need: Flashlight]',
          requirement:new DCE.Requirement({hasItem:'Flashlight'}),
          effects:[DCE.Effect.goto('cellar_chamber')],
        }),
        new DCE.Choice({text:'Descend in the dark (risky)',
          requirement:new DCE.Requirement({noItem:'Flashlight'}),
          effects:[DCE.Effect.say('You stumble in the darkness.'), DCE.Effect.damage(1), DCE.Effect.goto('cellar_chamber')],
        }),
        DCE.Choice.go('Turn back — you need more information','start'),
      ],
    }),

    new DCE.Scene({
      sceneId:'cellar_chamber', title:'The Ritual Chamber',
      description:"At the bottom of the stairs stretches a vaulted stone chamber that predates the manor by centuries. Carved glyphs cover every surface, pulsing with a sickly inner light.\n\nIn the center: a warded iron door, its surface blazing with sigils. Before it — what was Professor Ellison. He kneels, eyes blank, muttering in a language no living tongue should speak.\n\nThe ward is failing. One of the binding seals has been scraped away.",
      onEnter:[DCE.Effect.sanLoss('1d6','1'), DCE.Effect.say("The sight of Ellison's broken mind costs you Sanity.")],
      choices:[
        new DCE.Choice({text:'Attempt the banishment incantation (with journal bonus) [Occult]',
          requirement:new DCE.Requirement({hasFlag:'studied_library'}),
          skillCheck:new DCE.SkillCheck({skill:'Occult', bonusDice:1,
            onSuccess:[DCE.Effect.goto('banish_success')],
            onFailure:[DCE.Effect.goto('banish_fail')],
          }),
        }),
        new DCE.Choice({text:'Attempt the banishment incantation [Occult]',
          requirement:new DCE.Requirement({noFlag:'studied_library'}),
          skillCheck:new DCE.SkillCheck({skill:'Occult',
            onSuccess:[DCE.Effect.goto('banish_success')],
            onFailure:[DCE.Effect.goto('banish_fail')],
          }),
        }),
        new DCE.Choice({text:'Pull Ellison away from the door and flee',
          effects:[DCE.Effect.say('You drag the catatonic professor toward the stairs.'), DCE.Effect.goto('flee_manor')],
        }),
        new DCE.Choice({text:'Open the warded door [EXTREMELY DANGEROUS]',
          effects:[
            DCE.Effect.sanLoss('1d10','1d3'),
            new DCE.Effect(DCE.FX.COMBAT, {enemies:[{name:'Dimensional Shambler',hp:14,attack_skill:55,damage_dice:'2d6',san_loss:'1d6/1d20',armor:0}]}),
          ],
        }),
      ],
    }),

    new DCE.Scene({
      sceneId:'banish_success', title:'The Ward Holds',
      description:"Your voice rises, the incantation forming from notes in Ellison's journal. The glyphs flare blinding white.\n\nA shriek tears through dimensions not accessible to human senses. The warded door glows red-hot, then fades to cold iron.\n\nEllison collapses. He is alive — broken, but alive. The phosphorescent light fades. The chamber is quiet.\n\nIt is over. For now.",
      onEnter:[DCE.Effect.setFlag('banished_entity'), DCE.Effect.say('Your sanity holds. You feel clarity return.')],
      choices:[DCE.Choice.go('Carry Ellison out of the manor','victory')],
    }),

    new DCE.Scene({
      sceneId:'banish_fail', title:'The Incantation Fails',
      description:"The words die in your throat. The sigils pulse mockingly.\n\nA crack runs through the warded door. Something vast and cold presses against it from the other side. Ellison begins to scream.\n\nYou have seconds to act.",
      onEnter:[DCE.Effect.sanLoss('1d4','0')],
      choices:[
        DCE.Choice.go('Grab Ellison and run for the stairs','flee_manor'),
        new DCE.Choice({text:'Try again — push the roll [Occult PUSH]',
          skillCheck:new DCE.SkillCheck({skill:'Occult', push:true,
            onSuccess:[DCE.Effect.goto('banish_success')],
            onFailure:[DCE.Effect.sanLoss('1d10','0'), DCE.Effect.damage(3), DCE.Effect.goto('game_over_consumed')],
          }),
        }),
      ],
    }),

    new DCE.Scene({
      sceneId:'flee_manor', title:'Flight',
      description:"You half-carry the catatonic Ellison up the cellar stairs, through the dark manor, and out into the cold night air.\n\nBehind you, the manor shudders. Glass shatters in every window. Then — silence.\n\nEllison will need months of care at Arkham Sanitarium. He may never speak again about what he saw.\n\nThe entity remains bound — but the seal is weakening. You have bought the world time. How much, you cannot say.",
      onEnter:[DCE.Effect.sanLoss('1','0')],
      choices:[DCE.Choice.go('Report to Dr. Armitage — Partial Victory','partial_victory')],
    }),

    new DCE.Scene({
      sceneId:'partial_victory', title:'Report to Armitage',
      description:'Armitage listens grimly to your report in his study at the university. He nods, his face grave.\n\n"You did what you could. The binding will hold for years, perhaps decades. By then... we may know more."\n\nHe hands you a glass of brandy. Through the window, Arkham looks peaceful. You know better now.',
      choices:[
        new DCE.Choice({text:'It is enough. For now.',
          effects:[DCE.Effect.victory('You survived the Blackwood Manor Affair. The entity remains bound. Ellison recovers slowly. Arkham sleeps, unknowing.')],
        }),
      ],
    }),

    new DCE.Scene({
      sceneId:'victory', title:'The Darkness Driven Back',
      description:"You and Ellison emerge into the cold October night. The stars wheel overhead, indifferent as always.\n\nEllison clutches your arm, trembling. 'It's still there,' he whispers. 'It will always be there. We only locked the door.'\n\nYou drive back to Arkham in silence.",
      choices:[
        new DCE.Choice({text:'Deliver your report to Dr. Armitage',
          effects:[DCE.Effect.victory('The Blackwood Manor Affair — Resolved. The entity is re-sealed. Ellison lives. The world continues, ignorant of what almost was.')],
        }),
      ],
    }),

    new DCE.Scene({
      sceneId:'game_over_consumed', title:'Consumed',
      description:"The warded door shatters. In the blinding non-light that pours through, you see — briefly — something that exists in angles and impossibilities.\n\nYour mind does not survive the encounter intact.\n\nWhen the authorities finally enter the manor, they find only a catatonic figure kneeling beside a shattered iron door, muttering in no known language. The cellar is cold and dark.\n\nProfessor Ellison is never found.",
      onEnter:[DCE.Effect.sanLoss('5d10','0')],
      choices:[
        new DCE.Choice({text:'The darkness claims you.',
          effects:[DCE.Effect.gameOver('Consumed by an entity beyond human comprehension.')],
        }),
      ],
    }),
  ];
}

// ---------------------------------------------------------------------------
// Register everything
// ---------------------------------------------------------------------------
DCE.registerDemoContent = function() {
  DCE.clearScenes();
  DCE.clearDialogues();
  for (const scene of _buildScenes()) DCE.registerScene(scene);
  DCE.registerDialogue(_buildGardenerDialogue());
  return DCE.TileMap.fromString(_MANOR_ASCII, 'manor_ground');
};
