// StatsFight giochi (10/10, rifatto): sfida di battuta a baseball. Si batte a turno: un lancio a te, uno alla CPU,
// cinque a testa (pari: si continua finche' uno sbaglia). Mentre uno batte l'altro aspetta a bordo campo. Tocca lo
// schermo per girare la mazza quando la palla arriva nel riquadro: preciso = fuoricampo (3 punti), quasi = valida
// (1), in anticipo o in ritardo = fallo, troppo = strike. Visto da dietro il ricevitore: il battitore e' di spalle,
// girato verso il lanciatore; la mazza e' sempre nelle mani (posizione delle mani calcolata, braccia di conseguenza).
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("ycv"), S = null, st = null, cpuAv = null, pitAv = null;
  var TURNS = 5, SWING = 0.3, CONTACT = 0.45;   // durata dello swing; frazione in cui la mazza passa sul piatto
  function newGame() {
    cpuAv = G.randomAv(); pitAv = G.randomAv(); pitAv.cappello = "cappellino"; pitAv.maglia = "maglia"; pitAv.nome = "";
    st = { n: 0, turn: "me", me: 0, cpu: 0, log: { me: [], cpu: [] }, phase: "ready", pitch: null, swing: null, hit: null, msg: "", msgT: 0, celebrate: null };
    $("yover").hidden = true; nextPitch();
  }
  function hud() {
    $("yme").textContent = G.av.nome || "Tu"; $("ycpu").textContent = "CPU"; $("ysc").textContent = st.me + " - " + st.cpu;
    $("yhelp").textContent = "Lancio " + Math.min(st.n + 1, TURNS) + (st.n < TURNS ? " di " + TURNS : " (spareggio)") + ". " + (st.turn === "me"
      ? "Batti tu: tocca lo schermo quando la palla entra nel riquadro. Preciso = fuoricampo (3 punti), quasi = valida (1), presto o tardi = fallo."
      : "Batte la CPU: tu aspetti il tuo turno a bordo campo.");
  }
  function geo() { var W = S.W, H = S.H; return { W: W, H: H, plate: { x: W / 2, y: H * 0.9 }, mound: { x: W / 2, y: H * 0.56 }, zone: { x: W * 0.5, y: H * 0.73, w: W * 0.16, h: H * 0.11 } }; }
  function nextPitch() { st.pitch = null; st.swing = null; st.hit = null; st.phase = "ready"; st.readyT = performance.now() / 1000 + 1.2; hud(); }
  function throwPitch() {
    var inside = Math.random() < 0.82;
    st.pitch = { u: inside ? G.rnd(-0.8, 0.8) : G.pick([-1, 1]) * G.rnd(1.2, 1.5), v: inside ? G.rnd(-0.8, 0.8) : G.rnd(-1.3, 1.3), t0: performance.now() / 1000 + 0.55, dur: G.pick([0.62, 0.7, 0.8, 0.95]), curve: G.rnd(-0.25, 0.25) };
    st.phase = "pitch";
    if (st.turn === "cpu") {   // la CPU decide prima come andra' e gira la mazza al momento giusto (o sbagliato)
      var inZ = Math.abs(st.pitch.u) <= 1 && Math.abs(st.pitch.v) <= 1, r = Math.random(), k;
      if (!inZ) k = Math.random() < 0.7 ? "ball" : "strike";
      else k = r < 0.16 ? "hr" : r < 0.5 ? "valida" : r < 0.7 ? "fallo" : "strike";
      var arrive = st.pitch.t0 + st.pitch.dur, off = { hr: 0, valida: G.pick([-0.06, 0.06]), fallo: G.pick([-0.11, 0.11]), strike: G.pick([-0.22, 0.22]) }[k];
      st.cpuKind = k; st.cpuSwingAt = k === "ball" ? null : arrive - CONTACT * SWING + off;
    }
  }
  function pitchPos(g, t) {
    var p = st.pitch, z = g.zone, tx = z.x + p.u * z.w / 2, ty = z.y + p.v * z.h / 2, k = Math.pow(Math.min(t, 1.15), 1.7);
    var x0 = g.mound.x + 8 * S.H / 1000, y0 = g.mound.y - 150 * S.H / 1000;
    return { x: G.lerp(x0, tx, k) + Math.sin(Math.min(k, 1) * Math.PI) * p.curve * z.w, y: G.lerp(y0, ty, k) - Math.sin(Math.min(k, 1) * Math.PI) * S.H * 0.03, r: G.lerp(2.2, S.W * 0.022, Math.min(k, 1.1)) };
  }
  function judgeSwing(delta, inZone) {
    var a = Math.abs(delta);
    if (a <= 0.04 && inZone) return "hr";
    if (a <= 0.08) return "valida";
    if (a <= 0.14) return "fallo";
    return "strike";
  }
  function result(kind) {
    var who = st.turn, pts = kind === "hr" ? 3 : kind === "valida" ? 1 : 0;
    if (who === "me") st.me += pts; else st.cpu += pts;
    st.log[who].push(kind);
    st.msg = { hr: "Fuoricampo!", valida: "Valida!", presa: "Presa al volo: eliminato", fallo: "Fallo", strike: "Strike", ball: "Ball" }[kind] + (pts ? " +" + pts : "") + (who === "cpu" ? " (CPU)" : "");
    st.msgGood = (who === "me") === (pts > 0); st.msgT = performance.now() / 1000; st.phase = "result"; hud();
    if (window.SFX) { if (pts) SFX.play("folla", 0.15); else if (who === "me") SFX.play("delusione", 0.2); }
    setTimeout(advance, 1800);
  }
  function advance() {
    if (st.turn === "me") st.turn = "cpu";
    else { st.turn = "me"; st.n++; if (st.n >= TURNS && st.me !== st.cpu) return end(); }
    nextPitch();
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    if (window.SFX) SFX.play(win ? "vittoria" : "sconfitta");
    var nuovi = UI.onEnd("baseball", win);
    $("yover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="yagain">Rivincita</button>';
    $("yover").style.justifyContent = "flex-end"; $("yover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("yover").hidden = false;
    $("yagain").onclick = newGame;
  }
  function startSwing(now) { st.swing = { t0: now }; if (window.SFX) SFX.play("swing"); }
  cv.addEventListener("pointerdown", function () {
    if (!st || st.turn !== "me" || st.phase !== "pitch" || st.swing) return;
    var now = performance.now() / 1000; startSwing(now);
    var arrive = st.pitch.t0 + st.pitch.dur, delta = now + CONTACT * SWING - arrive, inZone = Math.abs(st.pitch.u) <= 1 && Math.abs(st.pitch.v) <= 1;
    st.swing.kind = judgeSwing(delta, inZone); st.swing.early = delta < 0;
  });

  // ------------------------------------------------------------------ battitore: mani e mazza
  // braccio a due pezzi (30 e 28) dalla spalla alla mano: angoli come in G.drawGuy (0 = giu', positivo = a destra)
  function ik(sx, sy, hx, hy, bendOut) {
    var dx = hx - sx, dy = hy - sy, d = Math.min(57.5, Math.hypot(dx, dy)), th = Math.atan2(dx, dy);
    var al = Math.acos(G.clamp((30 * 30 + d * d - 28 * 28) / (2 * 30 * d), -1, 1)), el = Math.acos(G.clamp((30 * 30 + 28 * 28 - d * d) / (2 * 30 * 28), -1, 1));
    return bendOut ? [th + al, -(Math.PI - el)] : [th - al, Math.PI - el];
  }
  // posizione della presa e della mazza lungo lo swing (u = 0 caricata dietro la spalla, CONTACT = sul piatto, 1 = finita)
  var KEYS = [[0, -16, -34, -0.35, 1], [0.3, -6, 2, 0.9, 1], [CONTACT, 6, 16, Math.PI / 2, 1], [0.7, 14, -6, 0.5, 0.45], [1, -10, -34, -1.25, 0.9]];
  function batAt(u) {
    var i = 0; while (i < KEYS.length - 2 && u > KEYS[i + 1][0]) i++;
    var a = KEYS[i], b = KEYS[i + 1], t = G.ease(G.clamp((u - a[0]) / (b[0] - a[0]), 0, 1));
    return { gx: G.lerp(a[1], b[1], t), gy: G.lerp(a[2], b[2], t), ang: G.lerp(a[3], b[3], t), len: G.lerp(a[4], b[4], t) };
  }
  function batterPose(A, u) {
    var hf = { bassa: 0.86, alta: 1.13 }[A.statura] || 1, wf = { magro: 0.86, robusto: 1.17 }[A.fisico] || 1, shY = -(6 + 80 * hf) - 64 * hf, b = batAt(u);
    // due mani sulla mazza: la seconda un po' piu' su lungo il manico
    var gx = b.gx, gy = shY + b.gy, ux = Math.sin(b.ang), uy = -Math.cos(b.ang), h2 = 8 * b.len;
    var al = ik(-20 * wf, shY + 4, gx, gy, false), ar = ik(20 * wf, shY + 4, gx + ux * h2, gy + uy * h2, true);
    var twist = u > CONTACT ? (u - CONTACT) * 0.5 : -0.1;
    return G.P({ al: al, ar: ar, ll: [-0.28, 0.08], lr: [0.3 + (u > 0.3 ? 0.15 : 0), -0.12], tilt: twist, hold: "bat", batAng: b.ang, batLen: b.len });
  }
  // ------------------------------------------------------------------ stadio
  function stadium(c, g) {
    var W = g.W, H = g.H;
    var sky = c.createLinearGradient(0, 0, 0, H * 0.3); sky.addColorStop(0, "#0E1E3A"); sky.addColorStop(1, "#2F5A8A"); c.fillStyle = sky; c.fillRect(0, 0, W, H * 0.3);
    // tribune a gradoni con la folla
    c.fillStyle = "#3A4250"; c.beginPath(); c.moveTo(0, H * 0.1); c.quadraticCurveTo(W / 2, H * 0.03, W, H * 0.1); c.lineTo(W, H * 0.33); c.lineTo(0, H * 0.33); c.fill();
    for (var r = 0; r < 9; r++) {
      var y = H * (0.13 + r * 0.022);
      c.fillStyle = r % 2 ? "#454E5E" : "#3A4250"; c.fillRect(0, y - H * 0.008, W, H * 0.02);
      for (var i = 0; i < 40; i++) { c.globalAlpha = 0.75; c.fillStyle = ["#C62828", "#ECEFF1", "#1565C0", "#F9A825", "#8D6E63", "#90A4AE"][(i * 5 + r * 7) % 6]; c.beginPath(); c.arc((i + (r % 2) * 0.5) * W / 39, y, W * 0.006, 0, G.TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    // torri dei fari
    [0.06, 0.94].forEach(function (x) { c.fillStyle = "#9AA3AD"; c.fillRect(W * x - 2, H * 0.02, 4, H * 0.12); c.fillStyle = "#FFF6D5"; c.fillRect(W * x - 14, H * 0.01, 28, 10); var lg = c.createRadialGradient(W * x, H * 0.02, 2, W * x, H * 0.02, W * 0.25); lg.addColorStop(0, "rgba(255,250,220,.45)"); lg.addColorStop(1, "rgba(255,250,220,0)"); c.fillStyle = lg; c.fillRect(0, 0, W, H * 0.3); });
    // tabellone
    c.fillStyle = "#14181E"; c.fillRect(W * 0.38, H * 0.035, W * 0.24, H * 0.065); c.strokeStyle = "#F2C230"; c.lineWidth = 2; c.strokeRect(W * 0.38, H * 0.035, W * 0.24, H * 0.065);
    c.fillStyle = "#F2C230"; c.font = "800 " + Math.round(H * 0.03) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(st.me + " : " + st.cpu, W / 2, H * 0.068);
    // muro dell'esterno, prato a strisce, terra del diamante
    c.fillStyle = "#1F5B3A"; c.fillRect(0, H * 0.33, W, H * 0.045); c.fillStyle = "#F2C230"; c.fillRect(0, H * 0.33, W, 2.5);
    c.fillStyle = "rgba(255,255,255,.8)"; c.font = "800 " + Math.round(H * 0.022) + "px Archivo"; c.fillText("400", W / 2, H * 0.355); c.fillText("330", W * 0.08, H * 0.355); c.fillText("330", W * 0.92, H * 0.355);
    var gr = c.createLinearGradient(0, H * 0.375, 0, H); gr.addColorStop(0, "#4E8F3E"); gr.addColorStop(1, "#3E7A31"); c.fillStyle = gr; c.fillRect(0, H * 0.375, W, H * 0.625);
    for (var s = 0; s < 8; s += 2) { c.fillStyle = "rgba(255,255,255,.06)"; c.beginPath(); c.moveTo(g.plate.x, g.plate.y); c.lineTo(W * (s / 8) * 1.4 - W * 0.2, H * 0.375); c.lineTo(W * ((s + 1) / 8) * 1.4 - W * 0.2, H * 0.375); c.fill(); }
    var hp = g.plate, b1 = { x: W * 0.84, y: H * 0.63 }, b2 = { x: W / 2, y: H * 0.47 }, b3 = { x: W * 0.16, y: H * 0.63 };
    c.fillStyle = "#C2824F"; c.beginPath(); c.moveTo(hp.x, hp.y + H * 0.04); c.lineTo(b1.x + W * 0.08, b1.y); c.quadraticCurveTo(W / 2, H * 0.34, b3.x - W * 0.08, b3.y); c.closePath(); c.fill();
    c.fillStyle = "#4A873B"; c.beginPath(); c.moveTo(hp.x, hp.y - H * 0.04); c.lineTo(b1.x - W * 0.06, b1.y); c.lineTo(b2.x, b2.y + H * 0.03); c.lineTo(b3.x + W * 0.06, b3.y); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hp.x, hp.y); c.lineTo(W * 1.2, H * 0.45); c.moveTo(hp.x, hp.y); c.lineTo(-W * 0.2, H * 0.45); c.stroke();
    [b1, b2, b3].forEach(function (b) { c.save(); c.translate(b.x, b.y); c.scale(1, 0.5); c.rotate(Math.PI / 4); c.fillStyle = "#fff"; c.fillRect(-6, -6, 12, 12); c.restore(); });
    c.fillStyle = "#C2824F"; c.beginPath(); c.ellipse(g.mound.x, g.mound.y, W * 0.11, H * 0.025, 0, 0, G.TAU); c.fill();
    c.beginPath(); c.ellipse(hp.x, hp.y, W * 0.32, H * 0.07, 0, 0, G.TAU); c.fill();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2; c.strokeRect(hp.x - W * 0.28, hp.y - H * 0.04, W * 0.15, H * 0.09); c.strokeRect(hp.x + W * 0.13, hp.y - H * 0.04, W * 0.15, H * 0.09);
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(hp.x - W * 0.05, hp.y - H * 0.012); c.lineTo(hp.x + W * 0.05, hp.y - H * 0.012); c.lineTo(hp.x + W * 0.05, hp.y + H * 0.006); c.lineTo(hp.x, hp.y + H * 0.022); c.lineTo(hp.x - W * 0.05, hp.y + H * 0.006); c.closePath(); c.fill();
    // cerchio d'attesa a bordo campo
    c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2; c.beginPath(); c.ellipse(W * 0.1, H * 0.86, W * 0.08, H * 0.02, 0, 0, G.TAU); c.stroke();
  }
  function baseball(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, G.TAU); c.fillStyle = "#FAFAFA"; c.fill(); if (r > 4) { c.strokeStyle = "#D33"; c.lineWidth = Math.max(1, r * 0.12); c.beginPath(); c.arc(x - r * 1.1, y, r * 0.8, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(x + r * 1.1, y, r * 0.8, Math.PI - 0.8, Math.PI + 0.8); c.stroke(); } }
  function frame() {
    if (!S || !st) return;
    var c = S.c, g = geo(), W = g.W, H = g.H, now = performance.now() / 1000;
    if (st.phase === "ready" && now >= st.readyT) throwPitch();
    if (st.phase === "pitch" && st.turn === "cpu" && st.cpuSwingAt && !st.swing && now >= st.cpuSwingAt) { startSwing(now); st.swing.kind = st.cpuKind; st.swing.early = Math.random() < 0.5; }
    // la palla arriva: colpita (al momento del contatto) o nel guantone
    if (st.phase === "pitch" && now > st.pitch.t0 + st.pitch.dur + 0.04) {
      var inZ = Math.abs(st.pitch.u) <= 1 && Math.abs(st.pitch.v) <= 1, kind = st.turn === "cpu" ? st.cpuKind : st.swing ? st.swing.kind : (inZ ? "strike" : "ball");
      if (kind === "valida" && Math.random() < 0.18) kind = "presa";
      var contact = kind === "hr" || kind === "valida" || kind === "presa" || kind === "fallo";
      st.hit = { kind: kind, t0: now, from: pitchPos(g, 1), early: st.swing ? st.swing.early : false };
      if (window.SFX) SFX.play(contact ? "mazza" : "guantone");
      result(kind);
    }
    stadium(c, g);
    // lanciatore sul monte (di fronte: guarda verso il piatto)
    var ps = H / 1000, pt = st.pitch ? G.clamp((now - (st.pitch.t0 - 0.55)) / 0.55, 0, 1) : 0;
    var pPose = st.phase === "pitch" ? (pt < 1 ? G.P({ ar: [G.lerp(0.3, 3.0, pt), 0.3], al: [-0.6, 0.4], ll: [-0.1, 0], lr: [0.3 * pt, -0.4 * pt] }) : G.P({ ar: [0.6, 0.2], al: [-0.5, 0.3], tilt: 0.15 })) : G.P({ al: [-0.5, 0.9], ar: [0.5, -0.9] });
    G.drawGuy(c, pitAv, g.mound.x, g.mound.y, ps, pPose, {});
    // riquadro dello strike
    var z = g.zone; c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h); c.setLineDash([]);
    // palla
    var ballPos = null;
    if (st.phase === "pitch" && now >= st.pitch.t0) ballPos = pitchPos(g, (now - st.pitch.t0) / st.pitch.dur);
    if (st.hit) {
      var ht = now - st.hit.t0, f = st.hit.from, k = st.hit.kind;
      if (k === "hr") { var q = Math.min(1, ht / 1.4); ballPos = { x: G.lerp(f.x, W * 0.55, q), y: f.y - Math.sin(q * Math.PI * 0.85) * H * 0.75 + q * H * 0.1, r: Math.max(1.5, f.r * (1 - q * 0.85)) }; }
      else if (k === "valida" || k === "presa") { var q2 = Math.min(1, ht); ballPos = { x: G.lerp(f.x, W * (st.hit.early ? 0.25 : 0.75), q2), y: G.lerp(f.y, H * 0.45, q2) - Math.sin(q2 * Math.PI) * H * 0.12, r: Math.max(2, f.r * (1 - q2 * 0.6)) }; }
      else if (k === "fallo") ballPos = { x: f.x + (st.hit.early ? -1 : 1) * ht * W * 1.1, y: f.y - Math.sin(Math.min(1, ht * 1.5) * Math.PI) * H * 0.25, r: f.r };
      else ballPos = { x: f.x, y: f.y + Math.min(ht, 0.2) * H * 0.25, r: f.r * 1.1 };
    }
    // chi aspetta: a bordo campo, mazza in spalla (di fronte)
    var waitAv = st.turn === "me" ? cpuAv : G.av, ws = H / 900;
    G.drawGuy(c, waitAv, W * 0.1, H * 0.86, ws, G.P({ ar: [0.4, -2.6], al: [-0.3, 0.3], hold: "bat", batAng: -0.4, batLen: 0.9 }), {});
    // battitore di spalle, a sinistra del piatto
    var batAv = st.turn === "me" ? G.av : cpuAv, bs = H / 520, u = st.swing ? G.clamp((now - st.swing.t0) / SWING, 0, 1) : 0;
    var behind = ballPos && st.phase === "pitch" && now > st.pitch.t0 + st.pitch.dur;
    if (behind) baseball(c, ballPos.x, ballPos.y, ballPos.r);
    G.drawGuy(c, batAv, W * 0.37, H * 0.985, bs, batterPose(batAv, u), { back: true });
    if (ballPos && !behind) baseball(c, ballPos.x, ballPos.y, ballPos.r);
    // scritte
    c.textAlign = "center"; c.textBaseline = "middle";
    if (st.phase === "ready" || (st.phase === "pitch" && !st.swing)) {
      c.font = "800 " + Math.round(W * 0.05) + "px Archivo"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.55)";
      var tx = st.turn === "me" ? "Tocca per battere" : "Batte la CPU"; c.strokeText(tx, W / 2, H * 0.41); c.fillStyle = st.turn === "me" ? "#FFD54F" : "#E8A252"; c.fillText(tx, W / 2, H * 0.41);
    }
    if (st.phase === "result" && st.msg) {
      var al = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = al; c.font = "800 " + Math.round(W * (st.msg.length > 16 ? 0.07 : 0.1)) + "px Archivo";
      c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.24); c.fillStyle = st.msgGood ? "#6FBE92" : "#E08268"; c.fillText(st.msg, W / 2, H * 0.24); c.restore();
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
    _st: function () { return st; },
    _pose: batterPose
  };
})();
