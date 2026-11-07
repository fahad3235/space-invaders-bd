// space-invaders-bd — browser glue: canvas rendering, input, sound, persistence.
// Depends on game.js (logic) and i18n.js (strings). Zero network requests.
'use strict';

/* global Game, I18N, bnDigits, fmtNum */

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

const LS = {
  best: 'si-bd-best',
  lang: 'si-bd-lang',
  diff: 'si-bd-difficulty',
  sound: 'si-bd-sound',
};

let lang = localStorage.getItem(LS.lang) || 'en';
let difficulty = localStorage.getItem(LS.diff) || 'normal';
let soundOn = localStorage.getItem(LS.sound) !== 'off';
let best = parseInt(localStorage.getItem(LS.best) || '0', 10) || 0;

let game = Game.createGame(difficulty);
let screen = 'menu'; // menu | playing | paused | over | clear
let keys = {};
let lastTs = 0;
let toastTimer = null;
let prevLives = game.lives;
let prevUfo = null;

// ---- Invader pixel sprites (11 x 8), two animation frames each ----
const SPRITES = {
  // row 0 — 30 pts (crab)
  0: [
    ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
    ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'],
  ],
  // rows 1-2 — 20 pts (squid)
  1: [
    ['...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '...X...X...', '..X.....X..', '.XX.....XX.'],
    ['...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '..XX...XX..', '.XX.....XX.', 'XX.......XX'],
  ],
  // rows 3-4 — 10 pts (octopus)
  2: [
    ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XX.XX.XX.XX', 'XXXXXXXXXXXX', '...XX..XX...', '..XX.XX.XX..', 'XX........XX'],
    ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XX.XX.XX.XX', 'XXXXXXXXXXXX', '..XX.XX.XX..', '.XX......XX.', '..XX....XX..'],
  ],
};
const SPRITE_COLORS = { 0: '#ff5d5d', 1: '#ffb84d', 2: '#7ee787' };
let animFrame = 0;
let animTimer = 0;

function drawSprite(rows, x, y, w, h, color) {
  const cw = w / rows[0].length;
  const ch = h / rows.length;
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === 'X') ctx.fillRect(x + c * cw, y + r * ch, cw + 0.5, ch + 0.5);
    }
  }
}

// ---- Sound (tiny WebAudio synth) ----
let audioCtx = null;
function beep(freqA, freqB, dur, type, vol) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freqA, audioCtx.currentTime);
    if (freqB) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* audio unavailable — game still works */ }
}
const sfx = {
  shoot: () => beep(880, 320, 0.09, 'square', 0.04),
  hit: () => beep(220, 60, 0.16, 'sawtooth', 0.06),
  playerHit: () => beep(320, 50, 0.4, 'sawtooth', 0.08),
  ufo: () => beep(1200, 900, 0.12, 'sine', 0.05),
  clear: () => { beep(523, 0, 0.12, 'square', 0.05); setTimeout(() => beep(659, 0, 0.12, 'square', 0.05), 120); setTimeout(() => beep(784, 0, 0.2, 'square', 0.05), 240); },
};

// ---- Rendering ----
function draw() {
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, Game.FIELD_W, Game.FIELD_H);

  // Stars (static, seeded by index for stability).
  ctx.fillStyle = '#1b2b4a';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97 + 13) % Game.FIELD_W;
    const sy = (i * 61 + 29) % Game.FIELD_H;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Shields.
  ctx.fillStyle = '#2fbf5a';
  for (const s of game.shields) {
    for (let r = 0; r < s.cells.length; r++) {
      for (let c = 0; c < s.cells[r].length; c++) {
        if (s.cells[r][c]) ctx.fillRect(s.x + c * Game.SHIELD_CELL, s.y + r * Game.SHIELD_CELL, Game.SHIELD_CELL, Game.SHIELD_CELL);
      }
    }
  }

  // Invaders.
  for (const v of game.invaders) {
    if (!v.alive) continue;
    const kind = v.row === 0 ? 0 : (v.row <= 2 ? 1 : 2);
    drawSprite(SPRITES[kind][animFrame], v.x, v.y, Game.INV_W, Game.INV_H, SPRITE_COLORS[kind]);
  }

  // UFO.
  if (game.ufo) {
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.ellipse(game.ufo.x + Game.UFO_W / 2, Game.UFO_Y + 10, Game.UFO_W / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.arc(game.ufo.x + Game.UFO_W / 2, Game.UFO_Y + 6, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(game.ufo.x + 8, Game.UFO_Y + 9, 3, 3);
    ctx.fillRect(game.ufo.x + 18, Game.UFO_Y + 9, 3, 3);
    ctx.fillRect(game.ufo.x + 28, Game.UFO_Y + 9, 3, 3);
  }

  // Player cannon.
  const px = game.playerX;
  const py = Game.PLAYER_Y;
  ctx.fillStyle = '#4dd0e1';
  ctx.fillRect(px + Game.PLAYER_W / 2 - 2, py, 4, 7); // barrel
  ctx.fillRect(px + 4, py + 6, Game.PLAYER_W - 8, 5); // body
  ctx.fillRect(px, py + 11, Game.PLAYER_W, 5); // base
  ctx.fillStyle = '#b2ebf2';
  ctx.fillRect(px + Game.PLAYER_W / 2 - 1, py + 1, 2, 4);

  // Player bullet.
  if (game.playerBullet) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(game.playerBullet.x, game.playerBullet.y, Game.BULLET_W, Game.BULLET_H);
  }
  // Invader bullets.
  ctx.fillStyle = '#ffea00';
  for (const b of game.invBullets) {
    ctx.fillRect(b.x, b.y, Game.BULLET_W, Game.BULLET_H + 4);
  }

  // Ground line.
  ctx.fillStyle = '#2fbf5a';
  ctx.fillRect(0, Game.FIELD_H - 4, Game.FIELD_W, 2);
}

// ---- HUD / overlays ----
function t(key) { return I18N[lang][key] || I18N.en[key] || key; }

function updateHud() {
  $('score').textContent = fmtNum(game.score, lang);
  $('best').textContent = fmtNum(Math.max(best, game.score), lang);
  $('level').textContent = fmtNum(game.level, lang);
  $('lives').textContent = '♥'.repeat(Math.max(0, game.lives)) + (game.lives <= 0 ? '—' : '');
  $('lives').style.color = game.lives <= 1 ? '#ff5d5d' : '#ff8fa3';
}

function showOverlay(id) {
  for (const o of ['overlay-menu', 'overlay-pause', 'overlay-over', 'overlay-clear']) {
    $(o).classList.toggle('hidden', o !== id);
  }
  if (!id) {
    for (const o of ['overlay-menu', 'overlay-pause', 'overlay-over', 'overlay-clear']) $(o).classList.add('hidden');
  }
}

function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1600);
}

function applyLang() {
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  $('lang-toggle').textContent = lang === 'bn' ? 'English' : 'বাংলা';
  $('sound-toggle').textContent = (soundOn ? '🔊 ' : '🔇 ') + t('sound') + ': ' + t(soundOn ? 'on' : 'off');
  $('pause-btn').textContent = screen === 'paused' ? t('resume') : t('pause');
  updateHud();
}

function saveBest() {
  if (game.score > best) {
    best = game.score;
    localStorage.setItem(LS.best, String(best));
    return true;
  }
  return false;
}

// ---- Flow ----
function startGame() {
  game = Game.createGame(difficulty);
  prevLives = game.lives;
  prevUfo = null;
  screen = 'playing';
  showOverlay(null);
  $('pause-btn').disabled = false;
  updateHud();
  lastTs = performance.now();
}

function endGame() {
  screen = 'over';
  const isBest = saveBest();
  $('final-score').textContent = fmtNum(game.score, lang);
  $('final-best').textContent = fmtNum(best, lang);
  $('final-accuracy').textContent = fmtNum(Game.accuracy(game), lang) + '%';
  $('final-kills').textContent = fmtNum(game.kills, lang);
  $('new-best').classList.toggle('hidden', !isBest);
  $('pause-btn').disabled = true;
  showOverlay('overlay-over');
  updateHud();
}

function levelClear() {
  screen = 'clear';
  saveBest();
  sfx.clear();
  $('clear-score').textContent = fmtNum(game.score, lang);
  $('clear-level').textContent = fmtNum(game.level, lang);
  showOverlay('overlay-clear');
  updateHud();
}

function togglePause() {
  if (screen === 'playing') {
    screen = 'paused';
    showOverlay('overlay-pause');
    $('pause-btn').textContent = t('resume');
  } else if (screen === 'paused') {
    screen = 'playing';
    showOverlay(null);
    $('pause-btn').textContent = t('pause');
    lastTs = performance.now();
  }
}

// ---- Main loop ----
function loop(ts) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(50, ts - lastTs);
  lastTs = ts;
  if (screen !== 'playing') { draw(); return; }

  // Movement input.
  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA || touchDir === -1) dir -= 1;
  if (keys.ArrowRight || keys.KeyD || touchDir === 1) dir += 1;
  if (dir) Game.movePlayer(game, dir, dtMs / 1000);

  // Sprite animation flips on each formation step tick.
  animTimer += dtMs;
  if (animTimer > 400) { animTimer = 0; animFrame = 1 - animFrame; }

  const beforeLives = game.lives;
  const beforeUfo = !!game.ufo;
  const beforeScore = game.score;
  Game.update(game, dtMs);
  if (game.lives < beforeLives) {
    sfx.playerHit();
    if (game.lives === 1) showToast(t('lives') + ': 1');
  }
  if (game.score > beforeScore && game.ufo === null && beforeUfo) {
    sfx.ufo();
    showToast(t('ufoBonus'));
  }
  if (game.lives > beforeLives) showToast(t('extraLife'));
  if (game.status === 'game-over') { endGame(); return; }
  if (game.status === 'level-clear') { levelClear(); return; }
  updateHud();
}

// ---- Input ----
let touchDir = 0;
let fireHeld = false;
let fireTimer = null;

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); }
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === 'Space' && screen === 'playing') {
    if (Game.firePlayer(game)) sfx.shoot();
  }
  if (e.code === 'KeyP' && (screen === 'playing' || screen === 'paused')) togglePause();
  if (e.code === 'Enter' && (screen === 'menu' || screen === 'over' || screen === 'clear')) {
    if (screen === 'clear') { Game.nextLevel(game); screen = 'playing'; showOverlay(null); lastTs = performance.now(); }
    else startGame();
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

function bindHold(id, dir) {
  const el = $(id);
  const on = (e) => { e.preventDefault(); touchDir = dir; };
  const off = (e) => { e.preventDefault(); if (touchDir === dir) touchDir = 0; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
bindHold('btn-left', -1);
bindHold('btn-right', 1);

const fireBtn = $('btn-fire');
fireBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (screen !== 'playing') return;
  if (Game.firePlayer(game)) sfx.shoot();
  fireHeld = true;
  clearInterval(fireTimer);
  fireTimer = setInterval(() => {
    if (fireHeld && screen === 'playing' && Game.firePlayer(game)) sfx.shoot();
  }, 260);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
  fireBtn.addEventListener(ev, () => { fireHeld = false; clearInterval(fireTimer); }));

// Drag on the canvas to move the cannon.
let dragging = false;
canvas.addEventListener('pointerdown', (e) => { dragging = true; moveCannonTo(e); });
canvas.addEventListener('pointermove', (e) => { if (dragging) moveCannonTo(e); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
  canvas.addEventListener(ev, () => { dragging = false; }));
function moveCannonTo(e) {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * Game.FIELD_W;
  game.playerX = Math.max(0, Math.min(Game.FIELD_W - Game.PLAYER_W, x - Game.PLAYER_W / 2));
}

// ---- Buttons ----
$('start-btn').addEventListener('click', startGame);
$('pause-btn').addEventListener('click', togglePause);
$('resume-btn').addEventListener('click', togglePause);
$('restart-btn').addEventListener('click', startGame);
$('play-again-btn').addEventListener('click', startGame);
$('next-level-btn').addEventListener('click', () => {
  Game.nextLevel(game);
  screen = 'playing';
  showOverlay(null);
  lastTs = performance.now();
});
$('lang-toggle').addEventListener('click', () => {
  lang = lang === 'bn' ? 'en' : 'bn';
  localStorage.setItem(LS.lang, lang);
  applyLang();
});
$('sound-toggle').addEventListener('click', () => {
  soundOn = !soundOn;
  localStorage.setItem(LS.sound, soundOn ? 'on' : 'off');
  applyLang();
});
$('diff-select').addEventListener('change', (e) => {
  difficulty = e.target.value;
  localStorage.setItem(LS.diff, difficulty);
  game = Game.createGame(difficulty);
  updateHud();
});
// (The How-to section is a native <details> element; no JS needed.)

// ---- Init ----
$('diff-select').value = difficulty;
applyLang();
showOverlay('overlay-menu');
updateHud();
requestAnimationFrame(loop);
