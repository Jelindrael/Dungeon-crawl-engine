// scene.js – Scene / narrative graph
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

// ---------------------------------------------------------------------------
// Effect types
// ---------------------------------------------------------------------------
DCE.FX = {
  GOTO:'goto', GIVE_ITEM:'give_item', REMOVE_ITEM:'remove_item',
  DAMAGE:'damage', HEAL:'heal', SET_FLAG:'set_flag', CLEAR_FLAG:'clear_flag',
  SAN_LOSS:'san_loss', GIVE_GOLD:'give_gold', TAKE_GOLD:'take_gold',
  SAY:'say', DIALOGUE:'dialogue', LOAD_MAP:'load_map', SHOW_ART:'show_art',
  COMBAT:'combat', GAME_OVER:'game_over', VICTORY:'victory',
};

DCE.Effect = class {
  constructor(type, params={}) { this.type = type; this.params = params; }

  static goto(sceneId)           { return new DCE.Effect(DCE.FX.GOTO,      {scene_id:sceneId}); }
  static giveItem(name)          { return new DCE.Effect(DCE.FX.GIVE_ITEM,  {name}); }
  static removeItem(name)        { return new DCE.Effect(DCE.FX.REMOVE_ITEM,{name}); }
  static damage(amount, dice)    { return new DCE.Effect(DCE.FX.DAMAGE,     {amount:amount||0, dice:dice||null}); }
  static heal(amount)            { return new DCE.Effect(DCE.FX.HEAL,       {amount}); }
  static setFlag(key, val=true)  { return new DCE.Effect(DCE.FX.SET_FLAG,   {key,value:val}); }
  static clearFlag(key)          { return new DCE.Effect(DCE.FX.CLEAR_FLAG, {key}); }
  static sanLoss(failDice, successDice='0') {
    return new DCE.Effect(DCE.FX.SAN_LOSS, {fail_dice:failDice, success_dice:successDice});
  }
  static say(message)            { return new DCE.Effect(DCE.FX.SAY,        {message}); }
  static dialogue(dialogueId)    { return new DCE.Effect(DCE.FX.DIALOGUE,   {dialogue_id:dialogueId}); }
  static gameOver(message)       { return new DCE.Effect(DCE.FX.GAME_OVER,  {message}); }
  static victory(message)        { return new DCE.Effect(DCE.FX.VICTORY,    {message}); }

  static fromDict(d) { return new DCE.Effect(d.type, d.params||{}); }
  toDict() { return {type:this.type, params:this.params}; }
};

// ---------------------------------------------------------------------------
// Requirement
// ---------------------------------------------------------------------------
DCE.Requirement = class {
  constructor({hasItem, noItem, hasFlag, noFlag, minGold, minSkill}={}) {
    this.hasItem  = hasItem  || null;
    this.noItem   = noItem   || null;
    this.hasFlag  = hasFlag  || null;
    this.noFlag   = noFlag   || null;
    this.minGold  = minGold  || null;
    this.minSkill = minSkill || null;  // {skillName: minValue}
  }

  isMet(inv) {
    if (this.hasItem  && !inv.hasItem(this.hasItem))   return false;
    if (this.noItem   &&  inv.hasItem(this.noItem))    return false;
    if (this.hasFlag  && !inv.hasFlag(this.hasFlag))   return false;
    if (this.noFlag   &&  inv.hasFlag(this.noFlag))    return false;
    if (this.minGold  &&  inv.cash < this.minGold)     return false;
    if (this.minSkill) {
      for (const [sk, min] of Object.entries(this.minSkill))
        if ((inv.skills[sk]||0) < min) return false;
    }
    return true;
  }
};

// ---------------------------------------------------------------------------
// SkillCheck
// ---------------------------------------------------------------------------
DCE.SkillCheck = class {
  constructor({skill, onSuccess=[], onFailure=[], bonusDice=0, push=false}={}) {
    this.skill      = skill;
    this.onSuccess  = onSuccess;
    this.onFailure  = onFailure;
    this.bonusDice  = bonusDice;
    this.push       = push;
  }
};

// ---------------------------------------------------------------------------
// Choice
// ---------------------------------------------------------------------------
DCE.Choice = class {
  constructor({text, effects=[], requirement=null, skillCheck=null}={}) {
    this.text        = text;
    this.effects     = effects;
    this.requirement = requirement;
    this.skillCheck  = skillCheck;
  }

  isAvailable(inv) {
    return !this.requirement || this.requirement.isMet(inv);
  }

  // Shortcut: simple navigation
  static go(text, sceneId) {
    return new DCE.Choice({text, effects:[DCE.Effect.goto(sceneId)]});
  }
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
DCE.Scene = class {
  constructor({sceneId, title, description, choices=[], onEnter=[], illustration=null, mapId=null}={}) {
    this.sceneId      = sceneId;
    this.title        = title;
    this.description  = description;
    this.choices      = choices;
    this.onEnter      = onEnter;
    this.illustration = illustration;
    this.mapId        = mapId;
  }

  availableChoices(inv) {
    return this.choices.filter(c => c.isAvailable(inv));
  }
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
DCE.SceneRegistry = {};
DCE.registerScene  = function(scene) { DCE.SceneRegistry[scene.sceneId] = scene; };
DCE.getScene       = function(id)    { return DCE.SceneRegistry[id]; };
DCE.clearScenes    = function()      { DCE.SceneRegistry = {}; };
