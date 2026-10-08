// StatsFight giochi (10/10): football americano. Tre azioni a testa, alternate. In attacco: tocca un ricevitore per
// lanciargli la palla (meglio quello senza difensori vicini), poi corri verso la end zone tenendo il dito sullo
// schermo e spostandolo a destra o a sinistra per schivare i difensori. Touchdown = 7 punti, almeno 20 yard = calcio
// piazzato da 3. In difesa: guidi il tuo difensore col dito e provi a placcare chi ha la palla.
// Campo in prospettiva (misure in yard): z = avanti dalla linea di partenza, end zone da z = 40.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("fcv"), S = null, st = null, cpuAv = null, touch = null;
  var DRIVES = 3, GOAL = 40, RUN_V = 7.4, DEF_V = 6.3, MY_DEF_V = 7.6;
  function team(base, c1, c2, num) { var a = Object.assign({}, base); a.c1 = c1; a.c2 = c2; a.maglia = "maglia"; a.num = num; a.cappello = "no"; a.accessorio = "no"; if (base !== G.av) a.nome = ""; return a; }
  function newGame() {
    cpuAv = G.randomAv(); if (cpuAv.c1 === G.av.c1) cpuAv.c1 = (cpuAv.c1 + 3) % G.COLORI.length;
    st = { drive: 0, turn: "me", me: 0, cpu: 0, phase: "pre", msg: "", msgT: 0, celebrate: null };
    $("fover").hidden = true; setupPlay();
  }
  function hud() {
    $("fme").textContent = G.av.nome || "Tu"; $("fcpu").textContent = "CPU"; $("fsc").textContent = st.me + " - " + st.cpu;
    $("fhelp").textContent = (st.drive < DRIVES ? "Azione " + (st.drive + 1) + " di " + DRIVES + ". " : "Supplementare. ")
      + (st.turn === "me" ? "Attacchi tu: tocca un ricevitore per lanciargli la palla (quello più libero), poi tieni il dito sullo schermo e spostalo a destra o a sinistra per schivare. Touchdown 7 punti, almeno 20 yard 3 punti."
        : "Difendi tu: tieni il dito sullo schermo e spostalo per guidare il tuo difensore (il numero " + (G.av.num != null ? G.av.num : "") + ") e placca chi ha la palla.");
  }
  // ------------------------------------------------------------------ azione
  function P(av, x, z, role, extra) { return Object.assign({ av: av, x: x, z: z, vx: 0, vz: 0, role: role }, extra || {}); }
  function setupPlay() {
    var off = st.turn === "me" ? G.av : cpuAv, def = st.turn === "me" ? cpuAv : G.av;
    var o1 = team(off, off.c1, off.c2), d1 = team(def, def.c1, def.c2);
    var mate = function (n, src) { var a = team(G.randomAv(), src.c1, src.c2, n); a.pant = src.pant; a.calze = src.calze; return a; };
    var r1 = mate(81, o1), r2 = mate(88, o1);
    var routes = [[{ x: -8, z: 0 }, { x: -8, z: G.rnd(9, 13) }, { x: G.rnd(-4, 0), z: 26 }], [{ x: 8, z: 0 }, { x: 8, z: G.rnd(3, 6) }, { x: G.rnd(-2, 4), z: 14 }, { x: G.rnd(-2, 4), z: 34 }]];
    if (Math.random() < 0.5) routes = routes.map(function (r) { return r.map(function (p) { return { x: -p.x, z: p.z }; }); });
    st.players = [
      P(st.turn === "me" ? G.av : team(cpuAv, cpuAv.c1, cpuAv.c2, 12), 0, -5, "qb"),
      P(r1, routes[0][0].x, 0, "wr", { route: routes[0], leg: 1 }), P(r2, routes[1][0].x, 0, "wr", { route: routes[1], leg: 1 }),
      P(mate(60, o1), -2.2, -0.6, "ol"), P(mate(55, o1), 0, -0.6, "ol"), P(mate(66, o1), 2.2, -0.6, "ol"),
      P(mate(90, d1), -1.6, 1, "dl"), P(mate(94, d1), 1.6, 1, "dl"),
      P(mate(24, d1), routes[0][0].x, 6, "cb", { mark: 1 }), P(mate(21, d1), routes[1][0].x, 6, "cb", { mark: 2 }),
      P(st.turn === "me" ? mate(31, d1) : G.av, 0, 15, "s", { mine: st.turn !== "me" })
    ];
    st.ball = { holder: 0, fly: null }; st.carrier = 0; st.phase = "pre"; st.t0 = performance.now() / 1000; st.camZ = -15; st.camX = 0;
    st.throwAt = st.turn === "cpu" ? st.t0 + 1 + G.rnd(1.4, 2.4) : null; touch = null; hud();
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function moveTo(p, tx, tz, v, dt) { var dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d < 0.01) return; var k = Math.min(1, v * dt / d); p.vx = dx / d * v; p.vz = dz / d * v; p.x += dx * k; p.z += dz * k; }
  function throwTo(i) {
    var qb = st.players[0], r = st.players[i], T = 0.35 + dist(qb, r) / 24;
    // si lancia dove sara' il ricevitore all'arrivo
    var tx = r.x + r.vx * T, tz = r.z + r.vz * T;
    st.ball = { holder: -1, fly: { x0: qb.x, z0: qb.z, x1: tx, z1: tz, t0: performance.now() / 1000, T: T, to: i } };
    st.phase = "air";
  }
  function catchBall() {
    var f = st.ball.fly, r = st.players[f.to], spot = { x: f.x1, z: f.z1 };
    var defs = st.players.filter(function (p) { return p.role === "cb" || p.role === "s"; }), near = defs.reduce(function (m, p) { return Math.min(m, dist(p, spot)); }, 99);
    var dr = dist(r, spot), roll = Math.random();
    if (dr > 2.5) return play("incompleto");
    if (near < 1.3 && roll < 0.4) return play("intercetto");
    if ((near < 1.3 && roll < 0.75) || (near < 2.6 && roll < 0.25) || roll < 0.05) return play("incompleto");
    st.ball = { holder: f.to, fly: null }; st.carrier = f.to; st.phase = "run"; st.runT = performance.now() / 1000;
    r.route = null;
  }
  function play(kind) {
    var c = st.players[st.carrier], yards = Math.max(0, Math.round(kind === "td" ? GOAL : (kind === "placcato" || kind === "fuori") ? c.z : 0));
    var pts = kind === "td" ? 7 : yards >= 20 ? 3 : 0, mine = st.turn === "me";
    if (mine) st.me += pts; else st.cpu += pts;
    st.msg = { td: "Touchdown!", placcato: "Placcato dopo " + yards + " yard", fuori: "Fuori campo dopo " + yards + " yard", incompleto: "Passaggio incompleto", intercetto: "Intercetto!", sack: "Sack sul quarterback" }[kind]
      + (pts === 3 ? " · calcio piazzato +3" : pts ? " +7" : "");
    st.msgGood = mine === (pts > 0); st.msgT = performance.now() / 1000; st.phase = "result"; hud();
    setTimeout(next, 2000);
  }
  function next() {
    if (st.turn === "me") st.turn = "cpu";
    else { st.turn = "me"; st.drive++; if (st.drive >= DRIVES && st.me !== st.cpu) return end(); }
    setupPlay();
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    var nuovi = win ? UI.onWin("football") : (G.pg.giocate++, G.savePg(), []);
    $("fover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="fagain">Rivincita</button>';
    $("fover").style.justifyContent = "flex-end"; $("fover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("fover").hidden = false;
    $("fagain").onclick = newGame;
  }
  function step(now, dt) {
    var ps = st.players, qb = ps[0], t = now - st.t0;
    if (st.phase === "pre" && t > 1) st.phase = "pass";
    if (st.phase === "pre") return;
    var running = st.phase === "run", carrier = ps[st.carrier];
    ps.forEach(function (p, i) {
      if (p.role === "wr" && p.route && st.phase !== "result") {   // percorso del ricevitore
        var w = p.route[p.leg]; if (w) { moveTo(p, w.x, w.z, 7, dt); if (Math.hypot(p.x - w.x, p.z - w.z) < 0.3) p.leg++; } else moveTo(p, p.x, p.z + 10, 7, dt);
      }
      if (p.role === "dl" && st.phase === "pass") moveTo(p, qb.x + (p.x < 0 ? -0.6 : 0.6), qb.z, 1.5, dt);
      if ((p.role === "cb" || p.role === "s") && !p.mine && st.phase !== "result") {
        if (running) moveTo(p, carrier.x + carrier.vx * 0.4, carrier.z + carrier.vz * 0.4, DEF_V, dt);   // inseguono chi ha la palla
        else if (p.role === "cb") { var m = ps[p.mark]; moveTo(p, m.x + 0.8 * (m.x > 0 ? -1 : 1), m.z + 2, 6.6, dt); }
        else { var deep = ps[1].z > ps[2].z ? ps[1] : ps[2]; moveTo(p, deep.x * 0.6, Math.max(12, deep.z + 4), 5, dt); }
      }
    });
    // il tuo difensore (quando difendi) segue il dito
    var mine = ps.filter(function (p) { return p.mine; })[0];
    if (mine && st.phase !== "result") {
      if (touch) { var jx = G.clamp((touch.x - touch.x0) / (S.W * 0.2), -1, 1), jz = G.clamp(-(touch.y - touch.y0) / (S.W * 0.2), -1, 1), l = Math.hypot(jx, jz);
        if (l > 0.1) { mine.vx = jx / Math.max(1, l) * MY_DEF_V; mine.vz = jz / Math.max(1, l) * MY_DEF_V; mine.x += mine.vx * dt; mine.z += mine.vz * dt; } }
      else if (!running) { var dp = ps[1].z > ps[2].z ? ps[1] : ps[2]; moveTo(mine, dp.x * 0.5, Math.max(12, dp.z + 4), 4, dt); }
    }
    // lancio della CPU: al ricevitore piu' libero
    if (st.phase === "pass" && st.throwAt && now >= st.throwAt) {
      var best = [1, 2].map(function (i) { var r = ps[i], d = ps.filter(function (p) { return p.role === "cb" || p.role === "s"; }).reduce(function (m, p) { return Math.min(m, dist(p, r)); }, 99); return [i, d]; }).sort(function (a, b) { return b[1] - a[1]; })[0];
      throwTo(best[0]);
    }
    if (st.phase === "pass" && t > 5.2) return play("sack");
    if (st.phase === "air" && now - st.ball.fly.t0 >= st.ball.fly.T) catchBall();
    if (running) {
      var c = carrier;
      if (st.turn === "me") {   // corri tu: avanti da solo, il dito sposta di lato
        var j = touch ? G.clamp((touch.x - touch.x0) / (S.W * 0.18), -1, 1) : 0;
        c.vx = j * 6.5; c.vz = RUN_V * (1 - Math.abs(j) * 0.25);
      } else {   // corre la CPU: si allontana dal difensore piu' vicino davanti
        var thr = ps.filter(function (p) { return (p.role === "cb" || p.role === "s") && p.z > c.z - 1; }).sort(function (a, b) { return dist(a, c) - dist(b, c); })[0];
        var away = thr ? G.clamp((c.x - thr.x) / 3, -1, 1) * (dist(thr, c) < 7 ? 1 : 0.3) : 0;
        if (Math.abs(c.x) > 20) away = -Math.sign(c.x) * 0.6;
        c.vx = away * 6; c.vz = RUN_V * 0.95;
      }
      c.x += c.vx * dt; c.z += c.vz * dt;
      if (c.z >= GOAL) return play("td");
      if (Math.abs(c.x) > 26.6) return play("fuori");
      var tackler = ps.filter(function (p) { return p.role === "cb" || p.role === "s"; }).some(function (p) { return dist(p, c) < 1.0; });
      if (tackler) return play("placcato");
    }
  }

  // ------------------------------------------------------------------ comandi
  cv.addEventListener("pointerdown", function (e) {
    if (!st) return; var p = G.pt(cv, e);
    if (st.turn === "me" && st.phase === "pass") {   // tocco su un ricevitore: lancio
      var best = null, bd = S.W * 0.14;
      [1, 2].forEach(function (i) { var q = proj(st.players[i].x, 1, st.players[i].z); var d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = i; } });
      if (best) { throwTo(best); return; }
    }
    touch = { x0: p.x, y0: p.y, x: p.x, y: p.y };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener("pointermove", function (e) { if (!touch) return; var p = G.pt(cv, e); touch.x = p.x; touch.y = p.y; });
  ["pointerup", "pointercancel"].forEach(function (n) { cv.addEventListener(n, function () { touch = null; }); });

  // ------------------------------------------------------------------ prospettiva e disegno
  var CAM = { h: 4.2, back: 8, pitch: 0.12 };
  function proj(x, y, z) {
    var X = x - st.camX, Y = y - CAM.h, Z = z - (st.camZ);
    var cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch), yy = Y * cp + Z * sp, zz = Z * cp - Y * sp, F = S.W * 0.7;
    return { x: S.W / 2 + F * X / zz, y: S.H * 0.3 - F * yy / zz, z: zz, k: F / zz };
  }
  function fieldLine(c, x0, z0, x1, z1) { var lim = st.camZ + 1.5; if (z0 < lim && z1 < lim) return; if (z0 < lim) { x0 = G.lerp(x0, x1, (lim - z0) / (z1 - z0)); z0 = lim; } if (z1 < lim) { x1 = G.lerp(x1, x0, (lim - z1) / (z0 - z1)); z1 = lim; } var a = proj(x0, 0, z0), b = proj(x1, 0, z1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  function quad(c, pts) { c.beginPath(); pts.forEach(function (p, i) { var q = proj(p[0], 0, p[1]); c[i ? "lineTo" : "moveTo"](q.x, q.y); }); c.closePath(); }
  function field(c) {
    var W = S.W, H = S.H, hz = proj(0, 0, st.camZ + 400).y;
    var sky = c.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#9CC9EE"); sky.addColorStop(1, "#D6EAF7"); c.fillStyle = sky; c.fillRect(0, 0, W, hz);
    var top = proj(0, 14, GOAL + 22).y; c.fillStyle = "#5F6670"; c.fillRect(0, top, W, hz - top);
    for (var r = 0; r < 7; r++) { c.fillStyle = r % 2 ? "#6E7680" : "#565D66"; c.fillRect(0, top + r * (hz - top) / 7, W, (hz - top) / 14); }
    for (var i = 0; i < 70; i++) { c.fillStyle = ["#C62828", "#1565C0", "#FDD835", "#fff"][i % 4]; c.globalAlpha = 0.5; c.fillRect((i * 37) % W, top + (i * 13) % Math.max(1, hz - top - 4), 2.5, 2.5); } c.globalAlpha = 1;
    c.fillStyle = "#2E7D32"; c.fillRect(0, hz, W, H - hz);
    for (var z = -20; z < GOAL + 10; z += 5) { if (z + 5 < st.camZ + 1.5) continue; var z0 = Math.max(z, st.camZ + 1.5); c.fillStyle = (Math.floor(z / 5) % 2) ? "#2E7D32" : "#33873A"; quad(c, [[-60, z0], [60, z0], [60, z + 5], [-60, z + 5]]); c.fill(); }
    if (GOAL + 10 > st.camZ + 1.5) { c.fillStyle = "#1B5E20"; quad(c, [[-26.6, Math.max(GOAL, st.camZ + 1.5)], [26.6, Math.max(GOAL, st.camZ + 1.5)], [26.6, GOAL + 10], [-26.6, GOAL + 10]]); c.fill(); }
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2;
    for (var y = -20; y <= GOAL + 10; y += 5) fieldLine(c, -26.6, y, 26.6, y);
    fieldLine(c, -26.6, -20, -26.6, GOAL + 10); fieldLine(c, 26.6, -20, 26.6, GOAL + 10);
    c.strokeStyle = "#42A5F5"; c.lineWidth = 3; fieldLine(c, -26.6, 0, 26.6, 0);
    c.strokeStyle = "#FDD835"; fieldLine(c, -26.6, 20, 26.6, 20);
    // numeri delle yard (mancano alla end zone)
    c.fillStyle = "rgba(255,255,255,.7)"; c.textAlign = "center"; c.textBaseline = "middle";
    for (var n = 10; n < GOAL; n += 10) { var q = proj(-20, 0, n), q2 = proj(20, 0, n); if (q.z > 1) { c.font = "800 " + Math.round(q.k * 2.2) + "px Archivo"; c.fillText(String(GOAL - n), q.x, q.y); c.fillText(String(GOAL - n), q2.x, q2.y); } }
    var ez = proj(0, 0, GOAL + 5); if (ez.z > 1) { c.font = "800 " + Math.round(ez.k * 2.6) + "px Archivo"; c.fillStyle = "rgba(255,255,255,.35)"; c.fillText("END ZONE", ez.x, ez.y); }
    // pali
    c.strokeStyle = "#FDD835"; c.lineWidth = 3;
    var gp = function (a, b) { var p = proj(a[0], a[1], a[2]), q2 = proj(b[0], b[1], b[2]); if (p.z > 1 && q2.z > 1) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q2.x, q2.y); c.stroke(); } };
    gp([0, 0, GOAL + 10], [0, 3, GOAL + 10]); gp([-3, 3, GOAL + 10], [3, 3, GOAL + 10]); gp([-3, 3, GOAL + 10], [-3, 9, GOAL + 10]); gp([3, 3, GOAL + 10], [3, 9, GOAL + 10]);
  }
  function frame() {
    if (!S || !st) return;
    var c = S.c, W = S.W, H = S.H, now = performance.now() / 1000, dt = Math.min(0.05, now - (st.last || now)); st.last = now;
    if (st.phase !== "end" && st.phase !== "result") step(now, dt);
    // telecamera: dietro al quarterback, poi dietro a chi corre
    var f = st.players[st.phase === "run" || st.phase === "result" ? st.carrier : 0];
    var tz = (st.phase === "air" ? Math.min(st.ball.fly.z1, 15) - 6 : f.z) - CAM.back, tx = f.x * 0.6;
    st.camZ += (tz - st.camZ) * Math.min(1, dt * 4); st.camX += (tx - st.camX) * Math.min(1, dt * 4);
    field(c);
    // giocatori dal piu' lontano: chi attacca va verso la end zone (di schiena), chi difende guarda verso di te
    var off = function (p) { return p.role === "qb" || p.role === "wr" || p.role === "ol"; };
    st.players.slice().sort(function (a, b) { return b.z - a.z; }).forEach(function (p) {
      var q = proj(p.x, 0, p.z); if (q.z < 1) return;
      var s = q.k * 2.5 / 215, moving = Math.hypot(p.vx, p.vz) > 0.5, run = moving ? Math.sin(now * 12 + p.x) * 0.55 : 0;
      var pose = G.P({ ll: [run, 0.2], lr: [-run, -0.2], al: [-0.4 - run * 0.5, 0.4], ar: [0.4 + run * 0.5, -0.4] });
      var holder = st.ball.holder === st.players.indexOf(p);
      if (holder) { pose.ar = [1.2, 1.5]; pose.hold = "nfl"; }
      if (p.role === "qb" && st.phase === "pass" && !holder) pose.ar = [2.6, 0.3];
      if (p.mine || (p.role === "qb" && st.turn === "me") || (holder && st.turn === "me" && st.phase === "run")) { c.beginPath(); c.ellipse(q.x, q.y, 22 * s * 2, 7 * s * 2, 0, 0, G.TAU); c.strokeStyle = "#FFD54F"; c.lineWidth = 2.5; c.stroke(); }
      G.drawGuy(c, p.av, q.x, q.y, s, pose, { back: off(p) });
    });
    // palla in volo
    if (st.phase === "air") {
      var fl = st.ball.fly, t = G.clamp((now - fl.t0) / fl.T, 0, 1), bq = proj(G.lerp(fl.x0, fl.x1, t), 2 + Math.sin(t * Math.PI) * (2 + fl.T * 3), G.lerp(fl.z0, fl.z1, t));
      c.save(); c.translate(bq.x, bq.y); c.rotate(now * 10); G.drawFootball(c, 0, 0, Math.max(4, bq.k * 0.3)); c.restore();
      var lq = proj(fl.x1, 0, fl.z1); c.strokeStyle = "rgba(255,213,79,.8)"; c.lineWidth = 2; c.beginPath(); c.ellipse(lq.x, lq.y, lq.k * 1.2, lq.k * 0.4, 0, 0, G.TAU); c.stroke();
    }
    // aiuti a schermo
    c.textAlign = "center"; c.textBaseline = "middle";
    if (st.phase === "pass" && st.turn === "me") {
      [1, 2].forEach(function (i) { var r = st.players[i], q = proj(r.x, 2.6, r.z), pulse = 0.5 + 0.5 * Math.sin(now * 6); c.fillStyle = "rgba(255,213,79," + (0.5 + pulse * 0.5) + ")"; c.beginPath(); c.moveTo(q.x, q.y - 4); c.lineTo(q.x - 7, q.y - 14); c.lineTo(q.x + 7, q.y - 14); c.fill(); });
      big(c, "Tocca un ricevitore", W / 2, H * 0.08, "#FFD54F");
    }
    if (st.phase === "pre") big(c, st.turn === "me" ? "Attacchi tu" : "Difendi tu", W / 2, H * 0.08, "#FFD54F");
    if (st.phase === "run" && st.turn === "me" && !touch) big(c, "Tieni il dito e spostalo per schivare", W / 2, H * 0.08, "#FFD54F", 0.045);
    if (st.turn === "cpu" && (st.phase === "pass" || st.phase === "run") && !touch) big(c, "Trascina per muovere il tuo difensore", W / 2, H * 0.08, "#FFD54F", 0.045);
    if (st.phase === "run" || st.phase === "result") { var cz = Math.max(0, Math.round(st.players[st.carrier].z)); c.font = "800 15px Archivo"; c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(cz + " yard", 10, H - 14); }
    if (st.phase === "result" && st.msg) { var al = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = al; big(c, st.msg, W / 2, H * 0.2, st.msgGood ? "#6FBE92" : "#E08268", st.msg.length > 18 ? 0.06 : 0.09); c.restore(); }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, pz = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, pz, {});
    }
  }
  function big(c, t, x, y, col, k) { c.font = "800 " + Math.round(S.W * (k || 0.06)) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.55)"; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
  window.Football = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.05, 190); },
    frame: frame,
    _st: function () { return st; },
    _proj: function (x, y, z) { return proj(x, y, z); }
  };
})();
