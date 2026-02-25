// sprite_editor.js – 2-bit pixel art editor
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.SpriteEditor = class {
  constructor(canvas, palette) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.palette  = palette || DCE.currentPalette;

    this.sprite   = DCE.Sprite.blank('new_sprite', 32, 32, 4);
    this.frameIdx = 0;
    this.zoom     = 12;
    this.tool     = 'pencil';  // pencil | eraser | fill
    this.undoStack= [];
    this.redoStack= [];

    this.SIDEBAR_W = 160;
    this.PREVIEW_W = 180;
    this.isDrawing = false;

    this._bind();
    this._scheduleRender();
  }

  get frame() { return this.sprite.frames[this.frameIdx]; }

  _canvasXY(mx, my) {
    const offX = this.SIDEBAR_W + 10;
    const offY = 40;
    const tx = Math.floor((mx - offX) / this.zoom);
    const ty = Math.floor((my - offY) / this.zoom);
    return [tx, ty];
  }

  _saveUndo() {
    this.undoStack.push(this.frame.clone());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  _floodFill(x, y, targetVal, fillVal) {
    if (x<0||y<0||x>=this.sprite.width||y>=this.sprite.height) return;
    if (this.frame.getPixel(x,y)!==targetVal) return;
    if (targetVal===fillVal) return;
    const stack=[[x,y]];
    while (stack.length) {
      const [cx,cy]=stack.pop();
      if (cx<0||cy<0||cx>=this.sprite.width||cy>=this.sprite.height) continue;
      if (this.frame.getPixel(cx,cy)!==targetVal) continue;
      this.frame.setPixel(cx,cy,fillVal);
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }

  _paint(mx, my, isErase) {
    const [tx,ty] = this._canvasXY(mx,my);
    if (tx<0||ty<0||tx>=this.sprite.width||ty>=this.sprite.height) return;
    if (this.tool==='fill') {
      this._saveUndo();
      const target=this.frame.getPixel(tx,ty);
      this._floodFill(tx,ty,target,isErase?0:1);
    } else {
      this.frame.setPixel(tx,ty,isErase||this.tool==='eraser'?0:1);
    }
    this._scheduleRender();
  }

  _bind() {
    this.canvas.setAttribute('tabindex','0');
    this.canvas.focus();

    this.canvas.addEventListener('mousedown', e => {
      const [mx,my]=this._pos(e);
      if (mx<this.SIDEBAR_W) { this._sidebarClick(mx,my); return; }
      this._saveUndo();
      this.isDrawing=true;
      this._paint(mx,my,e.button===2);
    });
    this.canvas.addEventListener('mousemove', e => {
      if (!this.isDrawing) return;
      const [mx,my]=this._pos(e);
      this._paint(mx,my,e.buttons===2);
    });
    this.canvas.addEventListener('mouseup', ()=>this.isDrawing=false);
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());

    this.canvas.addEventListener('keydown', e => {
      const ctrl=e.ctrlKey||e.metaKey;
      e.preventDefault();
      if (e.key==='p'||e.key==='P') { this.tool='pencil'; this._scheduleRender(); }
      if (e.key==='e'||e.key==='E') { this.tool='eraser'; this._scheduleRender(); }
      if (e.key==='f'||e.key==='F') { this.tool='fill';   this._scheduleRender(); }
      if (e.key==='+') { this.zoom=Math.min(24,this.zoom+2); this._scheduleRender(); }
      if (e.key==='-') { this.zoom=Math.max(4,this.zoom-2);  this._scheduleRender(); }
      if (e.key==='n'||e.key==='N') { this.sprite.addFrame(); this.frameIdx=this.sprite.frames.length-1; this._scheduleRender(); }
      if (e.key===',') { this.frameIdx=Math.max(0,this.frameIdx-1); this._scheduleRender(); }
      if (e.key==='.') { this.frameIdx=Math.min(this.sprite.frames.length-1,this.frameIdx+1); this._scheduleRender(); }
      if (ctrl&&e.key==='z') { if (this.undoStack.length) { this.redoStack.push(this.frame.clone()); this.sprite.frames[this.frameIdx]=this.undoStack.pop(); this._scheduleRender(); } }
      if (ctrl&&e.key==='y') { if (this.redoStack.length) { this.undoStack.push(this.frame.clone()); this.sprite.frames[this.frameIdx]=this.redoStack.pop(); this._scheduleRender(); } }
      if (ctrl&&e.key==='s') this._saveFile();
      if (ctrl&&e.key==='o') this._loadFile();
    });
  }

  _pos(e) {
    const r=this.canvas.getBoundingClientRect();
    const sx=this.canvas.width/r.width, sy=this.canvas.height/r.height;
    return [(e.clientX-r.left)*sx,(e.clientY-r.top)*sy];
  }

  _sidebarClick(mx,my) {
    const tools=[['pencil',40],['eraser',70],['fill',100]];
    for (const [t,ry] of tools) { if (my>=ry&&my<ry+24) { this.tool=t; this._scheduleRender(); return; } }
    if (my>=140&&my<164) { this.zoom=Math.min(24,this.zoom+2); this._scheduleRender(); }
    if (my>=168&&my<192) { this.zoom=Math.max(4,this.zoom-2);  this._scheduleRender(); }
    if (my>=210&&my<234) { this.sprite.addFrame(); this.frameIdx=this.sprite.frames.length-1; this._scheduleRender(); }
    if (my>=238&&my<262) { this.frameIdx=Math.max(0,this.frameIdx-1); this._scheduleRender(); }
    if (my>=266&&my<290) { this.frameIdx=Math.min(this.sprite.frames.length-1,this.frameIdx+1); this._scheduleRender(); }
    if (my>=310&&my<334) this._saveFile();
    if (my>=338&&my<362) this._loadFile();
  }

  _saveFile() {
    const blob=new Blob([this.sprite.toJSON()],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=(this.sprite.id||'sprite')+'.json'; a.click();
  }

  _loadFile() {
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      const reader=new FileReader();
      reader.onload=ev=>{ this.sprite=DCE.Sprite.fromJSON(ev.target.result); this.frameIdx=0; this._scheduleRender(); };
      reader.readAsText(f);
    };
    inp.click();
  }

  _scheduleRender() {
    if (!this._raf) this._raf=requestAnimationFrame(()=>{ this._raf=null; this._render(); });
  }

  _render() {
    const ctx=this.ctx, p=this.palette;
    const W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    // ---- Sidebar ----
    ctx.fillStyle=p.blend(0.06); ctx.fillRect(0,0,this.SIDEBAR_W,H);
    ctx.strokeStyle=p.blend(0.2); ctx.lineWidth=1; ctx.strokeRect(0,0,this.SIDEBAR_W,H);

    const tools=[['pencil',40,'P - Pencil'],['eraser',70,'E - Eraser'],['fill',100,'F - Fill']];
    for (const [t,ty,label] of tools) {
      const sel=this.tool===t;
      if(sel){ctx.fillStyle=p.blend(0.2);ctx.fillRect(4,ty,this.SIDEBAR_W-8,24);}
      ctx.strokeStyle=p.blend(0.35);ctx.strokeRect(4,ty,this.SIDEBAR_W-8,24);
      ctx.fillStyle=sel?p.fg:p.blend(0.65); ctx.font='11px monospace'; ctx.fillText(label,10,ty+16);
    }
    const btns=[
      [140,'+ Zoom',''],
      [168,'- Zoom',''],
      [210,'New Frame','N'],
      [238,'< Prev','<'],
      [266,'> Next','>'],
      [310,'Save (S)',''],
      [338,'Open (O)',''],
    ];
    for (const [ty,label] of btns) {
      ctx.strokeStyle=p.blend(0.3); ctx.strokeRect(4,ty,this.SIDEBAR_W-8,24);
      ctx.fillStyle=p.blend(0.6); ctx.font='11px monospace'; ctx.fillText(label,10,ty+16);
    }
    ctx.fillStyle=p.blend(0.4); ctx.font='10px monospace';
    ctx.fillText(`Frame ${this.frameIdx+1}/${this.sprite.frames.length}`,8,300);
    ctx.fillText(`Zoom: ${this.zoom}x`,8,128);

    // ---- Canvas ----
    const offX=this.SIDEBAR_W+10, offY=40;
    const cw=this.sprite.width*this.zoom, ch=this.sprite.height*this.zoom;

    // Background checkerboard
    for (let y=0;y<this.sprite.height;y++) {
      for (let x=0;x<this.sprite.width;x++) {
        ctx.fillStyle=(x+y)%2===0?p.blend(0.08):p.blend(0.04);
        ctx.fillRect(offX+x*this.zoom,offY+y*this.zoom,this.zoom,this.zoom);
      }
    }
    // Pixels
    for (let y=0;y<this.sprite.height;y++) {
      for (let x=0;x<this.sprite.width;x++) {
        if (this.frame.getPixel(x,y)) {
          ctx.fillStyle=p.fg;
          ctx.fillRect(offX+x*this.zoom,offY+y*this.zoom,this.zoom,this.zoom);
        }
      }
    }
    // Grid
    ctx.strokeStyle=p.blend(0.1); ctx.lineWidth=0.5;
    for (let x=0;x<=this.sprite.width;x++) {
      ctx.beginPath(); ctx.moveTo(offX+x*this.zoom,offY); ctx.lineTo(offX+x*this.zoom,offY+ch); ctx.stroke();
    }
    for (let y=0;y<=this.sprite.height;y++) {
      ctx.beginPath(); ctx.moveTo(offX,offY+y*this.zoom); ctx.lineTo(offX+cw,offY+y*this.zoom); ctx.stroke();
    }
    ctx.strokeStyle=p.blend(0.5); ctx.lineWidth=1.5;
    ctx.strokeRect(offX-1,offY-1,cw+2,ch+2);

    // ---- Preview ----
    const preX=offX+cw+20, preY=offY;
    ctx.fillStyle=p.blend(0.05); ctx.fillRect(preX,preY,this.sprite.width*4,this.sprite.height*4);
    ctx.strokeStyle=p.blend(0.3); ctx.strokeRect(preX,preY,this.sprite.width*4,this.sprite.height*4);
    ctx.fillStyle=p.blend(0.45); ctx.font='10px monospace'; ctx.fillText('PREVIEW 4x',preX,preY-6);
    for (let y=0;y<this.sprite.height;y++) {
      for (let x=0;x<this.sprite.width;x++) {
        ctx.fillStyle=this.frame.getPixel(x,y)?p.fg:p.bg;
        ctx.fillRect(preX+x*4,preY+y*4,4,4);
      }
    }

    // Top bar
    ctx.fillStyle=p.blend(0.08); ctx.fillRect(this.SIDEBAR_W,0,W-this.SIDEBAR_W,32);
    ctx.fillStyle=p.fg; ctx.font='12px monospace';
    ctx.fillText(`Sprite Editor | ${this.sprite.id} | ${this.sprite.width}×${this.sprite.height} | tool:${this.tool} | zoom:${this.zoom}x`,this.SIDEBAR_W+8,20);
  }
};
