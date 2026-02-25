// dialogue_editor.js – Node-based dialogue path editor
'use strict';
var DCE = window.DCE || {};
window.DCE = DCE;

DCE.DialogueEditor = class {
  constructor(canvas, palette) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.palette  = palette || DCE.currentPalette;

    this.tree = new DCE.DialogueTree({dialogueId:'new_dialogue', startNode:'start'});
    const startNode = new DCE.DialogueNode({nodeId:'start',speaker:'NPC',text:'Hello, investigator.',choices:[]});
    startNode.editorX=200; startNode.editorY=100;
    this.tree.addNode(startNode);

    this.camX=0; this.camY=0;
    this.selectedNode=null;
    this.dragNode=null; this.dragOffset=[0,0];
    this.isPanning=false; this.panStart=null; this.camStart=null;
    this._lastClickTime=0; this._lastClickNode=null;
    this._nodeCounter=1;

    this.SIDEBAR_W=200;
    this.NODE_W=180; this.NODE_H_BASE=60; this.CHOICE_H=20;

    this._bind();
    this._scheduleRender();
  }

  // ---- Geometry -----------------------------------------------------------
  _nodeHeight(node) { return this.NODE_H_BASE + node.choices.length*this.CHOICE_H; }

  _nodeScreenRect(node) {
    return { x: this.SIDEBAR_W+node.editorX+this.camX,
             y: node.editorY+this.camY,
             w: this.NODE_W, h: this._nodeHeight(node) };
  }

  _nodeAt(mx,my) {
    for (const node of Object.values(this.tree.nodes)) {
      const r=this._nodeScreenRect(node);
      if (mx>=r.x&&mx<r.x+r.w&&my>=r.y&&my<r.y+r.h) return node;
    }
    return null;
  }

  _portOut(node,ci) {
    const r=this._nodeScreenRect(node);
    return { x:r.x+r.w, y:r.y+this.NODE_H_BASE+(ci+0.5)*this.CHOICE_H };
  }
  _portIn(node) {
    const r=this._nodeScreenRect(node);
    return { x:r.x, y:r.y+this.NODE_H_BASE/2 };
  }

  // ---- Events -------------------------------------------------------------
  _bind() {
    this.canvas.setAttribute('tabindex','0');
    this.canvas.focus();

    this.canvas.addEventListener('mousedown', e => {
      const [mx,my]=this._pos(e);
      if (e.button===1) {
        this.isPanning=true; this.panStart=[mx,my]; this.camStart=[this.camX,this.camY]; return;
      }
      if (e.button===0) {
        if (mx<this.SIDEBAR_W) return;
        const node=this._nodeAt(mx,my);
        const now=Date.now();
        if (node&&node===this._lastClickNode&&(now-this._lastClickTime)<400) {
          this._editNode(node); this._lastClickTime=0; return;
        }
        this._lastClickNode=node; this._lastClickTime=now;
        this.selectedNode=node;
        if (node) {
          const r=this._nodeScreenRect(node);
          this.dragNode=node; this.dragOffset=[mx-r.x,my-r.y];
        }
        this._scheduleRender();
      }
    });
    this.canvas.addEventListener('mousemove', e => {
      const [mx,my]=this._pos(e);
      if (this.isPanning&&this.panStart) {
        this.camX=this.camStart[0]+(mx-this.panStart[0]);
        this.camY=this.camStart[1]+(my-this.panStart[1]);
        this._scheduleRender();
      } else if (this.dragNode) {
        this.dragNode.editorX=mx-this.SIDEBAR_W-this.dragOffset[0]-this.camX;
        this.dragNode.editorY=my-this.dragOffset[1]-this.camY;
        this._scheduleRender();
      }
    });
    this.canvas.addEventListener('mouseup', e=>{
      if(e.button===1) this.isPanning=false;
      else this.dragNode=null;
    });
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());

    this.canvas.addEventListener('keydown', e=>{
      e.preventDefault();
      const ctrl=e.ctrlKey||e.metaKey;
      if (e.key==='n'||e.key==='N') this._newNode();
      if (e.key==='c'&&!ctrl&&this.selectedNode) this._addChoice(this.selectedNode);
      if (e.key==='Delete'&&this.selectedNode) this._deleteNode(this.selectedNode);
      if (e.key==='ArrowLeft')  this.camX+=30;
      if (e.key==='ArrowRight') this.camX-=30;
      if (e.key==='ArrowUp')    this.camY+=30;
      if (e.key==='ArrowDown')  this.camY-=30;
      if (ctrl&&e.key==='s') this._saveFile();
      if (ctrl&&e.key==='o') this._loadFile();
      if (e.key==='Escape') { this.selectedNode=null; this._scheduleRender(); }
      this._scheduleRender();
    });
  }

  _pos(e) {
    const r=this.canvas.getBoundingClientRect();
    const sx=this.canvas.width/r.width, sy=this.canvas.height/r.height;
    return [(e.clientX-r.left)*sx,(e.clientY-r.top)*sy];
  }

  // ---- Node operations ----------------------------------------------------
  _newNode() {
    const id=`node_${this._nodeCounter++}`;
    const node=new DCE.DialogueNode({nodeId:id,speaker:'NPC',text:'New node.',choices:[]});
    // Place at center of current view
    node.editorX = 200 - this.camX;
    node.editorY = 200 - this.camY;
    this.tree.addNode(node);
    this.selectedNode=node;
    this._scheduleRender();
  }

  _deleteNode(node) {
    if (node.nodeId===this.tree.startNode) return;
    delete this.tree.nodes[node.nodeId];
    for (const n of Object.values(this.tree.nodes))
      n.choices=n.choices.filter(c=>c.nextNode!==node.nodeId);
    if (this.selectedNode===node) this.selectedNode=null;
    this._scheduleRender();
  }

  _addChoice(node) {
    const text=prompt(`Choice text for [${node.nodeId}]:`,'');
    if (text==null) return;
    const nids=Object.keys(this.tree.nodes).join(', ');
    const nextId=prompt(`Next node (available: ${nids}):`,'')||null;
    const cid=`c_${node.nodeId}_${node.choices.length}`;
    node.choices.push(new DCE.DialogueChoice({choiceId:cid,text:text.trim(),nextNode:nextId||null}));
    this._scheduleRender();
  }

  _editNode(node) {
    const text=prompt('Node text:',node.text);
    if (text!==null) node.text=text;
    const speaker=prompt('Speaker:',node.speaker||'');
    if (speaker!==null) node.speaker=speaker;
    this._scheduleRender();
  }

  // ---- File I/O -----------------------------------------------------------
  _saveFile() {
    const blob=new Blob([this.tree.toJSON()],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=(this.tree.dialogueId||'dialogue')+'.json'; a.click();
  }
  _loadFile() {
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      const reader=new FileReader();
      reader.onload=ev=>{ this.tree=DCE.DialogueTree.fromJSON(ev.target.result); this.selectedNode=null; this._scheduleRender(); };
      reader.readAsText(f);
    };
    inp.click();
  }

  // ---- Render -------------------------------------------------------------
  _scheduleRender() {
    if (!this._raf) this._raf=requestAnimationFrame(()=>{ this._raf=null; this._render(); });
  }

  _bezier(ctx,x1,y1,x2,y2,col) {
    const cx1=x1+Math.abs(x2-x1)*0.5, cx2=x2-Math.abs(x2-x1)*0.5;
    ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x1,y1);
    ctx.bezierCurveTo(cx1,y1,cx2,y2,x2,y2); ctx.stroke();
    // Arrowhead
    const angle=Math.atan2(y2-y1,x2-x1);
    const sz=8;
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-sz*Math.cos(angle-0.4),y2-sz*Math.sin(angle-0.4));
    ctx.lineTo(x2-sz*Math.cos(angle+0.4),y2-sz*Math.sin(angle+0.4));
    ctx.closePath(); ctx.fill();
  }

  _render() {
    const ctx=this.ctx, p=this.palette;
    const W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,W,H);

    // ---- Sidebar ----
    ctx.fillStyle=p.blend(0.06); ctx.fillRect(0,0,this.SIDEBAR_W,H);
    ctx.strokeStyle=p.blend(0.2); ctx.strokeRect(0,0,this.SIDEBAR_W,H);
    let sy=20;
    ctx.fillStyle=p.fg; ctx.font='bold 12px monospace'; ctx.fillText('DIALOGUE EDITOR',6,sy+12); sy+=24;
    if (this.selectedNode) {
      const n=this.selectedNode;
      ctx.fillStyle=p.blend(0.8); ctx.font='bold 11px monospace'; ctx.fillText(`ID: ${n.nodeId}`,6,sy+12); sy+=16;
      ctx.fillStyle=p.blend(0.6); ctx.font='11px monospace'; ctx.fillText(`Speaker: ${n.speaker||'—'}`,6,sy+12); sy+=14;
      const tprev=(n.text||'').slice(0,80);
      for (const chunk of [tprev.slice(0,26),tprev.slice(26,52),tprev.slice(52,78)]) {
        if(chunk){ctx.fillStyle=p.blend(0.5);ctx.font='10px monospace';ctx.fillText(chunk,6,sy+10);sy+=13;}
      }
      sy+=4;
      ctx.fillStyle=p.blend(0.5); ctx.fillText(`Choices: ${n.choices.length}`,6,sy+12); sy+=14;
      for (const ch of n.choices) {
        ctx.fillStyle=p.blend(0.4);
        ctx.fillText(`→${ch.nextNode||'?'}: ${ch.text.slice(0,22)}`,6,sy+10); sy+=13;
      }
    } else {
      ctx.fillStyle=p.blend(0.35); ctx.font='11px monospace'; ctx.fillText('(no node selected)',6,sy+12); sy+=16;
    }
    sy+=10;
    for (const h of ['N - new node','C - add choice','Dbl-click edit','Del - delete','Arrows - pan','Ctrl+S save','Ctrl+O load']) {
      ctx.fillStyle=p.blend(0.28); ctx.font='10px monospace'; ctx.fillText(h,6,sy+10); sy+=13;
    }
    sy+=6;
    ctx.fillStyle=p.blend(0.35); ctx.font='10px monospace';
    ctx.fillText(`Nodes: ${Object.keys(this.tree.nodes).length}`,6,sy+10); sy+=13;
    ctx.fillText(`Start: ${this.tree.startNode}`,6,sy+10);

    // ---- Canvas area ----
    ctx.save();
    ctx.beginPath(); ctx.rect(this.SIDEBAR_W,0,W-this.SIDEBAR_W,H); ctx.clip();

    // Dot grid
    ctx.fillStyle=p.blend(0.05);
    const gs=40, ox=(this.camX%gs+gs)%gs, oy=(this.camY%gs+gs)%gs;
    for (let gx=ox; gx<W-this.SIDEBAR_W; gx+=gs)
      for (let gy=oy; gy<H; gy+=gs)
        ctx.fillRect(this.SIDEBAR_W+gx,gy,1,1);

    // Arrows
    const arrowCol=p.blend(0.4);
    for (const node of Object.values(this.tree.nodes)) {
      for (let ci=0; ci<node.choices.length; ci++) {
        const ch=node.choices[ci];
        if (!ch.nextNode||!this.tree.nodes[ch.nextNode]) continue;
        const target=this.tree.nodes[ch.nextNode];
        const p1=this._portOut(node,ci), p2=this._portIn(target);
        this._bezier(ctx,p1.x,p1.y,p2.x,p2.y,arrowCol);
      }
    }

    // Nodes
    for (const node of Object.values(this.tree.nodes)) {
      const r=this._nodeScreenRect(node);
      const isSel=node===this.selectedNode;
      const isStart=node.nodeId===this.tree.startNode;

      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.fillRect(r.x+3,r.y+3,r.w,r.h);

      // Body
      ctx.fillStyle=p.blend(0.08); ctx.fillRect(r.x,r.y,r.w,r.h);
      ctx.strokeStyle=isSel?'#FFFF60':isStart?p.blend(0.8):p.blend(0.45);
      ctx.lineWidth=isSel?2:1;
      ctx.strokeRect(r.x+0.5,r.y+0.5,r.w-1,r.h-1);

      // Header
      ctx.fillStyle=p.blend(0.14); ctx.fillRect(r.x,r.y,r.w,this.NODE_H_BASE);

      // ID tag
      ctx.fillStyle=p.blend(0.5); ctx.font='10px monospace';
      ctx.fillText(node.nodeId,r.x+4,r.y+12);
      if (isStart) { ctx.fillStyle='#FFFF60'; ctx.fillText('▶START',r.x+r.w-56,r.y+12); }

      // Speaker + text
      ctx.fillStyle=p.fg; ctx.font='bold 12px monospace';
      ctx.fillText((node.speaker||'')+':', r.x+4, r.y+26);
      ctx.fillStyle=p.blend(0.7); ctx.font='11px monospace';
      const preview=(node.text||'').slice(0,22);
      ctx.fillText(preview,r.x+4,r.y+40);
      if (node.text&&node.text.length>22) {
        ctx.fillText(node.text.slice(22,44),r.x+4,r.y+54);
      }

      // In-port
      const pin=this._portIn(node);
      ctx.fillStyle=p.blend(0.6); ctx.beginPath(); ctx.arc(pin.x,pin.y,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=p.fg; ctx.lineWidth=1; ctx.stroke();

      // Choices
      for (let ci=0; ci<node.choices.length; ci++) {
        const ch=node.choices[ci];
        const cy=r.y+this.NODE_H_BASE+ci*this.CHOICE_H;
        ctx.fillStyle=p.blend(0.06); ctx.fillRect(r.x+2,cy,r.w-4,this.CHOICE_H-2);
        ctx.strokeStyle=p.blend(0.3); ctx.lineWidth=1; ctx.strokeRect(r.x+2+0.5,cy+0.5,r.w-5,this.CHOICE_H-3);
        const ctext=`${ci+1}. ${ch.text}`.slice(0,22);
        ctx.fillStyle=p.blend(0.75); ctx.font='10px monospace';
        ctx.fillText(ctext,r.x+6,cy+14);
        // Out-port
        const pout=this._portOut(node,ci);
        ctx.fillStyle=p.blend(0.5); ctx.beginPath(); ctx.arc(pout.x,pout.y,4,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=p.blend(0.8); ctx.lineWidth=1; ctx.stroke();
      }
    }

    ctx.restore();

    // Top bar
    ctx.fillStyle=p.blend(0.08); ctx.fillRect(this.SIDEBAR_W,0,W-this.SIDEBAR_W,28);
    ctx.fillStyle=p.fg; ctx.font='12px monospace';
    ctx.fillText(`Dialogue Editor | ${this.tree.dialogueId} | ${Object.keys(this.tree.nodes).length} nodes`,this.SIDEBAR_W+8,18);
  }
};
