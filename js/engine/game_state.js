// game_state.js – Central game state + effect processor
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.Mode = { SCENE:'scene', MAP:'map', DIALOGUE:'dialogue', COMBAT:'combat',
             MENU:'menu', GAME_OVER:'game_over', VICTORY:'victory' };

DCE.GameState = class {
  constructor(investigator, startScene='intro') {
    this.investigator     = investigator;
    this.currentSceneId   = startScene;
    this.mode             = DCE.Mode.SCENE;
    this.messages         = [];
    this.maxMessages      = 200;

    // Map
    this.currentMap = null;
    this.playerX    = 0;
    this.playerY    = 0;

    // Dialogue
    this.currentDialogue = null;
    this.currentNode     = null;

    // Combat
    this.combatEnemies = [];
    this.combatRound   = 0;

    // Callbacks set by renderer
    this.onUpdate = null;   // called after every state change

    this._pendingArt = null;
  }

  // ---- Message log --------------------------------------------------------
  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages)
      this.messages = this.messages.slice(-this.maxMessages);
  }

  recentMessages(n=15) { return this.messages.slice(-n); }

  // ---- Scene management --------------------------------------------------
  currentScene() { return DCE.SceneRegistry[this.currentSceneId]; }

  enterScene(sceneId) {
    this.currentSceneId = sceneId;
    this.mode = DCE.Mode.SCENE;
    const scene = DCE.SceneRegistry[sceneId];
    if (!scene) { this.log(`[ERROR] Scene not found: ${sceneId}`); return; }
    this.log(`― ${scene.title} ―`);
    for (const eff of scene.onEnter) this.applyEffect(eff);
    if (this.onUpdate) this.onUpdate();
  }

  processChoice(index) {
    const scene = this.currentScene();
    if (!scene) return;
    const choices = scene.availableChoices(this.investigator);
    const choice = choices[index];
    if (!choice) return;

    if (choice.skillCheck) {
      const sc = choice.skillCheck;
      const result = this.investigator.rollSkill(sc.skill, sc.bonusDice||0);
      this.log(result.toString());
      const effects = result.isSuccess ? sc.onSuccess : sc.onFailure;
      for (const eff of effects) this.applyEffect(eff);
    } else {
      for (const eff of choice.effects) this.applyEffect(eff);
    }
    if (this.onUpdate) this.onUpdate();
  }

  // ---- Dialogue ----------------------------------------------------------
  startDialogue(dialogueId) {
    const tree = DCE.DialogueRegistry[dialogueId];
    if (!tree) { this.log(`[ERROR] Dialogue not found: ${dialogueId}`); return; }
    this.currentDialogue = tree;
    const node = tree.getNode(tree.startNode);
    if (node) {
      this.currentNode = node;
      this.mode = DCE.Mode.DIALOGUE;
      for (const eff of (node.onEnter||[])) this.applyEffect(DCE.Effect.fromDict(eff));
      this.log(`${node.speaker}: "${node.text}"`);
    }
    if (this.onUpdate) this.onUpdate();
  }

  processDialogueChoice(index) {
    if (!this.currentNode || !this.currentDialogue) return;
    const choices = this.currentNode.availableChoices(this.investigator);
    const choice = choices[index];
    if (!choice) return;

    for (const eff of (choice.effects||[])) this.applyEffect(DCE.Effect.fromDict(eff));

    let nextId;
    if (choice.skillCheck) {
      const result = this.investigator.rollSkill(choice.skillCheck.skill);
      this.log(result.toString());
      nextId = result.isSuccess ? choice.skillCheck.onSuccess : choice.skillCheck.onFailure;
    } else {
      nextId = choice.nextNode;
    }

    if (nextId) {
      const node = this.currentDialogue.getNode(nextId);
      if (node) {
        this.currentNode = node;
        for (const eff of (node.onEnter||[])) this.applyEffect(DCE.Effect.fromDict(eff));
        this.log(`${node.speaker}: "${node.text}"`);
      } else { this._endDialogue(); }
    } else { this._endDialogue(); }
    if (this.onUpdate) this.onUpdate();
  }

  _endDialogue() {
    this.currentDialogue = null;
    this.currentNode = null;
    this.mode = DCE.Mode.SCENE;
  }

  // ---- Map movement -------------------------------------------------------
  movePlayer(dx, dy) {
    if (!this.currentMap) return;
    const nx = this.playerX+dx, ny = this.playerY+dy;
    if (this.currentMap.isPassable(nx, ny)) {
      this.playerX = nx; this.playerY = ny;
      this.currentMap.revealRadius(nx, ny, 5);
      for (const ent of this.currentMap.entitiesAt(nx, ny)) {
        if (ent.entityType === 'trigger') {
          const sid = ent.properties?.scene_id;
          if (sid) this.enterScene(sid);
        } else if (ent.entityType === 'npc') {
          const did = ent.properties?.dialogue_id;
          if (did) this.startDialogue(did);
        }
      }
    }
    if (this.onUpdate) this.onUpdate();
  }

  // ---- Effect processor --------------------------------------------------
  applyEffect(effect) {
    const { type, params } = effect;
    const inv = this.investigator;

    if (type === DCE.FX.GOTO) {
      this.enterScene(params.scene_id);

    } else if (type === DCE.FX.GIVE_ITEM) {
      inv.addItem(params.name);
      this.log(`You obtain: ${params.name}.`);

    } else if (type === DCE.FX.REMOVE_ITEM) {
      if (inv.removeItem(params.name)) this.log(`You lose: ${params.name}.`);

    } else if (type === DCE.FX.DAMAGE) {
      let amt = params.amount||0;
      if (params.dice) amt += DCE.parseDice(params.dice);
      const msgs = inv.takeDamage(amt);
      msgs.forEach(m=>this.log(m));
      if (inv.currentHp <= 0)
        this.applyEffect(DCE.Effect.gameOver(`${inv.name} succumbs to their wounds.`));

    } else if (type === DCE.FX.HEAL) {
      const healed = inv.heal(params.amount||0);
      this.log(`Recovered ${healed} HP. (${inv.currentHp}/${inv.maxHp})`);

    } else if (type === DCE.FX.SET_FLAG) {
      inv.setFlag(params.key, params.value !== undefined ? params.value : true);

    } else if (type === DCE.FX.CLEAR_FLAG) {
      delete inv.flags[params.key];

    } else if (type === DCE.FX.SAN_LOSS) {
      const { msgs } = inv.rollSanity(params.fail_dice||'1', params.success_dice||'0');
      msgs.forEach(m=>this.log(m));
      if (inv.currentSan <= 0)
        this.applyEffect(DCE.Effect.gameOver('Your mind shatters completely.'));

    } else if (type === DCE.FX.GIVE_GOLD) {
      inv.cash += params.amount||0;
      this.log(`You gain $${params.amount}.`);

    } else if (type === DCE.FX.TAKE_GOLD) {
      inv.cash = Math.max(0, inv.cash-(params.amount||0));
      this.log(`You spend $${params.amount}.`);

    } else if (type === DCE.FX.SAY) {
      this.log(params.message);

    } else if (type === DCE.FX.DIALOGUE) {
      this.startDialogue(params.dialogue_id);

    } else if (type === DCE.FX.COMBAT) {
      const enemies = (params.enemies||[]).map(e=>new DCE.Combatant({
        name: e.name, hp: e.hp||10, attackSkill: e.attack_skill||30,
        damageDice: e.damage_dice||'1d6', dodgeSkill: e.dodge_skill||0,
        armor: e.armor||0, sanLoss: e.san_loss||'0/1d3',
      }));
      this.combatEnemies = enemies;
      this.combatRound = 0;
      this.mode = DCE.Mode.COMBAT;
      this.log(`*** COMBAT: ${enemies.map(e=>e.name).join(', ')} ***`);

    } else if (type === DCE.FX.GAME_OVER) {
      this.log(`GAME OVER: ${params.message||'You are dead.'}`);
      this.mode = DCE.Mode.GAME_OVER;

    } else if (type === DCE.FX.VICTORY) {
      this.log(`VICTORY: ${params.message||'You have prevailed.'}`);
      this.mode = DCE.Mode.VICTORY;
    }
  }

  // ---- Combat action ------------------------------------------------------
  combatAttack() {
    if (!this.combatEnemies.length) return;
    const enemy = this.combatEnemies[0];
    const msgs = DCE.resolveCombat(this.investigator, enemy);
    msgs.forEach(m=>this.log(m));
    if (enemy.hp <= 0) {
      this.log(`${enemy.name} is defeated!`);
      this.combatEnemies.shift();
      if (!this.combatEnemies.length) {
        this.log('All enemies defeated!');
        this.mode = DCE.Mode.SCENE;
      }
    }
    if (this.investigator.currentHp <= 0)
      this.applyEffect(DCE.Effect.gameOver(`${this.investigator.name} falls in combat.`));
    if (this.onUpdate) this.onUpdate();
  }

  combatFlee() {
    this.log('You flee from combat!');
    this.combatEnemies = [];
    this.mode = DCE.Mode.SCENE;
    if (this.onUpdate) this.onUpdate();
  }

  // ---- Save / Load --------------------------------------------------------
  save() {
    const data = {
      investigator: this.investigator.toDict(),
      currentScene: this.currentSceneId,
      messages: this.messages.slice(-50),
      mode: this.mode,
      playerX: this.playerX,
      playerY: this.playerY,
    };
    localStorage.setItem('dce_save', JSON.stringify(data));
    this.log('Game saved.');
  }

  static load() {
    const raw = localStorage.getItem('dce_save');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const inv = DCE.Investigator.fromDict(data.investigator);
    const state = new DCE.GameState(inv, data.currentScene||'intro');
    state.messages = data.messages||[];
    state.mode = data.mode||DCE.Mode.SCENE;
    state.playerX = data.playerX||0;
    state.playerY = data.playerY||0;
    return state;
  }

  static hasSave() { return !!localStorage.getItem('dce_save'); }
};
