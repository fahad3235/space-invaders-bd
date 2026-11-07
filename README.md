# Space Invaders BD

A free, fully offline, bilingual (Bangla / English) Space Invaders-style arcade shooter. Defend Earth from a marching fleet of 50 invaders, hide behind destructible shields, and shoot the mystery UFO for bonus points. No account, no network, no ads — your best score lives only on your device.

> Factory run #261 — built 2026-11-07 (09:00 Asia/Dhaka slot).

## Features

- **Classic arcade gameplay** — 5×10 invader formation (50 invaders) that marches side to side, descends at the edges, and speeds up as invaders die
- **Row scoring** — top row 30 pts, middle rows 20 pts, bottom rows 10 pts; level-clear bonus +200
- **Mystery UFO** — a red UFO crosses the top at random intervals, worth 50 / 100 / 150 / 300 pts
- **Destructible shields** — 4 green bunkers that erode cell by cell when hit by either side's bullets
- **3 lives + extra life at 1,000 points**, level progression (each level faster)
- **3 difficulties** — Easy / Normal / Hard (formation speed, invader fire rate, UFO frequency)
- **Controls** — keyboard (← → / A D to move, Space to fire, P to pause, Enter to start), on-screen touch buttons (hold to move, tap FIRE), or drag the cannon on the canvas
- **WebAudio sound effects** with a mute toggle (shoot, hit, UFO, level-clear jingle)
- **Bilingual UI** — English / বাংলা toggle, persisted, with Bengali digits
- **Best score, accuracy, kills and shots** shown on the game-over screen; best score persisted in localStorage
- **Responsive** — verified at desktop and 390px mobile, no horizontal overflow
- **Offline** — zero network requests; open `index.html` and play

## How to play

Move the cannon, fire one bullet at a time (classic rule), and destroy the whole fleet before it reaches the ground. Invaders shoot back — their bullets erode your shields and cost a life on hit. Bullets cancel each other in mid-air. Clear a level to face a faster fleet.

## Stack

- Vanilla HTML + CSS + JavaScript (no frameworks, no build step)
- Canvas 2D rendering with hand-drawn pixel sprites
- Game logic in `game.js` (DOM-free, unit-tested from Node)
- WebAudio for sound effects

## Project layout

```
index.html   — page, HUD, overlays, touch controls
style.css    — dark arcade theme, responsive to 390px
app.js       — rendering, input, sound, persistence (browser glue)
game.js      — pure game logic (also required by the Node tests)
i18n.js      — English / Bangla strings + Bengali-digit formatting
tests/test.js — Node unit tests for game.js
```

## Run it

Just open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Testing

```bash
node tests/test.js        # 21 unit checks (formation, scoring, shields, lives, UFO, levels)
```

Headless-Chrome smoke tests (raw CDP against the cached `headless_shell` binary) cover: page load with zero console/page errors, start/pause/resume flow, keyboard movement + firing, canvas actually drawing, Bangla toggle (title + digits), difficulty select, touch buttons, and no horizontal overflow at 1280px and 390px. See `TEST_RESULTS.md` for the real results.

## Limitations

- Sound needs a user gesture first (browser autoplay policy); the first click or keypress unlocks it.
- Scores are stored per browser/device only — there is no online leaderboard.
- One player bullet at a time, by design (the classic rule).
- This is an original re-implementation inspired by the arcade classic; it is not affiliated with the original Space Invaders.

## Status

Complete MVP — playable end to end, tested, no known blocking bugs.
