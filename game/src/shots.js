'use strict';
/* VELMARA shots.js — one job: stage the four screenshots.
   ?shot=1..4 in the URL starts the game and places Riko, the
   police, the mission and the clock exactly where the shot needs
   them. Real gameplay, no fake pixels: the same code the player
   runs, frozen at a good moment. */

function giveCar(G, model, x, y) {
  const def = vehicleDef(model);
  const car = makeCar(def, x, y);
  car.angle = 0;
  G.parked.push(car);
  G.player.x = x; G.player.y = y;
  enterCar(car);
  return car;
}
function surroundPolice(G, n, radius) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    Police.spawnCar(G.player.x + Math.cos(a) * radius, G.player.y + Math.sin(a) * radius);
  }
}

window.__VELMARA_SHOT__ = function (G) {
  const params = new URLSearchParams(window.location.search);
  const shot = parseInt(params.get('shot') || '0', 10);
  if (!shot) return;
  startGame(false);
  G.messages = [];
  const P = G.player;
  if (shot === 1) {
    /* COVER: a daytime chase through Downtown, 3 stars, mission Heat. */
    G.hour = 10.5;
    Missions.start(3, G);
    P.x = 1700; P.y = 1100;
    giveCar(G, 'sports', 1700, 1100);
    P.car.speed = 260;
    G.keys.up = true;
    G.addHeat(25);
    surroundPolice(G, 3, 320);
    Police.setRoadblock(P.x, P.y, 0);
  } else if (shot === 2) {
    /* On foot in Old Town Market at dusk, crowds and traffic. */
    G.hour = 18.4;
    P.x = LANDMARKS.market.x; P.y = LANDMARKS.market.y;
    P.onFoot = true;
    for (let i = 0; i < 8; i++) {
      const p = World.randomSidewalkPoint();
      G.peds.push({ x: P.x + ((i % 4) - 1.5) * 70, y: P.y + (Math.floor(i / 4) - 0.5) * 90, angle: 0, speed: 40, color: '#e8e8e8', tx: p.x, ty: p.y, wait: 0, down: 0 });
    }
  }

  else if (shot === 3) {
    /* Taxi fare at Marina Pier in the morning sun, mission one. */
    G.hour = 9.0;
    P.x = LANDMARKS.marinaPier.x; P.y = LANDMARKS.marinaPier.y;
    giveCar(G, 'taxi', 440, 200);
    const f = { x: 500, y: 250, dx: LANDMARKS.plaza.x, dy: LANDMARKS.plaza.y, wait: 60, active: false };
    World.fares.push(f);
  } else if (shot === 4) {
    /* Night: 4 stars, helicopter spotlight, roadblock ahead. */
    G.hour = 22.0;
    Missions.start(8, G);
    P.x = 2200; P.y = 1100;
    giveCar(G, 'truck', 2200, 1100);
    P.car.speed = 180;
    P.car.hp = 500;
    P.car.upgrades.armor = true;
    G.keys.up = true;
    G.addHeat(82);
    surroundPolice(G, 4, 300);
    Police.setRoadblock(P.x, P.y, 0);
  }
  G.cam.x = clamp(P.x - G.view.w / 2, 0, WORLD_W - G.view.w);
  G.cam.y = clamp(P.y - G.view.h / 2, 0, WORLD_H - G.view.h);
};
