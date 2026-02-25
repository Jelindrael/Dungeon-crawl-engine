// sprite.js – 2-bit pixel art sprite system
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.SpriteFrame = class {
  constructor(width, height) {
    this.width  = width;
    this.height = height;
    // 2D array of 0/1
    this.pixels = Array.from({length:height}, ()=>Array(width).fill(0));
  }

  getPixel(x, y)      { return this.pixels[y]?.[x] ?? 0; }
  setPixel(x, y, val) { if (this.pixels[y]) this.pixels[y][x] = val ? 1 : 0; }

  clone() {
    const f = new DCE.SpriteFrame(this.width, this.height);
    f.pixels = this.pixels.map(row=>[...row]);
    return f;
  }

  toDict() { return { width:this.width, height:this.height, pixels:this.pixels }; }
  static fromDict(d) {
    const f = new DCE.SpriteFrame(d.width, d.height);
    f.pixels = d.pixels;
    return f;
  }
};

DCE.Sprite = class {
  constructor(id, width, height, pixelScale=2) {
    this.id         = id;
    this.width      = width;
    this.height     = height;
    this.pixelScale = pixelScale;
    this.frames     = [new DCE.SpriteFrame(width, height)];
  }

  get currentFrame() { return this.frames[0]; }

  addFrame() {
    this.frames.push(new DCE.SpriteFrame(this.width, this.height));
  }

  // Draw this sprite onto a canvas context at screen position (sx, sy)
  draw(ctx, sx, sy, palette) {
    const frame = this.currentFrame;
    const s = this.pixelScale;
    for (let y=0; y<this.height; y++) {
      for (let x=0; x<this.width; x++) {
        ctx.fillStyle = frame.getPixel(x,y) ? palette.fg : palette.bg;
        ctx.fillRect(sx+x*s, sy+y*s, s, s);
      }
    }
  }

  toDict() {
    return { id:this.id, width:this.width, height:this.height,
      pixelScale:this.pixelScale, frames:this.frames.map(f=>f.toDict()) };
  }

  toJSON() { return JSON.stringify(this.toDict(), null, 2); }

  static fromDict(d) {
    const s = new DCE.Sprite(d.id, d.width, d.height, d.pixelScale||2);
    s.frames = d.frames.map(f=>DCE.SpriteFrame.fromDict(f));
    return s;
  }

  static fromJSON(json) { return DCE.Sprite.fromDict(JSON.parse(json)); }

  static blank(id, width=32, height=32, pixelScale=4) {
    return new DCE.Sprite(id, width, height, pixelScale);
  }
};

DCE.SpriteRegistry = {};
DCE.registerSprite = function(sprite) { DCE.SpriteRegistry[sprite.id] = sprite; };
DCE.getSprite      = function(id)     { return DCE.SpriteRegistry[id]; };
