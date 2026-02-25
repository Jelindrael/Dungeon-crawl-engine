"""
Node-based Dialogue Path Editor

Visual editor for building DialogueTree graphs with:
  - Drag-and-drop nodes on an infinite canvas
  - Click to select / edit node text, speaker, choices
  - Add/remove nodes and choices
  - Arrow keys / middle-drag to pan
  - Ctrl+S / Ctrl+O – save/load dialogue JSON

Run standalone:  python -m editor.dialogue_editor
Controls:
  Left click node  – select node (drag to move)
  Left click empty – deselect
  Double-click     – edit node text (tkinter dialog)
  Right click node – context menu (add choice, delete node)
  N                – new node at mouse
  C (on selected)  – add choice to selected node
  Del              – delete selected node
  Ctrl+S           – save
  Ctrl+O           – open
  Middle drag / Arrow keys – pan canvas
"""
from __future__ import annotations
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import math
import tkinter as tk
from tkinter import filedialog, simpledialog
from typing import Optional, List, Tuple

import pygame

from engine.dialogue import DialogueTree, DialogueNode, DialogueChoice
from engine.palette import PRESETS, Palette

# ---------------------------------------------------------------------------
# Layout / Sizes
# ---------------------------------------------------------------------------
W, H        = 1200, 720
SIDEBAR_W   = 240
CANVAS_X    = SIDEBAR_W
CANVAS_Y    = 40
STATUS_H    = 22
CANVAS_W    = W - SIDEBAR_W
CANVAS_H    = H - CANVAS_Y - STATUS_H

NODE_W      = 180
NODE_H_BASE = 60    # base height; grows with choices
CHOICE_H    = 20
CORNER_R    = 6
FONT_SZ     = 12
FONT_SM_SZ  = 11

# Colors (overridden by palette)
COL_SEL_BORDER = (255, 255, 100)


# ---------------------------------------------------------------------------
# Helper: draw rounded rect
# ---------------------------------------------------------------------------
def _rounded_rect(surf: pygame.Surface, color, rect: pygame.Rect, radius: int, width: int = 0) -> None:
    pygame.draw.rect(surf, color, rect, border_radius=radius, width=width)


# ---------------------------------------------------------------------------
# Node view wrapper
# ---------------------------------------------------------------------------
class NodeView:
    """Wraps a DialogueNode with editor position data."""

    def __init__(self, node: DialogueNode) -> None:
        self.node = node
        # editor_x/editor_y stored inside node; use as canvas coordinates
        if not hasattr(node, "editor_x") or node.editor_x is None:
            node.editor_x = 0
        if not hasattr(node, "editor_y") or node.editor_y is None:
            node.editor_y = 0

    @property
    def x(self) -> float: return self.node.editor_x

    @x.setter
    def x(self, v: float) -> None: self.node.editor_x = v

    @property
    def y(self) -> float: return self.node.editor_y

    @y.setter
    def y(self, v: float) -> None: self.node.editor_y = v

    def height(self) -> int:
        return NODE_H_BASE + len(self.node.choices) * CHOICE_H

    def rect(self, cam_x: float, cam_y: float) -> pygame.Rect:
        sx = int(CANVAS_X + self.x + cam_x)
        sy = int(CANVAS_Y + self.y + cam_y)
        return pygame.Rect(sx, sy, NODE_W, self.height())

    def choice_rect(self, choice_idx: int, cam_x: float, cam_y: float) -> pygame.Rect:
        r = self.rect(cam_x, cam_y)
        cy = r.y + NODE_H_BASE + choice_idx * CHOICE_H
        return pygame.Rect(r.x + 4, cy, NODE_W - 8, CHOICE_H)

    def port_out(self, choice_idx: int, cam_x: float, cam_y: float) -> Tuple[int, int]:
        cr = self.choice_rect(choice_idx, cam_x, cam_y)
        return cr.right, cr.centery

    def port_in(self, cam_x: float, cam_y: float) -> Tuple[int, int]:
        r = self.rect(cam_x, cam_y)
        return r.left, r.top + NODE_H_BASE // 2


# ---------------------------------------------------------------------------
# Arrow drawing (bezier curve)
# ---------------------------------------------------------------------------
def _draw_arrow(surf: pygame.Surface, color, p1: Tuple[int, int], p2: Tuple[int, int]) -> None:
    x1, y1 = p1
    x2, y2 = p2
    # Bezier control points
    cx1 = x1 + abs(x2 - x1) * 0.5
    cy1 = y1
    cx2 = x2 - abs(x2 - x1) * 0.5
    cy2 = y2
    pts = []
    steps = max(12, int(math.dist(p1, p2) / 10))
    for i in range(steps + 1):
        t = i / steps
        it = 1 - t
        bx = it**3 * x1 + 3 * it**2 * t * cx1 + 3 * it * t**2 * cx2 + t**3 * x2
        by = it**3 * y1 + 3 * it**2 * t * cy1 + 3 * it * t**2 * cy2 + t**3 * y2
        pts.append((int(bx), int(by)))
    if len(pts) >= 2:
        pygame.draw.lines(surf, color, False, pts, 2)
    # Arrowhead
    if len(pts) >= 2:
        dx = pts[-1][0] - pts[-2][0]
        dy = pts[-1][1] - pts[-2][1]
        angle = math.atan2(dy, dx)
        sz = 8
        tip = pts[-1]
        a1 = (tip[0] - sz * math.cos(angle - 0.4),
              tip[1] - sz * math.sin(angle - 0.4))
        a2 = (tip[0] - sz * math.cos(angle + 0.4),
              tip[1] - sz * math.sin(angle + 0.4))
        pygame.draw.polygon(surf, color, [tip, a1, a2])


# ---------------------------------------------------------------------------
# Main editor
# ---------------------------------------------------------------------------

def run(palette: Optional[Palette] = None) -> Optional[DialogueTree]:
    palette = palette or PRESETS["phosphor_green"]
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Dialogue Path Editor")
    clock = pygame.time.Clock()

    font    = pygame.font.SysFont("monospace", FONT_SZ)
    font_sm = pygame.font.SysFont("monospace", FONT_SM_SZ)
    font_b  = pygame.font.SysFont("monospace", FONT_SZ, bold=True)

    fg, bg = palette.fg, palette.bg

    # Build initial tree
    tree = DialogueTree(dialogue_id="new_dialogue", start_node="start")
    start_node = DialogueNode(
        node_id="start",
        speaker="NPC",
        text="Hello, investigator. What brings you here?",
    )
    start_node.editor_x = 100
    start_node.editor_y = 100
    tree.nodes["start"] = start_node

    node_views: List[NodeView] = [NodeView(start_node)]

    # Camera
    cam_x: float = 0.0
    cam_y: float = 0.0

    # Selection
    selected_nv: Optional[NodeView] = None
    drag_nv:     Optional[NodeView] = None
    drag_offset: Tuple[float, float] = (0.0, 0.0)

    # Pan
    mid_drag     = False
    pan_start    = None
    cam_start    = None

    save_path: Optional[str] = None
    status_msg = "New dialogue  |  N=new node  C=add choice  Del=delete"

    node_counter = [1]  # for generating unique IDs

    # -----------------------------------------------------------------------
    def _get_view(node_id: str) -> Optional[NodeView]:
        for nv in node_views:
            if nv.node.node_id == node_id:
                return nv
        return None

    def _node_at(mx: int, my: int) -> Optional[NodeView]:
        for nv in reversed(node_views):
            r = nv.rect(cam_x, cam_y)
            if r.collidepoint(mx, my):
                return nv
        return None

    def _new_node(cx: float, cy: float) -> NodeView:
        nid = f"node_{node_counter[0]}"
        node_counter[0] += 1
        node = DialogueNode(node_id=nid, speaker="NPC",
                            text="New node text.")
        node.editor_x = cx - cam_x
        node.editor_y = cy - cam_y
        tree.nodes[nid] = node
        nv = NodeView(node)
        node_views.append(nv)
        return nv

    def _delete_node(nv: NodeView) -> None:
        nid = nv.node.node_id
        if nid == tree.start_node:
            return  # Don't delete start
        node_views.remove(nv)
        del tree.nodes[nid]
        # Remove choices pointing to this node
        for other in node_views:
            other.node.choices = [c for c in other.node.choices
                                  if c.next_node != nid]

    def _add_choice(nv: NodeView) -> None:
        root = tk.Tk(); root.withdraw()
        text = simpledialog.askstring("Add Choice", "Choice text:", parent=root)
        root.destroy()
        if not text:
            return
        root2 = tk.Tk(); root2.withdraw()
        nids = sorted(tree.nodes.keys())
        nid_str = simpledialog.askstring(
            "Next Node",
            f"Next node ID (available: {', '.join(nids)}):",
            parent=root2)
        root2.destroy()
        if nid_str is None:
            nid_str = ""
        cid = f"c_{nv.node.node_id}_{len(nv.node.choices)}"
        choice = DialogueChoice(choice_id=cid, text=text,
                                next_node=nid_str.strip() or None)
        nv.node.choices.append(choice)

    def _edit_node_text(nv: NodeView) -> None:
        root = tk.Tk(); root.withdraw()
        text = simpledialog.askstring(
            "Edit Node",
            f"Text for [{nv.node.node_id}]:",
            initialvalue=nv.node.text,
            parent=root)
        root.destroy()
        if text is not None:
            nv.node.text = text

        root2 = tk.Tk(); root2.withdraw()
        speaker = simpledialog.askstring(
            "Edit Speaker",
            "Speaker name:",
            initialvalue=nv.node.speaker or "",
            parent=root2)
        root2.destroy()
        if speaker is not None:
            nv.node.speaker = speaker.strip() or None

    # -----------------------------------------------------------------------
    def draw_frame() -> None:
        nonlocal status_msg
        screen.fill(bg)

        # --- Canvas background grid ---
        clip_rect = pygame.Rect(CANVAS_X, CANVAS_Y, CANVAS_W, CANVAS_H)
        screen.set_clip(clip_rect)

        # Subtle dot grid
        grid_spacing = 40
        grid_col = tuple(max(0, c - 20) if c < 20 else min(255, c + 8) for c in bg)
        ox = int(cam_x % grid_spacing)
        oy = int(cam_y % grid_spacing)
        for gx in range(ox, CANVAS_W, grid_spacing):
            for gy in range(oy, CANVAS_H, grid_spacing):
                screen.set_at((CANVAS_X + gx, CANVAS_Y + gy), grid_col)

        # --- Arrows (choice connections) ---
        arrow_col = palette.blend(0.4)
        for nv in node_views:
            for i, choice in enumerate(nv.node.choices):
                if choice.next_node and choice.next_node in tree.nodes:
                    target = _get_view(choice.next_node)
                    if target:
                        p1 = nv.port_out(i, cam_x, cam_y)
                        p2 = target.port_in(cam_x, cam_y)
                        _draw_arrow(screen, arrow_col, p1, p2)

        # --- Nodes ---
        for nv in node_views:
            r = nv.rect(cam_x, cam_y)
            is_sel  = (nv is selected_nv)
            is_start = (nv.node.node_id == tree.start_node)

            node_bg = tuple(c // 6 for c in fg)
            border_col = COL_SEL_BORDER if is_sel else (palette.blend(0.9) if is_start else palette.blend(0.5))
            border_w   = 2 if is_sel or is_start else 1

            _rounded_rect(screen, node_bg, r, CORNER_R)
            _rounded_rect(screen, border_col, r, CORNER_R, border_w)

            # Header
            header_r = pygame.Rect(r.x, r.y, NODE_W, NODE_H_BASE)
            _rounded_rect(screen, tuple(c // 4 for c in fg), header_r, CORNER_R)

            # Node ID tag
            nid_surf = font_sm.render(nv.node.node_id, False, palette.blend(0.6))
            screen.blit(nid_surf, (r.x + 4, r.y + 2))

            # Start marker
            if is_start:
                start_surf = font_sm.render("▶ START", False, COL_SEL_BORDER)
                screen.blit(start_surf, (r.x + NODE_W - 70, r.y + 2))

            # Speaker
            spk = nv.node.speaker or ""
            spk_surf = font_b.render(f"{spk}:", False, fg)
            screen.blit(spk_surf, (r.x + 4, r.y + 14))

            # Text (truncated)
            text = nv.node.text or ""
            max_chars = (NODE_W - 12) // 7
            lines = []
            for i in range(0, min(len(text), max_chars * 2), max_chars):
                lines.append(text[i:i + max_chars])
                if len(lines) >= 2:
                    break
            for li, line in enumerate(lines):
                lsurf = font_sm.render(line, False, palette.blend(0.75))
                screen.blit(lsurf, (r.x + 4, r.y + 28 + li * 14))

            # In-port dot
            pin = nv.port_in(cam_x, cam_y)
            pygame.draw.circle(screen, palette.blend(0.7), pin, 5)
            pygame.draw.circle(screen, fg, pin, 5, 1)

            # Choices
            for ci, choice in enumerate(nv.node.choices):
                cr = nv.choice_rect(ci, cam_x, cam_y)
                choice_bg = tuple(c // 5 for c in fg)
                pygame.draw.rect(screen, choice_bg, cr, border_radius=3)
                pygame.draw.rect(screen, palette.blend(0.4), cr, border_radius=3, width=1)
                ctext = f"{ci+1}. {choice.text}"
                if len(ctext) > 22:
                    ctext = ctext[:21] + "…"
                csurf = font_sm.render(ctext, False, palette.blend(0.8))
                screen.blit(csurf, (cr.x + 4, cr.y + 3))

                # Out-port dot
                pout = nv.port_out(ci, cam_x, cam_y)
                pygame.draw.circle(screen, palette.blend(0.5), pout, 4)
                pygame.draw.circle(screen, fg, pout, 4, 1)

        screen.set_clip(None)

        # --- Sidebar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(0, 0, SIDEBAR_W, H))
        sx, sy = 8, CANVAS_Y
        screen.blit(font.render("DIALOGUE EDITOR", False, fg), (sx, sy)); sy += 20

        if selected_nv:
            n = selected_nv.node
            screen.blit(font_b.render(f"ID: {n.node_id}", False, fg), (sx, sy)); sy += 16
            screen.blit(font_sm.render(f"Speaker: {n.speaker or '—'}", False, palette.blend(0.7)), (sx, sy)); sy += 14
            # Wrap text preview
            text_preview = (n.text or "")[:80]
            for chunk in [text_preview[i:i+26] for i in range(0, len(text_preview), 26)]:
                screen.blit(font_sm.render(chunk, False, palette.blend(0.6)), (sx, sy)); sy += 13
            sy += 6
            screen.blit(font_sm.render(f"Choices: {len(n.choices)}", False, palette.blend(0.6)), (sx, sy)); sy += 14
            for ci, ch in enumerate(n.choices):
                s = f"  {ci}→{ch.next_node or '?'}: {ch.text[:18]}"
                screen.blit(font_sm.render(s, False, palette.blend(0.5)), (sx, sy)); sy += 13
        else:
            screen.blit(font_sm.render("(no node selected)", False, palette.blend(0.4)), (sx, sy)); sy += 16

        sy += 12
        hints = [
            "N - new node",
            "C - add choice",
            "D-click - edit",
            "Del - delete",
            "Mid-drag - pan",
            "Arrows - pan",
            "Ctrl+S - save",
            "Ctrl+O - open",
            "",
            f"Nodes: {len(tree.nodes)}",
            f"Start: {tree.start_node}",
        ]
        for h in hints:
            screen.blit(font_sm.render(h, False, tuple(c // 2 for c in fg)), (sx, sy)); sy += 14

        # --- Top bar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(CANVAS_X, 0, CANVAS_W, CANVAS_Y - 2))
        fname = os.path.basename(save_path) if save_path else "<unsaved>"
        title = font.render(f"Dialogue Editor  |  {fname}", False, fg)
        screen.blit(title, (CANVAS_X + 8, 12))

        # --- Status bar ---
        pygame.draw.rect(screen, tuple(c // 8 for c in fg),
                         pygame.Rect(0, H - STATUS_H, W, STATUS_H))
        screen.blit(font_sm.render(status_msg, False, fg), (8, H - STATUS_H + 4))

        pygame.display.flip()

    # -----------------------------------------------------------------------
    running = True
    last_click_time = 0
    last_click_nv: Optional[NodeView] = None

    while running:
        draw_frame()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                ctrl = event.mod & pygame.KMOD_CTRL

                if event.key == pygame.K_ESCAPE:
                    running = False

                elif event.key == pygame.K_n and not ctrl:
                    mx, my = pygame.mouse.get_pos()
                    cx = mx - CANVAS_X
                    cy = my - CANVAS_Y
                    nv = _new_node(cx, cy)
                    selected_nv = nv
                    status_msg = f"Created node {nv.node.node_id}"

                elif event.key == pygame.K_c and not ctrl and selected_nv:
                    _add_choice(selected_nv)
                    status_msg = f"Added choice to {selected_nv.node.node_id}"

                elif event.key == pygame.K_DELETE and selected_nv:
                    nid = selected_nv.node.node_id
                    _delete_node(selected_nv)
                    selected_nv = None
                    status_msg = f"Deleted {nid}"

                elif event.key in (pygame.K_LEFT, pygame.K_RIGHT,
                                   pygame.K_UP, pygame.K_DOWN):
                    speed = 30
                    if event.key == pygame.K_LEFT:  cam_x += speed
                    if event.key == pygame.K_RIGHT: cam_x -= speed
                    if event.key == pygame.K_UP:    cam_y += speed
                    if event.key == pygame.K_DOWN:  cam_y -= speed

                elif event.key == pygame.K_s and ctrl:
                    if save_path is None:
                        root = tk.Tk(); root.withdraw()
                        save_path = filedialog.asksaveasfilename(
                            defaultextension=".json",
                            filetypes=[("Dialogue JSON", "*.json")])
                        root.destroy()
                    if save_path:
                        tree.save(save_path)
                        status_msg = f"Saved: {os.path.basename(save_path)}"

                elif event.key == pygame.K_o and ctrl:
                    root = tk.Tk(); root.withdraw()
                    path = filedialog.askopenfilename(
                        filetypes=[("Dialogue JSON", "*.json")])
                    root.destroy()
                    if path:
                        tree = DialogueTree.load(path)
                        save_path = path
                        node_views.clear()
                        for node in tree.nodes.values():
                            node_views.append(NodeView(node))
                        selected_nv = None
                        status_msg = f"Loaded: {os.path.basename(path)}"

            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos

                if event.button == 2:
                    mid_drag  = True
                    pan_start = (mx, my)
                    cam_start = (cam_x, cam_y)

                elif event.button == 1 and mx >= CANVAS_X:
                    hit = _node_at(mx, my)
                    now = pygame.time.get_ticks()
                    # Double-click detection
                    if hit and hit is last_click_nv and (now - last_click_time) < 400:
                        _edit_node_text(hit)
                        last_click_time = 0
                        last_click_nv = None
                    else:
                        selected_nv = hit
                        last_click_nv = hit
                        last_click_time = now
                        if hit:
                            r = hit.rect(cam_x, cam_y)
                            drag_nv = hit
                            drag_offset = (mx - r.x, my - r.y)

            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 2:
                    mid_drag = False
                elif event.button == 1:
                    drag_nv = None

            elif event.type == pygame.MOUSEMOTION:
                mx, my = event.pos
                if mid_drag and pan_start and cam_start:
                    cam_x = cam_start[0] + (mx - pan_start[0])
                    cam_y = cam_start[1] + (my - pan_start[1])
                elif drag_nv:
                    drag_nv.x = mx - CANVAS_X - drag_offset[0] - cam_x
                    drag_nv.y = my - CANVAS_Y - drag_offset[1] - cam_y

        clock.tick(30)

    pygame.quit()
    return tree


if __name__ == "__main__":
    run()
