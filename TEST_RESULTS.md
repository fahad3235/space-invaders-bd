# TEST_RESULTS.md — space-invaders-bd (factory run #260)

Date: 2026-11-07 (09:00 Asia/Dhaka slot)
Build: `~/workspace/muse-project-factory/builds/space-invaders-bd/`

## Node unit tests — 21/21 passed

Command: `node tests/test.js` (tests `game.js`, the DOM-free logic module)

- formation has 50 invaders in 5 rows x 10 cols
- invader scores by row: top 30, middle 20, bottom 10
- shields: 4 shields, 22x12 cells, arch cut-out at bottom centre
- player movement clamps to the field edges
- firePlayer allows only one player bullet at a time
- formation reverses direction and descends at the right edge
- formation reverses direction and descends at the left edge
- step speed increases as invaders die
- player bullet destroys an invader and awards its row score
- player bullet hitting a shield erodes cells and is consumed
- invader bullet hitting the player costs a life
- three player hits end the game
- invaders reaching the player line end the game
- clearing the fleet sets level-clear and adds the +200 bonus
- nextLevel rebuilds a fresh fleet and speeds the game up
- UFO hit awards one of 50/100/150/300 and removes the UFO
- extra life awarded once at 1000 points
- accuracy is kills/shots as a rounded percent
- difficulty presets differ (hard is faster than easy)
- invader bullets cancel the player bullet on contact
- rectsOverlap detects touching vs separated rects

## Headless-Chrome smoke tests — 18/18 passed (1280px and 390px)

Method: raw CDP against the cached `headless_shell-1187` binary, `file://` URL,
real key events (ArrowLeft, Space), real button clicks. Script: `/tmp/si-smoke.mjs`.

At both 1280px and 390px viewports:

- page loads without page errors
- title starts with "Space Invaders BD"
- canvas present, 480x560
- menu overlay visible at load
- HUD shows score 0, lives 3 hearts
- start hides menu overlay
- pause button enabled after start
- canvas is actually drawing (2,688 sampled lit pixels)
- game still running after 3s (no crash overlay)
- pause shows pause overlay
- resume hides pause overlay
- Bangla toggle switches title to Bengali (স্পেস ইনভেডার্স বিডি)
- HUD digits render in Bengali after toggle (০)
- difficulty select accepts hard
- touch buttons present
- no horizontal overflow
- no console errors during play
- no page exceptions during play

(First 1280px run was 17/18: the title check used an exact match while the real
title is "Space Invaders BD — Classic Arcade Shooter". The check was corrected
to a prefix match; re-run 18/18.)

## Visual check

Screenshot `/tmp/si-shot.png` (1280x900, headless_shell) hand-verified: title,
subtitle, language/sound chips, 4-stat HUD, difficulty + Pause/Restart row,
"Defend Earth!" menu overlay with Start button, 5-row invader formation in
red/amber/green, 4 green shields, player cannon at the bottom. No clipping,
no overflow.
