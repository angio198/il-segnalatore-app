// StatsFight giochi (10/10): sfida a canestro. Cinque posizioni (sotto canestro, media, tiro libero, tripla
// dall'angolo, tripla frontale): tiri tu, poi la CPU dallo stesso punto; 2 o 3 punti a canestro. Pari dopo 5 giri:
// tiri liberi a oltranza. La telecamera sta sempre dietro al tiratore, che quindi e' girato verso il canestro anche
// dai lati (campo in prospettiva vera, misure in metri). Tiro: trascini il dito verso l'alto; mentre trascini si vede
// l'arco del tiro (la mira: verde = dentro) e la barra della forza con la zona verde giusta per quella distanza.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("bcv"), S = null, st = null, cpuAv = null, drag = null, cam = null;
  var RIM = { x: 0, y: 3.05, z: 1.575 }, RIM_R = 0.23, BALL_R = 0.12;
  // r = distanza dal ferro in metri, a = angolo (0 = di fronte, positivo = a destra), pow = forza giusta
  var SPOTS = [
    { nome: "Sotto canestro", r: 2.1, a: 0.55, pts: 2, pow: 0.42, cpu: 0.8 },
    { nome: "Media distanza", r: 4.6, a: -0.75, pts: 2, pow: 0.6, cpu: 0.55 },
    { nome: "Tiro libero", r: 4.2, a: 0, pts: 2, pow: 0.56, cpu: 0.7 },
    { nome: "Tripla dall'angolo", r: 6.7, a: 1.35, pts: 3, pow: 0.8, cpu: 0.4 },
    { nome: "Tripla frontale", r: 7.2, a: 0, pts: 3, pow: 0.9, cpu: 0.38 }
  ];
  var FT = SPOTS[2];
  function newGame() {
    cpuAv = G.randomAv();
    st = { round: 0, turn: "me", me: 0, cpu: 0, phase: "aim", shot: null, msg: "", msgT: 0, celebrate: null, extra: false };
    $("bover").hidden = true; startTurn();
  }
  function spot() { return st.extra ? FT : SPOTS[Math.min(st.round, SPOTS.length - 1)]; }
  function hud() {
    $("bme").textContent = G.av.nome || "Tu"; $("bcpu").textContent = "CPU";
    $("bsc").textContent = st.me + " - " + st.cpu;
    var sp = spot();
    $("bhelp").textContent = (st.extra ? "Pari: tiri liberi a oltranza. " : "Giro " + (st.round + 1) + " di " + SPOTS.length + ": " + sp.nome + " (" + sp.pts + " punti). ")
      + (st.turn === "me" ? "Tieni il dito sullo schermo: il cursore della barra in basso va avanti e indietro, lascia quando è nel verde. Per mirare sposta il dito: l'arco tratteggiato deve finire nel ferro (verde)." : "Tira la CPU dallo stesso punto.");
  }
  function startTurn() {
    st.phase = "aim"; st.shot = null; st.ballP = null; cam = null; hud();
    if (st.turn === "cpu") { st.phase = "wait"; st.waitT = performance.now() / 1000 + 1; }
  }

  // ------------------------------------------------------------------ 3D: telecamera dietro al tiratore
  function shooterPos(sp) { return { x: sp.r * Math.sin(sp.a), y: 0, z: RIM.z + sp.r * Math.cos(sp.a) }; }
  function makeCam() {
    var sp = spot(), s = shooterPos(sp), bx = s.x - RIM.x, bz = s.z - RIM.z, bl = Math.hypot(bx, bz); bx /= bl; bz /= bl;
    var side = 0.55;   // un po' di lato: il tiratore non copre il canestro
    var C = { x: s.x + bx * 3 - bz * side, y: 2.2, z: s.z + bz * 3 + bx * side };
    var fx = RIM.x - C.x, fz = RIM.z - C.z, fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
    var c = { C: C, fx: fx, fz: fz, F: 1, cy: 0 };
    // F e cy scelti perche' il ferro stia al 30% dell'altezza e i piedi del tiratore al 96%
    var pr = raw(c, RIM), pf = raw(c, s);
    c.F = G.clamp((0.96 - 0.3) * S.H / (pr.yy - pf.yy), S.W * 0.7, S.W * 2.2);
    c.cy = S.H * 0.3 + c.F * pr.yy;
    return c;
  }
  function raw(c, p) { var dx = p.x - c.C.x, dy = p.y - c.C.y, dz = p.z - c.C.z; var X = dx * -c.fz + dz * c.fx, Z = dx * c.fx + dz * c.fz; return { xx: X / Z, yy: dy / Z, z: Z }; }
  function P3(p) { var r = raw(cam, p); return { x: S.W / 2 + cam.F * r.xx, y: cam.cy - cam.F * r.yy, z: r.z, k: cam.F / r.z }; }
  // linea 3D campionata, spezzata dove passa dietro la telecamera
  function line3(c, pts, step) {
    var all = []; for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / (step || 0.3)));
      for (var j = 0; j < n; j++) all.push({ x: G.lerp(a.x, b.x, j / n), y: G.lerp(a.y, b.y, j / n), z: G.lerp(a.z, b.z, j / n) }); }
    all.push(pts[pts.length - 1]);
    c.beginPath(); var pen = false;
    all.forEach(function (p) { var q = P3(p); if (q.z < 0.4) { pen = false; return; } if (pen) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); pen = true; });
    c.stroke();
  }
  function poly3(c, pts) { c.beginPath(); pts.forEach(function (p, i) { var q = P3(p); c[i ? "lineTo" : "moveTo"](q.x, q.y); }); c.closePath(); }
  function arc3(cx, cz, r, a0, a1) { var o = []; for (var i = 0; i <= 40; i++) { var a = G.lerp(a0, a1, i / 40); o.push({ x: cx + Math.sin(a) * r, y: 0, z: cz + Math.cos(a) * r }); } return o; }

  // ------------------------------------------------------------------ tiro
  function tolP(sp) { return sp.pts === 3 ? 0.045 : 0.06; }
  var TOL_A = 0.075;   // radianti di errore di mira che portano al bordo del ferro
  function judge(ae, pe) {
    var e = Math.hypot(ae, pe);
    if (e < 0.45) return { r: "ciuff", dentro: true };
    if (e < 1) return Math.random() < 1 - e * 0.55 ? { r: "ferro_dentro", dentro: true } : { r: "ferro", dentro: false };
    if (pe > 1 && Math.abs(ae) < 1.3) return pe < 2.3 && Math.random() < 0.35 ? { r: "tabella", dentro: true } : { r: "tabellone", dentro: false };   // dal rosso in poi: mai dentro
    if (pe < -1.6) return { r: "air", dentro: false };
    return { r: "fuori", dentro: false };
  }
  function handPos() { var sp = spot(), s = shooterPos(sp); return { x: s.x - Math.sin(sp.a) * 0.25, y: 2.45, z: s.z - Math.cos(sp.a) * 0.25 }; }
  // punto d'arrivo: di lato per l'errore di mira, corto o lungo per l'errore di forza
  function target(ae, pe) {
    var h = handPos(), dx = RIM.x - h.x, dz = RIM.z - h.z, l = Math.hypot(dx, dz); dx /= l; dz /= l;
    var lat = G.clamp(ae, -4, 4) * RIM_R, lon = G.clamp(pe, -4, 4) * RIM_R * 0.8;
    return { x: RIM.x - dz * lat + dx * lon, y: RIM.y + 0.05, z: RIM.z + dx * lat + dz * lon };
  }
  function flight(ae, pe, t) {
    var sp = spot(), h = handPos(), T = target(ae, pe), apex = 1.1 + 0.12 * sp.r;
    return { x: G.lerp(h.x, T.x, t), y: G.lerp(h.y, T.y, t) + 4 * apex * t * (1 - t), z: G.lerp(h.z, T.z, t) };
  }
  function release(ae, pe, res) {
    var sp = spot();
    st.shot = { ae: ae, pe: pe, res: res, t0: performance.now() / 1000, dur: 0.8 + 0.07 * sp.r };
    st.phase = "fly"; if (window.SFX) SFX.play("lancio");
  }
  function cpuShoot() {
    var sp = spot(), dentro = Math.random() < sp.cpu, ae, pe, res;
    for (var i = 0; i < 40; i++) {
      var k = dentro ? G.rnd(0, 0.95) : G.rnd(0.9, 2.2), a = G.rnd(0, G.TAU);
      ae = Math.cos(a) * k; pe = Math.sin(a) * k; res = judge(ae, pe);
      if (res.dentro === dentro) break;
    }
    release(ae, pe, res);
  }
  // dopo il volo: la palla prosegue con un po' di fisica (gravita', rimbalzi)
  function startAfter() {
    var sh = st.shot, r = sh.res.r, T = target(sh.ae, sh.pe), h = handPos(), dx = T.x - h.x, dz = T.z - h.z, l = Math.hypot(dx, dz); dx /= l; dz /= l;
    var b = { x: T.x, y: T.y, z: T.z, vx: dx * 2, vy: -3, vz: dz * 2, net: false };
    if (r === "ciuff" || r === "ferro_dentro" || r === "tabella") { b.x = RIM.x; b.z = RIM.z; b.y = RIM.y; b.vx = 0; b.vz = 0; b.vy = r === "ciuff" ? -2.5 : -1.2; b.net = true; }
    else if (r === "ferro") { var sg = sh.ae < 0 ? -1 : 1; b.vx = -dz * sg * 2.2 + dx * 0.5; b.vz = dx * sg * 2.2 + dz * 0.5; b.vy = 2.6; }
    else if (r === "tabellone") { b.vx = -dx * 2.5; b.vz = -dz * 2.5; b.vy = 1; }
    st.ballP = b; st.lastT = performance.now() / 1000;
  }
  function stepAfter(now) {
    var b = st.ballP, dt = Math.min(0.05, now - st.lastT); st.lastT = now;
    b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.net && b.y < RIM.y - 0.45) { b.net = false; b.vx = (Math.random() - 0.5) * 1.5; b.vz = 1.5; }
    if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) * 0.55; b.vx *= 0.8; b.vz *= 0.8; }
  }
  function finishShot() {
    var sp = spot(), r = st.shot.res, mine = st.turn === "me";
    if (r.dentro) { if (mine) st.me += sp.pts; else st.cpu += sp.pts; }
    st.msg = { ciuff: "Ciuff!", ferro_dentro: "Dentro dopo il ferro", tabella: "Di tabella!", ferro: "Ferro!", tabellone: "Lungo sul tabellone", air: "Air ball!", fuori: "Fuori!" }[r.r]
      + (r.dentro ? " +" + sp.pts : "");
    st.msgGood = mine === r.dentro; st.msgT = performance.now() / 1000; st.phase = "result"; startAfter(); hud();
    if (window.SFX) { SFX.play({ ciuff: "ciuff", ferro_dentro: "ferro", tabella: "tabellone", ferro: "ferro", tabellone: "tabellone", air: "delusione", fuori: "rimbalzo" }[r.r]); SFX.play(r.dentro === mine ? "folla" : "delusione", 0.25); }
    setTimeout(next, 1700);
  }
  function next() {
    if (st.turn === "me") { st.turn = "cpu"; return startTurn(); }
    st.turn = "me";
    if (!st.extra) { st.round++; if (st.round >= SPOTS.length) { if (st.me === st.cpu) st.extra = true; else return end(); } }
    else if (st.me !== st.cpu) return end();
    startTurn();
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    if (window.SFX) SFX.play(win ? "vittoria" : "sconfitta");
    var nuovi = UI.onEnd("basket", win, st.me, st.cpu);
    $("bover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (UI.endCard ? UI.endCard("basket", nuovi) : "") + '<button class="primary" type="button" id="bagain">Rivincita</button>';
    $("bover").style.justifyContent = "flex-end"; $("bover").style.background = "linear-gradient(rgba(8,14,18,.35), rgba(8,14,18,.9))"; $("bover").hidden = false;
    $("bagain").onclick = newGame;
  }

  // ------------------------------------------------------------------ comandi
  // forza (10/10): tenendo il dito sullo schermo il cursore della barra in basso va avanti e indietro; si lascia
  // quando e' nel verde al centro (poi giallo, rosso, bianco: sempre piu' corto o lungo)
  function period(sp) { return sp.pts === 3 ? 1.05 : 1.3; }
  function meter(d, now) { var k = ((now - d.t0) / period(spot())) % 2; return k < 1 ? k : 2 - k; }
  function zone(sp) { var g = tolP(sp) * 1.1; return [g, g * 2.2, g * 3.8]; }
  // direzione giusta: verso il ferro in orizzontale, con un'altezza fissa (la palla parte quasi alla quota del ferro e il
  // dito andrebbe quasi di lato): in pratica dritto in su = al centro, e l'arco tratteggiato mostra dove va
  function wantAng() { var h = P3(handPos()), r = P3(RIM); return Math.atan2(r.x - h.x, S.H * 0.45); }
  function aimErr(d) { return ((Math.abs(d.dy) < 20 && Math.abs(d.dx) < 20 ? wantAng() : Math.atan2(d.dx, Math.max(20, -d.dy))) - wantAng()) / TOL_A; }   // dito fermo = dritto al ferro
  cv.addEventListener("pointerdown", function (e) {
    if (!st || st.turn !== "me" || st.phase !== "aim") return;
    var p = G.pt(cv, e); drag = { x: p.x, y: p.y, dx: 0, dy: 0, t0: performance.now() / 1000 };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener("pointermove", function (e) { if (!drag) return; var p = G.pt(cv, e); drag.dx = p.x - drag.x; drag.dy = p.y - drag.y; });
  cv.addEventListener("pointerup", function () {
    if (!drag || !st) return; var d = drag; drag = null;
    if (st.turn !== "me" || st.phase !== "aim") return;
    var sp = spot(), ae = aimErr(d), pe = (meter(d, performance.now() / 1000) - 0.5) / zone(sp)[0];
    release(ae, pe, judge(ae, pe));
  });
  cv.addEventListener("pointercancel", function () { drag = null; });

  // ------------------------------------------------------------------ disegno
  function ball(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    var gr = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); gr.addColorStop(0, "#F7934A"); gr.addColorStop(1, "#C2541A");
    c.beginPath(); c.arc(0, 0, r, 0, G.TAU); c.fillStyle = gr; c.fill();
    c.strokeStyle = "#3B1A08"; c.lineWidth = Math.max(1, r * 0.09);
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.arc(-r * 1.25, 0, r * 0.95, -0.75, 0.75); c.stroke(); c.beginPath(); c.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.75, Math.PI + 0.75); c.stroke();
    c.restore();
  }
  function arena(c) {
    var W = S.W, H = S.H, hz = G.clamp(cam.cy, H * 0.25, H * 0.75);   // orizzonte
    var sky = c.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#07090D"); sky.addColorStop(1, "#18202C"); c.fillStyle = sky; c.fillRect(0, 0, W, hz);
    // tribune che scorrono con la telecamera
    var yaw = Math.atan2(cam.fx, -cam.fz);
    for (var row = 0; row < 11; row++) {
      var y = hz - H * 0.02 - row * H * 0.03, a = 0.75 - row * 0.05, sz = W * (0.011 - row * 0.0004), off = ((yaw * W * 0.8) % (W / 30) + W / 30) % (W / 30);
      for (var i = -1; i < 32; i++) { c.globalAlpha = a; c.fillStyle = ["#8E9AAA", "#5D6878", "#B54A4A", "#C9CED6", "#3E4A5C", "#D9B44A"][(i * 7 + row * 3 + 600) % 6]; c.beginPath(); c.arc(i * W / 30 + off + (row % 2) * W / 60, y, sz, 0, G.TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    var by = hz - H * 0.36; c.fillStyle = "#16306B"; c.fillRect(0, by, W, H * 0.022); c.fillStyle = "#B3202E"; c.fillRect(W * 0.62, by, W * 0.38, H * 0.022);
    c.fillStyle = "rgba(255,255,255,.75)"; c.font = "700 " + Math.round(H * 0.013) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("STATSFIGHT ARENA", W * 0.3, by + H * 0.011);
    // parquet
    var fl = c.createLinearGradient(0, hz, 0, H); fl.addColorStop(0, "#BF946A"); fl.addColorStop(1, "#E6C49A"); c.fillStyle = fl; c.fillRect(0, hz, W, H - hz);
    c.strokeStyle = "rgba(120,80,40,.16)"; c.lineWidth = 1;
    for (var k = -7; k <= 7; k++) line3(c, [{ x: k, y: 0, z: 0 }, { x: k, y: 0, z: 14 }], 0.5);
    // area, lunetta, tre punti
    c.fillStyle = "#1C8C8A"; poly3(c, [{ x: -2.45, y: 0, z: 0 }, { x: 2.45, y: 0, z: 0 }, { x: 2.45, y: 0, z: 5.8 }, { x: -2.45, y: 0, z: 5.8 }]); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.5;
    line3(c, [{ x: -2.45, y: 0, z: 0 }, { x: -2.45, y: 0, z: 5.8 }, { x: 2.45, y: 0, z: 5.8 }, { x: 2.45, y: 0, z: 0 }]);
    line3(c, [{ x: -7.5, y: 0, z: 0 }, { x: 7.5, y: 0, z: 0 }]);
    line3(c, arc3(0, 5.8, 1.8, -Math.PI / 2, Math.PI / 2));
    line3(c, [{ x: -6.6, y: 0, z: 0 }, { x: -6.6, y: 0, z: 2.99 }].concat(arc3(RIM.x, RIM.z, 6.75, -1.35, 1.35)).concat([{ x: 6.6, y: 0, z: 2.99 }, { x: 6.6, y: 0, z: 0 }]));
    line3(c, [{ x: -7.5, y: 0, z: 0 }, { x: -7.5, y: 0, z: 14 }]); line3(c, [{ x: 7.5, y: 0, z: 0 }, { x: 7.5, y: 0, z: 14 }]);
  }
  function hoop(c, front, sway) {
    var zc = P3(RIM).z, isFront = function (p) { return P3(p).z <= zc; };
    if (!front) {
      // sostegno, tabellone, ferro dietro
      c.fillStyle = "#C62828"; poly3(c, [{ x: -0.6, y: 0, z: -1.2 }, { x: 0.6, y: 0, z: -1.2 }, { x: 0.6, y: 1.1, z: -1.2 }, { x: -0.6, y: 1.1, z: -1.2 }]); c.fill();
      c.strokeStyle = "#9AA3AD"; c.lineWidth = Math.max(3, P3({ x: 0, y: 2, z: -1 }).k * 0.12); line3(c, [{ x: 0, y: 1.1, z: -1.2 }, { x: 0, y: 3.3, z: -1.2 }, { x: 0, y: 3.3, z: 1.15 }]);
      c.fillStyle = "rgba(225,235,245,.18)"; poly3(c, [{ x: -0.9, y: 2.9, z: 1.2 }, { x: 0.9, y: 2.9, z: 1.2 }, { x: 0.9, y: 3.95, z: 1.2 }, { x: -0.9, y: 3.95, z: 1.2 }]); c.fill();
      c.strokeStyle = "#F4F4F4"; c.lineWidth = 3.5; c.stroke();
      c.lineWidth = 2.5; poly3(c, [{ x: -0.3, y: 3.05, z: 1.2 }, { x: 0.3, y: 3.05, z: 1.2 }, { x: 0.3, y: 3.5, z: 1.2 }, { x: -0.3, y: 3.5, z: 1.2 }]); c.stroke();
      c.strokeStyle = "#B23A12"; c.lineWidth = 3; line3(c, [{ x: 0, y: RIM.y, z: 1.2 }, { x: 0, y: RIM.y, z: RIM.z - RIM_R }]);
    }
    // rete: dal ferro a un anello piu' stretto e piu' basso
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.2;
    for (var j = 0; j < 16; j++) {
      var a2 = j / 16 * G.TAU, top = { x: RIM.x + Math.cos(a2) * RIM_R, y: RIM.y, z: RIM.z + Math.sin(a2) * RIM_R }, bot = { x: RIM.x + Math.cos(a2) * RIM_R * 0.6 + sway * 0.05, y: RIM.y - 0.42, z: RIM.z + Math.sin(a2) * RIM_R * 0.6 };
      if (isFront(top) === front) line3(c, [top, bot], 0.5);
    }
    for (var n = 1; n <= 2; n++) { var rr = RIM_R * (1 - 0.2 * n), yy = RIM.y - 0.14 * n, ring = []; for (var m = 0; m <= 24; m++) { var am = m / 24 * G.TAU; ring.push({ x: RIM.x + Math.cos(am) * rr + sway * 0.03 * n, y: yy, z: RIM.z + Math.sin(am) * rr }); } drawHalf(c, ring, front, isFront); }
    c.strokeStyle = front ? "#E64A19" : "#B23A12"; c.lineWidth = Math.max(2.5, P3(RIM).k * 0.03);
    var rim = []; for (var i = 0; i <= 32; i++) { var a = i / 32 * G.TAU; rim.push({ x: RIM.x + Math.cos(a) * RIM_R, y: RIM.y, z: RIM.z + Math.sin(a) * RIM_R }); }
    drawHalf(c, rim, front, isFront);
  }
  function drawHalf(c, pts, front, isFront) {
    c.beginPath(); var pen = false;
    pts.forEach(function (p) { var q = P3(p); if (isFront(p) === front) { if (pen) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); pen = true; } else pen = false; });
    c.stroke();
  }
  function ballWorld(now) {
    if (st.phase === "result" && st.ballP) return st.ballP;
    if (!st.shot) return handPos();
    return flight(st.shot.ae, st.shot.pe, G.clamp((now - st.shot.t0) / st.shot.dur, 0, 1));
  }
  function frame() {
    if (!S || !st) return;
    var c = S.c, W = S.W, H = S.H, now = performance.now() / 1000, sp = spot();
    if (!cam) cam = makeCam();
    if (st.phase === "wait" && now >= st.waitT) cpuShoot();
    if (st.phase === "fly" && now - st.shot.t0 >= st.shot.dur) finishShot();
    if (st.phase === "result" && st.ballP) stepAfter(now);
    var inNet = st.phase === "result" && st.shot && st.shot.res.dentro, sway = inNet ? Math.sin((now - st.msgT) * 14) * Math.max(0, 1 - (now - st.msgT) * 1.4) : 0;
    arena(c);
    var bw = ballWorld(now), bq = P3(bw), behind = bq.z > P3(RIM).z + 0.05 || !!(st.ballP && st.ballP.net);
    hoop(c, false, sway);
    if (behind) ball(c, bq.x, bq.y, BALL_R * bq.k, now * 6);
    hoop(c, true, sway);
    // tiratore di schiena, girato verso il canestro (la telecamera e' dietro di lui)
    var s = shooterPos(sp), fq = P3(s), scale = fq.k * 1.85 / 215, av = st.turn === "me" ? G.av : cpuAv;
    var jump = st.shot ? Math.sin(Math.min(1, (now - st.shot.t0) / 0.5) * Math.PI) * 0.25 : 0;
    var pose = st.shot ? G.P({ al: [-2.95, 0.05], ar: [2.95, -0.05], lift: jump * 215 / 1.85, ll: [-0.1, 0.25], lr: [0.1, -0.25] })
      : G.P({ al: [-2.75, 0.35], ar: [2.75, -0.35], ll: [-0.1, 0.2], lr: [0.12, -0.2] });
    if (st.phase !== "end") G.drawGuy(c, av, fq.x, fq.y, scale, pose, { back: true });
    if (!behind && st.phase !== "end") ball(c, bq.x, bq.y, BALL_R * bq.k, st.shot ? now * 6 : 0);
    // mira (arco tratteggiato) mentre trascini, e la barra della forza in basso
    if (drag) {
      var ae = aimErr(drag), col = Math.abs(ae) < 0.45 ? "#6FBE92" : Math.abs(ae) < 1 ? "#E8C552" : "#E08268";
      c.strokeStyle = col; c.lineWidth = 3; c.setLineDash([5, 7]); c.beginPath();
      for (var i = 0; i <= 30; i++) { var q = P3(flight(ae, 0, i / 30)); c[i ? "lineTo" : "moveTo"](q.x, q.y); }
      c.stroke(); c.setLineDash([]);
      var tq = P3(target(ae, 0)); c.beginPath(); c.arc(tq.x, tq.y, 6, 0, G.TAU); c.fillStyle = col; c.fill();
    }
    if (st.turn === "me" && st.phase === "aim") {
      var z = zone(sp), bw = W * 0.78, bx0 = (W - bw) / 2, bh = 16, by = H - bh - 12, X = function (m) { return bx0 + m * bw; };
      G.rr(c, bx0 - 3, by - 3, bw + 6, bh + 6, 8); c.fillStyle = "rgba(0,0,0,.55)"; c.fill();
      c.fillStyle = "#F4F4F4"; c.fillRect(bx0, by, bw, bh);
      [["#E35D4F", z[2]], ["#F2C94C", z[1]], ["#4CC27A", z[0]]].forEach(function (zz) { c.fillStyle = zz[0]; c.fillRect(X(0.5 - zz[1]), by, (X(0.5 + zz[1]) - X(0.5 - zz[1])), bh); });
      if (drag) {
        var m = meter(drag, now), mx = X(m);
        c.fillStyle = "#1C1F24"; c.beginPath(); c.moveTo(mx - 8, by - 9); c.lineTo(mx + 8, by - 9); c.lineTo(mx, by + 2); c.closePath(); c.fill();
        c.fillRect(mx - 1.5, by, 3, bh); c.strokeStyle = "#fff"; c.lineWidth = 1; c.strokeRect(mx - 2, by, 4, bh);
      }
      c.font = "700 11px Archivo"; c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(drag ? "lascia nel verde" : "forza: tieni il dito, lascia nel verde", W / 2, by - 14);
    }
    if (st.phase === "aim" && st.turn === "me" && !drag) {
      var hq = P3(handPos()), pulse = 0.5 + 0.5 * Math.sin(now * 5);
      c.strokeStyle = "rgba(255,213,79," + (0.4 + 0.5 * pulse) + ")"; c.lineWidth = 4;
      for (var a = 0; a < 3; a++) { var yy = hq.y - H * 0.07 - a * H * 0.03; c.beginPath(); c.moveTo(hq.x - 10, yy + 8); c.lineTo(hq.x, yy); c.lineTo(hq.x + 10, yy + 8); c.stroke(); }
    }
    if (st.phase === "aim" || st.phase === "wait") {
      c.font = "800 " + Math.round(W * 0.055) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.6)";
      var lbl = (st.turn === "cpu" ? "CPU · " : "") + sp.nome + " · " + sp.pts + " punti"; c.strokeText(lbl, W / 2, H * 0.06); c.fillStyle = st.turn === "cpu" ? "#E8A252" : "#FFD54F"; c.fillText(lbl, W / 2, H * 0.06);
    }
    if (st.phase === "result" && st.msg) {
      var al = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = al; c.font = "800 " + Math.round(W * 0.09) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.12); c.fillStyle = st.msgGood ? "#6FBE92" : "#E08268"; c.fillText(st.msg, W / 2, H * 0.12); c.restore();
    }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, ps = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, ps, {});
    }
  }
  window.Basket = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.25, 190); cam = null; },
    frame: frame,
    _st: function () { return st; },
    _ideal: function () { if (!cam) cam = makeCam(); return { want: wantAng(), len: spot().pow * S.H * 0.5 }; },
    _meter: function () { return drag ? meter(drag, performance.now() / 1000) : null; }
  };
})();
