'use strict';
/* VELMARA: Streets of Gold v5 — config.js
   One job: every constant, name and tuning number the game shares.
   The city of Velmara is original: sun-soaked coast, six districts,
   its own people, cars and story. Nothing here comes from another game. */

const WORLD_W = 3600;
const WORLD_H = 2600;
const ROAD_W = 96;
const ROAD_X = [200, 700, 1200, 1700, 2200, 2700, 3200];
const ROAD_Y = [200, 650, 1100, 1550, 2000, 2350];
const SAVE_KEY = 'velmara-v5-save';
const GAME_TITLE = 'VELMARA: Streets of Gold';
const HERO_NAME = 'Riko Vale';

/* Deterministic random: the same city, traffic and crowds every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261118);
function rr(a, b) { return a + rng() * (b - a); }
function ri(a, b) { return Math.floor(rr(a, b + 1)); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function nearestRoadX(x) {
  let best = ROAD_X[0], bd = 1e9;
  for (const rx of ROAD_X) { const d = Math.abs(rx - x); if (d < bd) { bd = d; best = rx; } }
  return best;
}
function nearestRoadY(y) {
  let best = ROAD_Y[0], bd = 1e9;
  for (const ry of ROAD_Y) { const d = Math.abs(ry - y); if (d < bd) { bd = d; best = ry; } }
  return best;
}
function onRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

/* Sun-soaked palette: sand, terracotta roofs, teal sea, palm green. */
const PAL = {
  grass: '#7fae5a', grass2: '#8fbf68', sand: '#e8d9a8', sea: '#2e8fa8',
  seaDeep: '#1f6f8b', road: '#3d3d46', roadEdge: '#2b2b33', lane: '#e8d44d',
  sidewalk: '#b9b3a4', roofA: '#c96f4a', roofB: '#b85c5c', roofC: '#d9a441',
  roofD: '#5b7fa6', roofE: '#7a9e7e', wall: '#e6dcc8', park: '#5da24f',
  plaza: '#cbb98f', night: 'rgba(8,12,38,0.55)', dusk: 'rgba(255,110,60,0.18)',
};

/* Six districts, each with its own look and its own crowd. */
const DISTRICTS = [
  { name: 'Marina Bay', x: 0, y: 0, w: 950, h: 900, tint: '#2e8fa8', blurb: 'yachts, neon and salt air' },
  { name: 'Downtown', x: 950, y: 0, w: 1300, h: 1300, tint: '#c96f4a', blurb: 'glass towers and gold' },
  { name: 'The Hills', x: 2250, y: 0, w: 1350, h: 900, tint: '#7a9e7e', blurb: 'mansions above the bay' },
  { name: 'Old Town', x: 0, y: 900, w: 950, h: 850, tint: '#d9a441', blurb: 'markets and old stone' },
  { name: 'Midtown', x: 950, y: 1300, w: 1300, h: 800, tint: '#b85c5c', blurb: 'workshops and garages' },
  { name: 'Harbor Docks', x: 2250, y: 900, w: 1350, h: 1700, tint: '#5b7fa6', blurb: 'cranes, crates and fog' },
  { name: 'South Beach', x: 0, y: 1750, w: 2250, h: 850, tint: '#e8d9a8', blurb: 'sand, surf and street races' },
];
function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[1];
}

/* Named places the story and the missions point at. */
const LANDMARKS = {
  marinaPier: { x: 320, y: 320, name: 'Marina Pier' },
  plaza: { x: 1700, y: 1100, name: 'Gold Plaza' },
  market: { x: 700, y: 1550, name: 'Old Town Market' },
  docks: { x: 3050, y: 2050, name: 'Harbor Docks' },
  mansion: { x: 2700, y: 320, name: 'Villa Solana' },
  safehouse: { x: 1200, y: 2000, name: 'Safehouse' },
  garageN: { x: 2200, y: 650, name: 'Kilo Garage North' },
  garageS: { x: 1700, y: 2350, name: 'Kilo Garage South' },
  bank: { x: 1700, y: 650, name: 'Velmara Gold Bank' },
  beach: { x: 700, y: 2350, name: 'South Beach' },
  airport: { x: 3200, y: 650, name: 'Velmara Airfield' },
  casino: { x: 2200, y: 1100, name: 'Casino Lumen' },
};

/* Eight drivable models. Steal any of them: walk up and press E. */
const VEHICLES = [
  { id: 'sedan', name: 'Velmara Sedan', top: 300, accel: 210, turn: 2.9, color: '#4a7fb5', price: 0 },
  { id: 'taxi', name: 'Bay Taxi', top: 285, accel: 200, turn: 2.9, color: '#f2c230', price: 0 },
  { id: 'coupe', name: 'Solana Coupe', top: 340, accel: 250, turn: 3.2, color: '#c94a4a', price: 0 },
  { id: 'pickup', name: 'Docks Pickup', top: 275, accel: 190, turn: 2.6, color: '#5d7a4a', price: 0 },
  { id: 'van', name: 'Harbor Van', top: 250, accel: 165, turn: 2.4, color: '#d8d3c5', price: 0 },
  { id: 'sports', name: 'Lumen GT', top: 420, accel: 330, turn: 3.5, color: '#e8a020', price: 0 },
  { id: 'muscle', name: 'Hills Muscle', top: 380, accel: 290, turn: 3.0, color: '#7a3fa0', price: 0 },
  { id: 'truck', name: 'Gold Hauler', top: 230, accel: 150, turn: 2.2, color: '#8a6f3f', price: 0 },
];
function vehicleDef(id) {
  for (const v of VEHICLES) if (v.id === id) return v;
  return VEHICLES[0];
}

/* Garage upgrades: spend mission money, keep the car. */
const UPGRADES = [
  { id: 'armor', name: 'Steel Plating', cost: 300, desc: '+60 car health, shrugs off bumps' },
  { id: 'turbo', name: 'Turbo Kit', cost: 500, desc: '+18% top speed' },
  { id: 'nitro', name: 'Nitro Tanks', cost: 400, desc: 'Hold SHIFT for a nitro boost' },
];
const AMMO_COST = 100;
const COIN_VALUE = 50;
const COIN_COUNT = 24;
const FARE_BASE = 60;

/* Wanted tuning: heat 0..100, stars are heat bands. */
const WANTED_BANDS = [0, 12, 30, 55, 80, 95];
function starsForHeat(heat) {
  let s = 0;
  for (let i = 0; i < WANTED_BANDS.length; i++) if (heat >= WANTED_BANDS[i]) s = i;
  return s;
}
function copsForStars(stars) { return [0, 2, 3, 4, 6, 8][stars] || 0; }
