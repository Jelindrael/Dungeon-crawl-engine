// renderer.js – Canvas-based game renderer (Cyclopean-style layout)
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

// ---------------------------------------------------------------------------
// Layout constants (1280 × 720)
// ---------------------------------------------------------------------------
const W = 1280, H = 720;
const BANNER   = {x:0,   y:0,   w:1280, h:60};
const LEFT     = {x:0,   y:60,  w:200,  h:660};
const VIEWPORT = {x:200, y:60,  w:920,  h:420};
const LOG      = {x:200, y:480, w:920,  h:240};
const RIGHT    = {x:1120,y:60,  w:160,  h:660};
const TILE_SZ  = 20;

const MENU_BUTTONS = [
  {label:'Character', key:'c'},
  {label:'Inventory', key:'i'},
  {label:'Skills',    key:'k'},
  {label:'Map',       key:'x'},
  {label:'Save',      key:'F5'},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function strokeRect(ctx, x, y, w, h, color, lw=1) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
}
function drawText(ctx, text, x, y, color, size=13, bold=false) {
  ctx.fillStyle = color;
  ctx.font = `${bold?'bold ':''}${size}px monospace`;
  ctx.fillText(text, x, y);
}
function drawTextRight(ctx, text, rx, y, color, size=13) {
  ctx.fillStyle = color; ctx.font = `${size}px monospace`;
  const w = ctx.measureText(text).width;
  ctx.fillText(text, rx-w, y);
}
function wrapText(ctx, text, maxWidth, size=12) {
  // Returns array of lines
  ctx.font = `${size}px monospace`;
  const charW = ctx.measureText('M').width;
  const charsPerLine = Math.max(1, Math.floor(maxWidth/charW));
  const lines = [];
  for (const para of text.split('\n')) {
    if (para === '') { lines.push(''); continue; }
    let pos = 0;
    while (pos < para.length) {
      lines.push(para.slice(pos, pos+charsPerLine));
      pos += charsPerLine;
    }
  }
  return lines;
}
function drawBar(ctx, x, y, w, h, value, maxVal, fgColor, bgColor) {
  fillRect(ctx, x, y, w, h, bgColor);
  const filled = maxVal > 0 ? Math.round(w * value/maxVal) : 0;
  fillRect(ctx, x, y, filled, h, fgColor);
  strokeRect(ctx, x, y, w, h, fgColor);
}
function drawScanlines(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let sy=y; sy<y+h; sy+=2) ctx.fillRect(x, sy, w, 1);
}

// ---------------------------------------------------------------------------
// Tile drawing
// ---------------------------------------------------------------------------
function drawTile(ctx, tileId, px, py, sz, palette, revealed=true) {
  const td = DCE.TILE_DEFS[tileId] || DCE.TILE_DEFS[0];
  if (!revealed) { fillRect(ctx, px, py, sz, sz, palette.bg); return; }
  const art = td.art;
  const fg = palette.fg, bg = palette.bg, dim = palette.dim, mid = palette.mid;

  if (art === 'WALL') {
    fillRect(ctx, px, py, sz, sz, dim);
    fillRect(ctx, px+2, py+2, sz-4, sz-4, bg);
  } else if (art === 'FLOOR') {
    fillRect(ctx, px, py, sz, sz, bg);
    ctx.fillStyle = palette.blend(0.12);
    ctx.fillRect(px+1, py+1, 1, 1); ctx.fillRect(px+sz-2, py+1, 1, 1);
    ctx.fillRect(px+1, py+sz-2, 1, 1); ctx.fillRect(px+sz-2, py+sz-2, 1, 1);
  } else if (art === 'DOOR') {
    fillRect(ctx, px, py, sz, sz, bg);
    const my = py+Math.floor(sz/2);
    ctx.strokeStyle=fg; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(px, my); ctx.lineTo(px+sz, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+Math.floor(sz/2), py); ctx.lineTo(px+Math.floor(sz/2), py+sz); ctx.stroke();
  } else if (art === 'STAIRS') {
    fillRect(ctx, px, py, sz, sz, bg);
    drawText(ctx, td.glyph||'>', px+3, py+sz-4, fg, sz-4);
  } else if (art === 'WATER') {
    for (let wy=py; wy<py+sz; wy++) {
      for (let wx=px; wx<px+sz; wx++) {
        ctx.fillStyle = (wx+wy)%3===0 ? palette.blend(0.6) : bg;
        ctx.fillRect(wx, wy, 1, 1);
      }
    }
  } else if (art === 'CHEST') {
    fillRect(ctx, px, py, sz, sz, bg);
    strokeRect(ctx, px+3, py+4, sz-6, sz-8, fg);
    ctx.strokeStyle=fg; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px+3, py+Math.floor(sz/2)); ctx.lineTo(px+sz-3, py+Math.floor(sz/2)); ctx.stroke();
  } else if (art === 'PILLAR') {
    fillRect(ctx, px, py, sz, sz, bg);
    fillRect(ctx, px+Math.floor(sz*0.25), py+Math.floor(sz*0.1), Math.floor(sz*0.5), Math.floor(sz*0.8), dim);
  } else if (art === 'FIRE') {
    fillRect(ctx, px, py, sz, sz, bg);
    drawText(ctx, '¥', px+3, py+sz-3, palette.blend(0.9), sz-4, true);
  } else if (art === 'SPECIAL') {
    fillRect(ctx, px, py, sz, sz, bg);
    drawText(ctx, td.glyph||'?', px+2, py+sz-3, fg, sz-3, true);
  } else {
    fillRect(ctx, px, py, sz, sz, bg);
  }
}

// ---------------------------------------------------------------------------
// GameRenderer
// ---------------------------------------------------------------------------
DCE.GameRenderer = class {
  constructor(canvas, gameState, palette) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.state     = gameState;
    this.palette   = palette || DCE.currentPalette;
    this._overlay  = null;    // 'character'|'inventory'|'skills'|'map'
    this._running  = false;
    this._raf      = null;
    this._logScroll= 0;

    canvas.width  = W;
    canvas.height = H;
    canvas.style.imageRendering = 'pixelated';

    this._bindInput();
    gameState.onUpdate = () => this._scheduleRender();
  }

  // ---- Input ---------------------------------------------------------------
  _bindInput() {
    this.canvas.setAttribute('tabindex','0');
    this.canvas.focus();

    this.canvas.addEventListener('keydown', e => {
      e.preventDefault();
      this._onKey(e.key, e.code);
    });
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = W / rect.width, scaleY = H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top)  * scaleY;
      this._onClick(x, y);
    });
    // Re-focus on click
    this.canvas.addEventListener('mousedown', () => this.canvas.focus());
  }

  _onKey(key) {
    const st = this.state, mode = st.mode;

    if (mode === DCE.Mode.MAP) {
      const moves = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],
        w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
      if (moves[key]) { st.movePlayer(...moves[key]); return; }
    }

    if (mode === DCE.Mode.SCENE || mode === DCE.Mode.MAP) {
      if (key >= '1' && key <= '9') {
        const scene = st.currentScene();
        if (scene) {
          const choices = scene.availableChoices(st.investigator);
          st.processChoice(parseInt(key)-1);
          return;
        }
      }
    }
    if (mode === DCE.Mode.DIALOGUE) {
      if (key >= '1' && key <= '9') { st.processDialogueChoice(parseInt(key)-1); return; }
    }
    if (mode === DCE.Mode.COMBAT) {
      if (key === 'a' || key === 'A' || key === '1') { st.combatAttack(); return; }
      if (key === 'f' || key === 'F' || key === '2') { st.combatFlee(); return; }
    }
    if (mode === DCE.Mode.GAME_OVER || mode === DCE.Mode.VICTORY) {
      if (key === 'Enter' || key === ' ') {
        if (this.onReturnToMenu) this.onReturnToMenu();
        return;
      }
    }

    // Overlays
    if (key === 'c' || key === 'C') { this._toggleOverlay('character'); return; }
    if (key === 'i' || key === 'I') { this._toggleOverlay('inventory'); return; }
    if (key === 'k' || key === 'K') { this._toggleOverlay('skills');    return; }
    if (key === 'x' || key === 'X') { this._toggleOverlay('map');       return; }
    if (key === 'Escape')           { this._overlay = null; this._scheduleRender(); return; }
    if (key === 'F5') { st.save(); return; }
  }

  _onClick(x, y) {
    const st = this.state;

    // Right panel buttons
    if (x >= RIGHT.x && x < RIGHT.x+RIGHT.w && y >= RIGHT.y) {
      const btnY = RIGHT.y + 10;
      const btnH = 38, btnGap = 6;
      MENU_BUTTONS.forEach((btn, i) => {
        const by = btnY + i*(btnH+btnGap);
        if (y >= by && y < by+btnH) {
          if (btn.key === 'F5') { st.save(); return; }
          this._toggleOverlay(btn.key === 'c' ? 'character' :
            btn.key === 'i' ? 'inventory' : btn.key === 'k' ? 'skills' : 'map');
        }
      });

      // D-pad
      const dpadCx = RIGHT.x + RIGHT.w/2, dpadCy = RIGHT.y + 420;
      const dpadSz = 36, dpadGap = 2;
      const dpadHits = [
        [dpadCx-dpadSz/2, dpadCy-dpadSz-dpadGap, dpadSz, dpadSz, 0,-1],
        [dpadCx-dpadSz/2, dpadCy+dpadGap,         dpadSz, dpadSz, 0, 1],
        [dpadCx-dpadSz-dpadGap, dpadCy-dpadSz/2,  dpadSz, dpadSz,-1, 0],
        [dpadCx+dpadGap,         dpadCy-dpadSz/2, dpadSz, dpadSz, 1, 0],
      ];
      for (const [bx,by,bw,bh,dx,dy] of dpadHits) {
        if (x>=bx && x<bx+bw && y>=by && y<by+bh) { st.movePlayer(dx,dy); return; }
      }
    }

    // Log choices (click on choice text)
    if (x >= LOG.x && x < LOG.x+LOG.w && y >= LOG.y) {
      const mode = st.mode;
      if (mode === DCE.Mode.SCENE || mode === DCE.Mode.MAP) {
        const scene = st.currentScene();
        if (scene) {
          const choices = scene.availableChoices(st.investigator);
          const choiceY = LOG.y + LOG.h - choices.length*20 - 10;
          choices.forEach((c, i) => {
            const cy = choiceY + i*20;
            if (y >= cy && y < cy+20) st.processChoice(i);
          });
        }
      } else if (mode === DCE.Mode.DIALOGUE && st.currentNode) {
        const choices = st.currentNode.availableChoices(st.investigator);
        const choiceY = LOG.y + LOG.h - choices.length*20 - 10;
        choices.forEach((c, i) => {
          const cy = choiceY + i*20;
          if (y >= cy && y < cy+20) st.processDialogueChoice(i);
        });
      } else if (mode === DCE.Mode.COMBAT) {
        const choiceY = LOG.y + LOG.h - 2*20 - 10;
        if (y >= choiceY && y < choiceY+20) st.combatAttack();
        if (y >= choiceY+20 && y < choiceY+40) st.combatFlee();
      }
    }
  }

  _toggleOverlay(name) {
    this._overlay = (this._overlay === name) ? null : name;
    this._scheduleRender();
  }

  // ---- Render scheduling --------------------------------------------------
  _scheduleRender() {
    if (!this._raf) this._raf = requestAnimationFrame(()=>{ this._raf=null; this.render(); });
  }

  run() { this._running=true; this._scheduleRender(); }
  stop() { this._running=false; if(this._raf){cancelAnimationFrame(this._raf);this._raf=null;} }

  // ---- Master render ------------------------------------------------------
  render() {
    const ctx = this.ctx, p = this.palette;
    ctx.clearRect(0,0,W,H);

    this._drawBanner();
    this._drawLeft();
    this._drawViewport();
    this._drawLog();
    this._drawRight();

    // Scanlines overlay
    drawScanlines(ctx, 0, 0, W, H);

    // Overlay panel
    if (this._overlay) this._drawOverlay();
  }

  // ---- Banner -------------------------------------------------------------
  _drawBanner() {
    const ctx=this.ctx, p=this.palette;
    fillRect(ctx, BANNER.x, BANNER.y, BANNER.w, BANNER.h, p.bg);

    // Dither strips
    for (let x=0; x<200; x++) {
      ctx.fillStyle = ((x+0)%4 < 2) ? p.blend(0.4) : p.bg;
      ctx.fillRect(x, 0, 1, 60);
    }
    for (let x=0; x<200; x++) {
      ctx.fillStyle = ((x+0)%4 < 2) ? p.blend(0.4) : p.bg;
      ctx.fillRect(W-200+x, 0, 1, 60);
    }

    const st = this.state;
    const title = 'DUNGEON CRAWL ENGINE';
    ctx.fillStyle = p.fg; ctx.font = 'bold 22px monospace';
    const tw = ctx.measureText(title).width;
    ctx.fillText(title, W/2-tw/2, 24);

    const scene = st.currentScene();
    const sub = scene ? scene.title : '';
    ctx.fillStyle = p.blend(0.6); ctx.font = '13px monospace';
    const sw = ctx.measureText(sub).width;
    ctx.fillText(sub, W/2-sw/2, 46);

    // HP/SAN mini
    const inv = st.investigator;
    drawText(ctx, `HP ${inv.currentHp}/${inv.maxHp}  SAN ${inv.currentSan}/${inv.maxSan}`,
      W-260, 38, p.blend(0.7), 12);
  }

  // ---- Left panel ---------------------------------------------------------
  _drawLeft() {
    const ctx=this.ctx, p=this.palette;
    fillRect(ctx, LEFT.x, LEFT.y, LEFT.w, LEFT.h, p.bg);
    strokeRect(ctx, LEFT.x, LEFT.y, LEFT.w, LEFT.h, p.blend(0.25));

    const inv = this.state.investigator;
    let y = LEFT.y + 12;
    const x = 8;

    drawText(ctx, inv.name, x, y, p.fg, 12, true); y += 16;
    drawText(ctx, inv.occupation||'', x, y, p.blend(0.5), 11); y += 18;

    // HP bar
    drawText(ctx, 'HP', x, y, p.blend(0.6), 11); y += 14;
    drawBar(ctx, x, y, LEFT.w-16, 8, inv.currentHp, inv.maxHp, p.blend(0.9), p.blend(0.15)); y += 14;

    // SAN bar
    drawText(ctx, 'SAN', x, y, p.blend(0.6), 11); y += 14;
    drawBar(ctx, x, y, LEFT.w-16, 8, inv.currentSan, inv.maxSan, p.blend(0.7), p.blend(0.15)); y += 14;

    // MP bar
    drawText(ctx, 'MP', x, y, p.blend(0.6), 11); y += 14;
    drawBar(ctx, x, y, LEFT.w-16, 8, inv.currentMp, inv.maxMp, p.blend(0.5), p.blend(0.15)); y += 18;

    strokeRect(ctx, x, y, LEFT.w-16, 1, p.blend(0.2));
    y += 8;

    // Characteristics
    const chars = inv.characteristics;
    const charList = [['STR',chars.STR],['CON',chars.CON],['SIZ',chars.SIZ],['DEX',chars.DEX]];
    for (const [k,v] of charList) {
      drawText(ctx, k, x, y, p.blend(0.55), 11);
      drawTextRight(ctx, String(v), LEFT.w-8, y, p.blend(0.8), 11);
      y += 14;
    }
    y += 4;

    // Inventory
    strokeRect(ctx, x, y, LEFT.w-16, 1, p.blend(0.2)); y += 8;
    drawText(ctx, 'ITEMS', x, y, p.blend(0.5), 11, true); y += 14;
    for (const item of inv.inventory.slice(0,8)) {
      drawText(ctx, '· '+item.slice(0,18), x, y, p.blend(0.7), 10); y += 13;
    }
    if (inv.inventory.length > 8) drawText(ctx, `  +${inv.inventory.length-8} more`, x, y, p.blend(0.4), 10);

    // Mode indicator
    const modeStr = { scene:'SCENE', map:'EXPLORE', dialogue:'TALKING',
      combat:'COMBAT!', game_over:'GAME OVER', victory:'VICTORY' }[this.state.mode] || '';
    const modeY = LEFT.y + LEFT.h - 20;
    const modeW = ctx.measureText(modeStr).width + 12;
    fillRect(ctx, x, modeY-12, modeW, 16, p.blend(this.state.mode==='combat'?0.3:0.1));
    drawText(ctx, modeStr, x+6, modeY, this.state.mode==='combat'?p.fg:p.blend(0.6), 11, true);
  }

  // ---- Viewport -----------------------------------------------------------
  _drawViewport() {
    const ctx=this.ctx, p=this.palette, st=this.state;
    fillRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h, p.bg);
    strokeRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h, p.blend(0.2));

    if (st.mode === DCE.Mode.MAP && st.currentMap) {
      this._drawTileMap();
    } else if (st.mode === DCE.Mode.COMBAT) {
      this._drawCombatView();
    } else {
      this._drawSceneView();
    }
  }

  _drawTileMap() {
    const ctx=this.ctx, p=this.palette, st=this.state, map=st.currentMap;
    const tilesW = Math.floor(VIEWPORT.w/TILE_SZ);
    const tilesH = Math.floor(VIEWPORT.h/TILE_SZ);
    const camX = Math.max(0, Math.min(map.width-tilesW,  st.playerX - Math.floor(tilesW/2)));
    const camY = Math.max(0, Math.min(map.height-tilesH, st.playerY - Math.floor(tilesH/2)));

    ctx.save();
    ctx.beginPath();
    ctx.rect(VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h);
    ctx.clip();

    for (let ty=0; ty<tilesH+1; ty++) {
      for (let tx=0; tx<tilesW+1; tx++) {
        const mx=camX+tx, my=camY+ty;
        const px = VIEWPORT.x + tx*TILE_SZ, py = VIEWPORT.y + ty*TILE_SZ;
        const rev = map.revealed[my]?.[mx] ?? false;
        drawTile(ctx, map.get(mx,my), px, py, TILE_SZ, p, rev);
      }
    }

    // Entities
    for (const e of map.entities) {
      if (!map.revealed[e.y]?.[e.x]) continue;
      const px=VIEWPORT.x+(e.x-camX)*TILE_SZ, py=VIEWPORT.y+(e.y-camY)*TILE_SZ;
      if (px<VIEWPORT.x||py<VIEWPORT.y||px>=VIEWPORT.x+VIEWPORT.w||py>=VIEWPORT.y+VIEWPORT.h) continue;
      const ecols = {player_start:'#00FF50',npc:'#FFCC00',item:'#00CCFF',trigger:'#CC00CC'};
      const ecol = ecols[e.entityType] || p.fg;
      // Diamond marker
      ctx.fillStyle = ecol;
      ctx.beginPath();
      const cx=px+TILE_SZ/2, cy=py+TILE_SZ/2, sz=5;
      ctx.moveTo(cx,cy-sz); ctx.lineTo(cx+sz,cy); ctx.lineTo(cx,cy+sz); ctx.lineTo(cx-sz,cy);
      ctx.closePath(); ctx.fill();
    }

    // Player '@'
    const ppx = VIEWPORT.x + (st.playerX-camX)*TILE_SZ;
    const ppy = VIEWPORT.y + (st.playerY-camY)*TILE_SZ;
    fillRect(ctx, ppx, ppy, TILE_SZ, TILE_SZ, p.blend(0.15));
    ctx.fillStyle = p.fg; ctx.font = 'bold 14px monospace';
    ctx.fillText('@', ppx+3, ppy+TILE_SZ-3);

    ctx.restore();
  }

  _drawSceneView() {
    const ctx=this.ctx, p=this.palette, st=this.state;
    const scene = st.currentScene();
    if (!scene) return;

    fillRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h, p.bg);

    // Scene title bar
    fillRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, 30, p.blend(0.1));
    ctx.fillStyle = p.fg; ctx.font = 'bold 16px monospace';
    ctx.fillText(scene.title, VIEWPORT.x+12, VIEWPORT.y+20);

    // Description text
    const lines = wrapText(ctx, scene.description, VIEWPORT.w-24, 13);
    let ly = VIEWPORT.y + 50;
    for (const line of lines) {
      if (ly > VIEWPORT.y+VIEWPORT.h-10) break;
      drawText(ctx, line, VIEWPORT.x+12, ly, p.blend(0.8), 13);
      ly += 18;
    }
  }

  _drawCombatView() {
    const ctx=this.ctx, p=this.palette, st=this.state;
    fillRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, VIEWPORT.h, p.bg);

    // Title
    fillRect(ctx, VIEWPORT.x, VIEWPORT.y, VIEWPORT.w, 36, p.blend(0.15));
    ctx.fillStyle = p.fg; ctx.font = 'bold 18px monospace';
    ctx.fillText('⚔ COMBAT', VIEWPORT.x+12, VIEWPORT.y+24);

    let ey = VIEWPORT.y+60;
    for (const enemy of st.combatEnemies) {
      drawText(ctx, enemy.name, VIEWPORT.x+20, ey, p.fg, 14, true); ey += 20;
      drawText(ctx, `HP: ${enemy.hp}/${enemy.maxHp}`, VIEWPORT.x+20, ey, p.blend(0.7), 12); ey += 16;
      drawBar(ctx, VIEWPORT.x+20, ey, 200, 10, enemy.hp, enemy.maxHp, p.blend(0.8), p.blend(0.2)); ey += 24;
    }

    // Investigator HP
    const inv = st.investigator;
    ey = VIEWPORT.y + VIEWPORT.h - 60;
    drawText(ctx, `${inv.name}  HP ${inv.currentHp}/${inv.maxHp}`, VIEWPORT.x+20, ey, p.fg, 13); ey += 16;
    drawBar(ctx, VIEWPORT.x+20, ey, 300, 10, inv.currentHp, inv.maxHp, p.blend(0.9), p.blend(0.2));
  }

  // ---- Log ----------------------------------------------------------------
  _drawLog() {
    const ctx=this.ctx, p=this.palette, st=this.state;
    fillRect(ctx, LOG.x, LOG.y, LOG.w, LOG.h, p.bg);
    strokeRect(ctx, LOG.x, LOG.y, LOG.w, LOG.h, p.blend(0.2));

    // Header line
    strokeRect(ctx, LOG.x, LOG.y, LOG.w, 1, p.blend(0.3));

    const mode = st.mode;
    let choices = [];

    if (mode === DCE.Mode.SCENE || mode === DCE.Mode.MAP) {
      const scene = st.currentScene();
      if (scene) choices = scene.availableChoices(st.investigator);
    } else if (mode === DCE.Mode.DIALOGUE && st.currentNode) {
      const node = st.currentNode;
      // Show NPC text
      fillRect(ctx, LOG.x+4, LOG.y+4, LOG.w-8, 40, p.blend(0.06));
      drawText(ctx, `${node.speaker}:`, LOG.x+10, LOG.y+18, p.fg, 12, true);
      const tlines = wrapText(ctx, node.text, LOG.w-80, 12);
      tlines.slice(0,2).forEach((l,i) => drawText(ctx, l, LOG.x+10, LOG.y+30+i*14, p.blend(0.8), 12));
      choices = node.availableChoices(st.investigator);
    } else if (mode === DCE.Mode.COMBAT) {
      choices = [
        {text:'[1] Attack', _idx:0},
        {text:'[2] Flee', _idx:1},
      ];
    } else if (mode === DCE.Mode.GAME_OVER) {
      drawText(ctx, '━━━ GAME OVER ━━━', LOG.x+LOG.w/2-90, LOG.y+LOG.h/2-10, p.fg, 16, true);
      drawText(ctx, 'Press Enter to return to menu', LOG.x+LOG.w/2-130, LOG.y+LOG.h/2+14, p.blend(0.6), 13);
    } else if (mode === DCE.Mode.VICTORY) {
      drawText(ctx, '━━━ VICTORY ━━━', LOG.x+LOG.w/2-80, LOG.y+LOG.h/2-10, p.blend(0.9), 16, true);
      drawText(ctx, 'Press Enter to return to menu', LOG.x+LOG.w/2-130, LOG.y+LOG.h/2+14, p.blend(0.6), 13);
    }

    // Message log (recent messages)
    const logH = LOG.h - (choices.length > 0 ? choices.length*22+14 : 8) - (mode==='dialogue'?60:0);
    const logLines = wrapText(ctx, '', LOG.w-16, 12);
    const msgs = st.recentMessages(20);
    const allLines = [];
    for (const m of msgs) allLines.push(...wrapText(ctx, m, LOG.w-16, 12));
    const visLines = Math.floor(logH/15);
    const startLine = Math.max(0, allLines.length - visLines);
    let ly = LOG.y + (mode==='dialogue' ? 64 : 8);
    for (let i=startLine; i<allLines.length; i++) {
      const age = allLines.length - i;
      const alpha = age <= 3 ? 0.9 : age <= 8 ? 0.65 : 0.4;
      ctx.fillStyle = p.blend(alpha);
      ctx.font = '12px monospace';
      ctx.fillText(allLines[i], LOG.x+8, LOG.y + (mode==='dialogue' ? 64 : 8) + (i-startLine)*15);
      if (LOG.y+(mode==='dialogue'?64:8)+(i-startLine)*15 > LOG.y+logH+10) break;
    }

    // Choices
    if (choices.length > 0) {
      const choiceStartY = LOG.y + LOG.h - choices.length*22 - 8;
      strokeRect(ctx, LOG.x+4, choiceStartY-6, LOG.w-8, 1, p.blend(0.2));
      choices.forEach((c, i) => {
        const cy = choiceStartY + i*22;
        const text = `[${i+1}] ${c.text}`;
        // Hover highlight would need mouse tracking; just draw normally
        drawText(ctx, text, LOG.x+10, cy+15, p.blend(0.85), 12);
      });
    }
  }

  // ---- Right panel --------------------------------------------------------
  _drawRight() {
    const ctx=this.ctx, p=this.palette;
    fillRect(ctx, RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, p.bg);
    strokeRect(ctx, RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, p.blend(0.25));

    // Menu buttons
    const btnX = RIGHT.x+6, btnW = RIGHT.w-12, btnH=34, btnGap=5;
    MENU_BUTTONS.forEach((btn,i) => {
      const by = RIGHT.y+10 + i*(btnH+btnGap);
      fillRect(ctx, btnX, by, btnW, btnH, p.blend(0.08));
      strokeRect(ctx, btnX, by, btnW, btnH, p.blend(0.35));
      ctx.fillStyle = p.blend(0.75); ctx.font = '12px monospace';
      const tw = ctx.measureText(btn.label).width;
      ctx.fillText(btn.label, btnX+(btnW-tw)/2, by+22);
    });

    // D-pad
    const dpadCx = RIGHT.x + RIGHT.w/2;
    const dpadCy = RIGHT.y + 420;
    const sz=34, gap=3;
    const dirs = [
      [dpadCx-sz/2, dpadCy-sz-gap, sz, sz, '↑'],
      [dpadCx-sz/2, dpadCy+gap,    sz, sz, '↓'],
      [dpadCx-sz-gap, dpadCy-sz/2, sz, sz, '←'],
      [dpadCx+gap,    dpadCy-sz/2, sz, sz, '→'],
      [dpadCx-sz/2,   dpadCy-sz/2, sz, sz, '·'],
    ];
    for (const [dx,dy,dw,dh,lbl] of dirs) {
      fillRect(ctx, dx, dy, dw, dh, p.blend(0.1));
      strokeRect(ctx, dx, dy, dw, dh, p.blend(0.4));
      ctx.fillStyle = p.blend(0.7); ctx.font = 'bold 16px monospace';
      const tw=ctx.measureText(lbl).width;
      ctx.fillText(lbl, dx+(dw-tw)/2, dy+dh/2+6);
    }

    // Key hints
    let ky = dpadCy + sz + gap + 20;
    const hints = ['WASD/↑↓←→','move','1-9 choices','C char  I inv','K skills  X map','F5 save'];
    for (const h of hints) {
      drawText(ctx, h, RIGHT.x+4, ky, p.blend(0.3), 10);
      ky += 13;
    }
  }

  // ---- Overlays -----------------------------------------------------------
  _drawOverlay() {
    const ctx=this.ctx, p=this.palette, inv=this.state.investigator;
    const ox=200, oy=60, ow=720, oh=540;
    // Semi-transparent background
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.fillRect(ox,oy,ow,oh);
    strokeRect(ctx, ox, oy, ow, oh, p.fg, 2);

    const close = '[Esc] or same key to close';
    drawText(ctx, close, ox+ow-ctx.measureText(close).width-20, oy+20, p.blend(0.4), 11);

    if (this._overlay === 'character') {
      drawText(ctx, 'CHARACTER SHEET', ox+20, oy+30, p.fg, 18, true);
      let y=oy+60;
      drawText(ctx, `Name: ${inv.name}`, ox+20, y, p.blend(0.9), 14); y+=22;
      drawText(ctx, `Occupation: ${inv.occupation||'—'}`, ox+20, y, p.blend(0.7), 13); y+=22;
      drawText(ctx, `HP: ${inv.currentHp}/${inv.maxHp}  SAN: ${inv.currentSan}/${inv.maxSan}  MP: ${inv.currentMp}/${inv.maxMp}`, ox+20, y, p.blend(0.8), 13); y+=22;
      drawText(ctx, `Luck: ${inv.luck}  DMG Bonus: ${inv.damageBonus}  MOV: ${inv.move}`, ox+20, y, p.blend(0.7), 12); y+=28;
      // Characteristics grid
      const chars = inv.characteristics;
      const clist = Object.entries(chars);
      clist.forEach(([k,v],i) => {
        const cx = ox+20 + (i%4)*170, cy = y + Math.floor(i/4)*22;
        drawText(ctx, `${k}: ${v}`, cx, cy, p.blend(0.75), 13);
      });

    } else if (this._overlay === 'inventory') {
      drawText(ctx, 'INVENTORY', ox+20, oy+30, p.fg, 18, true);
      let y=oy+60;
      drawText(ctx, `Cash: $${inv.cash}`, ox+20, y, p.blend(0.7), 13); y+=24;
      if (inv.inventory.length === 0) {
        drawText(ctx, '(empty)', ox+30, y, p.blend(0.4), 13);
      } else {
        inv.inventory.forEach((item,i) => {
          drawText(ctx, `${i+1}. ${item}`, ox+30, y+i*20, p.blend(0.85), 13);
        });
      }

    } else if (this._overlay === 'skills') {
      drawText(ctx, 'SKILLS', ox+20, oy+30, p.fg, 18, true);
      const entries = Object.entries(inv.skills).sort((a,b)=>a[0].localeCompare(b[0]));
      const colW = 220;
      entries.forEach(([sk,val],i) => {
        const col = Math.floor(i/18), row = i%18;
        const sx=ox+20+col*colW, sy=oy+56+row*18;
        if (sx+colW > ox+ow-10) return;
        const bar = Math.round(val/100*60);
        fillRect(ctx, sx+130, sy-10, bar, 10, p.blend(0.3));
        strokeRect(ctx, sx+130, sy-10, 60, 10, p.blend(0.2));
        drawText(ctx, sk, sx, sy, p.blend(0.65), 11);
        drawTextRight(ctx, String(val)+'%', sx+128, sy, p.blend(0.85), 11);
      });

    } else if (this._overlay === 'map') {
      drawText(ctx, 'MAP', ox+20, oy+30, p.fg, 18, true);
      const map = this.state.currentMap;
      if (!map) { drawText(ctx,'No map loaded',ox+30,oy+70,p.blend(0.5),13); return; }
      const cellSz = Math.min(Math.floor((ow-40)/map.width), Math.floor((oh-60)/map.height), 12);
      const mx0 = ox+20, my0 = oy+50;
      for (let ty=0; ty<map.height; ty++) {
        for (let tx=0; tx<map.width; tx++) {
          if (!map.revealed[ty]?.[tx]) continue;
          const tile = map.get(tx,ty);
          const td = DCE.TILE_DEFS[tile]||DCE.TILE_DEFS[0];
          ctx.fillStyle = td.art==='WALL' ? p.blend(0.7) : td.art==='FLOOR' ? p.blend(0.15) : p.blend(0.4);
          ctx.fillRect(mx0+tx*cellSz, my0+ty*cellSz, cellSz, cellSz);
        }
      }
      // Player dot
      ctx.fillStyle = p.fg;
      ctx.fillRect(mx0+this.state.playerX*cellSz, my0+this.state.playerY*cellSz, cellSz, cellSz);
    }
  }
};
