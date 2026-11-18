'use strict';
/* VELMARA missions.js — one job: the story.
   Ten chained jobs for Riko Vale, from his first taxi fare to the
   crown of Velmara. Each mission is steps the engine walks through:
   go somewhere, steal or drive a car, collect, race, or escape. */

const Missions = {
  list: [
    {
      id: 'first-fare', title: 'First Fare', giver: 'Dario',
      brief: 'Meet Dario at Marina Pier. He needs a driver who asks no questions.',
      dialog: ['DARIO: Riko! You finally came back to Velmara.', 'DARIO: One fare. Pick up the lady at the pier, drop her at Gold Plaza.', 'RIKO: One fare. Then I am done with this city.'],
      reward: 150,
      steps: [
        { kind: 'goto', x: LANDMARKS.marinaPier.x, y: LANDMARKS.marinaPier.y, r: 90, label: 'Meet Dario at Marina Pier' },
        { kind: 'taxi', fares: 1, label: 'Take a taxi fare to Gold Plaza' },
      ],
    },
    {
      id: 'hot-wheels', title: 'Hot Wheels', giver: 'Dario',
      brief: 'A Lumen GT is parked outside Villa Solana. Borrow it. Bring it to Kilo Garage North.',
      dialog: ['DARIO: The Hills crowd parks a Lumen GT like it owns the street.', 'DARIO: It does not. Not tonight. Bring it to Kilo Garage.', 'RIKO: Stealing from the rich. My favorite kind of honest work.'],
      reward: 300,
      steps: [
        { kind: 'goto', x: LANDMARKS.mansion.x, y: LANDMARKS.mansion.y, r: 110, label: 'Reach Villa Solana in The Hills' },
        { kind: 'steal', model: 'sports', label: 'Steal the Lumen GT (walk up, press E)' },
        { kind: 'deliver', x: LANDMARKS.garageN.x, y: LANDMARKS.garageN.y, r: 110, label: 'Deliver the Lumen GT to Kilo Garage North' },
      ],
    },
    {
      id: 'package-run', title: 'Package Run', giver: 'Mara',
      brief: 'Three packages at Old Town Market. Harbor Docks wants them in 150 seconds. No peeking inside.',
      dialog: ['MARA: Three boxes, market stall, docks. One hundred fifty seconds.', 'MARA: The boxes are light. The trouble is not.', 'RIKO: Light boxes, heavy trouble. Sounds like Velmara.'],
      reward: 400, time: 150,
      steps: [
        { kind: 'goto', x: LANDMARKS.market.x, y: LANDMARKS.market.y, r: 100, label: 'Reach Old Town Market' },
        { kind: 'collect', count: 3, label: 'Collect 3 packages (walk over them)' },
        { kind: 'deliver', x: LANDMARKS.docks.x, y: LANDMARKS.docks.y, r: 120, label: 'Deliver the packages to Harbor Docks' },
      ],
    },
    {
      id: 'heat', title: 'Heat', giver: 'Dario',
      brief: 'The PD has your plate. Shake them for 40 seconds, then vanish into the Safehouse.',
      dialog: ['DARIO: Blue lights, Riko. Every cruiser in Midtown.', 'DARIO: Lose them. Forty seconds of fast driving, then the Safehouse.', 'RIKO: Forty seconds. I can do forty seconds standing still.'],
      reward: 350,
      steps: [
        { kind: 'escape', time: 40, heat: 3, label: 'Escape the police for 40 seconds' },
        { kind: 'goto', x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y, r: 100, label: 'Reach the Safehouse and cool off' },
      ],
    },
    {
      id: 'street-race', title: 'Street Race', giver: 'Lena',
      brief: 'Lena races the beach strip at dusk. Beat her through 5 checkpoints and the strip is yours.',
      dialog: ['LENA: Beach strip. Five gates. Loser buys the fuel.', 'LENA: I have never lost on my own street, Riko.', 'RIKO: Then tonight is full of firsts.'],
      reward: 600,
      steps: [
        { kind: 'goto', x: LANDMARKS.beach.x, y: LANDMARKS.beach.y, r: 120, label: 'Reach South Beach for the race' },
        { kind: 'race', label: 'Beat Lena through 5 checkpoints', points: [
          { x: 700, y: 2350 }, { x: 1700, y: 2350 }, { x: 2700, y: 2350 },
          { x: 3200, y: 2000 }, { x: 2200, y: 2000 },
        ] },
      ],
    },
    {
      id: 'the-pickup', title: 'The Pickup', giver: 'Mara',
      brief: 'Four drops scattered across Velmara. Collect them all, then bring them to Casino Lumen.',
      dialog: ['MARA: Four drops. No addresses, just the map. You know the city.', 'MARA: Casino Lumen pays on delivery. Do not stop for anyone.', 'RIKO: Four stops, one payday. Easy math.'],
      reward: 500,
      steps: [
        { kind: 'collect', count: 4, label: 'Collect 4 drops across the city' },
        { kind: 'deliver', x: LANDMARKS.casino.x, y: LANDMARKS.casino.y, r: 110, label: 'Deliver the drops to Casino Lumen' },
      ],
    },
    {
      id: 'getaway-driver', title: 'Getaway Driver', giver: 'Dario',
      brief: 'Pick up the crew at Gold Plaza, shake the PD, then get them to the Safehouse in one piece.',
      dialog: ['DARIO: The crew is waiting at Gold Plaza. The PD is waiting too.', 'DARIO: You drive, they duck. Safehouse. Go.', 'RIKO: Fast, quiet, alive. In that order.'],
      reward: 700,
      steps: [
        { kind: 'goto', x: LANDMARKS.plaza.x, y: LANDMARKS.plaza.y, r: 100, label: 'Pick up the crew at Gold Plaza' },
        { kind: 'escape', time: 25, heat: 3, label: 'Shake the police for 25 seconds' },
        { kind: 'deliver', x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y, r: 100, label: 'Deliver the crew to the Safehouse' },
      ],
    },
    {
      id: 'night-shift', title: 'Night Shift', giver: 'Lena',
      brief: 'Night fares pay double in Velmara. Three fares, any cab, no questions asked.',
      dialog: ['LENA: Night crowd, night money. Three fares before dawn.', 'LENA: They tip better when the city is dark. So do I.', 'RIKO: Three fares. Then I sleep like a honest man.'],
      reward: 450,
      steps: [
        { kind: 'taxi', fares: 3, label: 'Complete 3 taxi fares (night pays double)' },
      ],
    },
    {
      id: 'gold-rush', title: 'Gold Rush', giver: 'Mara',
      brief: 'A Gold Hauler leaves the bank at dawn. Take it, outrun the escort, deliver it to the Docks.',
      dialog: ['MARA: One truck. One bank. One very loud alarm.', 'MARA: The docks pay in gold for gold. Funny how that works.', 'RIKO: Loud is fine. Slow is not.'],
      reward: 900,
      steps: [
        { kind: 'goto', x: LANDMARKS.bank.x, y: LANDMARKS.bank.y, r: 110, label: 'Reach Velmara Gold Bank' },
        { kind: 'steal', model: 'truck', label: 'Steal the Gold Hauler (walk up, press E)' },
        { kind: 'escape', time: 20, heat: 4, label: 'Outrun the escort for 20 seconds' },
        { kind: 'deliver', x: LANDMARKS.docks.x, y: LANDMARKS.docks.y, r: 120, label: 'Deliver the gold to Harbor Docks' },
      ],
    },
    {
      id: 'king-of-velmara', title: 'King of Velmara', giver: 'Dario',
      brief: 'One last race across the whole city, then park the crown at Villa Solana. Win this and Velmara is yours.',
      dialog: ['DARIO: Every crew in the city is watching this one, Riko.', 'DARIO: Six gates, coast to coast. Lena is driving too.', 'RIKO: Then let them watch. I drive better with an audience.'],
      reward: 1500,
      steps: [
        { kind: 'race', label: 'Win the grand race: 6 gates across Velmara', points: [
          { x: 320, y: 320 }, { x: 1700, y: 200 }, { x: 3200, y: 650 },
          { x: 3200, y: 2000 }, { x: 1700, y: 2350 }, { x: 700, y: 1550 },
        ] },
        { kind: 'deliver', x: LANDMARKS.mansion.x, y: LANDMARKS.mansion.y, r: 120, label: 'Park at Villa Solana — take the crown' },
      ],
    },
  ],

  cur: null, doneCount: 0, dialogShown: false,

  start(i, G) {
    const def = this.list[i];
    if (!def) return false;
    this.cur = { def, idx: i, step: 0, timer: def.time || 0, collected: 0, faresDone: 0, rival: null, cp: 0, escapeT: 0 };
    this.dialogShown = false;
    const s0 = def.steps[0];
    if (s0.kind === 'collect') G.spawnPackages(s0.count);
    if (s0.kind === 'race') this.setupRace(G, s0);
    if (s0.kind === 'escape') { G.addHeat(30); G.message('The police are on you — RUN!', 3); }
    G.message(def.title + ' — ' + def.brief, 5);
    if (def.time) G.message('Time limit: ' + def.time + 's', 3);
    return true;
  },
  stepDef() { return this.cur ? this.cur.def.steps[this.cur.step] : null; },
  objective() {
    if (!this.cur) return 'Free roam — press M for missions, drive and earn.';
    const s = this.stepDef();
    if (!s) return '';
    let t = s.label || '';
    if (s.kind === 'collect') t += ' (' + this.cur.collected + '/' + s.count + ')';
    if (s.kind === 'taxi') t += ' (' + this.cur.faresDone + '/' + s.fares + ')';
    if (s.kind === 'race') t += ' (' + this.cur.cp + '/' + s.points.length + ')';
    if (this.cur.timer > 0) t += '  —  ' + Math.ceil(this.cur.timer) + 's';
    return t;
  },
  fail(G, why) {
    G.message('Mission failed: ' + why, 4);
    AudioSys.sfx('fail');
    this.cur = null;
  },
  complete(G) {
    const def = this.cur.def;
    G.player.money += def.reward;
    G.player.rep += 1;
    G.message(def.title + ' complete! +$' + def.reward, 4);
    AudioSys.sfx('mission');
    this.doneCount++;
    this.cur = null;
    G.saveGame();
    if (this.doneCount >= this.list.length) {
      G.message('KING OF VELMARA — you own this city now.', 6);
      G.player.money += 2000;
    } else {
      this.start(this.doneCount, G);
    }
  },
  nextStep(G) {
    this.cur.step++;
    if (this.cur.step >= this.cur.def.steps.length) { this.complete(G); return; }
    const s = this.stepDef();
    if (s.kind === 'collect') G.spawnPackages(s.count);
    if (s.kind === 'race') this.setupRace(G, s);
    if (s.kind === 'escape') { G.addHeat(30); G.message('The police are on you — RUN!', 3); }
    G.message(s.label, 3);
  },
  setupRace(G, s) {
    const p0 = s.points[0];
    this.cur.rival = {
      x: p0.x - 60, y: p0.y + 40, angle: 0, speed: 0, cp: 0,
      model: 'coupe', color: '#ff5fa2', top: 360, accel: 300,
    };
    this.cur.cp = 0;
  },
  update(dt, G) {
    const c = this.cur;
    if (!c) return;
    const s = this.stepDef();
    if (!s) return;
    if (c.timer > 0) {
      c.timer -= dt;
      if (c.timer <= 0) { this.fail(G, 'Out of time'); return; }
    }
    const P = G.player;
    if (s.kind === 'goto' || s.kind === 'deliver') {
      const needCar = s.kind === 'deliver';
      if ((!needCar || !P.onFoot) && dist(P.x, P.y, s.x, s.y) < s.r) this.nextStep(G);
    } else if (s.kind === 'steal') {
      if (!P.onFoot && P.car && P.car.model === s.model) this.nextStep(G);
    } else if (s.kind === 'taxi') {
      if (c.faresDone >= s.fares) this.nextStep(G);
    } else if (s.kind === 'collect') {
      if (c.collected >= s.count) this.nextStep(G);
    } else if (s.kind === 'escape') {
      c.escapeT += dt;
      if (c.escapeT >= s.time) this.nextStep(G);
    } else if (s.kind === 'race') {
      const pts = s.points;
      const target = pts[c.cp];
      if (target && dist(P.x, P.y, target.x, target.y) < 110) {
        c.cp++;
        AudioSys.sfx('pickup');
        if (c.cp >= pts.length) {
          const rivalCp = c.rival ? c.rival.cp : 0;
          if (rivalCp >= pts.length) { this.fail(G, 'Lena beat you to the line'); return; }
          this.nextStep(G);
        }
      }
      if (c.rival) {
        const r = c.rival;
        const rt = pts[Math.min(r.cp, pts.length - 1)];
        if (rt && dist(r.x, r.y, rt.x, rt.y) < 110) r.cp++;
        if (rt) {
          const want = angTo(r.x, r.y, rt.x, rt.y);
          r.angle += clamp(angDiff(r.angle, want), -2.4 * dt, 2.4 * dt);
          r.speed = Math.min(r.speed + r.accel * dt, r.top * (0.92 + 0.05 * Math.sin(r.cp * 2)));
          r.x += Math.cos(r.angle) * r.speed * dt;
          r.y += Math.sin(r.angle) * r.speed * dt;
        }
      }
    }
  },
  onFareDone(G) { if (this.cur && this.stepDef() && this.stepDef().kind === 'taxi') this.cur.faresDone++; },
  onPackage(G) { if (this.cur && this.stepDef() && this.stepDef().kind === 'collect') this.cur.collected++; },
};
