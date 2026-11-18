'use strict';
/* VELMARA render.js — one job: draw everything.
   The city, its cars and people, the particles and shadows, then
   the HUD, the minimap and the menus. All canvas, all original art. */

const Render = {
  /* Night factor 0 (noon) .. 1 (midnight) from the clock hour. */
  nightF(hour) {
    if (hour >= 20 || hour < 5) return 1;
    if (hour >= 18) return (hour - 18) / 2;
    if (hour >= 5 && hour < 7) return 1 - (hour - 5) / 2;
    return 0;
  },
  drawWorld(ctx, G, cam) {
    const night = this.nightF(G.hour);
    /* Ground: grass, then the sea and sand along the south edge. */
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(cam.x - 20, cam.y - 20, G.view.w + 40, G.view.h + 40);
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(cam.x - 20, WORLD_H - 130, G.view.w + 40, 150);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(cam.x - 20, WORLD_H - 132, G.view.w + 40, 26);
    /* Parks and plazas. */
    for (const p of World.parks) {
      if (!this.onScreen(p.x, p.y, p.w, p.h, cam, G)) continue;
      ctx.fillStyle = p.plaza ? PAL.plaza : PAL.park;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      if (!p.plaza) {
        ctx.fillStyle = '#4c8a42';
        for (let i = 0; i < p.trees; i++) {
          const tx = p.x + 30 + ((i * 67) % Math.max(40, p.w - 60));
          const ty = p.y + 30 + ((i * 43) % Math.max(40, p.h - 60));
          ctx.beginPath(); ctx.arc(tx, ty, 16, 0, 7); ctx.fill();
        }
      }
    }
    /* Roads with lane dashes, then sidewalks. */
    ctx.fillStyle = PAL.sidewalk;
    for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2 - 10, 0, ROAD_W + 20, WORLD_H);
    for (const ry of ROAD_Y) ctx.fillRect(0, ry - ROAD_W / 2 - 10, WORLD_W, ROAD_W + 20);
    ctx.fillStyle = PAL.road;
    for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (const ry of ROAD_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
    ctx.fillStyle = PAL.lane;
    for (const rx of ROAD_X) for (let y = 40; y < WORLD_H; y += 70) ctx.fillRect(rx - 2, y, 4, 34);
    for (const ry of ROAD_Y) for (let x = 40; x < WORLD_W; x += 70) ctx.fillRect(x, ry - 2, 34, 4);
    /* Buildings: wall, shaded roof, lit windows at night. */
    for (const b of World.buildings) {
      if (!this.onScreen(b.x, b.y, b.w, b.h, cam, G)) continue;
      const sh = (b.floors || 1) * 4;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + sh, b.y + sh, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 6);
      if (b.windows && night > 0.4) {
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        for (let wx = b.x + 14; wx < b.x + b.w - 12; wx += 26)
          for (let wy = b.y + 14; wy < b.y + b.h - 12; wy += 26)
            if (((wx * 7 + wy * 13) % 5) < 2) ctx.fillRect(wx, wy, 10, 12);
      }
    }
    /* Palms. */
    for (const p of World.palms) {
      if (p.x < cam.x - 40 || p.x > cam.x + G.view.w + 40 || p.y < cam.y - 40 || p.y > cam.y + G.view.h + 40) continue;
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 4 * p.s;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4 * p.s, p.y - 22 * p.s); ctx.stroke();
      ctx.fillStyle = '#3f8f3a';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55;
        ctx.beginPath();
        ctx.ellipse(p.x + 4 * p.s + Math.cos(a) * 13 * p.s, p.y - 22 * p.s + Math.sin(a) * 8 * p.s, 13 * p.s, 5 * p.s, a, 0, 7);
        ctx.fill();
      }
    }
    this.drawPlaces(ctx, G, cam);
  },
  onScreen(x, y, w, h, cam, G) {
    return x + w > cam.x - 30 && x < cam.x + G.view.w + 30 && y + h > cam.y - 30 && y < cam.y + G.view.h + 30;
  },

  drawPlaces(ctx, G, cam) {
    const night = this.nightF(G.hour);
    /* Gold coins: spinning, bobbing, sparkling. */
    for (const c of World.coins) {
      if (c.taken) continue;
      const bob = Math.sin(G.time * 2 + c.bob) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 8, 10, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.arc(c.x, c.y + bob, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', c.x, c.y + bob + 4);
    }
    /* Mission packages. */
    for (const p of G.pickups) {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(p.x - 10, p.y - 8, 20, 16);
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(p.x - 10, p.y - 2, 20, 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', p.x, p.y - 14);
    }
    /* Waiting taxi fares wave a hand. */
    for (const f of World.fares) {
      if (f.active) continue;
      const wave = Math.sin(G.time * 5) * 4;
      this.drawPerson(ctx, f.x, f.y, -Math.PI / 2, '#e8e8e8', 1);
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', f.x, f.y - 22 + wave);
    }
    /* Garages and gun shop signs. */
    for (const g of World.garages) this.drawSign(ctx, g.x, g.y, 'GARAGE', '#2e8fa8');
    this.drawSign(ctx, World.gunShop.x, World.gunShop.y, 'GUNS', '#8a2f2f');
    /* Mission target: pulsing ring + beam. */
    const s = Missions.stepDef();
    if (s && (s.kind === 'goto' || s.kind === 'deliver' || s.kind === 'race')) {
      const tx = s.kind === 'race' ? s.points[Math.min(Missions.cur.cp, s.points.length - 1)].x : s.x;
      const ty = s.kind === 'race' ? s.points[Math.min(Missions.cur.cp, s.points.length - 1)].y : s.y;
      const pulse = 1 + Math.sin(G.time * 4) * 0.12;
      ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(tx, ty, 46 * pulse, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,217,74,0.12)';
      ctx.beginPath(); ctx.arc(tx, ty, 46 * pulse, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.moveTo(tx, ty - 66); ctx.lineTo(tx - 10, ty - 44); ctx.lineTo(tx + 10, ty - 44); ctx.closePath(); ctx.fill();
    }
    /* Particles: smoke, sparks, skid, splashes. */
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* Night tint + headlight cones, drawn last over the world. */
    if (night > 0.05) {
      ctx.fillStyle = 'rgba(8,12,38,' + (night * 0.5).toFixed(2) + ')';
      ctx.fillRect(cam.x - 20, cam.y - 20, G.view.w + 40, G.view.h + 40);
    }
  },
  drawSign(ctx, x, y, text, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 44, y - 52, 88, 26);
    ctx.fillStyle = color;
    ctx.fillRect(x - 44, y - 52, 88, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 34);
    ctx.fillStyle = '#3d3d46';
    ctx.fillRect(x - 3, y - 26, 6, 26);
  },

  drawCar(ctx, x, y, angle, def, color, opts) {
    const o = opts || {};
    const L = def.id === 'truck' || def.id === 'van' ? 52 : 44;
    const W = def.id === 'truck' ? 26 : 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
    ctx.fillStyle = '#151515';
    ctx.fillRect(-L / 2 + 2, -W / 2 - 3, 10, 5);
    ctx.fillRect(-L / 2 + 2, W / 2 - 2, 10, 5);
    ctx.fillRect(L / 2 - 12, -W / 2 - 3, 10, 5);
    ctx.fillRect(L / 2 - 12, W / 2 - 2, 10, 5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-L / 2, -W / 2, L, W, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.beginPath(); ctx.roundRect(-4, -W / 2 + 3, 14, W - 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-L / 2 + 3, -W / 2 + 2, L - 6, 3);
    if (def.id === 'taxi') {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    if (def.id === 'truck') {
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    if (o.police) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-L / 2 + 6, -W / 2 + 2, L - 12, 5);
      ctx.fillStyle = (Math.floor(o.siren * 3) % 2 === 0) ? '#ff2e2e' : '#2e6bff';
      ctx.beginPath(); ctx.arc(0, -W / 2 - 1, 4, 0, 7); ctx.fill();
      ctx.fillStyle = (Math.floor(o.siren * 3) % 2 === 0) ? '#2e6bff' : '#ff2e2e';
      ctx.beginPath(); ctx.arc(0, W / 2 + 1, 4, 0, 7); ctx.fill();
    }
    if (o.headlight) {
      ctx.fillStyle = 'rgba(255,240,170,0.20)';
      ctx.beginPath();
      ctx.moveTo(L / 2, -8); ctx.lineTo(L / 2 + 130, -34);
      ctx.lineTo(L / 2 + 130, 34); ctx.lineTo(L / 2, 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c0';
      ctx.fillRect(L / 2 - 1, -W / 2 + 3, 3, 5);
      ctx.fillRect(L / 2 - 1, W / 2 - 8, 3, 5);
    }
    if (o.nitro) {
      ctx.fillStyle = '#4db8ff';
      ctx.beginPath(); ctx.arc(-L / 2 - 8, 0, 7 + Math.random() * 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  drawPerson(ctx, x, y, angle, color, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(1, 2, 9 * s, 6 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 8 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(4 * s, 0, 4.5 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(5 * s, 0, 3.5 * s, 0, 7); ctx.fill();
    ctx.restore();
  },
  drawEntities(ctx, G, cam) {
    const night = this.nightF(G.hour);
    for (const c of G.traffic) {
      if (!this.onScreen(c.x, c.y, 60, 60, cam, G)) continue;
      this.drawCar(ctx, c.x, c.y, c.angle, c.def, c.color, { headlight: night > 0.4 });
    }
    for (const p of G.peds) {
      if (!this.onScreen(p.x, p.y, 30, 30, cam, G)) continue;
      this.drawPerson(ctx, p.x, p.y, p.angle, p.color, 1);
    }
    for (const rb of Police.roadblocks) {
      for (const c of rb.cars) this.drawCar(ctx, c.x, c.y, c.angle, vehicleDef('sedan'), '#20242e', { police: true, siren: 2 });
    }
    for (const car of Police.cars) {
      this.drawCar(ctx, car.x, car.y, car.angle, vehicleDef('sedan'), '#20242e', { police: true, siren: car.siren, headlight: night > 0.4 });
    }
    if (Missions.cur && Missions.cur.rival) {
      const r = Missions.cur.rival;
      this.drawCar(ctx, r.x, r.y, r.angle, vehicleDef('coupe'), r.color, { headlight: night > 0.4 });
    }
    if (Police.heli) {
      const h = Police.heli;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 26, 30, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,170,0.18)';
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(G.player.x - 40, G.player.y - 40); ctx.lineTo(G.player.x + 40, G.player.y + 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath(); ctx.arc(h.x, h.y, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(h.x - 20, h.y); ctx.lineTo(h.x + 20, h.y); ctx.stroke();
    }
    const P = G.player;
    if (P.onFoot) this.drawPerson(ctx, P.x, P.y, P.angle, '#e84a4a', 1.1);
    else if (P.car) this.drawCar(ctx, P.x, P.y, P.angle, P.car.def, P.car.color, { headlight: night > 0.4, nitro: P.nitro });
  },

  drawHUD(ctx, G) {
    const P = G.player;
    const night = this.nightF(G.hour);
    ctx.textAlign = 'left';
    /* Top-left: cash, rep, wanted stars. */
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(12, 12, 250, 64, 10); ctx.fill();
    ctx.fillStyle = '#7CFC66';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('$' + P.money.toLocaleString('en-US'), 24, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText('REP ' + P.rep + '   •   ' + districtAt(P.x, P.y).name, 24, 62);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < P.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
      ctx.font = '22px sans-serif';
      ctx.fillText('★', 280 + i * 26, 40);
    }
    /* Top-right: clock, day phase, ammo, health. */
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(G.view.w - 212, 12, 200, 64, 10); ctx.fill();
    const hh = Math.floor(G.hour), mm = Math.floor((G.hour - hh) * 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), G.view.w - 24, 38);
    ctx.font = '13px sans-serif';
    ctx.fillText((night > 0.6 ? 'Night' : night > 0.2 ? 'Dusk' : 'Day') + '  •  Ammo ' + P.ammo, G.view.w - 24, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(G.view.w - 200, 66, 176, 7);
    ctx.fillStyle = P.health > 30 ? '#7CFC66' : '#ff4a4a';
    ctx.fillRect(G.view.w - 200, 66, 176 * clamp(P.health / 100, 0, 1), 7);
    ctx.textAlign = 'left';
    /* Bottom-center: current objective. */
    const obj = Missions.objective();
    ctx.font = 'bold 15px sans-serif';
    const ow = ctx.measureText(obj).width + 28;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect((G.view.w - ow) / 2, G.view.h - 52, ow, 32, 8); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('◆ ' + obj, (G.view.w - ow) / 2 + 14, G.view.h - 30);
    /* Bottom-right: speed and car health while driving. */
    if (!P.onFoot && P.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.roundRect(G.view.w - 150, G.view.h - 110, 138, 52, 10); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(Math.abs(P.speed) * 0.55) + ' mph', G.view.w - 24, G.view.h - 82);
      ctx.font = '12px sans-serif';
      ctx.fillText(P.car.def.name + (P.car.upgrades.nitro ? '  •  NITRO ready' : ''), G.view.w - 24, G.view.h - 66);
      ctx.textAlign = 'left';
    }
    /* Toast messages. */
    let my = 96;
    for (const m of G.messages) {
      ctx.globalAlpha = clamp(m.life, 0, 1);
      ctx.font = 'bold 15px sans-serif';
      const w = ctx.measureText(m.text).width + 24;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(12, my, w, 30, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(m.text, 24, my + 20);
      my += 36;
    }
    ctx.globalAlpha = 1;
    this.drawMinimap(ctx, G);
  },
  drawMinimap(ctx, G) {
    const mw = 220, mh = 160, mx = 12, my = G.view.h - mh - 12;
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 8); ctx.fill();
    ctx.fillStyle = '#3a6b2e';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    for (const rx of ROAD_X) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke(); }
    for (const ry of ROAD_Y) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke(); }
    ctx.fillStyle = '#2e8fa8';
    ctx.fillRect(mx, my + mh - 8, mw, 8);
    const s = Missions.stepDef();
    if (s && (s.kind === 'goto' || s.kind === 'deliver')) {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.arc(mx + s.x * sx, my + s.y * sy, 5, 0, 7); ctx.fill();
    }
    if (s && s.kind === 'race') {
      const pt = s.points[Math.min(Missions.cur.cp, s.points.length - 1)];
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.arc(mx + pt.x * sx, my + pt.y * sy, 5, 0, 7); ctx.fill();
    }
    for (const f of World.fares) if (!f.active) { ctx.fillStyle = '#ffd94a'; ctx.fillRect(mx + f.x * sx - 2, my + f.y * sy - 2, 4, 4); }
    for (const car of Police.cars) { ctx.fillStyle = '#4db8ff'; ctx.beginPath(); ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, 7); ctx.fill(); }
    const P = G.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx + P.x * sx, my + P.y * sy, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e84a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx + P.x * sx, my + P.y * sy, 6, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px sans-serif';
    ctx.fillText('VELMARA', mx + 4, my + mh - 4);
  },
};
