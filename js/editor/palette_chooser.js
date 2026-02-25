// palette_chooser.js – Two-color palette chooser
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.PaletteChooser = class {
  constructor(canvas, currentPalette) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.palette  = currentPalette || DCE.currentPalette;

    // Custom sliders
    this.customBgR = DCE.hexToRgb(this.palette.bgHex)[0];
    this.customBgG = DCE.hexToRgb(this.palette.bgHex)[1];
    this.customBgB = DCE.hexToRgb(this.palette.bgHex)[2];
    this.customFgR = DCE.hexToRgb(this.palette.fgHex)[0];
    this.customFgG = DCE.hexToRgb(this.palette.fgHex)[1];
    this.customFgB = DCE.hexToRgb(this.palette.fgHex)[2];

    this._dragging = null;  // {channel, sliderX, sliderW}
    this._bind();
    this._scheduleRender();
  }

  _apply() {
    const bg = DCE.rgbToHex(this.customBgR, this.customBgG, this.customBgB);
    const fg = DCE.rgbToHex(this.customFgR, this.customFgG, this.customFgB);
    this.palette = new DCE.Palette(bg, fg, 'Custom');
    DCE.currentPalette = this.palette;
    if (this.onChange) this.onChange(this.palette);
    this._scheduleRender();
  }

  _selectPreset(key) {
    const p = DCE.PRESETS[key];
    this.palette = p;
    DCE.currentPalette = p;
    const [r1,g1,b1] = DCE.hexToRgb(p.bgHex);
    const [r2,g2,b2] = DCE.hexToRgb(p.fgHex);
    this.customBgR=r1; this.customBgG=g1; this.customBgB=b1;
    this.customFgR=r2; this.customFgG=g2; this.customFgB=b2;
    if (this.onChange) this.onChange(this.palette);
    this._scheduleRender();
  }

  _sliderInfo() {
    const W=this.canvas.width;
    const sx=60, sw=W-200, sy0=280;
    return [
      {ch:'Bg R', y:sy0+0,   val:this.customBgR, set:v=>{this.customBgR=v;}, sx, sw},
      {ch:'Bg G', y:sy0+30,  val:this.customBgG, set:v=>{this.customBgG=v;}, sx, sw},
      {ch:'Bg B', y:sy0+60,  val:this.customBgB, set:v=>{this.customBgB=v;}, sx, sw},
      {ch:'Fg R', y:sy0+110, val:this.customFgR, set:v=>{this.customFgR=v;}, sx, sw},
      {ch:'Fg G', y:sy0+140, val:this.customFgG, set:v=>{this.customFgG=v;}, sx, sw},
      {ch:'Fg B', y:sy0+170, val:this.customFgB, set:v=>{this.customFgB=v;}, sx, sw},
    ];
  }

  _bind() {
    this.canvas.setAttribute('tabindex','0');
    this.canvas.addEventListener('mousedown', e => {
      const [mx,my]=this._pos(e);
      // Preset swatches
      this._presetHit(mx,my);
      // Sliders
      for (const sl of this._sliderInfo()) {
        if (my>=sl.y-10&&my<sl.y+18&&mx>=sl.sx&&mx<sl.sx+sl.sw) {
          this._dragging=sl;
          const v=Math.round(Math.max(0,Math.min(255,(mx-sl.sx)/sl.sw*255)));
          sl.set(v); this._apply();
        }
      }
    });
    this.canvas.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      const [mx]=this._pos(e);
      const sl=this._dragging;
      const v=Math.round(Math.max(0,Math.min(255,(mx-sl.sx)/sl.sw*255)));
      sl.set(v); this._apply();
    });
    this.canvas.addEventListener('mouseup', ()=>this._dragging=null);
  }

  _pos(e) {
    const r=this.canvas.getBoundingClientRect();
    const sx=this.canvas.width/r.width, sy=this.canvas.height/r.height;
    return [(e.clientX-r.left)*sx,(e.clientY-r.top)*sy];
  }

  _presetHit(mx,my) {
    const presets=Object.keys(DCE.PRESETS);
    const sw=140, sh=54, gap=12, startX=20, startY=60;
    const cols=4;
    presets.forEach((key,i) => {
      const col=i%cols, row=Math.floor(i/cols);
      const rx=startX+col*(sw+gap), ry=startY+row*(sh+gap);
      if (mx>=rx&&mx<rx+sw&&my>=ry&&my<ry+sh) this._selectPreset(key);
    });
  }

  _scheduleRender() {
    if (!this._raf) this._raf=requestAnimationFrame(()=>{ this._raf=null; this._render(); });
  }

  _render() {
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    const p=this.palette;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    // Title
    ctx.fillStyle=p.fg; ctx.font='bold 18px monospace';
    ctx.fillText('PALETTE CHOOSER',20,36);

    // Preset swatches
    const presets=Object.keys(DCE.PRESETS);
    const sw=140, sh=54, gap=12, startX=20, startY=60;
    const cols=4;
    presets.forEach((key,i) => {
      const pp=DCE.PRESETS[key];
      const col=i%cols, row=Math.floor(i/cols);
      const rx=startX+col*(sw+gap), ry=startY+row*(sh+gap);

      ctx.fillStyle=pp.bg; ctx.fillRect(rx,ry,sw,sh);
      ctx.fillStyle=pp.fg; ctx.fillRect(rx,ry,sw/2,sh);

      // Name
      ctx.fillStyle=pp.fg; ctx.font='11px monospace';
      ctx.fillText(pp.name,rx+4,ry+sh-6);

      // Selection border
      if (pp.bgHex===p.bgHex&&pp.fgHex===p.fgHex) {
        ctx.strokeStyle='#FFFF60'; ctx.lineWidth=2;
        ctx.strokeRect(rx+1,ry+1,sw-2,sh-2);
      } else {
        ctx.strokeStyle=p.blend(0.3); ctx.lineWidth=1;
        ctx.strokeRect(rx+0.5,ry+0.5,sw-1,sh-1);
      }
    });

    // Custom sliders section
    const sectionY=260;
    ctx.fillStyle=p.blend(0.5); ctx.font='bold 13px monospace';
    ctx.fillText('CUSTOM',20,sectionY);
    ctx.strokeStyle=p.blend(0.2); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(20,sectionY+6); ctx.lineTo(W-20,sectionY+6); ctx.stroke();

    for (const sl of this._sliderInfo()) {
      // Label
      ctx.fillStyle=p.blend(0.6); ctx.font='11px monospace'; ctx.fillText(sl.ch,20,sl.y+12);
      // Track
      ctx.fillStyle=p.blend(0.15); ctx.fillRect(sl.sx,sl.y,sl.sw,12);
      ctx.strokeStyle=p.blend(0.3); ctx.strokeRect(sl.sx,sl.y,sl.sw,12);
      // Thumb
      const tx=sl.sx+sl.val/255*sl.sw;
      ctx.fillStyle=p.fg; ctx.fillRect(tx-4,sl.y-2,8,16);
      // Value
      ctx.fillStyle=p.blend(0.7); ctx.font='11px monospace';
      ctx.fillText(String(sl.val),sl.sx+sl.sw+8,sl.y+12);
    }

    // Preview
    const preX=20, preY=470, preW=300, preH=80;
    ctx.fillStyle=p.bg; ctx.fillRect(preX,preY,preW/2,preH);
    ctx.fillStyle=p.fg; ctx.fillRect(preX+preW/2,preY,preW/2,preH);
    ctx.fillStyle=p.fg; ctx.font='12px monospace'; ctx.fillText('BG: '+p.bgHex,preX+8,preY+20);
    ctx.fillStyle=p.bg; ctx.font='12px monospace'; ctx.fillText('FG: '+p.fgHex,preX+preW/2+8,preY+20);
    ctx.fillStyle=p.fg; ctx.fillText('The quick brown fox',preX+8,preY+40);
    ctx.fillStyle=p.bg; ctx.fillText('The quick brown fox',preX+preW/2+8,preY+40);
    ctx.strokeStyle=p.blend(0.5); ctx.strokeRect(preX,preY,preW,preH);

    ctx.fillStyle=p.blend(0.35); ctx.font='11px monospace';
    ctx.fillText('Click a preset or drag sliders  ·  Changes apply immediately',20,H-20);
  }
};
