'use strict';
/* VELMARA main.js — one job: run the game.
   Input, the player on foot and behind the wheel, traffic and
   crowds, combat, taxi fares, coins, garages, the clock, saving,
   and the main loop. Everything else lives in its own file. */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  view: { w: 1280, h: 720 },
  time: 0, hour: 9.0, state: 'menu', paused: false,
  menuSel: 0, garageOpen: false, shopOpen: false, helpOpen: false,
  messages: [], particles: [], pickups: [], traffic: [], peds: [], parked: [],
  fare: null, fareTimer: 0, saveTimer: 0, shake: 0, ramCd: 0, cam: { x: 0, y: 0 },
  keys: {}, mouse: { x: 0, y: 0, clicked: false },
  player: {
    x: 1200, y: 1100, angle: 0, speed: 0, onFoot: true, health: 100,
    money: 250, rep: 0, heat: 0, wanted: 0, ammo: 12, car: null, nitro: false,
  },
  stats: { fares: 0, coins: 0, carsStolen: 0, missionsDone: 0 },
};

function message(text, secs) {
  G.messages.push({ text, life: secs || 3.5 });
  if (G.messages.length > 4) G.messages.shift();
}
G.message = message;
G.addHeat = function (n) {
  G.player.heat = clamp(G.player.heat + n, 0, 100);
  G.player.wanted = starsForHeat(G.player.heat);
};
G.saveGame = function () {
  try {
    const P = G.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: P.money, rep: P.rep, health: P.health, ammo: P.ammo,
      x: P.x, y: P.y, hour: G.hour, done: Missions.doneCount,
      coins: World.coins.filter((c) => c.taken).length,
    }));
  } catch (e) { /* storage may be unavailable; the game still plays */ }
};
G.loadGame = function () {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const P = G.player;
    P.money = s.money; P.rep = s.rep; P.health = s.health; P.ammo = s.ammo;
    P.x = s.x; P.y = s.y; G.hour = s.hour || 9;
    Missions.doneCount = s.done || 0;
    return true;
  } catch (e) { return false; }
};
G.spawnPackages = function (n) {
  G.pickups = [];
  for (let i = 0; i < n; i++) {
    const p = World.randomSidewalkPoint();
    G.pickups.push({ x: p.x, y: p.y });
  }
};
function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, v = rr(20, speed || 120);
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(0.3, 0.8), max: 0.8, color, size: rr(2, 5) });
  }
}

/* ---- input ---- */
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { G.keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.keys.nitro = true;
  if (e.code === 'KeyM') G.helpOpen = !G.helpOpen;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (G.garageOpen || G.shopOpen) { G.garageOpen = false; G.shopOpen = false; }
    else if (G.state === 'playing') G.paused = !G.paused;
  }
  if (e.code === 'KeyE') onInteract();
  if (e.code === 'KeyF') onPunch();
  if (e.code === 'Enter') onEnter();
  if (e.code === 'Digit1' && G.garageOpen) buyUpgrade(0);
  if (e.code === 'Digit2' && G.garageOpen) buyUpgrade(1);
  if (e.code === 'Digit3' && G.garageOpen) buyUpgrade(2);
  if (e.code === 'Digit4' && G.shopOpen) buyAmmo();
  if (e.repeat) return;
  if (G.state === 'menu' && (e.code === 'ArrowDown' || e.code === 'KeyS')) G.menuSel = (G.menuSel + 1) % 3;
  if (G.state === 'menu' && (e.code === 'ArrowUp' || e.code === 'KeyW')) G.menuSel = (G.menuSel + 2) % 3;
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.keys.nitro = false;
});
canvas.addEventListener('mousedown', (e) => {
  AudioSys.init(); AudioSys.resume();
  const r = canvas.getBoundingClientRect();
  G.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  G.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  G.mouse.clicked = true;
});
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  G.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  G.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});

/* ---- spawning ---- */
function spawnTraffic(n) {
  G.traffic = [];
  for (let i = 0; i < n; i++) {
    const p = World.randomRoadPoint();
    const def = pick(VEHICLES.filter((v) => v.id !== 'truck'));
    G.traffic.push({
      x: p.x, y: p.y, angle: p.horiz ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: rr(90, 170), def, color: def.color, model: def.id,
      horiz: p.horiz, dir: rng() < 0.5 ? 1 : -1, pause: 0,
    });
  }
}
function spawnPeds(n) {
  G.peds = [];
  const palette = ['#e8e8e8', '#4a7fb5', '#c96f4a', '#7a9e7e', '#d9a441', '#b85c5c', '#5b7fa6', '#e8a0c0'];
  for (let i = 0; i < n; i++) {
    const p = World.randomSidewalkPoint();
    G.peds.push({ x: p.x, y: p.y, angle: rng() * Math.PI * 2, speed: rr(28, 55), color: pick(palette), tx: p.x, ty: p.y, wait: rr(0, 4), down: 0 });
  }
}
function spawnParked() {
  G.parked = [];
  const spots = [
    { model: 'sports', x: 2700, y: 360 },
    { model: 'truck', x: 1800, y: 650 },
    { model: 'taxi', x: 440, y: 200 },
    { model: 'coupe', x: 2200, y: 1150 },
    { model: 'muscle', x: 1810, y: 1100 },
    { model: 'sedan', x: 1200, y: 2040 },
  ];
  for (const s of spots) {
    const def = vehicleDef(s.model);
    G.parked.push({ x: s.x, y: s.y, angle: rr(0, 6.28), speed: 0, def, color: def.color, model: s.model, hp: 100, upgrades: {} });
  }
}
function makeCar(def, x, y) {
  return { x, y, angle: 0, speed: 0, def, color: def.color, model: def.id, hp: 100, upgrades: {} };
}

/* ---- interactions ---- */
function nearestCar(maxD) {
  const P = G.player;
  let best = null, bd = maxD;
  const all = G.traffic.concat(G.parked);
  for (const c of all) {
    const d = dist(P.x, P.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function onInteract() {
  const P = G.player;
  if (G.state !== 'playing' || G.paused || G.garageOpen || G.shopOpen) return;
  AudioSys.init(); AudioSys.resume();
  if (!P.onFoot) {
    /* In a car: garage, fare pickup, or step out. */
    for (const g of World.garages) {
      if (dist(P.x, P.y, g.x, g.y) < 130) { G.garageOpen = true; return; }
    }
    if (P.car && P.car.model === 'taxi' && !G.fare) {
      for (const f of World.fares) {
        if (!f.active && dist(P.x, P.y, f.x, f.y) < 70) {
          f.active = true; G.fare = f;
          message('Fare picked up — take them to the marker!', 3);
          AudioSys.sfx('pickup');
          return;
        }
      }
    }
    exitCar();
    return;
  }
  /* On foot: gun shop, or steal the nearest car. */
  if (dist(P.x, P.y, World.gunShop.x, World.gunShop.y) < 110) { G.shopOpen = true; return; }
  const c = nearestCar(64);
  if (c) {
    enterCar(c);
    return;
  }
}
function enterCar(c) {
  const P = G.player;
  P.car = c;
  c.speed = 0;
  P.onFoot = false;
  P.angle = c.angle;
  P.speed = 0;
  const idx = G.traffic.indexOf(c);
  if (idx >= 0) G.traffic.splice(idx, 1);
  const pidx = G.parked.indexOf(c);
  if (pidx >= 0) G.parked.splice(pidx, 1);
  G.stats.carsStolen++;
  G.addHeat(6);
  AudioSys.sfx('enter');
  message('You took the ' + c.def.name + ' — the PD noticed.', 3);
}
function exitCar() {
  const P = G.player;
  if (!P.car) return;
  const c = P.car;
  c.x = P.x - Math.cos(P.angle) * 40;
  c.y = P.y - Math.sin(P.angle) * 40;
  c.angle = P.angle; c.speed = 0;
  if (c.hp > 0) G.parked.push(c);
  P.car = null; P.onFoot = true; P.speed = 0;
  P.x -= Math.cos(P.angle) * 46; P.y -= Math.sin(P.angle) * 46;
}
function onPunch() {
  const P = G.player;
  if (G.state !== 'playing' || G.paused || !P.onFoot) return;
  AudioSys.sfx('punch');
  for (const ped of G.peds) {
    if (dist(P.x, P.y, ped.x, ped.y) < 44) {
      ped.down = 2.5;
      ped.x += Math.cos(P.angle) * 26; ped.y += Math.sin(P.angle) * 26;
      burst(ped.x, ped.y, '#ffd94a', 6, 90);
      G.addHeat(3);
      message('Careful — the PD saw that.', 2);
      return;
    }
  }
}
function onEnter() {
  if (G.state === 'menu') {
    startGame(G.menuSel === 1);
    return;
  }
  if (G.state === 'busted' || G.state === 'wasted') {
    respawn();
    return;
  }
  if (G.state === 'won') { G.state = 'playing'; }
}
function buyUpgrade(i) {
  const P = G.player;
  if (!P.car) return;
  const u = UPGRADES[i];
  if (!u || P.car.upgrades[u.id]) return;
  if (P.money < u.cost) { message('Not enough cash for ' + u.name + ' ($' + u.cost + ')', 3); return; }
  P.money -= u.cost;
  P.car.upgrades[u.id] = true;
  if (u.id === 'armor') P.car.hp = Math.min(160, P.car.hp + 60);
  message(u.name + ' installed on your ' + P.car.def.name + '!', 3);
  AudioSys.sfx('cash');
}
function buyAmmo() {
  const P = G.player;
  if (P.money < AMMO_COST) { message('Ammo costs $' + AMMO_COST + ' — not enough cash.', 3); return; }
  P.money -= AMMO_COST;
  P.ammo += 24;
  message('+24 ammo. Stay safe out there.', 3);
  AudioSys.sfx('cash');
}
function respawn() {
  const P = G.player;
  P.money = Math.max(0, P.money - 200);
  P.health = 100; P.heat = 0; P.wanted = 0;
  P.x = LANDMARKS.safehouse.x; P.y = LANDMARKS.safehouse.y;
  P.onFoot = true; P.car = null; P.speed = 0;
  Police.reset();
  G.state = 'playing';
  message('You woke up at the Safehouse. $200 lighter.', 4);
}

/* ---- updates ---- */
function updatePlayer(dt) {
  const P = G.player;
  const k = G.keys;
  if (P.onFoot) {
    let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    let my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      P.angle = Math.atan2(my, mx);
      const nx = P.x + mx * 190 * dt, ny = P.y + my * 190 * dt;
      World.slideMove(P, nx, ny, 12);
      P.x = clamp(P.x, 30, WORLD_W - 30);
      P.y = clamp(P.y, 30, WORLD_H - 30);
    }
    /* Pick up packages and coins on foot. */
    for (const pk of G.pickups) {
      if (dist(P.x, P.y, pk.x, pk.y) < 30) {
        G.pickups.splice(G.pickups.indexOf(pk), 1);
        Missions.onPackage(G);
        AudioSys.sfx('pickup');
        message('Package secured.', 2);
        break;
      }
    }
  } else if (P.car) {
    const c = P.car;
    const def = c.def;
    const turbo = c.upgrades.turbo ? 1.18 : 1;
    const top = def.top * turbo;
    if (k.up) c.speed += def.accel * dt * (c.speed < 0 ? 2.2 : 1);
    if (k.down) c.speed -= def.accel * 0.9 * dt;
    if (!k.up && !k.down) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 140 * dt);
    c.speed = clamp(c.speed, -top * 0.45, top);
    P.nitro = !!(k.nitro && c.upgrades.nitro && c.speed > 40);
    if (P.nitro) c.speed = Math.min(c.speed + 260 * dt, top * 1.45);
    const steer = ((k.left ? 1 : 0) - (k.right ? 1 : 0)) * (c.speed >= 0 ? 1 : -1);
    c.angle += steer * def.turn * dt * clamp(Math.abs(c.speed) / 120, 0, 1);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const hit = World.slideMove(c, nx, ny, 18);
    if (hit && Math.abs(c.speed) > 120) {
      AudioSys.sfx('crash');
      burst(c.x, c.y, '#ff8a3d', 10, 140);
      c.hp -= 8; G.shake = 0.25;
      c.speed *= 0.35;
    }
    c.x = clamp(c.x, 30, WORLD_W - 30);
    c.y = clamp(c.y, 30, WORLD_H - 30);
    P.x = c.x; P.y = c.y; P.angle = c.angle; P.speed = c.speed;
    if (Math.abs(c.speed) > 240 && rng() < dt * 6) {
      G.particles.push({ x: c.x - Math.cos(c.angle) * 20, y: c.y - Math.sin(c.angle) * 20, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#888', size: 4 });
    }
    if (c.hp <= 0) {
      burst(c.x, c.y, '#ff5a3d', 26, 220);
      AudioSys.sfx('crash');
      message('Your car is wrecked!', 3);
      P.car = null; P.onFoot = true; P.speed = 0;
    }
    /* Run over a ped: heat, and the crowd remembers. */
    for (const ped of G.peds) {
      if (ped.down <= 0 && dist(P.x, P.y, ped.x, ped.y) < 30 && Math.abs(c.speed) > 60) {
        ped.down = 3;
        G.addHeat(8);
        burst(ped.x, ped.y, '#ff5a5a', 8, 100);
        AudioSys.sfx('crash');
      }
    }
    const rb = Police.hitRoadblock(P.x, P.y, 22);
    if (rb && Math.abs(c.speed) > 80) {
      burst(rb.x, rb.y, '#4db8ff', 16, 180);
      AudioSys.sfx('crash');
      c.hp -= 15; c.speed *= 0.3; G.shake = 0.4;
      Police.roadblocks = Police.roadblocks.filter((r) => !r.cars.includes(rb));
      message('You smashed through a roadblock!', 3);
    }
  }
  /* Coins pay whoever walks or drives over them. */
  for (const coin of World.coins) {
    if (!coin.taken && dist(P.x, P.y, coin.x, coin.y) < 34) {
      coin.taken = true;
      P.money += COIN_VALUE;
      G.stats.coins++;
      AudioSys.sfx('coin');
      burst(coin.x, coin.y, '#ffd94a', 10, 120);
      message('Gold coin! +$' + COIN_VALUE, 2);
    }
  }
}
function updateTraffic(dt) {
  for (const c of G.traffic) {
    if (c.pause > 0) { c.pause -= dt; continue; }
    const speed = c.speed * dt;
    let nx = c.x, ny = c.y;
    if (c.horiz) nx += c.dir * speed; else ny += c.dir * speed;
    /* Turn at intersections sometimes; turn around at the map edge. */
    const atX = ROAD_X.some((rx) => Math.abs(nx - rx) < 24);
    const atY = ROAD_Y.some((ry) => Math.abs(ny - ry) < 24);
    if (c.horiz && atX && rng() < dt * 0.25) { c.horiz = false; c.dir = rng() < 0.5 ? 1 : -1; c.y = nearestRoadY(c.y); }
    else if (!c.horiz && atY && rng() < dt * 0.25) { c.horiz = true; c.dir = rng() < 0.5 ? 1 : -1; c.x = nearestRoadX(c.x); }
    if (nx < 90 || nx > WORLD_W - 90) c.dir *= -1;
    if (ny < 90 || ny > WORLD_H - 90) c.dir *= -1;
    c.x = clamp(nx, 60, WORLD_W - 60);
    c.y = clamp(ny, 60, WORLD_H - 60);
    c.angle = c.horiz ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    /* Gentle car-following: slow down for the car ahead. */
    for (const o of G.traffic) {
      if (o === c) continue;
      const d = dist(c.x, c.y, o.x, o.y);
      if (d < 70 && d > 1) { c.x -= Math.cos(c.angle) * 30 * dt; c.y -= Math.sin(c.angle) * 30 * dt; }
    }
    const P = G.player;
    if (!P.onFoot && dist(c.x, c.y, P.x, P.y) < 52) {
      const push = angTo(P.x, P.y, c.x, c.y);
      c.x += Math.cos(push) * 60 * dt; c.y += Math.sin(push) * 60 * dt;
      if (Math.abs(P.speed) > 150) { AudioSys.sfx('crash'); burst(c.x, c.y, '#ccc', 8, 120); P.car.hp -= 4; G.shake = 0.2; }
    }
  }
  if (G.traffic.length < 14 && rng() < dt * 0.5) {
    const p = World.randomRoadPoint();
    const def = pick(VEHICLES.filter((v) => v.id !== 'truck'));
    G.traffic.push({ x: p.x, y: p.y, angle: 0, speed: rr(90, 170), def, color: def.color, model: def.id, horiz: p.horiz, dir: 1, pause: 0 });
  }
}

function updatePeds(dt) {
  const P = G.player;
  const night = Render.nightF(G.hour);
  for (const ped of G.peds) {
    if (ped.down > 0) { ped.down -= dt; continue; }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const d = dist(ped.x, ped.y, P.x, P.y);
    if (d < 130 && ((!P.onFoot && Math.abs(P.speed) > 120) || G.shotsFired > 0)) {
      /* Flee from a speeding car or a gunshot. */
      const a = angTo(P.x, P.y, ped.x, ped.y);
      ped.angle = a;
      const nx = ped.x + Math.cos(a) * 150 * dt, ny = ped.y + Math.sin(a) * 150 * dt;
      World.slideMove(ped, nx, ny, 10);
    } else {
      if (dist(ped.x, ped.y, ped.tx, ped.ty) < 24) {
        const t = World.randomSidewalkPoint();
        ped.tx = t.x; ped.ty = t.y; ped.wait = rr(0, 3);
      }
      const a = angTo(ped.x, ped.y, ped.tx, ped.ty);
      ped.angle = a;
      const nx = ped.x + Math.cos(a) * ped.speed * dt;
      const ny = ped.y + Math.sin(a) * ped.speed * dt;
      World.slideMove(ped, nx, ny, 10);
    }
  }
  if (G.peds.length < (night > 0.6 ? 16 : 26) && rng() < dt * 1.2) {
    const p = World.randomSidewalkPoint();
    G.peds.push({ x: p.x, y: p.y, angle: rng() * 6.28, speed: rr(28, 55), color: pick(['#e8e8e8', '#4a7fb5', '#c96f4a', '#7a9e7e', '#d9a441']), tx: p.x, ty: p.y, wait: 0, down: 0 });
  }
}
function updateShooting(dt) {
  const P = G.player;
  if (!G.mouse.clicked) return;
  G.mouse.clicked = false;
  if (G.state !== 'playing' || G.paused || P.ammo <= 0) return;
  P.ammo--;
  G.shotsFired = 2;
  AudioSys.sfx('shot');
  const wx = G.cam.x + G.mouse.x, wy = G.cam.y + G.mouse.y;
  const aim = angTo(P.x, P.y, wx, wy);
  P.angle = aim;
  burst(P.x + Math.cos(aim) * 22, P.y + Math.sin(aim) * 22, '#ffd94a', 6, 160);
  G.addHeat(4);
  /* Hit the nearest thing roughly in the line of fire. */
  let best = null, bd = 1e9;
  const targets = G.peds.filter((p) => p.down <= 0).map((p) => ({ x: p.x, y: p.y, kind: 'ped', ref: p }))
    .concat(Police.cars.map((c) => ({ x: c.x, y: c.y, kind: 'cop', ref: c })));
  for (const t of targets) {
    const d = dist(P.x, P.y, t.x, t.y);
    if (d > 320) continue;
    const da = Math.abs(angDiff(aim, angTo(P.x, P.y, t.x, t.y)));
    if (da < 0.35 && d < bd) { bd = d; best = t; }
  }
  if (best) {
    burst(best.x, best.y, '#ff5a5a', 10, 130);
    if (best.kind === 'ped') { best.ref.down = 4; G.addHeat(6); }
    else { best.ref.speed *= 0.2; G.addHeat(10); message('You shot at the PD!', 2); }
  }
}
function updateFares(dt) {
  G.fareTimer -= dt;
  if (G.fareTimer <= 0) { World.spawnFare(); G.fareTimer = rr(6, 12); }
  for (const f of World.fares) f.wait -= dt;
  World.fares = World.fares.filter((f) => f.wait > 0 || f.active);
  if (G.fare) {
    const f = G.fare;
    if (dist(G.player.x, G.player.y, f.dx, f.dy) < 80) {
      const night = Render.nightF(G.hour);
      const pay = Math.round(FARE_BASE * (night > 0.6 ? 2 : 1) + dist(f.x, f.y, f.dx, f.dy) / 40);
      G.player.money += pay;
      G.stats.fares++;
      AudioSys.sfx('cash');
      message('Fare complete! +$' + pay + (night > 0.6 ? ' (night bonus)' : ''), 3);
      Missions.onFareDone(G);
      World.fares = World.fares.filter((x) => x !== f);
      G.fare = null;
    }
    if (G.player.onFoot) { f.active = false; G.fare = null; }
  }
}
function update(dt) {
  G.time += dt;
  G.hour += dt * 0.06;
  if (G.hour >= 24) G.hour -= 24;
  if (G.shotsFired > 0) G.shotsFired -= dt;
  updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updateShooting(dt);
  updateFares(dt);
  const heatDelta = Police.update(dt, G.player, G.player.wanted);
  if (heatDelta === 'busted') {
    G.state = 'busted';
    AudioSys.sfx('busted');
    return;
  }
  if (typeof heatDelta === 'number' && heatDelta !== 0) G.addHeat(heatDelta);
  if (G.ramCd > 0) G.ramCd -= dt;
  else Police.ramPlayer(G.player, (car) => {
    if (G.player.car) { G.player.car.hp -= 3; G.shake = 0.2; AudioSys.sfx('crash'); }
    G.ramCd = 0.9;
  });
  Missions.update(dt, G);
  if (G.player.health <= 0) { G.state = 'wasted'; AudioSys.sfx('fail'); }
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const m of G.messages) m.life -= dt;
  G.messages = G.messages.filter((m) => m.life > 0);
  if (G.shake > 0) G.shake -= dt;
  G.saveTimer -= dt;
  if (G.saveTimer <= 0) { G.saveGame(); G.saveTimer = 30; }
  const P = G.player;
  G.cam.x = clamp(P.x - G.view.w / 2, 0, WORLD_W - G.view.w);
  G.cam.y = clamp(P.y - G.view.h / 2, 0, WORLD_H - G.view.h);
  if (G.shake > 0) { G.cam.x += rr(-4, 4); G.cam.y += rr(-4, 4); }
  AudioSys.update(dt, P.onFoot ? 0 : Math.abs(P.speed) / 420, P.wanted, !P.onFoot);
}

/* ---- flow ---- */
function startGame(continueSave) {
  AudioSys.init(); AudioSys.resume();
  World.build();
  Police.reset();
  spawnTraffic(16);
  spawnPeds(26);
  spawnParked();
  G.fareTimer = 8;
  World.spawnFare(); World.spawnFare();
  G.pickups = []; G.particles = []; G.messages = []; G.fare = null;
  G.player.x = 1200; G.player.y = 1100; G.player.onFoot = true; G.player.car = null;
  G.player.health = 100; G.player.heat = 0; G.player.wanted = 0;
  G.player.money = 250; G.player.rep = 0; G.player.ammo = 12; G.player.speed = 0;
  G.hour = 9; G.state = 'playing'; G.paused = false;
  Missions.doneCount = 0; Missions.cur = null;
  if (continueSave && G.loadGame()) {
    message('Welcome back, Riko. Velmara missed you.', 4);
  } else {
    message('Welcome to Velmara, Riko Vale.', 4);
  }
  Missions.start(0, G);
  G.saveGame();
}
function drawMenu() {
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, G.view.w, G.view.h);
  ctx.fillStyle = '#2e8fa8';
  ctx.fillRect(0, 0, G.view.w, 8);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('VELMARA', G.view.w / 2, 150);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Streets of Gold', G.view.w / 2, 195);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfe8ef';
  ctx.fillText('An open-world crime story in a sun-soaked city. Drive, steal, run missions, outrun the PD.', G.view.w / 2, 235);
  ctx.fillText('Riko Vale came back to Velmara for one last job. The city had other plans.', G.view.w / 2, 260);
  const items = ['▶  New Game — start Riko\'s story', '↻  Continue — pick up your save', '？  How to play'];
  items.forEach((t, i) => {
    const y = 340 + i * 52;
    ctx.fillStyle = G.menuSel === i ? '#ffd94a' : '#fff';
    ctx.font = (G.menuSel === i ? 'bold ' : '') + '22px sans-serif';
    ctx.fillText(t, G.view.w / 2, y);
  });
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#9fb8c4';
  ctx.fillText('WASD drive & walk  •  E enter / steal car  •  F punch  •  Click shoot  •  SHIFT nitro  •  M missions  •  P pause', G.view.w / 2, 540);
  ctx.fillText('10 story missions  •  taxi fares  •  24 gold coins  •  street races  •  garage upgrades  •  wanted 0–5 stars', G.view.w / 2, 568);
  ctx.fillText('Progress saves automatically. No network, no downloads — just Velmara.', G.view.w / 2, 596);
  ctx.textAlign = 'left';
  if (G.menuSel === 2 || G.helpOpen) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(240, 300, 800, 240, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('How to play', 270, 332);
    ctx.font = '15px sans-serif';
    const lines = [
      'Walk with WASD. Near a car, press E to steal it — the police will notice.',
      'Follow the gold marker: missions chain from First Fare to King of Velmara.',
      'Taxis pay fares (press E near a waving fare while driving a taxi).',
      'Gold coins hide across the city ($50 each). Garages sell armor, turbo and nitro.',
      'Wanted stars rise with crime and cool off when no cruiser can see you.',
      'At 3 stars expect roadblocks; at 4, a helicopter. Get caught on foot: BUSTED.',
    ];
    lines.forEach((l, i) => ctx.fillText('•  ' + l, 270, 362 + i * 26));
  }
}
function drawOverlays() {
  if (G.garageOpen && G.player.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, G.view.w, G.view.h);
    ctx.fillStyle = '#1c2430';
    ctx.beginPath(); ctx.roundRect(390, 170, 500, 340, 14); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('KILO GARAGE', G.view.w / 2, 212);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Your ' + G.player.car.def.name + '  •  Cash $' + G.player.money, G.view.w / 2, 244);
    UPGRADES.forEach((u, i) => {
      const owned = G.player.car.upgrades[u.id];
      ctx.fillStyle = owned ? '#7CFC66' : '#fff';
      ctx.fillText('[' + (i + 1) + ']  ' + u.name + ' — $' + u.cost + (owned ? '  ✓ OWNED' : ''), G.view.w / 2, 292 + i * 40);
      ctx.fillStyle = '#9fb8c4';
      ctx.font = '14px sans-serif';
      ctx.fillText(u.desc, G.view.w / 2, 312 + i * 40);
      ctx.font = '16px sans-serif';
    });
    ctx.fillStyle = '#9fb8c4';
    ctx.fillText('Press 1–3 to buy, ESC to leave', G.view.w / 2, 470);
    ctx.textAlign = 'left';
  }
  if (G.shopOpen) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, G.view.w, G.view.h);
    ctx.fillStyle = '#1c2430';
    ctx.beginPath(); ctx.roundRect(440, 220, 400, 220, 14); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('IRONWORKS GUN SHOP', G.view.w / 2, 262);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('[4]  +24 ammo — $' + AMMO_COST + '   (you have ' + G.player.ammo + ')', G.view.w / 2, 320);
    ctx.fillStyle = '#9fb8c4';
    ctx.fillText('Cash $' + G.player.money + '  •  ESC to leave', G.view.w / 2, 380);
    ctx.textAlign = 'left';
  }
  if (G.helpOpen && G.state === 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(240, 120, 800, 420, 12); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Missions — ' + Missions.doneCount + ' of ' + Missions.list.length + ' done', 270, 158);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    Missions.list.forEach((m, i) => {
      ctx.fillStyle = i < Missions.doneCount ? '#7CFC66' : i === Missions.doneCount ? '#ffd94a' : '#9fb8c4';
      ctx.fillText((i < Missions.doneCount ? '✓ ' : i === Missions.doneCount ? '▶ ' : '· ') + (i + 1) + '. ' + m.title + ' — ' + m.giver + ' ($' + m.reward + ')', 270, 192 + i * 30);
    });
    ctx.fillStyle = '#9fb8c4';
    ctx.fillText('Press M to close. Coins found: ' + G.stats.coins + '/' + COIN_COUNT + '  •  Fares: ' + G.stats.fares + '  •  Cars stolen: ' + G.stats.carsStolen, 270, 510);
  }
  if (G.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, G.view.w, G.view.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', G.view.w / 2, G.view.h / 2 - 10);
    ctx.font = '16px sans-serif';
    ctx.fillText('Press P to keep driving', G.view.w / 2, G.view.h / 2 + 28);
    ctx.textAlign = 'left';
  }
  if (G.state === 'busted' || G.state === 'wasted') {
    ctx.fillStyle = G.state === 'busted' ? 'rgba(20,40,120,0.75)' : 'rgba(120,20,20,0.75)';
    ctx.fillRect(0, 0, G.view.w, G.view.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(G.state === 'busted' ? 'BUSTED' : 'WASTED', G.view.w / 2, G.view.h / 2 - 10);
    ctx.font = '18px sans-serif';
    ctx.fillText('The PD impounded your ride and fined you $200. Press ENTER to wake up at the Safehouse.', G.view.w / 2, G.view.h / 2 + 34);
    ctx.textAlign = 'left';
  }
}

/* ---- render + loop ---- */
function render() {
  ctx.clearRect(0, 0, G.view.w, G.view.h);
  if (G.state === 'menu') {
    /* Live city behind the title: slow pan across Downtown. */
    const t = G.time * 12;
    G.cam.x = clamp(900 + Math.sin(t * 0.001) * 500, 0, WORLD_W - G.view.w);
    G.cam.y = clamp(500 + Math.cos(t * 0.0013) * 300, 0, WORLD_H - G.view.h);
    ctx.save();
    ctx.translate(-G.cam.x, -G.cam.y);
    Render.drawWorld(ctx, G, G.cam);
    for (const c of G.traffic) Render.drawCar(ctx, c.x, c.y, c.angle, c.def, c.color, {});
    ctx.restore();
    drawMenu();
    return;
  }
  ctx.save();
  ctx.translate(-G.cam.x, -G.cam.y);
  Render.drawWorld(ctx, G, G.cam);
  Render.drawEntities(ctx, G, G.cam);
  ctx.restore();
  Render.drawHUD(ctx, G);
  drawOverlays();
}
let lastT = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
  lastT = ts;
  if (G.state === 'playing' && !G.paused && !G.garageOpen && !G.shopOpen) update(dt);
  else if (G.state === 'menu') { G.time += dt; G.hour += dt * 0.02; }
  render();
}

/* ---- boot ---- */
World.build();
spawnTraffic(16);
spawnPeds(26);
spawnParked();
/* Screenshot mode hides the help bar so the frame is pure game. */
if (new URLSearchParams(window.location.search).get('shot')) {
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
}
if (window.__VELMARA_SHOT__) window.__VELMARA_SHOT__(G);
requestAnimationFrame(loop);

/* Test handle: the CDP playtest drives the game through this. */
window.VELMARA = {
  G, Missions, Police, World,
  start: (cont) => startGame(cont),
  state: () => ({ state: G.state, money: G.player.money, wanted: G.player.wanted, heat: G.player.heat, missionsDone: Missions.doneCount, x: Math.round(G.player.x), y: Math.round(G.player.y), onFoot: G.player.onFoot, hour: G.hour }),
  teleport: (x, y) => { G.player.x = x; G.player.y = y; if (G.player.car) { G.player.car.x = x; G.player.car.y = y; } },
  press: (key) => { G.keys[key] = true; setTimeout(() => { G.keys[key] = false; }, 120); },
  interact: () => onInteract(),
  enter: () => onEnter(),
};
