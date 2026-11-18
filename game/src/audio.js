'use strict';
/* VELMARA audio.js — one job: every sound, all synthesized live.
   No audio files: engine hum, sirens, an adaptive bassline and
   effects are built from oscillators and noise in WebAudio. */

const AudioSys = {
  ctx: null, master: null, musicGain: null, engineOsc: null, engineGain: null,
  sirenOsc: null, sirenGain: null, sirenTimer: 0, musicTimer: 0, musicStep: 0,
  muted: false, started: false, intensity: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.master);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineOsc.connect(lp); lp.connect(this.engineGain);
      this.engineOsc.start();
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenGain.connect(this.master);
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenOsc.start();
      this.started = true;
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },
  /* Engine pitch follows speed; siren wails while the heat is on. */
  update(dt, speedFrac, wanted, driving) {
    if (!this.ctx) return;
    if (!isFinite(speedFrac)) speedFrac = 0;
    const t = this.ctx.currentTime;
    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(50 + speedFrac * 165, t, 0.08);
      this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedFrac * 0.06 : 0.0, t, 0.1);
    }
    if (this.sirenOsc) {
      if (wanted > 0) {
        this.sirenTimer += dt;
        const hi = Math.sin(this.sirenTimer * 2.6) > 0;
        this.sirenOsc.frequency.setTargetAtTime(hi ? 880 : 620, t, 0.05);
        this.sirenGain.gain.setTargetAtTime(0.035, t, 0.2);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, t, 0.2);
      }
    }
    this.intensity = wanted > 0 ? 1 : (speedFrac > 0.6 ? 0.6 : 0.25);
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = this.intensity > 0.8 ? 0.16 : 0.24;
      this.musicStep = (this.musicStep + 1) % 32;
      this.playStep(this.musicStep);
    }
  },

  /* Adaptive bassline: A-minor groove, faster and tenser when wanted. */
  playStep(step) {
    if (!this.ctx || this.muted) return;
    const bass = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 58.27, 0, 65.41, 0,
                  55, 0, 55, 0, 65.41, 0, 82.41, 0, 73.42, 0, 65.41, 0, 58.27, 0, 49, 0];
    const f = bass[step];
    if (f) this.tone(f, 0.16, 'triangle', 0.5, this.musicGain);
    if (step % 8 === 4) this.tone(220, 0.1, 'square', 0.10, this.musicGain);
    if (this.intensity > 0.8 && step % 4 === 2) this.tone(440, 0.05, 'square', 0.07, this.musicGain);
    if (step % 4 === 0) this.noise(0.03, 0.25);
  },
  tone(freq, dur, type, vol, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(g); g.connect(this.master);
    src.start(t);
  },
  /* Named effects the game calls at the right moments. */
  sfx(name) {
    if (!this.ctx || this.muted) return;
    if (name === 'coin') { this.tone(988, 0.09, 'sine', 0.35); setTimeout(() => this.tone(1319, 0.14, 'sine', 0.35), 70); }
    else if (name === 'crash') { this.noise(0.25, 0.5); this.tone(70, 0.25, 'sawtooth', 0.4); }
    else if (name === 'shot') { this.noise(0.12, 0.5); this.tone(180, 0.08, 'square', 0.3); }
    else if (name === 'punch') { this.noise(0.08, 0.35); this.tone(120, 0.1, 'sine', 0.3); }
    else if (name === 'pickup') { this.tone(660, 0.1, 'sine', 0.3); setTimeout(() => this.tone(880, 0.12, 'sine', 0.3), 80); }
    else if (name === 'mission') { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.4), i * 110)); }
    else if (name === 'fail') { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.25), i * 130)); }
    else if (name === 'enter') { this.tone(330, 0.08, 'square', 0.25); setTimeout(() => this.tone(495, 0.1, 'square', 0.25), 70); }
    else if (name === 'busted') { [220, 196, 165, 131].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.3), i * 160)); }
    else if (name === 'cash') { this.tone(1175, 0.08, 'sine', 0.3); setTimeout(() => this.tone(1568, 0.16, 'sine', 0.3), 60); }
    else if (name === 'skid') { this.noise(0.15, 0.12); }
  },
};
