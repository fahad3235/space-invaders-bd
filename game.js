// space-invaders-bd — pure game logic (no DOM). Usable from Node tests and the browser.
// Logical playfield: 480 x 560 px. Classic rules: 5x10 invader formation,
// destructible shields, mystery UFO, 3 lives, speed rises as invaders die.

'use strict';

const FIELD_W = 480;
const FIELD_H = 560;
const INV_COLS = 10;
const INV_ROWS = 5;
const INV_W = 28;
const INV_H = 20;
const INV_GAP_X = 44;
const INV_GAP_Y = 34;
const INV_STEP_X = 10;
const INV_DESCEND = 18;
const PLAYER_W = 36;
const PLAYER_H = 16;
const PLAYER_Y = FIELD_H - 34;
const PLAYER_SPEED = 280; // px/s
const BULLET_W = 3;
const BULLET_H = 12;
const BULLET_SPEED = 540; // px/s, player bullet
const SHIELD_COUNT = 4;
const SHIELD_W = 66;
const SHIELD_H = 36;
const SHIELD_CELL = 3; // px per shield cell
const SHIELD_Y = FIELD_H - 118;
const UFO_W = 40;
const UFO_H = 16;
const UFO_Y = 34;
const UFO_SCORES = [50, 100, 150, 300];
const EXTRA_LIFE_AT = 1000;

const DIFFICULTY = {
  easy:   { stepMs: 900, invBulletSpeed: 150, invFireMs: 1400, maxInvBullets: 2, ufoEveryMs: 26000 },
  normal: { stepMs: 700, invBulletSpeed: 185, invFireMs: 1050, maxInvBullets: 3, ufoEveryMs: 22000 },
  hard:   { stepMs: 520, invBulletSpeed: 225, invFireMs: 800,  maxInvBullets: 4, ufoEveryMs: 18000 },
};

// Invader type by row: top row = 30 pts, rows 1-2 = 20 pts, rows 3-4 = 10 pts.
function invaderScore(row) {
  if (row === 0) return 30;
  if (row <= 2) return 20;
  return 10;
}

function makeShields() {
  const cols = SHIELD_W / SHIELD_CELL; // 22
  const rows = SHIELD_H / SHIELD_CELL; // 12
  const shields = [];
  const totalW = SHIELD_COUNT * SHIELD_W;
  const gap = (FIELD_W - totalW) / (SHIELD_COUNT + 1);
  for (let s = 0; s < SHIELD_COUNT; s++) {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        // Arch cut-out at the bottom centre (classic bunker shape).
        const inArch = r >= rows - 4 && c >= cols / 2 - 3 && c < cols / 2 + 3;
        // Rounded top corners.
        const corner = (r === 0 && (c < 2 || c >= cols - 2));
        row.push(!inArch && !corner);
      }
      cells.push(row);
    }
    shields.push({ x: Math.round(gap + s * (SHIELD_W + gap)), y: SHIELD_Y, cells });
  }
  return shields;
}

function makeInvaders() {
  const invaders = [];
  const originX = Math.round((FIELD_W - (INV_COLS - 1) * INV_GAP_X - INV_W) / 2);
  const originY = 76;
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      invaders.push({
        col: c, row: r,
        x: originX + c * INV_GAP_X,
        y: originY + r * INV_GAP_Y,
        alive: true,
      });
    }
  }
  return invaders;
}

function createGame(difficulty) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  return {
    difficulty: difficulty in DIFFICULTY ? difficulty : 'normal',
    score: 0,
    lives: 3,
    level: 1,
    invaders: makeInvaders(),
    shields: makeShields(),
    dir: 1, // formation moves right first
    stepMs: d.stepMs,
    stepTimer: 0,
    playerX: Math.round(FIELD_W / 2 - PLAYER_W / 2),
    playerBullet: null, // {x, y}
    invBullets: [], // {x, y}
    fireTimer: 0,
    ufo: null, // {x, dir}
    ufoTimer: d.ufoEveryMs,
    status: 'playing', // 'playing' | 'level-clear' | 'game-over'
    extraLifeAwarded: false,
    kills: 0,
    shotsFired: 0,
  };
}

function aliveInvaders(g) {
  return g.invaders.filter((v) => v.alive);
}

function currentStepMs(g) {
  // Formation speeds up as invaders die: fastest 90ms at the last invader.
  const d = DIFFICULTY[g.difficulty];
  const alive = aliveInvaders(g).length;
  const total = INV_COLS * INV_ROWS;
  const base = d.stepMs - (g.level - 1) * 60;
  const scaled = base * (0.15 + 0.85 * (alive / total));
  return Math.max(90, Math.round(scaled));
}

function stepFormation(g) {
  const alive = aliveInvaders(g);
  if (alive.length === 0) return;
  const minX = Math.min(...alive.map((v) => v.x));
  const maxX = Math.max(...alive.map((v) => v.x)) + INV_W;
  let descend = false;
  if (g.dir === 1 && maxX + INV_STEP_X > FIELD_W - 4) descend = true;
  if (g.dir === -1 && minX - INV_STEP_X < 4) descend = true;
  for (const v of alive) {
    if (descend) v.y += INV_DESCEND;
    else v.x += g.dir * INV_STEP_X;
  }
  if (descend) g.dir *= -1;
  // Invaders reached the shields/player line: game over.
  const lowest = Math.max(...alive.map((v) => v.y)) + INV_H;
  if (lowest >= PLAYER_Y - 2) g.status = 'game-over';
}

function movePlayer(g, dir, dt) {
  // dir: -1 left, +1 right, 0 none. dt in seconds.
  g.playerX += dir * PLAYER_SPEED * dt;
  if (g.playerX < 0) g.playerX = 0;
  if (g.playerX > FIELD_W - PLAYER_W) g.playerX = FIELD_W - PLAYER_W;
}

function firePlayer(g) {
  if (g.status !== 'playing') return false;
  if (g.playerBullet) return false; // classic rule: one player bullet at a time
  g.playerBullet = {
    x: g.playerX + PLAYER_W / 2 - BULLET_W / 2,
    y: PLAYER_Y - BULLET_H,
  };
  g.shotsFired += 1;
  return true;
}

function pickShooter(g) {
  // Lowest alive invader in a random column.
  const alive = aliveInvaders(g);
  if (alive.length === 0) return null;
  const cols = [...new Set(alive.map((v) => v.col))];
  const col = cols[Math.floor(Math.random() * cols.length)];
  const inCol = alive.filter((v) => v.col === col);
  return inCol.reduce((a, b) => (b.y > a.y ? b : a));
}

function fireInvader(g) {
  const d = DIFFICULTY[g.difficulty];
  if (g.invBullets.length >= d.maxInvBullets) return false;
  const s = pickShooter(g);
  if (!s) return false;
  g.invBullets.push({
    x: s.x + INV_W / 2 - BULLET_W / 2,
    y: s.y + INV_H,
  });
  return true;
}

function shieldHit(shield, bx, by, bw, bh) {
  // Returns true if the bullet rect overlaps a live shield cell; erodes a
  // small patch (radius 2 cells) around the impact point.
  const relX = bx - shield.x;
  const relY = by - shield.y;
  const c0 = Math.floor(relX / SHIELD_CELL);
  const r0 = Math.floor(relY / SHIELD_CELL);
  const c1 = Math.floor((relX + bw) / SHIELD_CELL);
  const r1 = Math.floor((relY + bh) / SHIELD_CELL);
  let hit = false;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (shield.cells[r] && shield.cells[r][c]) { hit = true; }
    }
  }
  if (!hit) return false;
  // Erode a 5x5 cell patch centred on the impact.
  const cc = Math.round((relX + bw / 2) / SHIELD_CELL);
  const rr = Math.round((relY + bh / 2) / SHIELD_CELL);
  for (let r = rr - 2; r <= rr + 2; r++) {
    for (let c = cc - 2; c <= cc + 2; c++) {
      if (shield.cells[r] && c >= 0 && c < shield.cells[r].length) {
        shield.cells[r][c] = false;
      }
    }
  }
  return true;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addScore(g, pts) {
  g.score += pts;
  if (!g.extraLifeAwarded && g.score >= EXTRA_LIFE_AT) {
    g.extraLifeAwarded = true;
    g.lives += 1;
  }
}

function spawnUfo(g) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  g.ufo = { x: dir === 1 ? -UFO_W : FIELD_W, dir, score: UFO_SCORES[Math.floor(Math.random() * UFO_SCORES.length)] };
}

function update(g, dtMs) {
  if (g.status !== 'playing') return;
  const dt = dtMs / 1000;
  const d = DIFFICULTY[g.difficulty];

  // Formation step timer.
  g.stepTimer += dtMs;
  const stepMs = currentStepMs(g);
  if (g.stepTimer >= stepMs) {
    g.stepTimer = 0;
    stepFormation(g);
    if (g.status !== 'playing') return;
  }

  // UFO timer + movement.
  g.ufoTimer -= dtMs;
  if (!g.ufo && g.ufoTimer <= 0) {
    spawnUfo(g);
    g.ufoTimer = d.ufoEveryMs;
  }
  if (g.ufo) {
    g.ufo.x += g.ufo.dir * 90 * dt;
    if (g.ufo.x < -UFO_W - 10 || g.ufo.x > FIELD_W + 10) g.ufo = null;
  }

  // Invader firing.
  g.fireTimer += dtMs;
  if (g.fireTimer >= d.invFireMs) {
    g.fireTimer = 0;
    fireInvader(g);
  }

  // Player bullet.
  if (g.playerBullet) {
    g.playerBullet.y -= BULLET_SPEED * dt;
    const b = { x: g.playerBullet.x, y: g.playerBullet.y, w: BULLET_W, h: BULLET_H };
    if (g.playerBullet.y + BULLET_H < 0) {
      g.playerBullet = null;
    } else {
      let consumed = false;
      // UFO hit?
      if (g.ufo && rectsOverlap(b, { x: g.ufo.x, y: UFO_Y, w: UFO_W, h: UFO_H })) {
        addScore(g, g.ufo.score);
        g.ufo = null;
        consumed = true;
      }
      // Invader hit?
      if (!consumed) {
        for (const v of g.invaders) {
          if (v.alive && rectsOverlap(b, { x: v.x, y: v.y, w: INV_W, h: INV_H })) {
            v.alive = false;
            g.kills += 1;
            addScore(g, invaderScore(v.row));
            consumed = true;
            break;
          }
        }
      }
      // Shield hit?
      if (!consumed) {
        for (const s of g.shields) {
          if (b.y + BULLET_H >= s.y && b.y <= s.y + SHIELD_H && shieldHit(s, b.x, b.y, BULLET_W, BULLET_H)) {
            consumed = true;
            break;
          }
        }
      }
      if (consumed) g.playerBullet = null;
    }
  }

  // Invader bullets.
  const kept = [];
  for (const ib of g.invBullets) {
    ib.y += (d.invBulletSpeed + (g.level - 1) * 12) * dt;
    const b = { x: ib.x, y: ib.y, w: BULLET_W, h: BULLET_H + 4 };
    let dead = false;
    if (ib.y > FIELD_H) dead = true;
    // Shield hit?
    if (!dead) {
      for (const s of g.shields) {
        if (b.y + b.h >= s.y && b.y <= s.y + SHIELD_H && shieldHit(s, b.x, b.y, BULLET_W, BULLET_H + 4)) {
          dead = true;
          break;
        }
      }
    }
    // Player hit?
    if (!dead && rectsOverlap(b, { x: g.playerX, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H })) {
      dead = true;
      g.lives -= 1;
      g.playerBullet = null;
      if (g.lives <= 0) g.status = 'game-over';
    }
    // Invader bullet vs player bullet (classic: they cancel).
    if (!dead && g.playerBullet) {
      const pb = { x: g.playerBullet.x, y: g.playerBullet.y, w: BULLET_W, h: BULLET_H };
      if (rectsOverlap(b, pb)) {
        dead = true;
        g.playerBullet = null;
      }
    }
    if (!dead) kept.push(ib);
  }
  g.invBullets = kept;

  // Level cleared?
  if (aliveInvaders(g).length === 0 && g.status === 'playing') {
    g.status = 'level-clear';
    g.score += 200; // level-clear bonus
  }
}

function nextLevel(g) {
  if (g.status !== 'level-clear') return false;
  const d = DIFFICULTY[g.difficulty];
  g.level += 1;
  g.invaders = makeInvaders();
  g.shields = makeShields();
  g.dir = 1;
  g.stepMs = d.stepMs;
  g.stepTimer = 0;
  g.playerBullet = null;
  g.invBullets = [];
  g.ufo = null;
  g.ufoTimer = d.ufoEveryMs;
  g.status = 'playing';
  return true;
}

function accuracy(g) {
  if (g.shotsFired === 0) return 0;
  return Math.round((g.kills / g.shotsFired) * 100);
}

const API = {
  FIELD_W, FIELD_H, INV_COLS, INV_ROWS, INV_W, INV_H, INV_GAP_X, INV_GAP_Y,
  INV_STEP_X, INV_DESCEND, PLAYER_W, PLAYER_H, PLAYER_Y, PLAYER_SPEED,
  BULLET_W, BULLET_H, BULLET_SPEED, SHIELD_COUNT, SHIELD_W, SHIELD_H,
  SHIELD_CELL, SHIELD_Y, UFO_W, UFO_H, UFO_Y, UFO_SCORES, EXTRA_LIFE_AT,
  DIFFICULTY, invaderScore, makeShields, makeInvaders, createGame,
  aliveInvaders, currentStepMs, stepFormation, movePlayer, firePlayer,
  pickShooter, fireInvader, shieldHit, rectsOverlap, addScore, spawnUfo,
  update, nextLevel, accuracy,
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.Game = API;
