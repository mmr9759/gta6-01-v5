'use strict';
/* VELMARA world.js — one job: build the city and everything in it.
   Seeded generation: the same blocks, parks, palms and gold coins
   every run, so missions and screenshots always line up. */

const World = {
  buildings: [], parks: [], palms: [], coins: [], fares: [], racers: [],
  garages: [], gunShop: null, beach: null,

  build() {
    this.buildings = []; this.parks = []; this.palms = []; this.coins = [];
    this.fares = []; this.garages = [];
    const roofColors = [PAL.roofA, PAL.roofB, PAL.roofC, PAL.roofD, PAL.roofE];
    for (let ix = 0; ix < ROAD_X.length - 1; ix++) {
      for (let iy = 0; iy < ROAD_Y.length - 1; iy++) {
        const x0 = ROAD_X[ix] + ROAD_W / 2 + 14;
        const y0 = ROAD_Y[iy] + ROAD_W / 2 + 14;
        const x1 = ROAD_X[ix + 1] - ROAD_W / 2 - 14;
        const y1 = ROAD_Y[iy + 1] - ROAD_W / 2 - 14;
        const bw = x1 - x0, bh = y1 - y0;
        if (bw < 60 || bh < 60) continue;
        const roll = rng();
        if (roll < 0.16) {
          this.parks.push({ x: x0, y: y0, w: bw, h: bh, trees: ri(3, 7) });
          for (let t = 0; t < 5; t++) this.palms.push({ x: rr(x0 + 20, x1 - 20), y: rr(y0 + 20, y1 - 20), s: rr(0.8, 1.3) });
          continue;
        }
        if (roll < 0.24) {
          this.parks.push({ x: x0, y: y0, w: bw, h: bh, plaza: true, trees: 2 });
          continue;
        }
        const cols = bw > 320 ? 2 : 1;
        const rows = bh > 320 ? 2 : 1;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const bx = x0 + c * (bw / cols) + 8;
            const by = y0 + r * (bh / rows) + 8;
            const bwid = bw / cols - 16;
            const bhei = bh / rows - 16;
            const tall = districtAt(bx + bwid / 2, by + bhei / 2).name === 'Downtown';
            this.buildings.push({
              x: bx, y: by, w: bwid, h: bhei,
              roof: pick(roofColors), wall: PAL.wall,
              floors: tall ? ri(3, 6) : ri(1, 3), windows: tall,
            });
          }
        }
      }
    }
    /* Palm-lined beach strip along the south edge. */
    this.beach = { x: 0, y: WORLD_H - 130, w: WORLD_W, h: 130 };
    for (let i = 0; i < 26; i++) this.palms.push({ x: rr(40, WORLD_W - 40), y: rr(WORLD_H - 120, WORLD_H - 20), s: rr(0.9, 1.4) });
    /* Gold coins hidden across the city: 24, worth $50 each. */
    const coinSpots = [];
    while (coinSpots.length < COIN_COUNT) {
      const x = rr(150, WORLD_W - 150), y = rr(150, WORLD_H - 150);
      if (this.blocked(x, y, 20)) continue;
      if (coinSpots.some((c) => dist(c.x, c.y, x, y) < 260)) continue;
      coinSpots.push({ x, y });
    }
    this.coins = coinSpots.map((c) => ({ x: c.x, y: c.y, taken: false, bob: rr(0, 6) }));
    /* Garages and the gun shop. */
    this.garages = [
      { x: LANDMARKS.garageN.x, y: LANDMARKS.garageN.y, name: 'Kilo Garage North' },
      { x: LANDMARKS.garageS.x, y: LANDMARKS.garageS.y, name: 'Kilo Garage South' },
    ];
    this.gunShop = { x: 1350, y: 720, name: 'Ironworks Gun Shop' };
  },

  blocked(x, y, pad) {
    const p = pad || 0;
    for (const b of this.buildings) {
      if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
    }
    return null;
  },
  slideMove(e, nx, ny, radius) {
    /* Move with axis-separated sliding so cars and walkers hug walls. */
    const hitX = this.blocked(nx, e.y, radius);
    const hitY = this.blocked(e.x, ny, radius);
    if (!hitX) e.x = nx;
    if (!hitY) e.y = ny;
    return hitX || hitY;
  },
  randomRoadPoint() {
    if (rng() < 0.5) return { x: pick(ROAD_X) + rr(-14, 14), y: rr(120, WORLD_H - 120), horiz: false };
    return { x: rr(120, WORLD_W - 120), y: pick(ROAD_Y) + rr(-14, 14), horiz: true };
  },
  randomSidewalkPoint() {
    const p = this.randomRoadPoint();
    return { x: clamp(p.x + rr(-70, 70), 60, WORLD_W - 60), y: clamp(p.y + rr(-70, 70), 60, WORLD_H - 60) };
  },
  /* Taxi fares wait on sidewalks; a fare pays more after dark. */
  spawnFare() {
    const p = this.randomSidewalkPoint();
    const dest = this.randomSidewalkPoint();
    if (dist(p.x, p.y, dest.x, dest.y) < 500) return;
    this.fares.push({ x: p.x, y: p.y, dx: dest.x, dy: dest.y, wait: 40, active: false });
    if (this.fares.length > 5) this.fares.shift();
  },
  coinsLeft() { return this.coins.filter((c) => !c.taken).length; },
};
