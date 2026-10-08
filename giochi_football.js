// StatsFight giochi (10/10, rifatto): football americano, sfida di lanci. Sei il quarterback: i tuoi compagni
// corrono verso la end zone e tu devi fare un bel lancio. Tre lanci a testa, alternati con la CPU (pari: si
// continua). Comandi: tieni il dito sullo schermo, il cerchio sul campo va avanti e indietro lungo la direzione
// del dito (spostalo a destra o a sinistra per mirare); lascia quando il cerchio e' davanti a un compagno.
// Preso in end zone = touchdown (7 punti), preso oltre le 25 yard = 3, preso piu' corto = 1, a terra = 0.
// Telecamera: dietro al quarterback, poi dietro la palla in volo, poi si alza e si allarga dove la palla arriva.
// I difensori sono comparse: corrono vicino ai ricevitori ma non intercettano.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("fcv"), S = null, st = null, cpuAv = null, hold = null;
  var THROWS = 3, GOAL = 40, QB_Z = -5, MAXT = 7;
  function team(base, c1, c2, num) { var a = Object.assign({}, base); a.c1 = c1; a.c2 = c2; a.maglia = "maglia"; a.num = num; a.cappello = "casco"; a.hatCol = c1; a.accessorio = "no"; if (base !== G.av) a.nome = ""; return a; }
  function newGame() {
    cpuAv = G.randomAv(); if (cpuAv.c1 === G.av.c1) cpuAv.c1 = (cpuAv.c1 + 3) % G.COLORI.length;
    st = { n: 0, turn: "me", me: 0, cpu: 0, phase: "pre", msg: "", msgT: 0, celebrate: null };
    $("fover").hidden = true; setupPlay();
  }
  function hud() {
    $("fme").textContent = G.av.nome || "Tu"; $("fcpu").textContent = "CPU"; $("fsc").textContent = st.me + " - " + st.cpu;
    $("fhelp").textContent = "Lancio " + Math.min(st.n + 1, THROWS) + (st.n < THROWS ? " di " + THROWS : " (spareggio)") + ". " + (st.turn === "me"
      ? "Lanci tu: tieni il dito sullo schermo, il cerchio corre avanti e indietro; sposta il dito per mirare e lascia quando il cerchio è davanti a un compagno. Touchdown 7, preso oltre le 25 yard 3, più corto 1."
      : "Lancia la CPU: guarda e aspetta il tuo turno.");
  }
  // ------------------------------------------------------------------ azione
  function P(av, x, z, role, extra) { return Object.assign({ av: av, x: x, z: z, vx: 0, vz: 0, role: role }, extra || {}); }
  function setupPlay() {
    var off = st.turn === "me" ? G.av : cpuAv, def = st.turn === "me" ? cpuAv : G.av;
    var mate = function (n, src) { var a = team(G.randomAv(), src.c1, src.c2, n); a.pant = src.pant; a.calze = src.calze; return a; };
    var ps = [P(st.turn === "me" ? team(G.av, G.av.c1, G.av.c2, G.av.num) : team(cpuAv, cpuAv.c1, cpuAv.c2, 12), 0, QB_Z, "qb")];
    // tre ricevitori: corsie diverse, velocita' diverse, un po' di zig zag
    [[-14, 6.6], [0.5, 7.3], [14, 6.9]].forEach(function (r, i) { ps.push(P(mate([81, 88, 11][i], off), r[0], 0, "wr", { lane: r[0] * G.rnd(0.35, 0.7), v: r[1] * G.rnd(0.95, 1.05), ph: G.rnd(0, 6) })); });
    [-3, -1, 1, 3].forEach(function (x, i) { ps.push(P(mate(60 + i, off), x, -0.7, "ol")); ps.push(P(mate(90 + i, def), x * 0.9, 0.8, "dl")); });
    [1, 2, 3].forEach(function (k) { ps.push(P(mate(20 + k, def), ps[k].x + 2, 7, "db", { mark: k })); });
    ps.push(P(mate(31, def), 0, 22, "s"));
    st.players = ps; st.ball = null; st.catcher = -1; st.phase = "pre"; st.t0 = performance.now() / 1000; hold = null;
    st.cam = null; hud();
    if (st.turn === "cpu") st.cpuAt = st.t0 + 1 + G.rnd(1.6, 3.2);
  }
  function wrPos(p, t) {   // dove sara' il ricevitore fra t secondi (corre verso la end zone, zig zag leggero)
    var z = p.z + p.v * t, x = G.lerp(p.x, p.lane + Math.sin((z + p.ph) * 0.25) * 2.5, Math.min(1, t * 0.6));
    return { x: x, z: Math.min(z, GOAL + 9) };
  }
  // lancio verso (x1,z1): il ricevitore che puo' arrivarci la va a prendere
  function throwTo(x1, z1) {
    var qb = st.players[0], d = Math.hypot(x1 - qb.x, z1 - qb.z), T = 0.7 + d / 24;
    var best = -1, bd = 99;
    st.players.forEach(function (p, i) { if (p.role !== "wr") return; var q = wrPos(p, T), dd = Math.hypot(q.x - x1, q.z - z1); if (dd < bd) { bd = dd; best = i; } });
    st.ball = { x0: qb.x + 0.4, z0: qb.z, x1: x1, z1: z1, t0: performance.now() / 1000, T: T, h: 3 + d * 0.16, to: bd <= 4.2 ? best : -1 };
    if (st.ball.to >= 0) st.players[st.ball.to].chase = true;
    st.phase = "air"; hold = null; if (window.SFX) SFX.play("lancio");
  }
  function ballPos(now) {
    var b = st.ball, t = G.clamp((now - b.t0) / b.T, 0, 1);
    return { x: G.lerp(b.x0, b.x1, t), y: 2 + (0.4 - 2) * t + 4 * b.h * t * (1 - t), z: G.lerp(b.z0, b.z1, t), t: t };
  }
  function land(now) {
    var b = st.ball, caught = b.to >= 0, z = b.z1, pts = 0, msg;
    if (caught) { st.catcher = b.to; pts = z >= GOAL ? 7 : z >= 25 ? 3 : 1; msg = (z >= GOAL ? "Touchdown!" : "Preso a " + Math.round(z) + " yard") + " +" + pts; }
    else msg = "Incompleto: palla a terra";
    if (st.turn === "me") st.me += pts; else st.cpu += pts;
    st.msg = msg + (st.turn === "cpu" ? " (CPU)" : ""); st.msgGood = (st.turn === "me") === (pts > 0); st.msgT = now; st.phase = "result"; hud();
    if (window.SFX) { SFX.play(caught ? "presa" : "rimbalzo"); SFX.play(pts ? (st.turn === "me" ? "folla" : "delusione") : (st.turn === "me" ? "delusione" : "folla"), 0.2); if (pts === 7) SFX.play("fischio", 0.5); }
    setTimeout(next, 2600);
  }
  function next() {
    if (st.turn === "me") st.turn = "cpu";
    else { st.turn = "me"; st.n++; if (st.n >= THROWS && st.me !== st.cpu) return end(); }
    setupPlay();
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    if (window.SFX) SFX.play(win ? "vittoria" : "sconfitta");
    var nuovi = UI.onEnd("football", win, st.me, st.cpu);
    $("fover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (UI.endCard ? UI.endCard("football", nuovi) : "") + '<button class="primary" type="button" id="fagain">Rivincita</button>';
    $("fover").style.justifyContent = "flex-end"; $("fover").style.background = "linear-gradient(rgba(8,14,18,.35), rgba(8,14,18,.9))"; $("fover").hidden = false;
    $("fagain").onclick = newGame;
  }
  function step(now, dt) {
    var t = now - st.t0;
    if (st.phase === "pre" && t > 1) { st.phase = "play"; st.play0 = now; if (window.SFX) SFX.play("fischio"); }
    if (st.phase === "pre" || st.phase === "end") return;
    var running = st.phase !== "result" || now - st.msgT < 0.6;
    st.players.forEach(function (p, i) {
      var ox = p.x, oz = p.z;
      if (p.role === "wr" && running) {
        if (p.chase && st.phase === "air") { var b = st.ball, left = Math.max(0.05, b.t0 + b.T - now); p.x += (b.x1 - p.x) * Math.min(1, dt / left); p.z += (b.z1 - p.z) * Math.min(1, dt / left); }
        else if (st.phase !== "result" || i !== st.catcher) { var q = wrPos(p, dt); p.x = q.x; p.z = q.z; }
      }
      if (p.role === "db" && running) { var m = st.players[p.mark]; p.x += (m.x + 1.6 - p.x) * Math.min(1, dt * 1.8); p.z += (m.z - 1.8 - p.z) * Math.min(1, dt * 1.6); }   // fanno finta di marcare
      if (p.role === "s" && running) { var deep = st.players[2]; p.x += (deep.x * 0.5 - p.x) * dt; p.z += (Math.max(18, deep.z + 3) - p.z) * dt * 0.6; }
      if ((p.role === "ol" || p.role === "dl") && st.phase === "play") { p.x += Math.sin(now * 3 + i) * dt * 0.3; }
      p.vx = (p.x - ox) / Math.max(dt, 1e-3); p.vz = (p.z - oz) / Math.max(dt, 1e-3);
    });
    if (st.phase === "play") {
      if (st.turn === "cpu" && now >= st.cpuAt) {   // la CPU sceglie un compagno e anticipa, con un errore a caso
        var wr = st.players.filter(function (p) { return p.role === "wr"; }), r = G.pick(wr), T0 = 0.7 + Math.hypot(r.x, r.z - QB_Z) / 24, q2 = wrPos(r, T0 + 0.5);
        var miss = Math.random() < 0.3 ? G.rnd(5, 9) * G.pick([-1, 1]) : G.rnd(-2, 2);
        throwTo(q2.x + miss * 0.5, Math.min(GOAL + 8, q2.z + miss));
      }
      if (st.turn === "me" && now - st.play0 > MAXT && !hold) { st.ball = null; st.msg = "Tempo scaduto: placcato"; st.msgGood = false; st.msgT = now; st.phase = "result"; hud(); if (window.SFX) SFX.play("delusione"); setTimeout(next, 2000); }
    }
    if (st.phase === "air" && now >= st.ball.t0 + st.ball.T) land(now);
  }
  // ------------------------------------------------------------------ comandi: cerchio che corre avanti e indietro
  function holdTarget(now) {
    var qb = st.players[0], k = ((now - hold.t0) / 1.7) % 2, m = k < 1 ? k : 2 - k, dist = G.lerp(8, 55, m);
    var ang = G.clamp((hold.x - hold.x0) / (S.W * 0.4), -1, 1) * 0.65;
    return { x: G.clamp(qb.x + Math.sin(ang) * dist, -25, 25), z: qb.z + Math.cos(ang) * dist, m: m };
  }
  cv.addEventListener("pointerdown", function (e) {
    if (!st || st.turn !== "me" || st.phase !== "play") return; var p = G.pt(cv, e);
    hold = { x0: p.x, x: p.x, t0: performance.now() / 1000 }; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener("pointermove", function (e) { if (hold) hold.x = G.pt(cv, e).x; });
  cv.addEventListener("pointerup", function () { if (!hold || st.phase !== "play") { hold = null; return; } var tg = holdTarget(performance.now() / 1000); throwTo(tg.x, tg.z); });
  cv.addEventListener("pointercancel", function () { hold = null; });

  // ------------------------------------------------------------------ telecamera 3D (posizione + punto guardato)
  function camLook(C, L) { var fx = L.x - C.x, fy = L.y - C.y, fz = L.z - C.z, fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    var rx = fz, rz = -fx, rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;   // destra = avanti x su (orizzontale)
    var ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;   // su = avanti x destra
    return { C: C, f: [fx, fy, fz], r: [rx, 0, rz], u: [ux, uy, uz] }; }
  function toCam(p) { var c = st.cam, dx = p.x - c.C.x, dy = p.y - c.C.y, dz = p.z - c.C.z; return { X: dx * c.r[0] + dz * c.r[2], Y: dx * c.u[0] + dy * c.u[1] + dz * c.u[2], Z: dx * c.f[0] + dy * c.f[1] + dz * c.f[2] }; }
  function scr(q) { var F = S.W * 0.9; return { x: S.W / 2 + F * q.X / q.Z, y: S.H * 0.5 - F * q.Y / q.Z, k: F / q.Z, z: q.Z }; }
  function proj(x, y, z) { return scr(toCam({ x: x, y: y, z: z })); }
  var NEAR = 0.4;
  function polyW(c, pts) {   // poligono sul campo tagliato davanti alla telecamera
    var q = pts.map(function (p) { return toCam({ x: p[0], y: p[1] || 0, z: p[2] != null ? p[2] : p[1] }); }), out = [];
    for (var i = 0; i < q.length; i++) { var a = q[i], b = q[(i + 1) % q.length];
      if (a.Z >= NEAR) out.push(a);
      if ((a.Z >= NEAR) !== (b.Z >= NEAR)) { var t = (NEAR - a.Z) / (b.Z - a.Z); out.push({ X: G.lerp(a.X, b.X, t), Y: G.lerp(a.Y, b.Y, t), Z: NEAR }); } }
    if (out.length < 3) return false;
    c.beginPath(); out.forEach(function (p, i) { var s = scr(p); c[i ? "lineTo" : "moveTo"](s.x, s.y); }); c.closePath(); return true;
  }
  function g3(x, z) { return [x, 0, z]; }
  function lineW(c, a, b) { var p = toCam({ x: a[0], y: a[1], z: a[2] }), q = toCam({ x: b[0], y: b[1], z: b[2] }); if (p.Z < NEAR && q.Z < NEAR) return;
    if (p.Z < NEAR) { var t = (NEAR - p.Z) / (q.Z - p.Z); p = { X: G.lerp(p.X, q.X, t), Y: G.lerp(p.Y, q.Y, t), Z: NEAR }; } if (q.Z < NEAR) { var t2 = (NEAR - q.Z) / (p.Z - q.Z); q = { X: G.lerp(q.X, p.X, t2), Y: G.lerp(q.Y, p.Y, t2), Z: NEAR }; }
    var s1 = scr(p), s2 = scr(q); c.beginPath(); c.moveTo(s1.x, s1.y); c.lineTo(s2.x, s2.y); c.stroke(); }
  function updateCam(now, dt) {
    var qb = st.players[0], want;
    if (st.phase === "air" || (st.phase === "result" && st.ball)) {
      var b = st.ball, bp = ballPos(Math.min(now, b.t0 + b.T)), t = bp.t, dx = b.x1 - b.x0, dz = b.z1 - b.z0, dl = Math.hypot(dx, dz) || 1;
      var follow = { C: { x: bp.x - dx / dl * 4, y: bp.y + 1.3, z: bp.z - dz / dl * 4 }, L: { x: bp.x + dx / dl * 6, y: bp.y - 0.8, z: bp.z + dz / dl * 6 } };   // dietro la palla
      var over = { C: { x: b.x1 - dx / dl * 10 + 4, y: 9, z: b.z1 - dz / dl * 10 }, L: { x: b.x1, y: 0, z: b.z1 + 2 } };   // dall'alto sul punto d'arrivo
      var k = st.phase === "result" ? 1 : G.ease(G.clamp((t - 0.62) / 0.38, 0, 1));
      want = { C: mixP(follow.C, over.C, k), L: mixP(follow.L, over.L, k) };
      st.camC = want.C; st.camL = want.L;   // segue subito: e' la telecamera "sulla palla"
    } else {
      want = { C: { x: qb.x * 0.5, y: 5, z: QB_Z - 9 }, L: { x: 0, y: 0, z: 16 } };
      if (!st.camC) { st.camC = want.C; st.camL = want.L; }
      var a = Math.min(1, dt * 3); st.camC = mixP(st.camC, want.C, a); st.camL = mixP(st.camL, want.L, a);
    }
    st.cam = camLook(st.camC, st.camL);
  }
  function mixP(a, b, t) { return { x: G.lerp(a.x, b.x, t), y: G.lerp(a.y, b.y, t), z: G.lerp(a.z, b.z, t) }; }
  function field(c) {
    var W = S.W, H = S.H;
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#7DB6E8"); sky.addColorStop(1, "#CFE6F6"); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // tribune: pareti attorno al campo, a file colorate
    var rows = ["#5F6670", "#6E7680", "#565D66", "#737B86"];
    [[-34, -30, -34, 70], [34, -30, 34, 70], [-34, 70, 34, 70]].forEach(function (w) {
      for (var r = 0; r < 6; r++) { c.fillStyle = rows[r % 4]; if (polyW(c, [[w[0], r * 2, w[1]], [w[2], r * 2, w[3]], [w[2] + (w[0] === w[2] ? Math.sign(w[0]) * 3 : 0), r * 2 + 2, w[3] + (w[1] === w[3] ? 3 : 0)], [w[0] + (w[0] === w[2] ? Math.sign(w[0]) * 3 : 0), r * 2 + 2, w[1] + (w[1] === w[3] ? 3 : 0)]])) c.fill(); }
    });
    c.fillStyle = "#2B6B2F"; if (polyW(c, [g3(-34, -30), g3(34, -30), g3(34, 70), g3(-34, 70)])) c.fill();
    for (var z = -20; z < GOAL; z += 5) { c.fillStyle = (Math.floor(z / 5) % 2) ? "#2E7D32" : "#33873A"; if (polyW(c, [g3(-26.6, z), g3(26.6, z), g3(26.6, z + 5), g3(-26.6, z + 5)])) c.fill(); }
    c.fillStyle = "#1B5E20"; if (polyW(c, [g3(-26.6, GOAL), g3(26.6, GOAL), g3(26.6, GOAL + 10), g3(-26.6, GOAL + 10)])) c.fill();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2;
    for (var y = -20; y <= GOAL + 10; y += 5) lineW(c, [-26.6, 0, y], [26.6, 0, y]);
    lineW(c, [-26.6, 0, -20], [-26.6, 0, GOAL + 10]); lineW(c, [26.6, 0, -20], [26.6, 0, GOAL + 10]);
    c.strokeStyle = "#42A5F5"; c.lineWidth = 3; lineW(c, [-26.6, 0, 0], [26.6, 0, 0]);
    c.strokeStyle = "#FDD835"; lineW(c, [-26.6, 0, 25], [26.6, 0, 25]);
    c.fillStyle = "rgba(255,255,255,.7)"; c.textAlign = "center"; c.textBaseline = "middle";
    [10, 20, 30].forEach(function (n) { [-20, 20].forEach(function (x) { var q = proj(x, 0, n); if (q.z > 1) { c.font = "800 " + Math.round(Math.min(60, q.k * 2.2)) + "px Archivo"; c.fillText(String(GOAL - n), q.x, q.y); } }); });
    var ez = proj(0, 0, GOAL + 5); if (ez.z > 1) { c.font = "800 " + Math.round(Math.min(80, ez.k * 2.6)) + "px Archivo"; c.fillStyle = "rgba(255,255,255,.35)"; c.fillText("END ZONE", ez.x, ez.y); }
    c.strokeStyle = "#FDD835"; c.lineWidth = 3;
    lineW(c, [0, 0, GOAL + 10], [0, 3, GOAL + 10]); lineW(c, [-3, 3, GOAL + 10], [3, 3, GOAL + 10]); lineW(c, [-3, 3, GOAL + 10], [-3, 9, GOAL + 10]); lineW(c, [3, 3, GOAL + 10], [3, 9, GOAL + 10]);
  }
  function big(c, t, x, y, col, k) { c.font = "800 " + Math.round(S.W * (k || 0.06)) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
  var last = null;
  function frame() {
    if (!S || !st) return;
    var c = S.c, W = S.W, H = S.H, now = performance.now() / 1000, dt = last ? Math.min(0.05, now - last) : 0.016; last = now;
    step(now, dt); updateCam(now, dt);
    field(c);
    // giocatori dal piu' lontano; chi attacca corre verso la end zone (di schiena alla telecamera dietro), chi difende di fronte
    var list = st.players.map(function (p, i) { var q = toCam({ x: p.x, y: 0, z: p.z }); return { p: p, i: i, q: q }; }).filter(function (o) { return o.q.Z > NEAR; }).sort(function (a, b) { return b.q.Z - a.q.Z; });
    var bp = st.phase === "air" ? ballPos(now) : null, ballDrawn = false;
    list.forEach(function (o) {
      var p = o.p, s0 = scr(o.q), s = s0.k * 2.3 / 215;
      if (s0.k > S.W * 3) return;   // troppo vicino alla telecamera
      if (bp && !ballDrawn && toCam(bp).Z > o.q.Z) { drawBall(c, bp, now); ballDrawn = true; }
      var moving = Math.hypot(p.vx, p.vz) > 0.8, run = moving ? Math.sin(now * 12 + o.i) * 0.55 : 0;
      var pose = G.P({ ll: [run, 0.2], lr: [-run, -0.2], al: [-0.4 - run * 0.5, 0.4], ar: [0.4 + run * 0.5, -0.4] });
      if (p.role === "qb") { if (st.phase === "play") { pose.ar = hold ? [2.6, 0.6] : [1.2, 1.4]; pose.hold = "nfl"; } else if (st.phase === "air" && now - st.ball.t0 < 0.4) pose.ar = [2.9, -0.2]; }
      if (st.phase === "result" && o.i === st.catcher) { pose = G.P({ al: [-2.8, 0], ar: [2.8, 0], hold: "nfl", lift: Math.abs(Math.sin(now * 6)) * 20, face: "happy" }); }
      var offense = p.role === "qb" || p.role === "wr" || p.role === "ol";
      var camAhead = st.cam.f[2] > 0;   // la telecamera guarda verso la end zone
      G.drawGuy(c, p.av, s0.x, s0.y, s, pose, { back: offense === camAhead });
      if (p.role === "wr" && st.phase === "play" && st.turn === "me") { var tq = proj(p.x, 2.7, p.z); c.fillStyle = "rgba(255,213,79,.9)"; c.beginPath(); c.moveTo(tq.x, tq.y - 2); c.lineTo(tq.x - 6, tq.y - 11); c.lineTo(tq.x + 6, tq.y - 11); c.fill(); }
    });
    if (bp && !ballDrawn) drawBall(c, bp, now);
    if (st.phase === "result" && st.ball && st.catcher < 0) { var lp = proj(st.ball.x1, 0.15, st.ball.z1); if (lp.z > NEAR) { c.save(); c.translate(lp.x, lp.y); G.drawFootball(c, 0, 0, Math.max(4, lp.k * 0.35)); c.restore(); } }
    // cerchio di mira mentre tieni il dito
    if (hold && st.phase === "play") {
      var tg = holdTarget(now), qb = st.players[0];
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2; c.setLineDash([6, 6]); lineW(c, [qb.x, 0.05, qb.z], [tg.x, 0.05, tg.z]); c.setLineDash([]);
      c.strokeStyle = "#FFD54F"; c.lineWidth = 3; c.beginPath(); var ring = []; for (var a = 0; a <= 24; a++) ring.push(proj(tg.x + Math.cos(a / 24 * G.TAU) * 1.6, 0.05, tg.z + Math.sin(a / 24 * G.TAU) * 1.6));
      ring.forEach(function (q, i) { c[i ? "lineTo" : "moveTo"](q.x, q.y); }); c.stroke();
      c.font = "800 13px Archivo"; c.fillStyle = "#fff"; c.textAlign = "center"; var lq = proj(tg.x, 0, tg.z); c.fillText(Math.round(tg.z) + " yard", lq.x, lq.y - 14);
    }
    // scritte
    if (st.phase === "pre") big(c, st.turn === "me" ? "Lanci tu" : "Lancia la CPU", W / 2, H * 0.12, "#FFD54F");
    if (st.phase === "play" && st.turn === "me" && !hold) { big(c, "Tieni il dito sullo schermo", W / 2, H * 0.12, "#FFD54F", 0.05); var left = Math.max(0, MAXT - (now - st.play0)); c.font = "800 15px Archivo"; c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(left.toFixed(1) + " s", 10, H - 14); }
    if (st.phase === "play" && hold) big(c, "Lascia davanti a un compagno", W / 2, H * 0.12, "#FFD54F", 0.05);
    if (st.phase === "result" && st.msg) { var al = Math.min(1, (now - st.msgT) * 3); c.save(); c.globalAlpha = al; big(c, st.msg, W / 2, H * 0.14, st.msgGood ? "#6FBE92" : "#E08268", st.msg.length > 18 ? 0.06 : 0.09); c.restore(); }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, pz = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, pz, {});
    }
  }
  function drawBall(c, bp, now) {
    var q = proj(bp.x, bp.y, bp.z), sh = proj(bp.x, 0, bp.z); if (q.z < NEAR) return;
    if (sh.z > NEAR) { c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(sh.x, sh.y, Math.max(2, sh.k * 0.3), Math.max(1, sh.k * 0.1), 0, 0, G.TAU); c.fill(); }
    c.save(); c.translate(q.x, q.y); c.rotate(-0.5 + Math.sin(now * 3) * 0.1); G.drawFootball(c, 0, 0, G.clamp(q.k * 0.3, 3, S.W * 0.12)); c.restore();
  }
  window.Football = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.15, 190); },
    frame: frame,
    _st: function () { return st; },
    _hold: function () { return hold ? holdTarget(performance.now() / 1000) : null; },
    _wr: function (i, t) { return wrPos(st.players[i], t); }
  };
})();
