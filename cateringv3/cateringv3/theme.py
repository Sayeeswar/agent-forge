"""Visual system: color tokens, fonts, shared style dicts (approximated from screenshots)."""

COLORS = {
    "cream": "#F5EFE6",
    "card": "#FFFFFF",
    "terracotta": "#B5502E",
    "terracotta_soft": "#F6E6DC",
    "ink": "#241E1A",
    "muted": "#8A8178",
    "green": "#2E7D32",
    "green_soft": "#E8F0E9",
    "today_blue": "#DCE7F0",
}

FONT_SERIF = "Playfair Display, serif"
FONT_SANS = "Inter, sans-serif"

FONT_FACE_CSS = """
@font-face {
  font-family: 'Playfair Display';
  src: url('/fonts/PlayfairDisplay.woff2') format('woff2');
  font-weight: 400 900; font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-weight: 100 900; font-display: swap;
}
"""

CARD_STYLE = {
    "background": COLORS["card"],
    "border_radius": "16px",
    "padding": "16px",
    "box_shadow": "0 1px 2px rgba(0,0,0,0.05)",
}

PILL_STYLE = {
    "border_radius": "9999px",
    "padding": "8px 16px",
    "font_size": "14px",
}

SHEET_STYLE = {
    "background": COLORS["card"],
    "border_radius": "24px 24px 0 0",
    "padding": "20px",
}
