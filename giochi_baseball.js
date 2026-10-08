// StatsFight giochi (10/10): baseball. Due inning: in ogni inning prima batti tu (5 lanci della CPU), poi lanci tu
// (5 lanci alla CPU). Battere: tocca lo schermo per girare la mazza quando la palla arriva nel riquadro; il tempo
// conta: preciso = fuoricampo (3 punti), quasi = valida (1), in anticipo o in ritardo = fallo, troppo = strike.
// Lanciare: tocca un punto del riquadro: negli angoli la CPU batte meno, fuori dal riquadro e' "ball" (+1 alla CPU).
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("ycv"), S = null, st = null, cpuAv = null;
  var INNINGS = 2, PITCHES = 5;
  function newGame() {
    cpuAv = G.randomAv(); cpuAv.cappello = "cappellino"; cpuAv.capelli = cpuAv.capelli === "afro" ? "corti" : cpuAv.capelli;
    st = { inning: 0, half: "bat", n: 0, me: 0, cpu: 0, phase: "ready", pitch: null, swing: null, hit: null, msg: "", msgT: 0, celebrate: null };
    $("yover").hidden = true; nextPitch();
  }
  function hud() {
    $("yme").textContent = G.av.nome || "Tu"; $("ycpu").textContent = "CPU"; $("ysc").textContent = st.me + " - " + st.cpu;
    $("yhelp").textContent = (st.inning < INNINGS ? "Inning " + (st.inning + 1) + " di " + INNINGS : "Inning supplementare") + " · lancio " + Math.min(st.n + 1, PITCHES) + " di " + PITCHES + ". "
      + (st.half === "bat" ? "Batti tu: tocca lo schermo quando la palla entra nel riquadro. Preciso = fuoricampo (3 punti), quasi = valida (1)."
        : "Lanci tu: tocca un punto del riquadro. Negli angoli la CPU batte meno; fuori dal riquadro è ball e la CPU prende 1 punto.");
  }
  function geo() { var W = S.W, H = S.H; return { W: W, H: H, plate: { x: W / 2, y: H * 0.9 }, mound: { x: W / 2, y: H * 0.585 }, zone: { x: W / 2, y: H * 0.74, w: W * 0.17, h: H * 0.12 } }; }
  function nextPitch() {
    st.pitch = null; st.swing = null; st.hit = null; st.phase = "ready"; hud();
    if (st.half === "bat") { st.readyT = performance.now() / 1000 + 1.1; }
  }
  // lancio verso un punto (u,v) del riquadro: -1..1 dentro, oltre = fuori
  function throwPitch(u, v, dur) { st.pitch = { u: u, v: v, t0: performance.now() / 1000 + 0.5, dur: dur, curve: G.rnd(-0.25, 0.25) }; st.phase = "pitch"; }
  function pitchPos(g, t) {
    var p = st.pitch, z = g.zone, tx = z.x + p.u * z.w / 2, ty = z.y + p.v * z.h / 2, k = Math.pow(t, 1.7);
    var x0 = g.mound.x + 10 * S.H / 1100, y0 = g.mound.y - 150 * S.H / 1100;
    return { x: G.lerp(x0, tx, k) + Math.sin(k * Math.PI) * p.curve * z.w, y: G.lerp(y0, ty, k) - Math.sin(k * Math.PI) * S.H * 0.03, r: G.lerp(2.2, S.W * 0.022, k) };
  }
  function result(kind, pts, who) {
    if (pts) { if (who === "me") st.me += pts; else st.cpu += pts; }
    st.msg = { hr: "Fuoricampo!", valida: "Valida!", fallo: "Fallo", strike: "Strike", ball: "Ball", presa: "Al volo: eliminato" }[kind] + (pts ? " +" + pts : "");
    st.msgGood = (who === "me") === (pts > 0) || (who === "cpu" && !pts);
    st.msgT = performance.now() / 1000; st.phase = "result"; hud();
    setTimeout(advance, 1700);
  }
  function advance() {
    st.n++;
    if (st.n >= PITCHES) {   // cambio: dopo la battuta si lancia; dopo il lancio inning finito (pari = inning in piu')
      st.n = 0;
      if (st.half === "bat") st.half = "pitch";
      else { st.half = "bat"; st.inning++; if (st.inning >= INNINGS && st.me !== st.cpu) return end(); }
    }
    nextPitch();
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    var nuovi = win ? UI.onWin("baseball") : (G.pg.giocate++, G.savePg(), []);
    $("yover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="yagain">Rivincita</button>';
    $("yover").style.justifyContent = "flex-end"; $("yover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("yover").hidden = false;
    $("yagain").onclick = newGame;
  }
  // battuta: confronto fra il momento del contatto e l'arrivo della palla
  function judgeSwing(delta, inZone) {
    var a = Math.abs(delta);
    if (a <= 0.04 && inZone) return "hr";
    if (a <= 0.08) return "valida";
    if (a <= 0.14) return "fallo";
    return "strike";
  }
  function cpuBats(u, v) {
    var d = Math.max(Math.abs(u), Math.abs(v));
    if (d > 1) return "ball";
    var r = Math.random(), edge = Math.pow(d, 1.5);
    if (r < 0.2 * (1 - edge)) return "hr";
    if (r < 0.2 * (1 - edge) + 0.32 * (1 - edge * 0.7)) return "valida";
    return Math.random() < 0.5 ? "fallo" : "strike";
  }

  // ------------------------------------------------------------------ comandi
  cv.addEventListener("pointerdown", function (e) {
    if (!st) return; var now = performance.now() / 1000, g = geo(), p = G.pt(cv, e);
    if (st.half === "bat" && st.phase === "pitch" && !st.swing) {
      st.swing = { t0: now };
      var arrive = st.pitch.t0 + st.pitch.dur, delta = now + 0.07 - arrive, inZone = Math.abs(st.pitch.u) <= 1 && Math.abs(st.pitch.v) <= 1;
      st.swing.kind = judgeSwing(delta, inZone); st.swing.early = delta < 0;
    } else if (st.half === "pitch" && st.phase === "ready") {
      var z = g.zone, u = (p.x - z.x) / (z.w / 2), v = (p.y - z.y) / (z.h / 2);
      if (Math.abs(u) > 1.8 || Math.abs(v) > 1.8) return;
      throwPitch(G.clamp(u + G.rnd(-0.12, 0.12), -1.6, 1.6), G.clamp(v + G.rnd(-0.12, 0.12), -1.6, 1.6), G.rnd(0.6, 0.75));
      st.cpuKind = cpuBats(st.pitch.u, st.pitch.v);
      if (st.cpuKind !== "ball" && st.cpuKind !== "strike") st.swingAt = st.pitch.t0 + st.pitch.dur - 0.07 + (st.cpuKind === "fallo" ? G.pick([-0.11, 0.11]) : 0);
      else st.swingAt = st.cpuKind === "strike" ? st.pitch.t0 + st.pitch.dur - 0.25 : null;
    }
  });

  // ------------------------------------------------------------------ disegno
  function field(c, g) {
    var W = g.W, H = g.H, sky = c.createLinearGradient(0, 0, 0, H * 0.35); sky.addColorStop(0, "#8EC9F2"); sky.addColorStop(1, "#CFE9F7"); c.fillStyle = sky; c.fillRect(0, 0, W, H * 0.35);
    c.fillStyle = "#FFE45C"; c.beginPath(); c.arc(W * 0.2, H * 0.1, W * 0.06, 0, G.TAU); c.fill();
    for (var i = 0; i < 9; i++) { var hx = i * W / 8 - W * 0.04, hh = H * (0.04 + (i % 3) * 0.012); c.fillStyle = ["#D9534F", "#F0AD4E", "#5BC0DE", "#E8E1D3"][i % 4]; c.fillRect(hx, H * 0.33 - hh, W * 0.1, hh); c.fillStyle = "#7A3B2E"; c.beginPath(); c.moveTo(hx - 3, H * 0.33 - hh); c.lineTo(hx + W * 0.05, H * 0.33 - hh - H * 0.03); c.lineTo(hx + W * 0.1 + 3, H * 0.33 - hh); c.fill(); }
    c.fillStyle = "#2F6B3A"; c.fillRect(0, H * 0.33, W, H * 0.04); c.fillStyle = "#F2C230"; c.fillRect(0, H * 0.33, W, 3);   // recinzione
    var gr = c.createLinearGradient(0, H * 0.37, 0, H); gr.addColorStop(0, "#6FA35A"); gr.addColorStop(1, "#4E8A3F"); c.fillStyle = gr; c.fillRect(0, H * 0.37, W, H * 0.63);
    for (var s = 0; s < 6; s++) { c.fillStyle = "rgba(255,255,255,.05)"; c.beginPath(); c.moveTo(W / 2, H * 0.92); c.lineTo(W * (s / 6), H * 0.37); c.lineTo(W * ((s + 0.5) / 6), H * 0.37); c.fill(); }
    // diamante: terra, erba dentro, basi
    var hp = g.plate, b1 = { x: W * 0.86, y: H * 0.66 }, b2 = { x: W / 2, y: H * 0.5 }, b3 = { x: W * 0.14, y: H * 0.66 };
    c.fillStyle = "#C98B57"; c.beginPath(); c.moveTo(hp.x, hp.y + H * 0.04); c.lineTo(b1.x + W * 0.08, b1.y); c.quadraticCurveTo(W / 2, H * 0.36, b3.x - W * 0.08, b3.y); c.closePath(); c.fill();
    c.fillStyle = "#62994F"; c.beginPath(); c.moveTo(hp.x, hp.y - H * 0.04); c.lineTo(b1.x - W * 0.06, b1.y); c.lineTo(b2.x, b2.y + H * 0.03); c.lineTo(b3.x + W * 0.06, b3.y); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hp.x, hp.y); c.lineTo(W * 1.2, H * 0.48); c.moveTo(hp.x, hp.y); c.lineTo(-W * 0.2, H * 0.48); c.stroke();
    [b1, b2, b3].forEach(function (b) { c.save(); c.translate(b.x, b.y); c.scale(1, 0.5); c.rotate(Math.PI / 4); c.fillStyle = "#fff"; c.fillRect(-6, -6, 12, 12); c.restore(); });
    c.fillStyle = "#C98B57"; c.beginPath(); c.ellipse(g.mound.x, g.mound.y, W * 0.11, H * 0.025, 0, 0, G.TAU); c.fill();
    c.fillStyle = "#C98B57"; c.beginPath(); c.ellipse(hp.x, hp.y, W * 0.3, H * 0.07, 0, 0, G.TAU); c.fill();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2; c.strokeRect(hp.x - W * 0.27, hp.y - H * 0.04, W * 0.14, H * 0.09); c.strokeRect(hp.x + W * 0.13, hp.y - H * 0.04, W * 0.14, H * 0.09);
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(hp.x - W * 0.05, hp.y - H * 0.012); c.lineTo(hp.x + W * 0.05, hp.y - H * 0.012); c.lineTo(hp.x + W * 0.05, hp.y + H * 0.006); c.lineTo(hp.x, hp.y + H * 0.022); c.lineTo(hp.x - W * 0.05, hp.y + H * 0.006); c.closePath(); c.fill();
  }
  function baseball(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, G.TAU); c.fillStyle = "#FAFAFA"; c.fill(); if (r > 4) { c.strokeStyle = "#D33"; c.lineWidth = Math.max(1, r * 0.12); c.beginPath(); c.arc(x - r * 1.1, y, r * 0.8, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(x + r * 1.1, y, r * 0.8, Math.PI - 0.8, Math.PI + 0.8); c.stroke(); } }
  function frame() {
    if (!S || !st) return;
    var c = S.c, g = geo(), W = g.W, H = g.H, now = performance.now() / 1000;
    if (st.phase === "ready" && st.half === "bat" && now >= st.readyT) {   // la CPU lancia: 80% nel riquadro, veloce o lento
      var inside = Math.random() < 0.8, u = inside ? G.rnd(-0.9, 0.9) : G.pick([-1, 1]) * G.rnd(1.2, 1.6), v = inside ? G.rnd(-0.9, 0.9) : G.rnd(-1.4, 1.4);
      throwPitch(u, v, G.pick([0.62, 0.7, 0.8, 0.95]));
    }
    var batterAv = st.half === "bat" ? G.av : cpuAv, pitcherAv = st.half === "bat" ? cpuAv : G.av;
    // la CPU batte quando lanci tu
    if (st.half === "pitch" && st.phase === "pitch" && st.swingAt && !st.swing && now >= st.swingAt) st.swing = { t0: now, kind: st.cpuKind, early: Math.random() < 0.5 };
    // fine del lancio: esito
    if (st.phase === "pitch" && now > st.pitch.t0 + st.pitch.dur + 0.05) {
      var who = st.half === "bat" ? "me" : "cpu", kind;
      if (st.half === "bat") { var inZ = Math.abs(st.pitch.u) <= 1 && Math.abs(st.pitch.v) <= 1; kind = st.swing ? st.swing.kind : (inZ ? "strike" : "ball"); }
      else kind = st.cpuKind;
      if (kind === "valida" && Math.random() < 0.18) kind = "presa";
      st.hit = { kind: kind, t0: now, from: pitchPos(g, 1), early: st.swing ? st.swing.early : false };
      result(kind, kind === "hr" ? 3 : kind === "valida" ? 1 : (kind === "ball" && who === "cpu") ? 1 : 0, who);
    }
    field(c, g);
    // lanciatore sul monte
    var ps = H / 1100, pt = st.pitch ? G.clamp((now - (st.pitch.t0 - 0.5)) / 0.5, 0, 1) : 0;
    var pPose = pt < 1 && st.phase === "pitch" ? G.P({ ar: [G.lerp(0.3, 3.0, pt), 0.3], al: [-0.6, 0.4], ll: [-0.1, 0], lr: [0.3 * pt, -0.4 * pt] }) : st.phase === "pitch" ? G.P({ ar: [0.6, 0.2], al: [-0.5, 0.3], tilt: 0.15 }) : G.P({ al: [-0.5, 0.9], ar: [0.5, -0.9] });
    G.drawGuy(c, pitcherAv, g.mound.x, g.mound.y, ps, pPose, {});
    // riquadro dello strike
    var z = g.zone;
    c.strokeStyle = st.half === "pitch" && st.phase === "ready" ? "rgba(255,213,79,.95)" : "rgba(255,255,255,.35)"; c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h); c.setLineDash([]);
    if (st.half === "pitch" && st.phase === "ready") { c.strokeStyle = "rgba(255,213,79,.35)"; c.lineWidth = 1; for (var q = 1; q < 3; q++) { c.beginPath(); c.moveTo(z.x - z.w / 2 + q * z.w / 3, z.y - z.h / 2); c.lineTo(z.x - z.w / 2 + q * z.w / 3, z.y + z.h / 2); c.moveTo(z.x - z.w / 2, z.y - z.h / 2 + q * z.h / 3); c.lineTo(z.x + z.w / 2, z.y - z.h / 2 + q * z.h / 3); c.stroke(); } }
    // palla lanciata (dietro al battitore solo quando e' gia' passata)
    var ballPos = null;
    if (st.phase === "pitch" && now >= st.pitch.t0) ballPos = pitchPos(g, G.clamp((now - st.pitch.t0) / st.pitch.dur, 0, 1.1));
    if (st.hit) {   // dopo il colpo
      var ht = now - st.hit.t0, f = st.hit.from, k = st.hit.kind;
      if (k === "hr") ballPos = { x: G.lerp(f.x, W * 0.55, Math.min(1, ht / 1.3)), y: f.y - Math.sin(Math.min(1, ht / 1.3) * Math.PI * 0.8) * H * 0.75 + ht * 30, r: Math.max(1.5, f.r * (1 - ht * 0.7)) };
      else if (k === "valida" || k === "presa") ballPos = { x: G.lerp(f.x, W * (st.hit.early ? 0.25 : 0.75), Math.min(1, ht)), y: G.lerp(f.y, H * 0.45, Math.min(1, ht)) - Math.sin(Math.min(1, ht) * Math.PI) * H * 0.12, r: Math.max(2, f.r * (1 - ht * 0.6)) };
      else if (k === "fallo") ballPos = { x: f.x + (st.hit.early ? -1 : 1) * ht * W * 1.1, y: f.y - Math.sin(Math.min(1, ht * 1.5) * Math.PI) * H * 0.25, r: f.r };
      else ballPos = { x: f.x, y: f.y + Math.min(ht, 0.25) * H * 0.3, r: f.r * 1.1 };   // nel guantone del ricevitore
    }
    // battitore a sinistra del piatto, girato verso il lanciatore
    var bs = H / 520, sw = st.swing ? G.clamp((now - st.swing.t0) / 0.22, 0, 1) : 0;
    var idle = G.P({ al: [1.25, 1.35], ar: [0.45, -2.9], ll: [-0.2, 0.05], lr: [0.25, -0.05], hold: "bat", batAng: -0.75 });
    var contact = G.P({ al: [1.65, 0.1], ar: [1.45, 0.15], ll: [-0.25, 0.1], lr: [0.35, -0.2], hold: "bat", batAng: 1.5, tilt: 0.12 });
    var follow = G.P({ al: [2.5, 0.4], ar: [2.3, 0.4], ll: [-0.25, 0.1], lr: [0.4, -0.3], hold: "bat", batAng: 3.4, tilt: 0.2 });
    var bPose = sw < 0.5 ? G.mixPose(idle, contact, sw * 2) : G.mixPose(contact, follow, (sw - 0.5) * 2); bPose.hold = "bat"; bPose.batAng = sw < 0.5 ? G.lerp(-0.75, 1.5, sw * 2) : G.lerp(1.5, 3.4, (sw - 0.5) * 2);
    var behind = ballPos && st.phase === "pitch" && now > st.pitch.t0 + st.pitch.dur;
    if (behind) baseball(c, ballPos.x, ballPos.y, ballPos.r);
    G.drawGuy(c, batterAv, W * 0.26, H * 0.97, bs, bPose, {});
    if (ballPos && !behind) baseball(c, ballPos.x, ballPos.y, ballPos.r);
    // scritte
    if (st.phase === "ready") {
      c.font = "800 " + Math.round(W * 0.055) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.55)";
      var tx = st.half === "bat" ? "Pronto a battere" : "Tocca il riquadro per lanciare"; c.strokeText(tx, W / 2, H * 0.22); c.fillStyle = "#FFD54F"; c.fillText(tx, W / 2, H * 0.22);
    }
    if (st.phase === "result" && st.msg) {
      var al = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = al; c.font = "800 " + Math.round(W * 0.1) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.2); c.fillStyle = st.msgGood ? "#2E9E5B" : "#D9534F"; c.fillText(st.msg, W / 2, H * 0.2); c.restore();
    }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, pz = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, pz, {});
    }
  }
  window.Baseball = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.25, 190); },
    frame: frame,
    _st: function () { return st; }
  };
})();
