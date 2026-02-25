// main.js – Launcher and screen manager
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.App = class {
  constructor() {
    this.canvas  = document.getElementById('main-canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.palette = DCE.currentPalette;
    this.screen  = 'menu';   // menu | char_select | game | map_ed | sprite_ed | dialogue_ed | palette_ed
    this.gameRenderer    = null;
    this.editorInstance  = null;

    this._menuSelected = 0;
    this._charSelected = 0;
    this._menuItems = [
      {label:'Play Demo',          action:'char_select'},
      {label:'Continue Game',      action:'continue',   cond:()=>DCE.GameState.hasSave()},
      {label:'Map Editor',         action:'map_ed'},
      {label:'Sprite / Art Editor',action:'sprite_ed'},
      {label:'Dialogue Editor',    action:'dialogue_ed'},
      {label:'Palette Chooser',    action:'palette_ed'},
    ];
    this._premades = ['doctor','professor','reporter','detective'];
    this._premadeLabels = [
      ['Dr. Alice Hayes',   'Doctor',   'Medicine 70, First Aid 60'],
      ['Prof. Harold Webb', 'Professor','Library Use 75, Occult 50'],
      ['Rita Caldwell',     'Reporter', 'Persuade 65, Spot Hidden 60'],
      ['Jack Malone',       'Detective','Spot Hidden 65, Fighting 55'],
    ];

    this._raf = null;
    this._bind();
    this._scheduleRender();
  }

  // ---- Input ---------------------------------------------------------------
  _bind() {
    window.addEventListener('keydown', e => {
      if (this.screen === 'menu')        this._menuKey(e);
      else if (this.screen === 'char_select') this._charKey(e);
      // game/editor screens handle their own input
    });
    this.canvas.addEventListener('click', e => {
      const [mx,my] = this._pos(e);
      if (this.screen === 'menu')        this._menuClick(mx,my);
      else if (this.screen === 'char_select') this._charClick(mx,my);
    });
    this.canvas.addEventListener('mousemove', e => {
      if (this.screen !== 'menu' && this.screen !== 'char_select') return;
      const [mx,my] = this._pos(e);
      if (this.screen === 'menu')   this._menuHover(mx,my);
      if (this.screen === 'char_select') this._charHover(mx,my);
    });
    // Allow canvas to receive keyboard events
    this.canvas.setAttribute('tabindex','0');
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width/r.width, sy = this.canvas.height/r.height;
    return [(e.clientX-r.left)*sx, (e.clientY-r.top)*sy];
  }

  // ---- Navigation ----------------------------------------------------------
  _visibleMenuItems() { return this._menuItems.filter(m=>!m.cond||m.cond()); }

  _menuKey(e) {
    const items = this._visibleMenuItems();
    if (e.key==='ArrowUp'||e.key==='w') this._menuSelected=Math.max(0,this._menuSelected-1);
    else if (e.key==='ArrowDown'||e.key==='s') this._menuSelected=Math.min(items.length-1,this._menuSelected+1);
    else if (e.key==='Enter'||e.key===' ') this._menuActivate(items[this._menuSelected]);
    this._scheduleRender();
  }

  _menuHover(mx,my) {
    const items=this._visibleMenuItems();
    const cx=this.canvas.width/2, startY=200, gap=52;
    items.forEach((item,i)=>{
      const by=startY+i*gap;
      if (my>=by-4&&my<by+36&&Math.abs(mx-cx)<160) { if (this._menuSelected!==i) { this._menuSelected=i; this._scheduleRender(); } }
    });
  }

  _menuClick(mx,my) {
    const items=this._visibleMenuItems();
    const cx=this.canvas.width/2, startY=200, gap=52;
    items.forEach((item,i)=>{
      const by=startY+i*gap;
      if (my>=by-4&&my<by+36&&Math.abs(mx-cx)<160) this._menuActivate(item);
    });
  }

  _menuActivate(item) {
    if (!item) return;
    if (item.action==='char_select') { this.screen='char_select'; this._scheduleRender(); }
    else if (item.action==='continue') this._continueGame();
    else if (item.action==='map_ed')       this._openEditor('map');
    else if (item.action==='sprite_ed')    this._openEditor('sprite');
    else if (item.action==='dialogue_ed')  this._openEditor('dialogue');
    else if (item.action==='palette_ed')   this._openEditor('palette');
  }

  _charKey(e) {
    if (e.key==='ArrowLeft'||e.key==='a') this._charSelected=Math.max(0,this._charSelected-1);
    else if (e.key==='ArrowRight'||e.key==='d') this._charSelected=Math.min(this._premades.length-1,this._charSelected+1);
    else if (e.key==='Enter'||e.key===' ') this._startGame(this._premades[this._charSelected]);
    else if (e.key==='Escape') { this.screen='menu'; this._scheduleRender(); }
    this._scheduleRender();
  }

  _charHover(mx,my) {
    const cw=230, gap=20, total=this._premades.length*(cw+gap)-gap;
    const startX=(this.canvas.width-total)/2;
    this._premades.forEach((_,i)=>{
      const rx=startX+i*(cw+gap);
      if (mx>=rx&&mx<rx+cw&&my>=130&&my<460) {
        if (this._charSelected!==i) { this._charSelected=i; this._scheduleRender(); }
      }
    });
  }

  _charClick(mx,my) {
    const cw=230, gap=20, total=this._premades.length*(cw+gap)-gap;
    const startX=(this.canvas.width-total)/2;
    this._premades.forEach((key,i)=>{
      const rx=startX+i*(cw+gap);
      if (mx>=rx&&mx<rx+cw&&my>=130&&my<460) {
        if (i===this._charSelected) this._startGame(key);
        else { this._charSelected=i; this._scheduleRender(); }
      }
    });
  }

  // ---- Game ---------------------------------------------------------------
  _startGame(premadeKey) {
    const manor_map = DCE.registerDemoContent();
    const investigator = DCE.buildPremade(premadeKey);
    const state = new DCE.GameState(investigator, 'intro');
    state.currentMap = manor_map;
    const [px,py] = manor_map.playerStart();
    state.playerX=px; state.playerY=py;
    manor_map.revealRadius(px,py,5);
    state.enterScene('intro');

    this.screen='game';
    // Resize canvas for game (1280×720)
    this.canvas.width=1280; this.canvas.height=720;
    this.gameRenderer = new DCE.GameRenderer(this.canvas, state, this.palette);
    this.gameRenderer.onReturnToMenu = ()=>this._returnToMenu();
    this.gameRenderer.run();
    // Stop our own render loop since renderer takes over
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf=null; }
  }

  _continueGame() {
    const state = DCE.GameState.load();
    if (!state) return;
    DCE.registerDemoContent();
    this.screen='game';
    this.canvas.width=1280; this.canvas.height=720;
    this.gameRenderer = new DCE.GameRenderer(this.canvas, state, this.palette);
    this.gameRenderer.onReturnToMenu = ()=>this._returnToMenu();
    this.gameRenderer.run();
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf=null; }
  }

  _returnToMenu() {
    if (this.gameRenderer) { this.gameRenderer.stop(); this.gameRenderer=null; }
    if (this.editorInstance) { this.editorInstance=null; }
    this.screen='menu';
    this.canvas.width=1280; this.canvas.height=720;
    this._scheduleRender();
    this.canvas.focus();
  }

  // ---- Editors ------------------------------------------------------------
  _openEditor(type) {
    this.screen=type+'_ed';
    this.canvas.width=1280; this.canvas.height=720;

    if (type==='map') {
      this.editorInstance=new DCE.MapEditor(this.canvas, this.palette);
    } else if (type==='sprite') {
      this.editorInstance=new DCE.SpriteEditor(this.canvas, this.palette);
    } else if (type==='dialogue') {
      this.editorInstance=new DCE.DialogueEditor(this.canvas, this.palette);
    } else if (type==='palette') {
      this.canvas.width=740; this.canvas.height=580;
      this.editorInstance=new DCE.PaletteChooser(this.canvas, this.palette);
      this.editorInstance.onChange = p => { this.palette=p; DCE.currentPalette=p; };
    }

    // Editors handle their own render loop.
    // Add an Escape handler to return to menu.
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf=null; }
    const escListener = e => {
      if (e.key==='Escape') {
        window.removeEventListener('keydown', escListener);
        this._returnToMenu();
      }
    };
    window.addEventListener('keydown', escListener);
  }

  // ---- Menu render --------------------------------------------------------
  _scheduleRender() {
    if (this.screen==='game'||this.screen.endsWith('_ed')) return;
    if (!this._raf) this._raf=requestAnimationFrame(()=>{ this._raf=null; this._render(); });
  }

  _render() {
    if (this.screen==='game'||this.screen.endsWith('_ed')) return;
    if (this.screen==='menu')        this._renderMenu();
    else if (this.screen==='char_select') this._renderCharSelect();
  }

  _renderMenu() {
    const ctx=this.ctx, p=this.palette, W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    // Scanlines
    ctx.fillStyle='rgba(0,0,0,0.1)';
    for (let y=0;y<H;y+=2) ctx.fillRect(0,y,W,1);

    // Title
    ctx.fillStyle=p.fg; ctx.font='bold 32px monospace';
    const title='DUNGEON CRAWL ENGINE';
    ctx.fillText(title, W/2-ctx.measureText(title).width/2, 80);

    ctx.fillStyle=p.blend(0.5); ctx.font='14px monospace';
    const sub='Call of Cthulhu 7e  ·  Two-Color Pixel Art';
    ctx.fillText(sub, W/2-ctx.measureText(sub).width/2, 112);

    ctx.strokeStyle=p.blend(0.25); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(80,132); ctx.lineTo(W-80,132); ctx.stroke();

    const items=this._visibleMenuItems();
    const cx=W/2, startY=200, gap=52;
    items.forEach((item,i)=>{
      const isSel=i===this._menuSelected;
      const by=startY+i*gap;
      if (isSel) {
        ctx.fillStyle=p.blend(0.1); ctx.fillRect(cx-160,by-4,320,38);
        ctx.strokeStyle=p.fg; ctx.lineWidth=1; ctx.strokeRect(cx-160,by-4,320,38);
      }
      ctx.fillStyle=isSel?p.fg:p.blend(0.7);
      ctx.font=`${isSel?'bold ':''  }18px monospace`;
      const lw=ctx.measureText(item.label).width;
      ctx.fillText(item.label,cx-lw/2,by+26);
    });

    ctx.fillStyle=p.blend(0.3); ctx.font='11px monospace';
    const hint='↑↓ / mouse  ·  Enter / click to select  ·  Esc to go back';
    ctx.fillText(hint,W/2-ctx.measureText(hint).width/2,H-24);
  }

  _renderCharSelect() {
    const ctx=this.ctx, p=this.palette, W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    ctx.fillStyle='rgba(0,0,0,0.1)';
    for (let y=0;y<H;y+=2) ctx.fillRect(0,y,W,1);

    ctx.fillStyle=p.fg; ctx.font='bold 24px monospace';
    const title='THE BLACKWOOD MANOR AFFAIR';
    ctx.fillText(title,W/2-ctx.measureText(title).width/2,50);
    ctx.fillStyle=p.blend(0.5); ctx.font='13px monospace';
    const sub='Choose Your Investigator  |  Arkham, Massachusetts — October 1926';
    ctx.fillText(sub,W/2-ctx.measureText(sub).width/2,78);
    ctx.strokeStyle=p.blend(0.25); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(60,96); ctx.lineTo(W-60,96); ctx.stroke();

    const cw=230, ch=340, gap=20, total=this._premades.length*(cw+gap)-gap;
    const startX=(W-total)/2;
    this._premades.forEach((key,i)=>{
      const inv=DCE.buildPremade(key);
      const isSel=i===this._charSelected;
      const rx=startX+i*(cw+gap), ry=120;

      ctx.fillStyle=p.blend(isSel?0.12:0.06); ctx.fillRect(rx,ry,cw,ch);
      ctx.strokeStyle=isSel?p.fg:p.blend(0.3); ctx.lineWidth=isSel?2:1;
      ctx.strokeRect(rx+0.5,ry+0.5,cw-1,ch-1);

      // Portrait area
      ctx.fillStyle=p.blend(0.08); ctx.fillRect(rx+10,ry+10,cw-20,100);
      ctx.strokeStyle=p.blend(0.25); ctx.strokeRect(rx+10,ry+10,cw-20,100);
      ctx.fillStyle=p.blend(0.5); ctx.font='13px monospace';
      ctx.fillText(key.toUpperCase(),rx+cw/2-ctx.measureText(key.toUpperCase()).width/2,ry+65);

      // Name + occupation
      const [name,occ,skills]=this._premadeLabels[i];
      ctx.fillStyle=isSel?p.fg:p.blend(0.8); ctx.font=`bold 13px monospace`;
      // Wrap name
      const words=name.split(' ');
      const line1=words.slice(0,2).join(' '), line2=words.slice(2).join(' ');
      ctx.fillText(line1,rx+8,ry+126);
      if(line2){ctx.fillText(line2,rx+8,ry+142);}
      ctx.fillStyle=p.blend(0.5); ctx.font='11px monospace';
      ctx.fillText(occ,rx+8,ry+(line2?158:144));

      // Stats
      const chars=inv.characteristics;
      let sy2=ry+(line2?175:162);
      for (const [k,v] of [['STR',chars.STR],['CON',chars.CON],['SIZ',chars.SIZ],['DEX',chars.DEX],['INT',chars.INT],['POW',chars.POW],['EDU',chars.EDU],['APP',chars.APP]]) {
        ctx.fillStyle=p.blend(0.6); ctx.font='10px monospace'; ctx.fillText(`${k}:${v}`,rx+8+(([0,1,2,3].includes(['STR','CON','SIZ','DEX','INT','POW','EDU','APP'].indexOf(k)))?0:110),sy2);
        if(['CON','DEX','POW','APP'].includes(k)) sy2+=14;
      }
      sy2+=4;
      ctx.strokeStyle=p.blend(0.2); ctx.beginPath(); ctx.moveTo(rx+8,sy2); ctx.lineTo(rx+cw-8,sy2); ctx.stroke(); sy2+=8;
      ctx.fillStyle=p.blend(0.45); ctx.font='10px monospace';
      for (const chunk of [skills.slice(0,28),skills.slice(28)]) {
        if(chunk){ctx.fillText(chunk,rx+8,sy2);sy2+=13;}
      }
    });

    ctx.fillStyle=p.blend(0.35); ctx.font='12px monospace';
    const hint='← → or mouse to select  |  Enter or click to confirm  |  Esc to go back';
    ctx.fillText(hint,W/2-ctx.measureText(hint).width/2,H-24);
  }
};

// Boot when DOM is ready
window.addEventListener('load', ()=>{
  window.dceApp = new DCE.App();
});
