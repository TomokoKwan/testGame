Shapes & Shields — Demo

A minimal HTML5 canvas game where the player is a triangle and can toggle a circular shield to block incoming projectiles from enemy shapes.

Files included:
- `index.html` — main page
- `style.css` — basic styling
- `main.js` — game logic (movement, enemies, shield)

How to run locally:

Open `index.html` in a browser. For best results serve over a local HTTP server (PowerShell):

```powershell
# from the project folder (d:\TestGame\test\testGame)
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Controls:
- Move: WASD or arrow keys (also slight mouse-follow)
- Toggle shield: Space (or hold touch)
- Restart: R

Notes / next steps:
- Add sounds and particle effects
- Add multiple shield types and power-ups
- Persist high score
- Add keyboard-only/ touch-friendly UI

Enjoy! Feel free to ask for refinements (different shapes, AI, networking, or export to Electron/Unity).
