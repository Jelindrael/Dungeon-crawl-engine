// palette.js – Two-color palette system
// Attaches to global DCE namespace.
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.hexToRgb = function(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
};

DCE.rgbToHex = function(r,g,b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
};

DCE.Palette = class {
  constructor(bgHex, fgHex, name) {
    this.bgHex = bgHex;
    this.fgHex = fgHex;
    this.name  = name || 'Custom';
    this._bg   = DCE.hexToRgb(bgHex);
    this._fg   = DCE.hexToRgb(fgHex);
  }

  get bg()  { return this.bgHex; }
  get fg()  { return this.fgHex; }

  get dim() {
    const [r,g,b] = this._fg;
    return DCE.rgbToHex(r>>1, g>>1, b>>1);
  }

  get bright() {
    const [r,g,b] = this._fg;
    return DCE.rgbToHex(Math.min(255,r+40), Math.min(255,g+40), Math.min(255,b+40));
  }

  get mid() { return this.blend(0.5); }

  blend(t) {
    const [br,bg_,bb] = this._bg;
    const [fr,fg_,fb] = this._fg;
    const r = Math.round(br + (fr-br)*t);
    const g = Math.round(bg_ + (fg_-bg_)*t);
    const b = Math.round(bb + (fb-bb)*t);
    return DCE.rgbToHex(r,g,b);
  }
};

DCE.PRESETS = {
  phosphor_green: new DCE.Palette('#000C02', '#00E646', 'Phosphor Green'),
  amber:          new DCE.Palette('#0E0900', '#FFAF00', 'Amber'),
  cyan:           new DCE.Palette('#000A0E', '#00D2F0', 'Cyan'),
  white:          new DCE.Palette('#0A0A0A', '#E8E8E8', 'White Phosphor'),
  red:            new DCE.Palette('#0E0000', '#FF3030', 'Red Alert'),
  blue:           new DCE.Palette('#00020E', '#4080FF', 'Blue Terminal'),
  magenta:        new DCE.Palette('#0A000A', '#DC00DC', 'Magenta'),
  neon_yellow:    new DCE.Palette('#0C0C00', '#E8F000', 'Neon Yellow'),
};

DCE.DEFAULT_PALETTE_KEY = 'phosphor_green';
DCE.currentPalette = DCE.PRESETS[DCE.DEFAULT_PALETTE_KEY];
