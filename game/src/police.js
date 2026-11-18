'use strict';
/* VELMARA police.js — one job: the Velmara PD.
   Patrol cars cruise the grid; when the heat rises they chase,
   at 3 stars they throw roadblocks across the road ahead, and at
   4 stars a helicopter circles with a spotlight. Getting caught
   on foot means BUSTED; losing them means the heat cools off. */

const Police = {
  cars: [], heli: null, roadblocks: [], bustTimer: 0, unseenTimer: 0,

  reset() {
    this.cars = []; this.heli = null; this.roadblocks = [];
    this.bustTimer = 0; this.unseenTimer = 0;
  },
  spawnCar(x, y) {
    const p = World.randomRoadPoint();
    const car = {
      x: x !== undefined ? x : p.x, y: y !== undefined ? y : p.y,
      angle: p.horiz ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 0, model: 'police', color: '#20242e', siren: rng() * 6,
      hp: 100, state: 'patrol', targetX: 0, targetY: 0, retarget: 0, stuck: 0,
    };
    this.cars.push(car);
    return car;
  },
  ensureCount(wanted) {
    const want = copsForStars(wanted);
    while (this.cars.length < want) this.spawnCar();
    if (this.cars.length > want) this.cars.length = want;
  },
  /* A roadblock: two cruisers parked bumper to bumper across a road. */
  setRoadblock(px, py, angle) {
    if (this.roadblocks.length >= 2) return;
    const ahead = 420;
    const cx = px + Math.cos(angle) * ahead;
    const cy = py + Math.sin(angle) * ahead;
    const bx = nearestRoadX(cx), by = nearestRoadY(cy);
    const useX = Math.abs(cx - bx) < Math.abs(cy - by);
    const gx = useX ? bx : cx, gy = useX ? cy : by;
    const a = useX ? Math.PI / 2 : 0;
    this.roadblocks.push({
      x: gx, y: gy, angle: a, life: 25,
      cars: [
        { x: gx - Math.cos(a + Math.PI / 2) * 46, y: gy - Math.sin(a + Math.PI / 2) * 46, angle: a },
        { x: gx + Math.cos(a + Math.PI / 2) * 46, y: gy + Math.sin(a + Math.PI / 2) * 46, angle: a },
      ],
    });
  },
  update(dt, player, wanted) {
    this.ensureCount(wanted);
    /* Helicopter above 4 stars: circles, keeps the player lit. */
    if (wanted >= 4 && !this.heli) this.heli = { angle: 0, x: player.x, y: player.y };
    if (wanted < 4) this.heli = null;
    if (this.heli) {
      this.heli.angle += dt * 0.5;
      this.heli.x = player.x + Math.cos(this.heli.angle) * 150;
      this.heli.y = player.y + Math.sin(this.heli.angle) * 150 - 60;
    }
    /* Roadblocks while the heat is high and the player is driving. */
    if (wanted >= 3 && !player.onFoot && this.roadblocks.length === 0 && rng() < dt * 0.12) {
      this.setRoadblock(player.x, player.y, player.angle);
    }
    for (const rb of this.roadblocks) rb.life -= dt;
    this.roadblocks = this.roadblocks.filter((rb) => rb.life > 0);
    let anySees = false;
    for (const car of this.cars) {
      car.siren += dt;
      const d = dist(car.x, car.y, player.x, player.y);
      const sees = wanted > 0 && d < 760;
      if (sees) anySees = true;
      car.state = sees ? 'chase' : 'patrol';
      if (car.state === 'chase') {
        const want = angTo(car.x, car.y, player.x, player.y);
        car.angle += clamp(angDiff(car.angle, want), -2.6 * dt, 2.6 * dt);
        car.speed = Math.min(car.speed + 320 * dt, 400);
      } else {
        car.retarget -= dt;
        if (car.retarget <= 0) {
          const p = World.randomRoadPoint();
          car.targetX = p.x; car.targetY = p.y; car.retarget = rr(4, 9);
        }
        const want = angTo(car.x, car.y, car.targetX, car.targetY);
        car.angle += clamp(angDiff(car.angle, want), -2.0 * dt, 2.0 * dt);
        car.speed = Math.min(car.speed + 160 * dt, 150);
        if (dist(car.x, car.y, car.targetX, car.targetY) < 60) car.retarget = 0;
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = World.slideMove(car, nx, ny, 16);
      if (hit) { car.speed *= 0.4; car.angle += rr(-0.5, 0.5); }
      if (car.speed < 20 && car.state === 'chase') { car.stuck += dt; if (car.stuck > 2) { car.angle += Math.PI * 0.5; car.stuck = 0; } }
      else car.stuck = 0;
      car.x = clamp(car.x, 40, WORLD_W - 40);
      car.y = clamp(car.y, 40, WORLD_H - 40);
    }

    /* Heat cools when nobody can see the player; grows while chased. */
    if (wanted > 0) {
      if (anySees) { this.unseenTimer = 0; }
      else {
        this.unseenTimer += dt;
        if (this.unseenTimer > 6) return -7 * dt;
      }
    } else this.unseenTimer = 0;
    /* BUSTED: a cruiser sits on the player while on foot. */
    if (!player.onFoot) { this.bustTimer = 0; return 0; }
    let near = false;
    for (const car of this.cars) if (dist(car.x, car.y, player.x, player.y) < 34) near = true;
    if (near && wanted > 0) {
      this.bustTimer += dt;
      if (this.bustTimer > 1.2) return 'busted';
    } else this.bustTimer = 0;
    return 0;
  },
  /* Ramming a roadblock cruiser smashes it aside. Returns true on hit. */
  hitRoadblock(x, y, radius) {
    for (const rb of this.roadblocks) {
      for (const c of rb.cars) {
        if (dist(x, y, c.x, c.y) < radius + 26) return c;
      }
    }
    return null;
  },
  /* Police cruisers touching the player's car damage it and slow it. */
  ramPlayer(player, onRam) {
    if (player.onFoot) return;
    for (const car of this.cars) {
      if (dist(car.x, car.y, player.x, player.y) < 44 && Math.abs(car.speed) > 60) {
        onRam(car);
        car.speed *= -0.3;
      }
    }
  },
};
