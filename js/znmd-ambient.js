// ZNMD Ambient Audio Engine — Web Audio API
// A-minor tonality, slow wandering arpeggios + drone pads + feedback delay
// Inspired by the Shankar-Ehsaan-Loy emotional palette of ZNMD

export class ZNMDAmbient {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.wet = null;
    this.running = false;
    this.melodyTimer = null;
    this.droneNodes = [];
  }

  _boot() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;

    // Tape-style feedback delay for warmth
    const delay  = this.ctx.createDelay(2.5);
    const fb     = this.ctx.createGain();
    const dFilt  = this.ctx.createBiquadFilter();
    delay.delayTime.value = 0.42;
    fb.gain.value         = 0.26;
    dFilt.type            = 'lowpass';
    dFilt.frequency.value = 1100;
    delay.connect(dFilt); dFilt.connect(fb); fb.connect(delay);
    delay.connect(this.ctx.destination);

    // Wet send at lower gain
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.55;
    this.master.connect(this.wet);
    this.wet.connect(delay);
    this.master.connect(this.ctx.destination);
  }

  // Soft sine pad — two slightly detuned oscs for warmth
  _pad(freq, vol) {
    const ctx = this.ctx;
    [0, 3].forEach(detune => {
      const osc  = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      filt.type           = 'lowpass';
      filt.frequency.value = Math.min(freq * 3, 900);
      gain.gain.value = vol;
      osc.connect(filt); filt.connect(gain); gain.connect(this.master);
      osc.start();
      this.droneNodes.push(osc, gain);
    });
  }

  // Plucked triangle — like an acoustic guitar harmonic
  _pluck(freq, when, vol, dur) {
    const ctx  = this.ctx;
    const osc  = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type             = 'triangle';
    osc.frequency.value  = freq;
    osc.detune.value     = (Math.random() - 0.5) * 5;
    filt.type            = 'bandpass';
    filt.frequency.value = freq * 2.2;
    filt.Q.value         = 1.8;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filt); filt.connect(gain); gain.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  _drone() {
    // A-minor tonal center: A1 A2 E3 A3 C4 E4 A4
    [[55,0.055],[82.41,0.04],[110,0.038],[130.81,0.028],[164.81,0.022],[220,0.016]]
      .forEach(([f, v]) => this._pad(f, v));
  }

  _arpeggio() {
    // A-minor pentatonic melody — wandering, melancholic
    // A C D E G across two octaves
    const SEQ = [
      [220, 0.10, 3.2],[261.63,0.07,2.6],[293.66,0.08,3.0],[329.63,0.09,3.4],
      [392, 0.07, 2.4],[329.63,0.08,2.8],[261.63,0.07,2.6],[220,  0.09,3.8],
      [174.61,0.06,2.8],[220,0.07,2.4],[261.63,0.06,2.6],[293.66,0.08,3.0],
      [329.63,0.09,3.2],[392,0.07,2.6],[440,0.07,2.4],[392,0.08,3.0],
    ];
    const GAPS = [4.0,3.2,3.6,4.4,3.0,3.4,4.0,3.2,3.8,4.6,3.2,3.4,4.0,3.2,3.6,4.4];
    let i = 0;
    const tick = () => {
      if (!this.running) return;
      const [freq, vol, dur] = SEQ[i % SEQ.length];
      this._pluck(freq, this.ctx.currentTime + 0.05, vol, dur);
      this.melodyTimer = setTimeout(tick, GAPS[i % GAPS.length] * 1000);
      i++;
    };
    tick();
  }

  start(vol = 0.38) {
    this._boot();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.running = true;
    this._drone();
    setTimeout(() => { if (this.running) this._arpeggio(); }, 2200);
    const now = this.ctx.currentTime;
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(vol, now + 4);
  }

  stop() {
    this.running = false;
    clearTimeout(this.melodyTimer);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.linearRampToValueAtTime(0, now + 2.8);
    setTimeout(() => {
      this.droneNodes.forEach(n => { try { n.disconnect(); if(n.stop) n.stop(); } catch(e){} });
      this.droneNodes = [];
    }, 3200);
  }

  setVol(v) {
    if (!this.ctx) return;
    this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 1.8);
  }
}
