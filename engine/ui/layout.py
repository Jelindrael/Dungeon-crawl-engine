"""
Screen layout constants for the 1280×720 Cyclopean-style UI.

Panels:
  BANNER     – full-width decorative title strip (top)
  LEFT       – location, mini-map, inventory keys, character stats
  VIEWPORT   – center: tile map or encounter illustration
  LOG        – scrolling text log (below viewport)
  RIGHT      – menu buttons + directional pad
"""
import pygame

W, H = 1280, 720

# Panel rectangles
BANNER   = pygame.Rect(0,    0,    1280, 60)
LEFT     = pygame.Rect(0,    60,   200,  660)
VIEWPORT = pygame.Rect(200,  60,   920,  420)
LOG      = pygame.Rect(200,  480,  920,  240)
RIGHT    = pygame.Rect(1120, 60,   160,  660)

# Within the RIGHT panel
RIGHT_BUTTONS_TOP  = RIGHT.top + 10
RIGHT_BUTTONS_H    = 360        # space for 7 menu buttons
RIGHT_DPAD_TOP     = RIGHT.top + RIGHT_BUTTONS_H + 20
RIGHT_DPAD_H       = RIGHT.height - RIGHT_BUTTONS_H - 30

# Within the LEFT panel – vertical sections
LEFT_LOCATION_Y  = LEFT.top + 8
LEFT_LOCATION_H  = 80
LEFT_MINIMAP_Y   = LEFT_LOCATION_Y + LEFT_LOCATION_H + 4
LEFT_MINIMAP_H   = 160
LEFT_KEYS_Y      = LEFT_MINIMAP_Y + LEFT_MINIMAP_H + 4
LEFT_KEYS_H      = 100
LEFT_STATUS_Y    = LEFT_KEYS_Y + LEFT_KEYS_H + 4

MINIMAP_RECT = pygame.Rect(LEFT.left + 4, LEFT_MINIMAP_Y, LEFT.width - 8, LEFT_MINIMAP_H)

# Tile size in the main viewport (pixels per tile)
TILE_SIZE = 20

# Number of tiles visible in viewport
TILES_W = VIEWPORT.width  // TILE_SIZE   # 46
TILES_H = VIEWPORT.height // TILE_SIZE   # 21

# Font sizes
FONT_SM  = 11     # status labels, tile glyphs
FONT_MD  = 13     # body text, log
FONT_LG  = 16     # panel headers
FONT_XL  = 22     # title banner
FONT_XXL = 32     # game title

# UI padding / margin
PAD = 6

# Button dimensions in the right panel
BTN_W  = RIGHT.width - 16
BTN_H  = 36
BTN_GAP = 4

# DPAD button dimensions
DPAD_BTN = 44
DPAD_GAP = 4
