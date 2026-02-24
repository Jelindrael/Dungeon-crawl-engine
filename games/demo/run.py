#!/usr/bin/env python3
"""
The Dungeon of Aeloria
======================

A demo game for the Dungeon Crawl Engine.

Run with:
    python -m games.demo.run
    # or from project root:
    python games/demo/run.py
"""
import sys
import os

# Allow running from the project root without installing
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine import GameEngine, Theme
from games.demo.content import CLASSES, register_all

TITLE_ART = r"""
    _   _____ _     ___  ____  ___    _
   / \ | ____| |   / _ \|  _ \|_ _|  / \
  / _ \|  _| | |  | | | | |_) || |  / _ \
 / ___ \ |___| |__| |_| |  _ < | | / ___ \
/_/   \_\_____|_____\___/|_| \_\___/_/   \_\
"""


def main() -> None:
    # Register all game content (items + scenes)
    register_all()

    engine = GameEngine(
        start_scene="intro",
        game_title="THE DUNGEON OF AELORIA",
        theme=Theme.GREEN(),
        classes=CLASSES,
        save_file="aeloria_save.json",
    )

    # Override the title art
    engine.renderer.print_title_screen(
        title="THE DUNGEON OF AELORIA",
        subtitle="A Dungeon Crawl Engine Demo  ·  v1.0",
        art=TITLE_ART,
    )
    engine.renderer.press_any_key()

    # Clear the title screen flag so run() doesn't show it again
    engine._show_title = lambda: None  # type: ignore[method-assign]

    engine.run()


if __name__ == "__main__":
    main()
