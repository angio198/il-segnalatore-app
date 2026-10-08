// StatsFight giochi (prototipo 09/10): tennis. Un game di servizio a testa; sull'1-1 si continua finche' uno va
// avanti di 2 game. Punteggio vero (15, 30, 40, parita', vantaggio). Comandi: trascina il dito per muoverti, tocca
// per colpire (presto = incrociato, tardi = lungolinea), oppure colpo veloce in su verso destra o sinistra per
// scegliere il lato. Battuta: tocca per lanciare la palla, tocca di nuovo quando e' in alto.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("tcv"), S = null, st = null, cpuAv = null, inp = null, keys = {};
  var GRAV = 2.6, NET_H = 0.1, ME_V = -0.07, CPU_V = 1.07, REACH = 0.34;
  // 10/10: la palla si colpisce con la racchetta, che sta alla destra del giocatore (RK in unita' di campo): il
  // colpo parte dalla testa della racchetta e l'animazione ha il contatto proprio nel momento del colpo
  var RK = 0.4, BACK = 0.15, FWD = 0.3;
  function newGame() {
    cpuAv = G.randomAv(); cpuAv.racchetta = G.pick(["classica", "rossa", "blu"]);
    st = { pts: [0, 0], games: [0, 0], game: 0, me: { u: 0.35, tu: 0.35, swing: -9, aim: null }, cpu: { u: -0.35, swing: -9 }, ball: null, phase: "serve", serve: { by: 0, fault: 0, tossT: null }, msg: "", msgT: 0, over: false, celebrate: null, lastHit: null };
    $("tover").hidden = true; setupPoint(); hud();
  }
  var NAMES = ["0", "15", "30", "40"];
  function scoreTxt() {
    var a = st.pts[0], b = st.pts[1];
    if (a >= 3 && b >= 3) return a === b ? "Parità" : (a > b ? "Vantaggio " + (G.av.nome || "tuo") : "Vantaggio CPU");
    return NAMES[Math.min(a, 3)] + " - " + NAMES[Math.min(b, 3)];
  }
  function hud() {
    $("tme").textContent = (G.av.nome || "Tu") + (server() === 0 ? " · batte" : "");
    $("tcpu").textContent = "CPU" + (server() === 1 ? " · batte" : "");
    $("tsc").textContent = st.games[0] + " - " + st.games[1];
    $("thelp").textContent = "Game: " + scoreTxt() + ". Trascina il dito per muoverti, tocca per colpire (presto = incrociato, tardi = lungolinea) o fai un colpo veloce verso l'alto a destra o a sinistra. Battuta: tocca per lanciare, tocca di nuovo con la palla in alto. Un game a testa; sull'1-1 si va avanti finché uno ha 2 game in più.";
  }
  function server() { return st.game % 2; }   // 0 = tu, 1 = CPU
  function deuceSide() { return (st.pts[0] + st.pts[1]) % 2 === 0; }
  function setupPoint() {
    var sv = server(), ds = deuceSide();
    st.ball = null; st.phase = "serve"; st.serve.tossT = null; st.lastHit = null; st.bounces = 0;
    // chi batte sta dietro la linea, dal lato giusto; chi risponde in diagonale
    if (sv === 0) { st.me.u = st.me.tu = ds ? 0.35 : -0.35; st.cpu.u = ds ? -0.55 : 0.55; }
    else { st.cpu.u = ds ? -0.35 : 0.35; st.me.u = st.me.tu = ds ? 0.55 : -0.55; st.cpuServeAt = performance.now() / 1000 + 1.4; }
    hud();
  }
  // geometria: u -1..1 (corridoi esclusi), v 0 = tua linea di fondo, 1 = quella della CPU, rete a 0,5
  function geo() { var W = S.W, H = S.H; return { W: W, H: H, yN: H * 0.84, yF: H * 0.29, wN: W * 0.4, wF: W * 0.24 }; }
  function f(v) { var p = 0.55; return v * (1 + p) / (1 + p * v); }
  function sxy(g, u, v, z) { var k = f(v), hw = G.lerp(g.wN, g.wF, k); return { x: g.W / 2 + u * hw, y: g.yN - (g.yN - g.yF) * k - (z || 0) * g.H * 0.2 * G.lerp(1, 0.62, k), s: G.lerp(1, 0.62, k) }; }
  // un colpo: da dove e' la palla al punto di rimbalzo in tempo T
  function shot(from, tu, tv, T, who) {
    var z0 = from.z, vz = (0.5 * GRAV * T * T - z0) / T;
    st.ball = { u: from.u, v: from.v, z: z0, vu: (tu - from.u) / T, vv: (tv - from.v) / T, vz: vz, bounced: 0, by: who, side: tv > 0.5 ? 1 : 0, serve: st.phase === "serving" };
    st.lastHit = who; st.bounces = 0; st.cpu.prep = false; if (window.SFX) SFX.play(st.phase === "serving" ? "racchetta" : "racchetta");
  }
  function point(winner, why) {
    if (st.phase === "point" || st.phase === "end") return;
    if (window.SFX) SFX.play(winner === 0 ? "folla" : "delusione");
    st.pts[winner]++; st.phase = "point"; st.serve.fault = 0; st.msg = why; st.msgGood = winner === 0; st.msgT = performance.now() / 1000;
    var a = st.pts[0], b = st.pts[1], gw = null;
    if (a >= 4 && a - b >= 2) gw = 0; else if (b >= 4 && b - a >= 2) gw = 1;
    if (gw != null) { st.games[gw]++; st.game++; st.pts = [0, 0]; st.msg = why + " · game " + (gw === 0 ? (G.av.nome || "tuo") : "CPU"); }
    hud();
    setTimeout(function () {
      if (Math.abs(st.games[0] - st.games[1]) >= 2) return end();
      setupPoint();
    }, 1500);
  }
  function end() {
    var win = st.games[0] > st.games[1];
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    if (window.SFX) SFX.play(win ? "vittoria" : "sconfitta");
    var nuovi = UI.onEnd("tennis", win, st.games[0], st.games[1]);
    $("tover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.games[0] + "-" + st.games[1] + '</b>'
      + (UI.endCard ? UI.endCard("tennis", nuovi) : "") + '<button class="primary" type="button" id="tagain">Rivincita</button>';
    $("tover").style.justifyContent = "flex-end"; $("tover").style.background = "linear-gradient(rgba(8,14,18,.35), rgba(8,14,18,.9))"; $("tover").hidden = false;
    $("tagain").onclick = newGame;
  }
  // ------------------------------------------------------------------ battuta
  function myServeTap(dirX) {
    var now = performance.now() / 1000;
    if (st.serve.tossT == null) { st.serve.tossT = now; return; }
    var k = (now - st.serve.tossT) / TOSS, good = Math.abs(k - 0.5);   // meglio con la palla al punto piu' alto
    var ds = deuceSide(), side = ds ? -1 : 1;
    var tu = side * (dirX ? (dirX * side > 0 ? 0.85 : 0.12) : 0.5), tv = 0.72;
    var err = good > 0.3 ? 0.6 : good > 0.18 ? 0.25 : 0.06;
    if (Math.random() < err) { tv = Math.random() < 0.5 ? 0.82 : 0.6; tu += G.rnd(-0.3, 0.3) * (Math.random() < 0.5 ? 1 : 2); }
    st.phase = "serving"; st.me.serveT = now;
    shot({ u: st.me.u - 0.1, v: ME_V, z: tossZ(st.serve.tossT, now) }, tu + G.rnd(-0.05, 0.05), tv + G.rnd(-0.04, 0.04), 0.8, 0);
  }
  function cpuServe() {
    var ds = deuceSide(), side = ds ? 1 : -1;
    var tu = side * G.rnd(0.15, 0.85), tv = G.rnd(0.27, 0.42);
    if (Math.random() < (st.serve.fault ? 0.04 : 0.1)) tv = Math.random() < 0.5 ? 0.18 : 0.47;   // fallo
    st.phase = "serving"; st.cpu.serveT = performance.now() / 1000;
    shot({ u: st.cpu.u - 0.1, v: CPU_V, z: 2.4 }, tu, tv, 0.85, 1);
  }
  function serveFault(by) {
    if (st.serve.fault) { st.serve.fault = 0; point(1 - by, "Doppio fallo"); return; }
    st.serve.fault = 1; st.phase = "point"; st.msg = "Fallo: seconda"; st.msgGood = by === 1; st.msgT = performance.now() / 1000;
    setTimeout(function () { var f0 = st.serve.fault; setupPoint(); st.serve.fault = f0; }, 1100);
  }
  // ------------------------------------------------------------------ fisica e avversario
  function step(dt) {
    var now = performance.now() / 1000, me = st.me, cpu = st.cpu, b = st.ball;
    // movimento: tu col dito o con le frecce; un piccolo aiuto ti avvicina alla palla
    if (keys.ArrowLeft) me.tu = me.u - 0.5; if (keys.ArrowRight) me.tu = me.u + 0.5;
    me.tu = G.clamp(me.tu, -1.35, 1.35);
    var dm = me.tu - me.u, sp = 1.7 * dt; me.moving = Math.abs(dm) > 0.02; me.u += G.clamp(dm, -sp, sp);
    if (st.phase === "serve" && server() === 1 && now >= st.cpuServeAt) cpuServe();
    if (!b || (st.phase !== "rally" && st.phase !== "serving")) { cpu.moving = false; return; }
    // CPU: va verso dove arrivera' la palla
    var target = cpu.u;
    if (b.vv > 0) { var tt = Math.max(0, (CPU_V - b.v) / b.vv); target = b.u + b.vu * tt - RK; } else target = b.u * 0.3;
    var dc = G.clamp(target, -1.3, 1.3) - cpu.u, cs = 1.25 * dt; cpu.moving = Math.abs(dc) > 0.03; cpu.u += G.clamp(dc, -cs, cs);
    // palla
    b.u += b.vu * dt; b.v += b.vv * dt; b.z += b.vz * dt; b.vz -= GRAV * dt;
    var prevSide = b.lastV != null ? b.lastV : b.v; b.lastV = b.v;
    if ((prevSide - 0.5) * (b.v - 0.5) < 0 && b.z < NET_H && !b.netted) { b.netted = true; b.vu *= 0.1; b.vv = -b.vv * 0.15; b.vz = 0.4; if (b.serve) serveFault(b.by); else point(1 - b.by, "Rete"); return; }
    if (b.z <= 0) {
      b.z = 0; b.vz = -b.vz * 0.62; b.vu *= 0.88; b.vv *= 0.88; st.bounces++; if (window.SFX) SFX.play("rimbalzo");
      if (st.bounces === 1) {
        var mySide = b.v < 0.5, sideOk = b.by === 0 ? !mySide : mySide;
        var inCourt = Math.abs(b.u) <= 1.0 && b.v >= -0.005 && b.v <= 1.005 && sideOk;
        if (b.serve) { var box = b.by === 0 ? (b.v >= 0.5 && b.v <= 0.77) : (b.v <= 0.5 && b.v >= 0.23); var half = (b.by === 0 ? (deuceSide() ? b.u <= 0.02 : b.u >= -0.02) : (deuceSide() ? b.u >= -0.02 : b.u <= 0.02)); if (!(box && half && Math.abs(b.u) <= 1)) { serveFault(b.by); return; } st.phase = "rally"; }
        else if (!inCourt) { point(1 - b.by, "Fuori"); return; }
      } else if (st.bounces >= 2) { point(b.by, b.serve ? "Ace!" : (b.by === 0 ? "Vincente!" : "Non ci sei arrivato")); return; }
    }
    // CPU risponde: carica il colpo un attimo prima, poi colpisce
    if (b.by === 0 && st.bounces >= 1 && b.vv > 0 && !cpu.prep && (CPU_V - 0.14 - b.v) / b.vv < BACK) { cpu.prep = true; cpu.swing = now; }
    if (b.by === 0 && st.bounces >= 1 && b.v >= CPU_V - 0.14 && b.z < 0.75) {
      if (Math.abs(b.u - (cpu.u + RK)) < REACH && Math.random() < 0.94) cpuHit(); else if (b.v > CPU_V + 0.3) point(0, "Vincente!");
    }
    if (b.by === 0 && b.v > CPU_V + 0.4) { point(0, "Vincente!"); return; }
    // tu: colpisci se hai toccato da poco e la palla e' a portata
    // un piccolo aiuto: se non stai muovendo il dito, ti sposti perche' la racchetta vada sulla palla
    if (b.by === 1 && b.vv < 0 && !inp) { var tm = Math.max(0, (ME_V - b.v) / b.vv); me.tu = G.lerp(me.tu, G.clamp(b.u + b.vu * tm - RK, -1.35, 1.35), Math.min(1, dt * 2.2)); }
    if (b.by === 1 && st.bounces >= 1 && b.v <= ME_V + 0.17 && b.v >= ME_V - 0.12 && b.z < 0.8 && now - me.swing < 0.32 && Math.abs(b.u - (me.u + RK)) < REACH) myHit(now);
    if (b.by === 1 && b.v < ME_V - 0.4) { point(1, st.bounces ? "Non ci sei arrivato" : "Fuori"); }
  }
  function cpuHit() {
    var b = st.ball, err = Math.random();
    var tu = G.rnd(-0.85, 0.85), tv = G.rnd(0.06, 0.32), T = G.rnd(0.95, 1.25);
    if (err < 0.06) tu = G.pick([-1, 1]) * G.rnd(1.05, 1.25);
    else if (err < 0.09) tv = -0.12;
    st.cpu.hitT = performance.now() / 1000;
    shot({ u: st.cpu.u + RK, v: b.v, z: 0.45 }, tu, tv, T, 1);
    if (err >= 0.09 && err < 0.12) st.ball.vz *= 0.55;   // a volte in rete
  }
  function myHit(now) {
    var b = st.ball, me = st.me, aim = me.aim, tu;
    var late = (now - me.swing) / 0.32;              // presto = incrociato, tardi = lungolinea
    if (aim) tu = aim * G.rnd(0.55, 0.85);
    else tu = (me.u >= 0 ? -1 : 1) * G.lerp(0.75, -0.35, late) + G.rnd(-0.15, 0.15);
    var stretch = Math.abs(b.u - (me.u + RK)) / REACH, tv = G.rnd(0.72, 0.94);
    if (Math.random() < (stretch > 0.75 ? 0.22 : 0.05)) { if (Math.random() < 0.5) tu = (tu >= 0 ? 1 : -1) * G.rnd(1.03, 1.2); else tv = G.rnd(1.02, 1.1); }
    me.aim = null; me.swing = -9; me.hitT = now;
    shot({ u: me.u + RK, v: b.v, z: 0.45 }, tu, tv, G.rnd(0.9, 1.15), 0);
  }
  // ------------------------------------------------------------------ comandi
  cv.addEventListener("pointerdown", function (e) { if (!st) return; var p = G.pt(cv, e); inp = { x: p.x, y: p.y, t: performance.now(), u0: st.me.tu, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", function (e) {
    if (!inp || !st) return; var p = G.pt(cv, e), dx = p.x - inp.x;
    if (Math.abs(dx) > 12 || Math.abs(p.y - inp.y) > 12) inp.moved = true;
    if (inp.moved && performance.now() - inp.t > 120) st.me.tu = G.clamp(inp.u0 + dx / geo().wN * 1.2, -1.35, 1.35);
  });
  cv.addEventListener("pointerup", function (e) {
    if (!inp || !st) return; var p = G.pt(cv, e), d = inp; inp = null;
    var dt = performance.now() - d.t, dx = p.x - d.x, dy = p.y - d.y;
    var flick = dt < 280 && dy < -30, tap = !d.moved && dt < 300;
    if (!flick && !tap) return;
    var dir = flick && Math.abs(dx) > 18 ? (dx > 0 ? 1 : -1) : 0;
    if (st.phase === "serve" && server() === 0) { myServeTap(dir); return; }
    if (st.phase === "rally" || st.phase === "serving") { st.me.swing = performance.now() / 1000; st.me.aim = dir || null; }
  });
  window.addEventListener("keydown", function (e) {
    if (!st || (window.UI && UI.tab() !== "tennis")) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = true; e.preventDefault(); }
    if (e.key === " ") { e.preventDefault(); if (st.phase === "serve" && server() === 0) myServeTap(0); else { st.me.swing = performance.now() / 1000; st.me.aim = null; } }
  });
  window.addEventListener("keyup", function (e) { keys[e.key] = false; if (e.key === "ArrowLeft" || e.key === "ArrowRight") st && (st.me.tu = st.me.u); });

  // ------------------------------------------------------------------ disegno
  var last = null;
  function frame() {
    if (!S || !st) return;
    var now = performance.now() / 1000, dt = last ? Math.min(0.04, now - last) : 0.016; last = now;
    if (st.phase !== "end") step(dt);
    var g = geo(), c = S.c, W = S.W, H = S.H;
    // fuori campo, campo, linee
    c.fillStyle = "#2E6B4F"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#1A2E3D"; c.fillRect(0, 0, W, H * 0.12);
    var q = function (u, v) { return sxy(g, u, v, 0); };
    c.fillStyle = "#2B5DA8"; poly(c, [q(-1.3, -0.12), q(1.3, -0.12), q(1.3, 1.12), q(-1.3, 1.12)]);
    c.fillStyle = "#2F66B8"; poly(c, [q(-1, 0), q(1, 0), q(1, 1), q(-1, 1)]);
    c.strokeStyle = "#fff"; c.lineWidth = 2;
    line(c, q(-1, 0), q(1, 0)); line(c, q(-1, 1), q(1, 1)); line(c, q(-1, 0), q(-1, 1)); line(c, q(1, 0), q(1, 1));
    line(c, q(-1, 0.23), q(1, 0.23)); line(c, q(-1, 0.77), q(1, 0.77)); line(c, q(0, 0.23), q(0, 0.77));
    line(c, q(0, 0), q(0, 0.02)); line(c, q(0, 1), q(0, 0.98));
    // CPU (lontano)
    drawPlayer(c, g, cpuAv, st.cpu, CPU_V, false, now);
    // palla dietro la rete se e' dalla parte della CPU
    var b = st.ball;
    if (b && b.v > 0.5) drawBallT(c, g, b);
    // rete
    var nl = sxy(g, -1.15, 0.5, 0), nr = sxy(g, 1.15, 0.5, 0), nh = sxy(g, 0, 0.5, NET_H).y - sxy(g, 0, 0.5, 0).y;
    c.fillStyle = "rgba(20,20,20,.55)"; c.fillRect(nl.x, nl.y + nh, nr.x - nl.x, -nh);
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; for (var x = nl.x; x < nr.x; x += 5) line(c, { x: x, y: nl.y }, { x: x, y: nl.y + nh });
    c.fillStyle = "#fff"; c.fillRect(nl.x, nl.y + nh - 2, nr.x - nl.x, 3);
    c.fillStyle = "#ccc"; c.fillRect(nl.x - 3, nl.y + nh - 4, 4, -nh + 4); c.fillRect(nr.x - 1, nr.y + nh - 4, 4, -nh + 4);
    if (b && b.v <= 0.5) drawBallT(c, g, b);
    // battuta: palla lanciata
    if (st.phase === "serve" && server() === 1) { var cp = sxy(g, st.cpu.u - 0.1, CPU_V, tossZ(st.cpuServeAt - TOSS * 0.5, now)); G.drawTennisBall(c, cp.x, cp.y, 3.5); }
    drawPlayer(c, g, G.av, st.me, ME_V, true, now);
    if (st.phase === "serve" && server() === 0) {   // palla lanciata ben sopra la testa, davanti all'omino
      var tz = st.serve.tossT != null ? tossZ(st.serve.tossT, now) : 0.42;
      if (st.serve.tossT != null && now - st.serve.tossT > TOSS * 1.12) st.serve.tossT = null;   // ricade: si rilancia
      var sp = sxy(g, st.me.u - 0.1, ME_V, tz); G.drawTennisBall(c, sp.x, sp.y, 5.5);
      c.font = "700 14px Archivo"; c.fillStyle = "#E8A252"; c.textAlign = "center"; c.fillText(st.serve.tossT == null ? "Tocca per lanciare la palla" : "Tocca ora per battere!", W / 2, H * 0.62);
    }
    // indicatore "colpisci"
    if (b && b.by === 1 && st.bounces >= 1 && b.v < 0.3 && Math.abs(b.u - st.me.u) < REACH + 0.1) { c.font = "800 16px Archivo"; c.fillStyle = "#6FBE92"; c.textAlign = "center"; c.fillText("Tocca!", W / 2, H * 0.97); }
    // punteggio del game e messaggio
    c.font = "800 15px Archivo"; c.textAlign = "left"; c.fillStyle = "#fff"; c.fillText(scoreTxt(), 10, 22);
    if (st.phase === "point" && st.msg) { var a = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = a; c.font = "800 " + Math.round(W * 0.075) + "px Archivo"; c.textAlign = "center"; c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.47); c.fillStyle = st.msgGood ? "#6FBE92" : "#E08268"; c.fillText(st.msg, W / 2, H * 0.47); c.restore(); }
    if (st.phase === "end") { c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H); var ct = now - st.celebrate.t0, ps = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct); G.drawGuy(c, G.av, W / 2, H * 0.7, H / 380, ps, {}); }
  }
  var TOSS = 1.1;   // secondi del lancio: la palla sale fino a circa una volta e mezza l'altezza dell'omino
  function tossZ(t0, now) { var k = G.clamp((now - t0) / TOSS, 0, 1.15); return 0.42 + Math.sin(Math.min(1, k) * Math.PI) * 2.1 - (k > 1 ? (k - 1) * 3 : 0); }
  function poly(c, pts) { c.beginPath(); pts.forEach(function (p, i) { c[i ? "lineTo" : "moveTo"](p.x, p.y); }); c.closePath(); c.fill(); }
  function line(c, a, b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  function drawBallT(c, g, b) {
    var sh = sxy(g, b.u, b.v, 0), p = sxy(g, b.u, b.v, b.z);
    c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(sh.x, sh.y, 5 * sh.s, 2 * sh.s, 0, 0, G.TAU); c.fill();
    G.drawTennisBall(c, p.x, p.y, 5.5 * p.s);
  }
  function drawPlayer(c, g, A, pl, v, isMe, now) {
    var p = sxy(g, pl.u, v, 0), s = g.H / (isMe ? 800 : 700) * p.s;
    // fase del colpo: 0 = racchetta indietro, 0,35 = contatto (racchetta di lato, all'altezza della palla), 1 = finito
    var sw = -1, since = now - (pl.swing || -9), hit = now - (pl.hitT || -9);
    if (hit >= 0 && hit < FWD) sw = 0.35 + hit / FWD * 0.65;
    else if (since >= 0 && since < 0.32) sw = Math.min(0.35, since / BACK * 0.35) - 0.0001;
    else if (since >= 0.32 && since < 0.32 + FWD && !(hit >= 0 && hit < 0.6)) sw = 0.35 + (since - 0.32) / FWD * 0.65;   // a vuoto
    var swinging = sw >= 0;
    var step = pl.moving ? Math.sin(now * 16) * 0.45 : 0;
    var K = [[0, 2.3, 0.2, 2.6], [0.35, 1.05, 0.35, 1.5], [1, -1.3, -0.5, -0.9]], kf = function (j) { var a = K[0], b = K[1]; if (sw > 0.35) { a = K[1]; b = K[2]; } var t = (sw - a[0]) / (b[0] - a[0]); return G.lerp(a[j], b[j], G.ease(t)); };
    var pose = G.P({ ar: swinging ? [kf(1), kf(2)] : [1.0, -0.6], al: [-0.5, 0.4], ll: [-0.2 + step, 0.15], lr: [0.2 - step, -0.15], hold: "racket", racketAng: swinging ? kf(3) : 2.4, tilt: swinging ? G.lerp(0.1, -0.15, sw) : 0 });
    var tossing = st.phase === "serve" && ((isMe && server() === 0 && st.serve.tossT != null) || (!isMe && server() === 1 && now > st.cpuServeAt - TOSS * 0.5));
    if (tossing) pose = G.P({ al: [-2.95, 0.05], ar: [2.0, 1.3], hold: "racket", racketAng: 0.2, tilt: 0.1, ll: [-0.15, 0.2], lr: [0.25, -0.1] });
    var sv = (now - (pl.serveT || -9)) / 0.42;
    if (sv >= 0 && sv < 1) {   // battuta: il braccio passa sopra la testa e scende davanti
      var a = G.lerp(2.3, 4.5, G.ease(sv));
      pose = G.P({ ar: [a, 0.05], al: [G.lerp(-2.6, -0.6, sv), 0.4], hold: "racket", racketAng: Math.PI - a, tilt: G.lerp(0.12, -0.25, sv), lift: Math.sin(sv * Math.PI) * 14, ll: [-0.1, 0.1], lr: [0.3 * sv, -0.2] });
    }
    G.drawGuy(c, A, p.x, p.y, s, pose, { back: isMe, racket: true });
  }
  window.Tennis = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.45, 190); },
    frame: frame,
    _st: function () { return st; }
  };
})();
