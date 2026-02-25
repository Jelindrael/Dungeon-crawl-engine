// dialogue.js – Dialogue tree system
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.DialogueRequirement = class {
  constructor({hasFlag,noFlag,hasItem,minSkill,minGold}={}) {
    this.hasFlag  = hasFlag  || null;
    this.noFlag   = noFlag   || null;
    this.hasItem  = hasItem  || null;
    this.minSkill = minSkill || null;
    this.minGold  = minGold  || null;
  }
  isMet(inv) {
    if (this.hasFlag  && !inv.hasFlag(this.hasFlag))   return false;
    if (this.noFlag   &&  inv.hasFlag(this.noFlag))    return false;
    if (this.hasItem  && !inv.hasItem(this.hasItem))   return false;
    if (this.minGold  &&  inv.cash < this.minGold)     return false;
    if (this.minSkill) {
      for (const [sk,min] of Object.entries(this.minSkill))
        if ((inv.skills[sk]||0) < min) return false;
    }
    return true;
  }
};

DCE.DialogueSkillCheck = class {
  constructor({skill, onSuccess=null, onFailure=null, push=false}={}) {
    this.skill     = skill;
    this.onSuccess = onSuccess;
    this.onFailure = onFailure;
    this.push      = push;
  }
};

DCE.DialogueChoice = class {
  constructor({choiceId, text, nextNode=null, requirement=null, skillCheck=null, effects=[]}={}) {
    this.choiceId   = choiceId;
    this.text       = text;
    this.nextNode   = nextNode;
    this.requirement= requirement;
    this.skillCheck = skillCheck;
    this.effects    = effects;
  }
  isAvailable(inv) { return !this.requirement || this.requirement.isMet(inv); }
};

DCE.DialogueNode = class {
  constructor({nodeId, speaker='', text='', portrait=null, choices=[], onEnter=[], editorX=0, editorY=0}={}) {
    this.nodeId   = nodeId;
    this.speaker  = speaker;
    this.text     = text;
    this.portrait = portrait;
    this.choices  = choices;
    this.onEnter  = onEnter;
    this.editorX  = editorX;
    this.editorY  = editorY;
  }
  availableChoices(inv) { return this.choices.filter(c=>c.isAvailable(inv)); }
};

DCE.DialogueTree = class {
  constructor({dialogueId, startNode, title='', nodes={}}={}) {
    this.dialogueId = dialogueId;
    this.startNode  = startNode;
    this.title      = title;
    this.nodes      = nodes;
  }

  getNode(id) { return this.nodes[id]; }
  addNode(node) { this.nodes[node.nodeId] = node; }

  toJSON() {
    const nodesOut = {};
    for (const [id, n] of Object.entries(this.nodes)) {
      nodesOut[id] = {
        id: n.nodeId, speaker: n.speaker, text: n.text,
        portrait: n.portrait, editorX: n.editorX, editorY: n.editorY,
        onEnter: n.onEnter,
        choices: n.choices.map(c=>({
          id: c.choiceId, text: c.text, nextNode: c.nextNode,
          effects: c.effects,
        })),
      };
    }
    return JSON.stringify({id:this.dialogueId, startNode:this.startNode, title:this.title, nodes:nodesOut}, null, 2);
  }

  static fromJSON(json) {
    const d = JSON.parse(json);
    const nodes = {};
    for (const [id, n] of Object.entries(d.nodes||{})) {
      nodes[id] = new DCE.DialogueNode({
        nodeId: n.id || id,
        speaker: n.speaker||'',
        text: n.text||'',
        portrait: n.portrait||null,
        onEnter: n.onEnter||[],
        editorX: n.editorX||0,
        editorY: n.editorY||0,
        choices: (n.choices||[]).map(c=>new DCE.DialogueChoice({
          choiceId: c.id||'choice',
          text: c.text,
          nextNode: c.nextNode||null,
          effects: c.effects||[],
        })),
      });
    }
    return new DCE.DialogueTree({dialogueId:d.id||'dialogue', startNode:d.startNode||'', title:d.title||'', nodes});
  }
};

DCE.DialogueRegistry = {};
DCE.registerDialogue = function(tree) { DCE.DialogueRegistry[tree.dialogueId] = tree; };
DCE.getDialogue      = function(id)   { return DCE.DialogueRegistry[id]; };
DCE.clearDialogues   = function()     { DCE.DialogueRegistry = {}; };
