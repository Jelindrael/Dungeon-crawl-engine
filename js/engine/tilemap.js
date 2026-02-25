// tilemap.js – Tile map system with fog-of-war
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.TILE = { FLOOR:0, WALL:1, DOOR:2, DOOR_OPEN:3, STAIRS_D:4, STAIRS_U:5,
             WATER:6, CHEST:7, ALTAR:8, PILLAR:9, VOID:10, FIRE:11 };

DCE.TILE_DEFS = {
  0:  { name:'Floor',     glyph:'·', passable:true,  art:'FLOOR'  },
  1:  { name:'Wall',      glyph:'█', passable:false, art:'WALL'   },
  2:  { name:'Door',      glyph:'+', passable:true,  art:'DOOR'   },
  3:  { name:'Door Open', glyph:'/', passable:true,  art:'FLOOR'  },
  4:  { name:'Stairs ↓',  glyph:'>', passable:true,  art:'STAIRS' },
  5:  { name:'Stairs ↑',  glyph:'<', passable:true,  art:'STAIRS' },
  6:  { name:'Water',     glyph:'~', passable:false, art:'WATER'  },
  7:  { name:'Chest',     glyph:'$', passable:true,  art:'CHEST'  },
  8:  { name:'Altar',     glyph:'Ω', passable:true,  art:'SPECIAL'},
  9:  { name:'Pillar',    glyph:'O', passable:false, art:'PILLAR' },
  10: { name:'Void',      glyph:' ', passable:false, art:'VOID'   },
  11: { name:'Fire',      glyph:'¥', passable:false, art:'FIRE'   },
};

DCE.MapEntity = class {
  constructor(type, id, x, y, props={}) {
    this.entityType  = type;
    this.id          = id;
    this.x           = x;
    this.y           = y;
    this.properties  = props;
  }
};

DCE.TileMap = class {
  constructor(width, height, name='map') {
    this.width    = width;
    this.height   = height;
    this.name     = name;
    this.tiles    = Array.from({length:height}, ()=>Array(width).fill(DCE.TILE.FLOOR));
    this.revealed = Array.from({length:height}, ()=>Array(width).fill(false));
    this.entities = [];
    this.connections = {};
  }

  get(x, y) {
    if (x<0||y<0||x>=this.width||y>=this.height) return DCE.TILE.VOID;
    return this.tiles[y][x];
  }

  set(x, y, tile) {
    if (x<0||y<0||x>=this.width||y>=this.height) return;
    this.tiles[y][x] = tile;
  }

  isPassable(x, y) {
    if (x<0||y<0||x>=this.width||y>=this.height) return false;
    return DCE.TILE_DEFS[this.tiles[y][x]]?.passable ?? false;
  }

  revealRadius(cx, cy, radius=5) {
    for (let dy=-radius; dy<=radius; dy++) {
      for (let dx=-radius; dx<=radius; dx++) {
        if (dx*dx+dy*dy <= radius*radius) {
          const x=cx+dx, y=cy+dy;
          if (x>=0&&y>=0&&x<this.width&&y<this.height)
            this.revealed[y][x] = true;
        }
      }
    }
  }

  playerStart() {
    for (const e of this.entities)
      if (e.entityType==='player_start') return [e.x, e.y];
    // Find first passable tile
    for (let y=0; y<this.height; y++)
      for (let x=0; x<this.width; x++)
        if (this.isPassable(x,y)) return [x,y];
    return [1,1];
  }

  entitiesAt(x, y) {
    return this.entities.filter(e => e.x===x && e.y===y);
  }

  toDict() {
    return { name:this.name, width:this.width, height:this.height,
      tiles:this.tiles, revealed:this.revealed,
      entities:this.entities.map(e=>({type:e.entityType,id:e.id,x:e.x,y:e.y,props:e.properties})),
      connections:this.connections };
  }

  toJSON() { return JSON.stringify(this.toDict(), null, 2); }

  static fromDict(d) {
    const m = new DCE.TileMap(d.width, d.height, d.name||'map');
    m.tiles = d.tiles;
    m.revealed = d.revealed || Array.from({length:d.height},()=>Array(d.width).fill(false));
    m.entities = (d.entities||[]).map(e=>new DCE.MapEntity(e.type,e.id,e.x,e.y,e.props||{}));
    m.connections = d.connections||{};
    return m;
  }

  static fromJSON(json) { return DCE.TileMap.fromDict(JSON.parse(json)); }

  static blank(width, height, name='new_map') {
    const m = new DCE.TileMap(width, height, name);
    // Border walls
    for (let x=0; x<width; x++) { m.set(x,0,DCE.TILE.WALL); m.set(x,height-1,DCE.TILE.WALL); }
    for (let y=0; y<height; y++) { m.set(0,y,DCE.TILE.WALL); m.set(width-1,y,DCE.TILE.WALL); }
    return m;
  }

  static fromString(str, mapId='map') {
    const lines = str.trim().split('\n');
    const height = lines.length;
    const width  = Math.max(...lines.map(l=>l.length));
    const m = new DCE.TileMap(width, height, mapId);
    const charMap = {'#':DCE.TILE.WALL,'.':DCE.TILE.FLOOR,'+':DCE.TILE.DOOR,
      '>':DCE.TILE.STAIRS_D,'<':DCE.TILE.STAIRS_U,'~':DCE.TILE.WATER,
      '$':DCE.TILE.CHEST,'O':DCE.TILE.PILLAR,' ':DCE.TILE.FLOOR};
    for (let y=0; y<height; y++) {
      for (let x=0; x<lines[y].length; x++) {
        const ch = lines[y][x];
        if (ch === '@') {
          m.set(x,y,DCE.TILE.FLOOR);
          m.entities.push(new DCE.MapEntity('player_start','player_start',x,y));
        } else {
          m.set(x, y, charMap[ch] ?? DCE.TILE.FLOOR);
        }
      }
    }
    return m;
  }
};
