// space-invaders-bd — Node unit tests for game.js (pure logic).
// Run: node tests/test.js
'use strict';

const assert = require('assert');
const G = require('../game.js');

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS ' + name);
  } catch (e) {
    console.log('FAIL ' + name + ' — ' + e.message);
    process.exitCode = 1;
  }
}

check('formation has 50 invaders in 5 rows x 10 cols', () => {
  const g = G.createGame('normal');
  assert.strictEqual(g.invaders.length, 50);
  assert.strictEqual(G.aliveInvaders(g).length, 50);
  assert.strictEqual(g.lives, 3);
  assert.strictEqual(g.level, 1);
  assert.strictEqual(g.score, 0);
  assert.strictEqual(g.status, 'playing');
});

check('invader scores by row: top 30, middle 20, bottom 10', () => {
  assert.strictEqual(G.invaderScore(0), 30);
  assert.strictEqual(G.invaderScore(1), 20);
  assert.strictEqual(G.invaderScore(2), 20);
  assert.strictEqual(G.invaderScore(3), 10);
  assert.strictEqual(G.invaderScore(4), 10);
});

check('shields: 4 shields, 22x12 cells, arch cut-out at bottom centre', () => {
  const g = G.createGame('normal');
  assert.strictEqual(g.shields.length, 4);
  for (const s of g.shields) {
    assert.strictEqual(s.cells.length, 12);
    assert.strictEqual(s.cells[0].length, 22);
    assert.strictEqual(s.cells[11][11], false); // arch centre bottom
    assert.strictEqual(s.cells[0][11], true); // top centre solid
  }
});

check('player movement clamps to the field edges', () => {
  const g = G.createGame('normal');
  G.movePlayer(g, -1, 10);
  assert.strictEqual(g.playerX, 0);
  G.movePlayer(g, 1, 10);
  assert.strictEqual(g.playerX, G.FIELD_W - G.PLAYER_W);
});

check('firePlayer allows only one player bullet at a time', () => {
  const g = G.createGame('normal');
  assert.strictEqual(G.firePlayer(g), true);
  assert.strictEqual(G.firePlayer(g), false);
  assert.strictEqual(g.shotsFired, 1);
});

check('formation reverses direction and descends at the right edge', () => {
  const g = G.createGame('normal');
  for (const v of g.invaders) v.x = G.FIELD_W - G.INV_W - 2;
  const y0 = g.invaders[0].y;
  G.stepFormation(g);
  assert.strictEqual(g.dir, -1);
  assert.strictEqual(g.invaders[0].y, y0 + G.INV_DESCEND);
});

check('formation reverses direction and descends at the left edge', () => {
  const g = G.createGame('normal');
  g.dir = -1;
  for (const v of g.invaders) v.x = 2;
  const y0 = g.invaders[0].y;
  G.stepFormation(g);
  assert.strictEqual(g.dir, 1);
  assert.strictEqual(g.invaders[0].y, y0 + G.INV_DESCEND);
});

check('step speed increases as invaders die', () => {
  const g = G.createGame('normal');
  const full = G.currentStepMs(g);
  g.invaders.forEach((v, i) => { if (i > 0) v.alive = false; });
  const one = G.currentStepMs(g);
  assert.ok(one < full, 'one invader (' + one + 'ms) should step faster than 50 (' + full + 'ms)');
  assert.ok(one >= 90, 'step time never below 90ms');
});

check('player bullet destroys an invader and awards its row score', () => {
  const g = G.createGame('normal');
  const target = g.invaders.find((v) => v.row === 0);
  g.playerBullet = { x: target.x + 5, y: target.y + 5 };
  G.update(g, 16);
  assert.strictEqual(target.alive, false);
  assert.strictEqual(g.score, 30);
  assert.strictEqual(g.playerBullet, null);
  assert.strictEqual(g.kills, 1);
});

check('player bullet hitting a shield erodes cells and is consumed', () => {
  const g = G.createGame('normal');
  const s = g.shields[0];
  const before = s.cells.flat().filter(Boolean).length;
  g.playerBullet = { x: s.x + 10, y: s.y + 5 };
  G.update(g, 16);
  const after = s.cells.flat().filter(Boolean).length;
  assert.ok(after < before, 'cells should be eroded');
  assert.strictEqual(g.playerBullet, null);
});

check('invader bullet hitting the player costs a life', () => {
  const g = G.createGame('normal');
  g.invBullets = [{ x: g.playerX + 5, y: G.PLAYER_Y - 5 }];
  G.update(g, 16);
  assert.strictEqual(g.lives, 2);
  assert.strictEqual(g.status, 'playing');
});

check('three player hits end the game', () => {
  const g = G.createGame('normal');
  for (let i = 0; i < 3; i++) {
    g.invBullets = [{ x: g.playerX + 5, y: G.PLAYER_Y - 5 }];
    G.update(g, 16);
  }
  assert.strictEqual(g.lives, 0);
  assert.strictEqual(g.status, 'game-over');
});

check('invaders reaching the player line end the game', () => {
  const g = G.createGame('normal');
  for (const v of g.invaders) v.y = G.PLAYER_Y - G.INV_H;
  G.stepFormation(g);
  assert.strictEqual(g.status, 'game-over');
});

check('clearing the fleet sets level-clear and adds the +200 bonus', () => {
  const g = G.createGame('normal');
  for (const v of g.invaders) v.alive = false;
  // One invader left alive so update() can register the kill path is not needed:
  // with zero alive, update() marks level-clear directly.
  g.score = 500;
  G.update(g, 16);
  assert.strictEqual(g.status, 'level-clear');
  assert.strictEqual(g.score, 700);
});

check('nextLevel rebuilds a fresh fleet and speeds the game up', () => {
  const g = G.createGame('normal');
  g.status = 'level-clear';
  const ok = G.nextLevel(g);
  assert.strictEqual(ok, true);
  assert.strictEqual(g.level, 2);
  assert.strictEqual(g.status, 'playing');
  assert.strictEqual(G.aliveInvaders(g).length, 50);
});

check('UFO hit awards one of 50/100/150/300 and removes the UFO', () => {
  const g = G.createGame('normal');
  g.ufo = { x: 100, dir: 1, score: 150 };
  g.playerBullet = { x: 110, y: G.UFO_Y + 5 };
  G.update(g, 16);
  assert.strictEqual(g.score, 150);
  assert.strictEqual(g.ufo, null);
});

check('extra life awarded once at 1000 points', () => {
  const g = G.createGame('normal');
  G.addScore(g, 999);
  assert.strictEqual(g.lives, 3);
  G.addScore(g, 1);
  assert.strictEqual(g.lives, 4);
  assert.strictEqual(g.extraLifeAwarded, true);
  G.addScore(g, 5000);
  assert.strictEqual(g.lives, 4, 'no second extra life');
});

check('accuracy is kills/shots as a rounded percent', () => {
  const g = G.createGame('normal');
  g.shotsFired = 4;
  g.kills = 3;
  assert.strictEqual(G.accuracy(g), 75);
  const empty = G.createGame('normal');
  assert.strictEqual(G.accuracy(empty), 0);
});

check('difficulty presets differ (hard is faster than easy)', () => {
  const easy = G.createGame('easy');
  const hard = G.createGame('hard');
  assert.ok(G.DIFFICULTY.hard.stepMs < G.DIFFICULTY.easy.stepMs);
  assert.ok(G.DIFFICULTY.hard.invBulletSpeed > G.DIFFICULTY.easy.invBulletSpeed);
  assert.ok(G.currentStepMs(hard) < G.currentStepMs(easy));
});

check('invader bullets cancel the player bullet on contact', () => {
  const g = G.createGame('normal');
  g.playerBullet = { x: 200, y: 300 };
  g.invBullets = [{ x: 200, y: 295 }];
  G.update(g, 1);
  assert.strictEqual(g.playerBullet, null);
  assert.strictEqual(g.invBullets.length, 0);
});

check('rectsOverlap detects touching vs separated rects', () => {
  assert.strictEqual(G.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.strictEqual(G.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }), false);
});

console.log('\n' + passed + ' checks passed.');
