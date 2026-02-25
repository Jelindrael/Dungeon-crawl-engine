// coc.js – Call of Cthulhu 7th Edition rules
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------
DCE.d = function(sides, count=1, bonus=0) {
  let t = bonus;
  for (let i=0; i<count; i++) t += Math.floor(Math.random()*sides)+1;
  return t;
};

DCE.rollPercentile = function() {
  const tens  = Math.floor(Math.random()*10)*10;
  const units = Math.floor(Math.random()*10);
  const total = (tens+units) === 0 ? 100 : tens+units;
  return total;
};

// bonus_dice > 0 = bonus (take lowest tens), < 0 = penalty (take highest tens)
DCE.rollWithBonus = function(bonusDice=0) {
  const units = Math.floor(Math.random()*10);
  const count = Math.abs(bonusDice)+1;
  const tensRolls = Array.from({length:count}, ()=>Math.floor(Math.random()*10)*10);
  let tens;
  if      (bonusDice > 0) tens = Math.min(...tensRolls);
  else if (bonusDice < 0) tens = Math.max(...tensRolls);
  else                    tens = tensRolls[0];
  const result = tens+units;
  return result === 0 ? 100 : result;
};

DCE.parseDice = function(notation) {
  if (!notation || notation === '0') return 0;
  notation = String(notation).trim();
  let total = 0;
  const parts = notation.toLowerCase().split('+');
  for (const part of parts) {
    const m = part.match(/^(\d+)?d(\d+)$/);
    if (m) {
      const count = parseInt(m[1]||'1');
      const sides = parseInt(m[2]);
      for (let i=0; i<count; i++) total += Math.floor(Math.random()*sides)+1;
    } else {
      const n = parseInt(part);
      if (!isNaN(n)) total += n;
    }
  }
  return total;
};

// ---------------------------------------------------------------------------
// Success levels
// ---------------------------------------------------------------------------
DCE.SUCCESS = { EXTREME:4, HARD:3, REGULAR:2, FAILURE:1, FUMBLE:0 };

DCE.checkSkill = function(skillValue, skillName='Skill', bonusDice=0) {
  const roll = DCE.rollWithBonus(bonusDice);
  const fumbleThreshold = skillValue > 50 ? 100 : 96;
  let level;
  if      (roll >= fumbleThreshold)        level = DCE.SUCCESS.FUMBLE;
  else if (roll <= Math.floor(skillValue/5))  level = DCE.SUCCESS.EXTREME;
  else if (roll <= Math.floor(skillValue/2))  level = DCE.SUCCESS.HARD;
  else if (roll <= skillValue)             level = DCE.SUCCESS.REGULAR;
  else                                     level = DCE.SUCCESS.FAILURE;

  const labels = {[DCE.SUCCESS.EXTREME]:'Extreme Success',[DCE.SUCCESS.HARD]:'Hard Success',
    [DCE.SUCCESS.REGULAR]:'Regular Success',[DCE.SUCCESS.FAILURE]:'Failure',[DCE.SUCCESS.FUMBLE]:'Fumble'};
  return { skill: skillName, value: skillValue, roll, level,
    isSuccess: level >= DCE.SUCCESS.REGULAR,
    label: labels[level],
    toString() { return `${skillName} (${skillValue}%) → ${roll} — ${labels[level]}`; }
  };
};

DCE.sanityCheck = function(investigator, failDice='1d6', successDice='1') {
  const result = DCE.checkSkill(investigator.currentSan, 'Sanity');
  const dice = result.isSuccess ? successDice : failDice;
  const lost = DCE.parseDice(dice);
  investigator.currentSan = Math.max(0, investigator.currentSan - lost);
  const msgs = [`Sanity check → ${result.roll} — ${result.label}. Lost ${lost} SAN. (${investigator.currentSan}/${investigator.maxSan})`];
  if (!result.isSuccess && lost >= 5) msgs.push('Temporary insanity!');
  return { result, lost, msgs };
};

// ---------------------------------------------------------------------------
// BASE_SKILLS
// ---------------------------------------------------------------------------
DCE.BASE_SKILLS = {
  'Accounting':25,'Anthropology':1,'Appraise':5,'Archaeology':1,
  'Art & Craft':5,'Charm':15,'Climb':20,'Credit Rating':0,
  'Cthulhu Mythos':0,'Disguise':5,'Dodge':0,'Drive Auto':20,
  'Elec Repair':10,'Fast Talk':5,'Fighting':25,'Firearms':20,
  'First Aid':30,'History':5,'Intimidate':15,'Jump':20,
  'Language (Own)':0,'Law':5,'Library Use':20,'Listen':20,
  'Locksmith':1,'Mech Repair':10,'Medicine':1,'Natural World':10,
  'Navigate':10,'Occult':5,'Op Hv Machine':1,'Persuade':10,
  'Pilot':1,'Psychology':10,'Psychoanalysis':1,'Ride':5,
  'Science':1,'Sleight of Hand':10,'Spot Hidden':25,'Stealth':20,
  'Survival':10,'Swim':20,'Throw':20,'Track':10,
};

// ---------------------------------------------------------------------------
// Investigator
// ---------------------------------------------------------------------------
DCE.Investigator = class {
  constructor(data) {
    this.name            = data.name || 'Unknown';
    this.occupation      = data.occupation || '';
    this.characteristics = Object.assign({STR:50,CON:50,SIZ:50,DEX:50,APP:50,INT:50,POW:50,EDU:50}, data.characteristics||{});
    this.skills          = Object.assign({}, DCE.BASE_SKILLS, data.skills||{});
    // Adjust dodge base to DEX/2
    this.skills['Dodge'] = data.skills && data.skills['Dodge'] != null
      ? data.skills['Dodge'] : Math.floor(this.characteristics.DEX/2);
    this.skills['Language (Own)'] = this.characteristics.EDU;
    this._computeDerived();
    if (data.currentHp  != null) this.currentHp  = data.currentHp;
    if (data.currentSan != null) this.currentSan = data.currentSan;
    if (data.currentMp  != null) this.currentMp  = data.currentMp;
    if (data.luck       != null) this.luck        = data.luck;
    this.inventory = data.inventory || [];
    this.flags     = data.flags     || {};
    this.cash      = data.cash      || 0;
  }

  _computeDerived() {
    const c = this.characteristics;
    this.maxHp  = Math.floor((c.CON+c.SIZ)/10);
    this.maxMp  = Math.floor(c.POW/5);
    this.maxSan = c.POW;
    this.currentHp  = this.maxHp;
    this.currentSan = this.maxSan;
    this.currentMp  = this.maxMp;
    this.luck = DCE.d(6,3)*5;
    const build = Math.floor((c.STR+c.SIZ)/25) - 2;
    this.build = Math.max(-2, Math.min(2, build));
    const dbTable = [[-Infinity,-1,'−1d4'],[-1,0,'0'],[0,1,'1d4'],[1,2,'1d6']];
    this.damageBonus = build <= -2 ? '−1d6' : build === -1 ? '−1d4' : build === 0 ? '0' : build === 1 ? '+1d4' : '+1d6';
    this.move = c.DEX < c.SIZ && c.STR < c.SIZ ? 7 : c.DEX > c.SIZ && c.STR > c.SIZ ? 9 : 8;
  }

  rollSkill(skillName, bonusDice=0) {
    return DCE.checkSkill(this.skills[skillName] || 1, skillName, bonusDice);
  }

  rollSanity(failDice='1d6', successDice='1') {
    return DCE.sanityCheck(this, failDice, successDice);
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    return [`Took ${amount} damage. HP: ${this.currentHp}/${this.maxHp}`];
  }

  heal(amount) {
    const before = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    return this.currentHp - before;
  }

  hasItem(name) { return this.inventory.includes(name); }
  addItem(name) { if (!this.inventory.includes(name)) this.inventory.push(name); }
  removeItem(name) {
    const i = this.inventory.indexOf(name);
    if (i >= 0) { this.inventory.splice(i,1); return true; }
    return false;
  }

  hasFlag(key) { return !!this.flags[key]; }
  setFlag(key, val=true) { this.flags[key] = val; }

  toDict() {
    return { name:this.name, occupation:this.occupation,
      characteristics:this.characteristics, skills:this.skills,
      currentHp:this.currentHp, currentSan:this.currentSan,
      currentMp:this.currentMp, luck:this.luck,
      inventory:this.inventory, flags:this.flags, cash:this.cash };
  }

  static fromDict(d) { return new DCE.Investigator(d); }
};

// ---------------------------------------------------------------------------
// Pre-made investigators
// ---------------------------------------------------------------------------
DCE.PREMADE_DATA = {
  doctor: {
    name:'Dr. Alice Hayes', occupation:'Doctor of Medicine',
    characteristics:{STR:50,CON:60,SIZ:50,DEX:55,APP:65,INT:75,POW:60,EDU:85},
    skills:{'Medicine':70,'First Aid':60,'Psychology':60,'Science':50,'Persuade':45,'Spot Hidden':50,'Library Use':55,'Occult':25},
  },
  professor: {
    name:'Prof. Harold Webb', occupation:'Professor of History',
    characteristics:{STR:45,CON:50,SIZ:55,DEX:50,APP:55,INT:85,POW:65,EDU:90},
    skills:{'History':75,'Library Use':75,'Occult':50,'Archaeology':45,'Language (Own)':90,'Persuade':50,'Psychology':45,'Spot Hidden':45},
  },
  reporter: {
    name:'Rita Caldwell', occupation:'Journalist',
    characteristics:{STR:50,CON:55,SIZ:50,DEX:65,APP:70,INT:70,POW:55,EDU:65},
    skills:{'Persuade':65,'Spot Hidden':60,'Fast Talk':55,'Listen':55,'Psychology':50,'Library Use':45,'Stealth':40,'Drive Auto':50},
  },
  detective: {
    name:'Jack Malone', occupation:'Private Detective',
    characteristics:{STR:65,CON:60,SIZ:60,DEX:65,APP:55,INT:65,POW:55,EDU:65},
    skills:{'Spot Hidden':65,'Track':50,'Fighting':55,'Firearms':50,'Intimidate':50,'Psychology':45,'Listen':55,'Stealth':45},
  },
};

DCE.buildPremade = function(key) {
  const data = DCE.PREMADE_DATA[key];
  if (!data) throw new Error('Unknown premade: '+key);
  return new DCE.Investigator(JSON.parse(JSON.stringify(data)));
};

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
DCE.Combatant = class {
  constructor(data) {
    this.name        = data.name || 'Enemy';
    this.hp          = data.hp   || 10;
    this.maxHp       = data.hp   || 10;
    this.attackSkill = data.attackSkill || 30;
    this.damageDice  = data.damageDice  || '1d6';
    this.dodgeSkill  = data.dodgeSkill  || 0;
    this.armor       = data.armor       || 0;
    this.sanLoss     = data.sanLoss     || '0/1d3';
    this.isNpc       = true;
  }
};

DCE.resolveCombat = function(investigator, enemy) {
  const msgs = [];
  // Investigator attacks
  const atkResult = DCE.checkSkill(investigator.skills['Fighting']||25, 'Fighting');
  msgs.push(atkResult.toString());
  if (atkResult.isSuccess) {
    let dmg = DCE.parseDice(investigator.damageBonus==='0' || !investigator.damageBonus ? '1d3' : '1d3');
    if (atkResult.level >= DCE.SUCCESS.EXTREME) dmg *= 2;
    dmg = Math.max(1, dmg - enemy.armor);
    enemy.hp -= dmg;
    msgs.push(`Hit for ${dmg} damage! Enemy HP: ${enemy.hp}/${enemy.maxHp}`);
  } else {
    msgs.push('Miss!');
  }
  // Enemy counter-attacks if alive
  if (enemy.hp > 0) {
    const eAtk = DCE.checkSkill(enemy.attackSkill, enemy.name+' attacks');
    msgs.push(eAtk.toString());
    if (eAtk.isSuccess) {
      let edmg = DCE.parseDice(enemy.damageDice);
      const dmgMsgs = investigator.takeDamage(edmg);
      msgs.push(...dmgMsgs);
    } else {
      msgs.push(enemy.name+' misses!');
    }
  }
  return msgs;
};
