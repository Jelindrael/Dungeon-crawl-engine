// map_editor.js – Tile map editor (runs on its own canvas)
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.MapEditor = class {
  constructor(canvas, palette) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.palette = palette || DCE.currentPalette;

    this.tilemap = DCE.TileMap.blank(20, 15, 'new_map');
    this.zoom    = 24;
    this.camX    = 40;
    this.camY    = 40;
    this.selectedTile = DCE.TILE.FLOOR;
    this.entityMode   = false;
    this.entityTypeIdx= 0;
    this.entityTypes  = ['player_start','npc','item','trigger'];

    this.isPainting = false;
    this.isPanning  = false;
    this.panStart   = null;
    this.camStart   = null;

    this.SIDEBAR_W  = 180;

    this._bind();
    this._scheduleRender();
  }

  // ---- Coordinate helpers -------------------------------------------------
  _tileAt(mx, my) {
    const tx = Math.floor((mx - this.SIDEBAR_W - this.camX) / this.zoom);
    const ty = Math.floor((my - this.camY) / this.zoom);
    return [tx, ty];
  }
  _tileRect(tx, ty) {
    return { x: this.SIDEBAR_W + this.camX + tx*this.zoom,
             y: this.camY + ty*this.zoom, w: this.zoom, h: this.zoom };
  }

  // ---- Events -------------------------------------------------------------
  _bind() {
    this.canvas.setAttribute('tabindex','0');
    this.canvas.focus();

    this.canvas.addEventListener('mousedown', e => {
      const [mx,my] = this._pos(e);
      if (e.button === 1) {
        this.isPanning=true; this.panStart=[mx,my]; this.camStart=[this.camX,this.camY];
      } else if (e.button === 0) {
        if (mx < this.SIDEBAR_W) { this._sidebarClick(mx,my); }
        else { this.isPainting=true; this._paint(mx,my,e.button); }
      } else if (e.button === 2) {
        this.isPainting=true; this._paint(mx,my,2);
      }
    });
    this.canvas.addEventListener('mousemove', e => {
      const [mx,my] = this._pos(e);
      if (this.isPanning) {
        this.camX = this.camStart[0]+(mx-this.panStart[0]);
        this.camY = this.camStart[1]+(my-this.panStart[1]);
        this._scheduleRender();
      } else if (this.isPainting) {
        const btn = e.buttons&1 ? 0 : e.buttons&2 ? 2 : -1;
        if (btn >= 0) this._paint(mx,my,btn);
      }
    });
    this.canvas.addEventListener('mouseup', e => {
      if (e.button===1) this.isPanning=false;
      else { this.isPainting=false; }
    });
    this.canvas.addEventListener('contextmenu', e=>e.preventDefault());
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zLevels=[8,12,16,20,24,32,40];
      const ci=zLevels.indexOf(this.zoom);
      const ni=Math.max(0,Math.min(zLevels.length-1,ci+(e.deltaY<0?1:-1)));
      this.zoom=zLevels[ni]; this._scheduleRender();
    });
    this.canvas.addEventListener('keydown', e => {
      e.preventDefault();
      const ctrl = e.ctrlKey||e.metaKey;
      if (e.key==='+' || e.key==='=') { this.zoom=Math.min(40,this.zoom+4); this._scheduleRender(); }
      if (e.key==='-') { this.zoom=Math.max(8,this.zoom-4); this._scheduleRender(); }
      if (e.key==='e' || e.key==='E') { this.entityMode=!this.entityMode; this._scheduleRender(); }
      if (e.key==='Delete' && this.entityMode) { this._deleteEntityAtMouse(); }
      if (ctrl && e.key==='s') this._saveFile();
      if (ctrl && e.key==='o') this._loadFile();
      if (ctrl && e.key==='n') { this.tilemap=DCE.TileMap.blank(20,15,'new_map'); this._scheduleRender(); }
    });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width/r.width, sy = this.canvas.height/r.height;
    return [(e.clientX-r.left)*sx, (e.clientY-r.top)*sy];
  }

  _paint(mx, my, btn) {
    const [tx,ty] = this._tileAt(mx,my);
    if (tx<0||ty<0||tx>=this.tilemap.width||ty>=this.tilemap.height) return;
    if (this.entityMode && btn===0) {
      const etype = this.entityTypes[this.entityTypeIdx];
      if (etype==='player_start') this.tilemap.entities=this.tilemap.entities.filter(e=>e.entityType!=='player_start');
      const eid=`${etype}_${tx}_${ty}`;
      if (!this.tilemap.entities.find(e=>e.x===tx&&e.y===ty&&e.entityType===etype))
        this.tilemap.entities.push(new DCE.MapEntity(etype,eid,tx,ty));
    } else {
      this.tilemap.set(tx,ty, btn===2?DCE.TILE.FLOOR:this.selectedTile);
    }
    this._scheduleRender();
  }

  _sidebarClick(mx,my) {
    const p = this.palette;
    const TILE_PALETTE = Object.entries(DCE.TILE_DEFS).map(([id,td])=>[parseInt(id),td.name]);
    const startY=20, rowH=24;
    const tilePaletteH=TILE_PALETTE.length*rowH+30;
    // Tile section
    for (let i=0;i<TILE_PALETTE.length;i++) {
      const ry=startY+20+i*rowH;
      if (my>=ry && my<ry+rowH) {
        this.selectedTile=TILE_PALETTE[i][0]; this.entityMode=false; this._scheduleRender(); return;
      }
    }
    // Entity section
    const entStart=startY+tilePaletteH+10;
    for (let i=0;i<this.entityTypes.length;i++) {
      const ry=entStart+20+i*rowH;
      if (my>=ry && my<ry+rowH) {
        this.entityTypeIdx=i; this.entityMode=true; this._scheduleRender(); return;
      }
    }
  }

  _deleteEntityAtMouse() {
    // Approximate — use last known mouse pos; simplify by checking center
  }

  // ---- File I/O -----------------------------------------------------------
  _saveFile() {
    const json = this.tilemap.toJSON();
    const blob = new Blob([json], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (this.tilemap.name||'map')+'.json';
    a.click();
  }

  _loadFile() {
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.json';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => { this.tilemap=DCE.TileMap.fromJSON(ev.target.result); this._scheduleRender(); };
      reader.readAsText(f);
    };
    inp.click();
  }

  // ---- Render -------------------------------------------------------------
  _scheduleRender() {
    if (!this._raf) this._raf = requestAnimationFrame(()=>{ this._raf=null; this._render(); });
  }

  _tileColor(tileId) {
    const p=this.palette;
    const blendMap={0:0.1,1:0.9,2:0.55,3:0.38,4:0.75,5:0.75,6:0.45,7:0.65,8:0.85,9:1.0,10:0,11:0.7};
    return p.blend(blendMap[tileId]??0.5);
  }

  _render() {
    const ctx=this.ctx, p=this.palette;
    const W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    // ---- Sidebar ----
    ctx.fillStyle=p.blend(0.06); ctx.fillRect(0,0,this.SIDEBAR_W,H);
    ctx.strokeStyle=p.blend(0.2); ctx.lineWidth=1; ctx.strokeRect(0,0,this.SIDEBAR_W,H);

    const TILE_PALETTE=Object.entries(DCE.TILE_DEFS).map(([id,td])=>[parseInt(id),td.name]);
    let sy=20;
    ctx.fillStyle=p.fg; ctx.font='bold 12px monospace'; ctx.fillText('TILES',8,sy+12); sy+=24;
    for (const [tid,tname] of TILE_PALETTE) {
      const sel=(!this.entityMode)&&(this.selectedTile===tid);
      if (sel) { ctx.fillStyle=p.blend(0.2); ctx.fillRect(4,sy,this.SIDEBAR_W-8,22); }
      ctx.fillStyle=this._tileColor(tid); ctx.fillRect(8,sy+3,14,14);
      ctx.strokeStyle=p.blend(0.4); ctx.lineWidth=1; ctx.strokeRect(8,sy+3,14,14);
      ctx.fillStyle=sel?p.fg:p.blend(0.7); ctx.font='11px monospace';
      ctx.fillText(tname,28,sy+15); sy+=24;
    }
    sy+=8;
    ctx.fillStyle=p.fg; ctx.font='bold 12px monospace'; ctx.fillText('ENTITIES',8,sy+12); sy+=24;
    for (let i=0;i<this.entityTypes.length;i++) {
      const sel=this.entityMode&&(this.entityTypeIdx===i);
      const etype=this.entityTypes[i];
      if (sel) { ctx.fillStyle=p.blend(0.2); ctx.fillRect(4,sy,this.SIDEBAR_W-8,22); }
      const ecols={player_start:'#00FF50',npc:'#FFCC00',item:'#00CCFF',trigger:'#CC00CC'};
      ctx.fillStyle=ecols[etype]||p.fg; ctx.fillRect(8,sy+5,10,10);
      ctx.fillStyle=sel?p.fg:p.blend(0.65); ctx.font='11px monospace';
      ctx.fillText(etype,24,sy+15); sy+=24;
    }
    // Hints
    sy+=10;
    for (const h of ['Scroll:zoom','Mid-drag:pan','RClick:erase','E:entity','Ctrl+S:save','Ctrl+O:load','Ctrl+N:new']) {
      ctx.fillStyle=p.blend(0.3); ctx.font='10px monospace'; ctx.fillText(h,8,sy+10); sy+=13;
    }

    // ---- Canvas area ----
    const cx0=this.SIDEBAR_W;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx0,0,W-cx0,H); ctx.clip();

    // Dot grid
    ctx.fillStyle=p.blend(0.06);
    const gs=40;
    for (let gx=(this.camX%gs); gx<W-cx0; gx+=gs)
      for (let gy=(this.camY%gs); gy<H; gy+=gs)
        ctx.fillRect(cx0+gx,gy,1,1);

    // Tiles
    for (let ty=0;ty<this.tilemap.height;ty++) {
      for (let tx=0;tx<this.tilemap.width;tx++) {
        const r=this._tileRect(tx,ty);
        if (r.x+r.w<cx0||r.y+r.h<0||r.x>W||r.y>H) continue;
        ctx.fillStyle=this._tileColor(this.tilemap.get(tx,ty));
        ctx.fillRect(r.x,r.y,r.w,r.h);
        // Grid line
        ctx.strokeStyle=p.blend(0.08); ctx.lineWidth=1;
        ctx.strokeRect(r.x+0.5,r.y+0.5,r.w-1,r.h-1);
        if (this.zoom>=16) {
          const glyph=DCE.TILE_DEFS[this.tilemap.get(tx,ty)]?.glyph||'';
          ctx.fillStyle=p.blend(0.3); ctx.font=`${Math.floor(this.zoom*0.6)}px monospace`;
          ctx.fillText(glyph,r.x+3,r.y+r.h-4);
        }
      }
    }

    // Entities
    for (const e of this.tilemap.entities) {
      const r=this._tileRect(e.x,e.y);
      const ecols={player_start:'#00FF50',npc:'#FFCC00',item:'#00CCFF',trigger:'#CC00CC'};
      ctx.fillStyle=ecols[e.entityType]||this.palette.fg;
      const cx2=r.x+r.w/2, cy2=r.y+r.h/2, sz=Math.max(4,this.zoom/4);
      ctx.beginPath(); ctx.moveTo(cx2,cy2-sz); ctx.lineTo(cx2+sz,cy2);
      ctx.lineTo(cx2,cy2+sz); ctx.lineTo(cx2-sz,cy2); ctx.closePath(); ctx.fill();
    }

    // Map border
    const mr=this._tileRect(0,0);
    ctx.strokeStyle=p.blend(0.5); ctx.lineWidth=2;
    ctx.strokeRect(mr.x-1,mr.y-1,this.tilemap.width*this.zoom+2,this.tilemap.height*this.zoom+2);

    ctx.restore();

    // Top bar
    ctx.fillStyle=p.blend(0.08); ctx.fillRect(cx0,0,W-cx0,28);
    ctx.fillStyle=p.fg; ctx.font='12px monospace';
    const mode=this.entityMode?`ENTITY:${this.entityTypes[this.entityTypeIdx]}`:`TILE:${DCE.TILE_DEFS[this.selectedTile]?.name||'?'}`;
    ctx.fillText(`Map Editor | ${this.tilemap.name} | ${mode} | zoom:${this.zoom}px | ${this.tilemap.width}×${this.tilemap.height}`, cx0+8, 18);
  }
};
