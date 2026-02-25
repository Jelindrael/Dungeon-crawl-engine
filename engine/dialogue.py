"""
Dialogue tree system.

Dialogues are JSON-defined node graphs.  Each node has:
  - speaker & portrait
  - body text
  - a list of choices (edges to other nodes)

Each choice can have:
  - A requirement (has_flag, min_skill, has_item, min_gold)
  - A skill check (CoC percentile roll vs DC)
  - An effects list (same vocabulary as scene effects)
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Requirement
# ---------------------------------------------------------------------------

@dataclass
class DialogueRequirement:
    has_flag:   Optional[str]        = None
    no_flag:    Optional[str]        = None
    has_item:   Optional[str]        = None
    min_skill:  Optional[Dict[str, int]] = None   # {"Library Use": 40}
    min_gold:   Optional[int]        = None

    def is_met(self, investigator) -> bool:
        if self.has_flag and not investigator.has_flag(self.has_flag):
            return False
        if self.no_flag and investigator.has_flag(self.no_flag):
            return False
        if self.has_item and not investigator.has_item(self.has_item):
            return False
        if self.min_gold and investigator.cash < self.min_gold:
            return False
        if self.min_skill:
            for skill, minimum in self.min_skill.items():
                if investigator.skills.get(skill, 0) < minimum:
                    return False
        return True

    def to_dict(self) -> dict:
        return {k: v for k, v in {
            "has_flag": self.has_flag,
            "no_flag": self.no_flag,
            "has_item": self.has_item,
            "min_skill": self.min_skill,
            "min_gold": self.min_gold,
        }.items() if v is not None}

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueRequirement":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# ---------------------------------------------------------------------------
# Skill check within a choice
# ---------------------------------------------------------------------------

@dataclass
class DialogueSkillCheck:
    skill:      str
    on_success: Optional[str] = None   # node id on success
    on_failure: Optional[str] = None   # node id on failure
    push:       bool = False            # allow pushed roll?

    def to_dict(self) -> dict:
        return {
            "skill": self.skill,
            "on_success": self.on_success,
            "on_failure": self.on_failure,
            "push": self.push,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueSkillCheck":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# ---------------------------------------------------------------------------
# Choice (edge)
# ---------------------------------------------------------------------------

@dataclass
class DialogueChoice:
    choice_id:   str
    text:        str
    next_node:   Optional[str]                  = None
    requirement: Optional[DialogueRequirement]  = None
    skill_check: Optional[DialogueSkillCheck]   = None
    effects:     List[Dict[str, Any]]           = field(default_factory=list)

    def is_available(self, investigator) -> bool:
        if self.requirement is None:
            return True
        return self.requirement.is_met(investigator)

    def to_dict(self) -> dict:
        d: Dict[str, Any] = {"id": self.choice_id, "text": self.text}
        if self.next_node:
            d["next_node"] = self.next_node
        if self.requirement:
            d["requirement"] = self.requirement.to_dict()
        if self.skill_check:
            d["skill_check"] = self.skill_check.to_dict()
        if self.effects:
            d["effects"] = self.effects
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueChoice":
        req = DialogueRequirement.from_dict(d["requirement"]) if "requirement" in d else None
        sc  = DialogueSkillCheck.from_dict(d["skill_check"]) if "skill_check" in d else None
        return cls(
            choice_id=d.get("id", "choice"),
            text=d["text"],
            next_node=d.get("next_node"),
            requirement=req,
            skill_check=sc,
            effects=d.get("effects", []),
        )


# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------

@dataclass
class DialogueNode:
    node_id:    str
    speaker:    str
    text:       str
    portrait:   Optional[str]          = None
    choices:    List[DialogueChoice]   = field(default_factory=list)
    on_enter:   List[Dict[str, Any]]   = field(default_factory=list)
    is_terminal: bool                  = False
    # Editor layout position
    editor_x:   int = 0
    editor_y:   int = 0

    def available_choices(self, investigator) -> List[DialogueChoice]:
        return [c for c in self.choices if c.is_available(investigator)]

    def to_dict(self) -> dict:
        return {
            "id": self.node_id,
            "speaker": self.speaker,
            "text": self.text,
            "portrait": self.portrait,
            "choices": [c.to_dict() for c in self.choices],
            "on_enter": self.on_enter,
            "is_terminal": self.is_terminal,
            "editor_x": self.editor_x,
            "editor_y": self.editor_y,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueNode":
        choices = [DialogueChoice.from_dict(c) for c in d.get("choices", [])]
        return cls(
            node_id=d["id"],
            speaker=d.get("speaker", "???"),
            text=d.get("text", ""),
            portrait=d.get("portrait"),
            choices=choices,
            on_enter=d.get("on_enter", []),
            is_terminal=d.get("is_terminal", False),
            editor_x=d.get("editor_x", 0),
            editor_y=d.get("editor_y", 0),
        )


# ---------------------------------------------------------------------------
# Dialogue tree
# ---------------------------------------------------------------------------

@dataclass
class DialogueTree:
    dialogue_id: str
    start_node:  str
    title:       str                     = ""
    nodes:       Dict[str, DialogueNode] = field(default_factory=dict)

    def get_node(self, node_id: str) -> Optional[DialogueNode]:
        return self.nodes.get(node_id)

    def add_node(self, node: DialogueNode) -> None:
        self.nodes[node.node_id] = node

    def remove_node(self, node_id: str) -> None:
        self.nodes.pop(node_id, None)
        # Clean up references
        for node in self.nodes.values():
            for choice in node.choices:
                if choice.next_node == node_id:
                    choice.next_node = None

    def to_dict(self) -> dict:
        return {
            "id": self.dialogue_id,
            "title": self.title,
            "start_node": self.start_node,
            "nodes": {nid: n.to_dict() for nid, n in self.nodes.items()},
        }

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueTree":
        nodes = {nid: DialogueNode.from_dict(n) for nid, n in d.get("nodes", {}).items()}
        return cls(
            dialogue_id=d.get("id", "dialogue"),
            title=d.get("title", ""),
            start_node=d.get("start_node", ""),
            nodes=nodes,
        )

    @classmethod
    def load(cls, path: str) -> "DialogueTree":
        with open(path) as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def empty(cls, dialogue_id: str) -> "DialogueTree":
        tree = cls(dialogue_id=dialogue_id, title="New Dialogue", start_node="node_0")
        node = DialogueNode(
            node_id="node_0",
            speaker="NPC",
            text="Hello, investigator.",
            choices=[
                DialogueChoice("farewell", "Goodbye.", next_node=None),
            ],
        )
        tree.add_node(node)
        return tree


# ---------------------------------------------------------------------------
# Dialogue registry
# ---------------------------------------------------------------------------

class DialogueRegistry:
    _trees: Dict[str, DialogueTree] = {}

    @classmethod
    def register(cls, tree: DialogueTree) -> None:
        cls._trees[tree.dialogue_id] = tree

    @classmethod
    def get(cls, dialogue_id: str) -> Optional[DialogueTree]:
        return cls._trees.get(dialogue_id)

    @classmethod
    def clear(cls) -> None:
        cls._trees.clear()
