// Suoni dei minigiochi (10/10), sintetizzati con Web Audio: niente file da scaricare. Si spengono con lo stesso
// interruttore dei suoni dell'app (statsight.suono = "0"). Il contesto audio nasce al primo tocco (regola dei browser).
// Uso: SFX.play("calcio" | "racchetta" | "rimbalzo" | "ciuff" | "ferro" | "tabellone" | "mazza" | "swing" | "guantone"
//               | "lancio" | "presa" | "fischio" | "disco" | "sponda" | "sirena" | "folla" | "delusione" | "vittoria"
//               | "sconfitta" | "tic" | "tap")
(function () {
  "use strict";
  var ctx = null, noiseBuf = null;
  function on() { try { return localStorage.getItem("statsight.suono") !== "0"; } catch (e) { return true; } }
  function ready() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (!ctx) ctx = new AC(); if (ctx.state === "suspended") ctx.resume(); } catch (e) {}
  }
  document.addEventListener("pointerdown", ready, { passive: true });
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (noiseBuf = b);
  }
  // mattoncini: un tono con inviluppo e un rumore filtrato con inviluppo
  function tone(type, f0, f1, t, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(filter, f0, f1, q, t, dur, vol, attack) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); s.loop = true; fl.type = filter; fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(ctx.destination); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  var SOUNDS = {
    calcio: function (t) { tone("sine", 160, 45, t, 0.16, 0.5); hiss("lowpass", 1800, 400, 1, t, 0.05, 0.25); },
    racchetta: function (t) { tone("triangle", 900, 500, t, 0.07, 0.25); hiss("bandpass", 2500, 1500, 2, t, 0.06, 0.3); },
    rimbalzo: function (t) { tone("sine", 220, 110, t, 0.09, 0.3); },
    ciuff: function (t) { hiss("highpass", 3000, 6000, 0.7, t, 0.28, 0.18, 0.04); },
    ferro: function (t) { [520, 780, 1240].forEach(function (f, i) { tone("triangle", f, f * 0.98, t, 0.5 - i * 0.12, 0.12); }); },
    tabellone: function (t) { tone("square", 120, 70, t, 0.12, 0.18); hiss("lowpass", 900, 300, 1, t, 0.1, 0.2); },
    mazza: function (t) { hiss("bandpass", 2200, 1200, 1.5, t, 0.09, 0.6); tone("triangle", 1400, 700, t, 0.08, 0.25); },
    swing: function (t) { hiss("bandpass", 400, 1800, 2, t, 0.22, 0.2, 0.08); },
    guantone: function (t) { tone("sine", 130, 60, t, 0.1, 0.45); hiss("lowpass", 700, 200, 1, t, 0.07, 0.3); },
    lancio: function (t) { hiss("bandpass", 600, 1500, 1.5, t, 0.3, 0.15, 0.06); },
    presa: function (t) { tone("sine", 180, 80, t, 0.12, 0.4); hiss("lowpass", 1200, 300, 1, t, 0.06, 0.25); },
    fischio: function (t) { var o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = 2900; l.frequency.value = 38; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.setValueAtTime(0.12, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(ctx.destination); o.start(t); l.start(t); o.stop(t + 0.5); l.stop(t + 0.5); },
    disco: function (t) { tone("triangle", 1600, 900, t, 0.04, 0.3); hiss("highpass", 3000, 3000, 1, t, 0.03, 0.2); },
    sponda: function (t) { tone("sine", 300, 180, t, 0.06, 0.2); },
    sirena: function (t) { tone("sawtooth", 220, 220, t, 0.9, 0.08); tone("sawtooth", 277, 277, t, 0.9, 0.06); tone("square", 330, 330, t, 0.9, 0.04); },
    folla: function (t) { hiss("bandpass", 500, 900, 0.6, t, 1.6, 0.22, 0.25); hiss("bandpass", 1200, 1600, 1, t + 0.1, 1.3, 0.1, 0.3); },
    delusione: function (t) { hiss("bandpass", 700, 250, 0.8, t, 1.1, 0.16, 0.1); },
    vittoria: function (t) { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone("triangle", f, f, t + i * 0.11, i === 3 ? 0.6 : 0.22, 0.16); }); },
    sconfitta: function (t) { [392, 349.2, 311.1, 261.6].forEach(function (f, i) { tone("triangle", f, f * 0.98, t + i * 0.16, i === 3 ? 0.6 : 0.2, 0.13); }); },
    tic: function (t) { tone("square", 1800, 900, t, 0.03, 0.05); },
    tap: function (t) { tone("sine", 700, 500, t, 0.05, 0.12); }
  };
  window.SFX = {
    play: function (name, delay) {
      if (!on() || !ctx || ctx.state !== "running" || !SOUNDS[name]) return;
      try { SOUNDS[name](ctx.currentTime + 0.005 + (delay || 0)); } catch (e) {}
    }
  };
})();
