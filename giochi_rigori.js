// StatsFight giochi (prototipo 09/10): sfida ai rigori. Tiri tu, para l'altro, poi il contrario: 5 a testa, poi a
// oltranza. Tiro: trascina il dito dal pallone verso la porta (direzione = dove, lunghezza = altezza, troppo veloce
// = alto) oppure tocca un punto della porta. Tiro a effetto (09/10): tieni premuto sul pallone e disegna la
// traiettoria (al massimo 1,5 secondi): la palla la rifa' identica; se non finisce dentro la porta e' fuori. Il
// portiere sceglie dove buttarsi e arriva li' esattamente quando arriva la palla.
// In porta: tocca (o trascina) dove tuffarti, prima che parta il tiro.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("rcv"), S = null, st = null, cpuAv = null, drag = null;
  function newGame() {
    cpuAv = G.randomAv();
    st = { turn: "me", me: [], cpu: [], phase: "aim", t: 0, kick: null, keeper: { x: 0, y: 0.15, tx: 0, ty: 0.15, rot: 0 }, ball: null, msg: "", msgT: 0, keepTarget: null, over: false, celebrate: null };
    hud(); $("rover").hidden = true; startTurn();
  }
  function hud() {
    $("rme").textContent = (G.av.nome || "Tu"); $("rcpu").textContent = "CPU";
    var dots = function (a) { var out = a.map(function (x) { return '<i class="' + (x ? "g" : "m") + '"></i>'; }); while (out.length < 5) out.push("<i></i>"); return out.join(""); };
    $("rdme").innerHTML = dots(st.me); $("rdcpu").innerHTML = dots(st.cpu);
    $("rsc").textContent = sum(st.me) + " - " + sum(st.cpu);
    $("rhelp").textContent = st.turn === "me" ? "Tiri tu: trascina il dito dal pallone verso la porta (più lungo = più alto, troppo veloce = vola alto) o tocca un punto della porta. Tiro a effetto: tieni premuto sul pallone e disegna la traiettoria (1,5 secondi al massimo): deve finire dentro la porta."
      : "Sei in porta: tocca dove tuffarti (o trascina il dito verso quel lato) prima che l'avversario calci. Se non tocchi resti al centro.";
  }
  function sum(a) { return a.reduce(function (s, x) { return s + (x ? 1 : 0); }, 0); }
  // geometria: porta in coordinate gx -1..1 (pali), gy 0..1 (terra..traversa)
  function geo() { var W = S.W, H = S.H; return { gx0: W * 0.1, gx1: W * 0.9, top: H * 0.13, base: H * 0.42, spotX: W / 2, spotY: H * 0.8 }; }
  function GX(g, x) { return G.lerp(g.gx0, g.gx1, (x + 1) / 2); }
  function GY(g, y) { return G.lerp(g.base, g.top, y); }
  function toGoal(g, px, py) { return { x: (px - g.gx0) / (g.gx1 - g.gx0) * 2 - 1, y: (g.base - py) / (g.base - g.top) }; }
  function startTurn() {
    st.phase = "aim"; st.t = performance.now() / 1000; st.kick = null; st.ball = null; st.keepTarget = null;
    st.keeper = { x: 0, y: 0.15, tx: 0, ty: 0.15, rot: 0, t0: 0 };
    hud();
    if (st.turn === "cpu") { st.phase = "run"; st.runT = st.t + 0.9; }   // l'avversario prende la rincorsa: hai un attimo per scegliere
  }
  function shoot(target, speed, path) {   // target in coordinate porta; speed 0.5 lento .. 1 normale .. 1.6 forte
    var now = performance.now() / 1000;
    st.kick = { x: target.x, y: target.y, speed: speed, t0: now, dur: speed < 0.75 ? 0.75 : speed > 1.3 ? 0.42 : 0.55, path: path || null };
    if (path) st.kick.dur = path.dur;
    st.phase = "fly";
    // il portiere si tuffa al calcio
    if (st.turn === "me") {
      var r = Math.random(), dir;
      if (r < 0.15) dir = { x: 0, y: G.rnd(0.1, 0.6) };
      else if (r < 0.15 + (speed < 0.75 ? 0.55 : 0.3)) dir = { x: G.clamp(target.x + G.rnd(-0.25, 0.25), -0.9, 0.9), y: G.clamp(target.y + G.rnd(-0.3, 0.3), 0.05, 0.95) };   // la legge
      else dir = { x: G.pick([-1, 1]) * G.rnd(0.45, 0.9), y: G.rnd(0.05, 0.9) };
      st.keeper.tx = dir.x; st.keeper.ty = dir.y; st.keeper.t0 = now + Math.max(0.05, st.kick.dur - 0.42);   // arriva insieme alla palla
    } else {
      var k = st.keepTarget || { x: 0, y: 0.2 };
      st.keeper.tx = G.clamp(k.x, -0.92, 0.92); st.keeper.ty = G.clamp(k.y, 0.05, 0.95); st.keeper.t0 = now + 0.08;
    }
  }
  function cpuKick() {
    var r = Math.random(), t;
    if (r < 0.08) t = { x: G.pick([-1, 1]) * G.rnd(1.08, 1.3), y: G.rnd(0.1, 0.8) };       // fuori
    else if (r < 0.13) t = { x: G.rnd(-0.6, 0.6), y: G.rnd(1.06, 1.3) };                      // alto
    else t = { x: G.pick([-1, 1]) * G.rnd(0.2, 0.95), y: G.rnd(0.05, 0.92) };
    if (Math.random() < 0.12) t.x = G.rnd(-0.2, 0.2);                                          // centrale
    shoot(t, G.rnd(0.85, 1.25));
  }
  function outcome() {
    var k = st.kick, kp = st.keeper, ax = Math.abs(k.x);
    if (ax > 1.0 && ax < 1.09 && k.y < 1.05) return ["palo", false];
    if (k.y > 1.0 && k.y < 1.07 && ax < 1.0) return ["traversa", false];
    if (ax >= 1.0 || k.y >= 1.0) return ["fuori", false];
    var reach = (ax > 0.78 && k.y > 0.72) ? 0.27 : k.speed > 1.3 ? 0.3 : k.speed < 0.75 ? 0.5 : 0.38;
    var stay = Math.abs(kp.tx) < 0.15;
    var saved = stay ? (ax < 0.3 && k.y < 0.8) : (Math.abs(k.x - kp.tx) < reach && Math.abs(k.y - kp.ty) < reach + 0.12);
    return saved ? ["parata", false] : ["gol", true];
  }
  function finishKick() {
    var o = outcome(); (st.turn === "me" ? st.me : st.cpu).push(o[1]);
    st.msg = { gol: st.turn === "me" ? "GOL!" : "Gol subito", parata: st.turn === "me" ? "Parata del portiere" : "PARATA!", fuori: "Fuori!", palo: "Palo!", traversa: "Traversa!" }[o[0]];
    st.msgGood = (st.turn === "me") === o[1]; st.msgT = performance.now() / 1000; st.res = o[0];
    st.phase = "result"; hud();
    setTimeout(next, 1500);
  }
  function decided() {
    var a = sum(st.me), b = sum(st.cpu), na = st.me.length, nb = st.cpu.length;
    if (na <= 5 && nb <= 5) { if (a + (5 - na) < b || b + (5 - nb) < a) return true; if (na === 5 && nb === 5) return a !== b; return false; }
    return na === nb && a !== b;   // a oltranza: dopo ogni coppia di tiri
  }
  function next() {
    if (decided()) return end();
    st.turn = st.turn === "me" ? "cpu" : "me"; startTurn();
  }
  function end() {
    var win = sum(st.me) > sum(st.cpu);
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    var nuovi = win ? UI.onWin("rigori") : (G.pg.giocate++, G.savePg(), []);
    $("rover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + sum(st.me) + "-" + sum(st.cpu) + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="ragain">Rivincita</button>';
    $("rover").style.justifyContent = "flex-end"; $("rover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("rover").hidden = false;
    $("ragain").onclick = newGame;
  }

  // ------------------------------------------------------------------ comandi
  var DRAW_HOLD = 280, DRAW_MAX = 1500;
  cv.addEventListener("pointerdown", function (e) {
    if (!st) return; var p = G.pt(cv, e); drag = { x: p.x, y: p.y, t: performance.now(), cx: p.x, cy: p.y, moved: false, pts: null };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    var g = geo(), near = Math.hypot(p.x - g.spotX, p.y - g.spotY) < S.W * 0.16;
    if (st.turn === "me" && st.phase === "aim" && near) drag.hold = setTimeout(function () {   // tenuto premuto: si disegna
      if (drag && !drag.moved) { drag.pts = [{ x: g.spotX, y: g.spotY - 9, t: 0 }]; drag.t = performance.now(); drag.end = setTimeout(function () { finishDraw(); }, DRAW_MAX); }
    }, DRAW_HOLD);
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return; var p = G.pt(cv, e); drag.cx = p.x; drag.cy = p.y;
    if (Math.hypot(p.x - drag.x, p.y - drag.y) > 10 && !drag.pts) { drag.moved = true; clearTimeout(drag.hold); }
    if (drag.pts) drag.pts.push({ x: p.x, y: p.y, t: (performance.now() - drag.t) / 1000 });
  });
  function finishDraw() {
    if (!drag || !drag.pts) return; var d = drag; drag = null; clearTimeout(d.hold); clearTimeout(d.end);
    var pts = d.pts; if (pts.length < 3) return;
    var g = geo(), last = pts[pts.length - 1], end = toGoal(g, last.x, last.y), dur = G.clamp(last.t, 0.45, 1.5);
    // dentro la porta solo se l'ultimo punto e' fra i pali e sotto la traversa; altrimenti fuori (largo, alto o corto)
    var inGoal = Math.abs(end.x) < 1 && end.y > 0 && end.y < 1;
    var tgt = inGoal ? end : { x: Math.abs(end.x) >= 1 ? end.x : (end.x < 0 ? -1.2 : 1.2), y: end.y >= 1 ? end.y : end.y <= 0 ? 1.2 : end.y };
    if (!inGoal && end.y <= 0) tgt = { x: 1.25, y: 0.3 };   // non arriva in porta: fuori
    kickMe(tgt, 1, { pts: pts, dur: dur });
  }
  cv.addEventListener("pointerup", function (e) {
    if (!drag || !st) return; clearTimeout(drag.hold);
    if (drag.pts) { finishDraw(); return; }
    var d = drag; drag = null;
    var g = geo(), p = G.pt(cv, e), dx = p.x - d.x, dy = p.y - d.y, len = Math.hypot(dx, dy), dt = Math.max(30, performance.now() - d.t);
    if (st.turn === "me" && st.phase === "aim") {
      if (len < 12) {   // tocco sulla porta: tiro preciso a velocita' normale
        var tg = toGoal(g, p.x, p.y); if (tg.y < -0.1 || tg.y > 1.3 || Math.abs(tg.x) > 1.3) return;
        kickMe({ x: tg.x + G.rnd(-0.07, 0.07), y: G.clamp(tg.y + G.rnd(-0.07, 0.07), 0.02, 1.2) }, 1); return;
      }
      if (dy > -25) return;
      var v = len / dt, gx = G.clamp(dx / (S.W * 0.3), -1.35, 1.35), gy = G.clamp((-dy - 40) / (S.H * 0.38), 0.02, 1.15);
      var speed = G.clamp(v / 1.3, 0.5, 1.7);
      if (speed > 1.45) gy += G.rnd(0.05, 0.35);   // troppo forte: tende a volare alto
      kickMe({ x: gx + G.rnd(-0.06, 0.06), y: gy }, speed);
    } else if (st.turn === "cpu" && (st.phase === "run" || (st.phase === "fly" && performance.now() / 1000 - st.kick.t0 < 0.12))) {
      var t2;
      if (len < 12) t2 = toGoal(g, p.x, p.y);
      else t2 = { x: G.clamp(dx / (S.W * 0.25), -1, 1), y: G.clamp(-dy / (S.H * 0.3), 0.05, 0.95) };
      st.keepTarget = { x: G.clamp(t2.x, -1, 1), y: G.clamp(t2.y, 0.05, 0.95) };
      if (st.phase === "fly") { st.keeper.tx = st.keepTarget.x; st.keeper.ty = st.keepTarget.y; }
    }
  });
  function kickMe(t, speed, path) { st.phase = "run"; st.runT = performance.now() / 1000 + 0.45; st.pending = { t: t, speed: speed, path: path || null }; }

  // ------------------------------------------------------------------ disegno
  function frame() {
    if (!S || !st) return;
    var c = S.c, W = S.W, H = S.H, g = geo(), now = performance.now() / 1000;
    // passaggi di stato a tempo
    if (st.phase === "run" && now >= st.runT) { if (st.turn === "me") { var pd = st.pending; st.pending = null; shoot(pd.t, pd.speed, pd.path); } else cpuKick(); }
    if (st.phase === "fly" && now - st.kick.t0 >= st.kick.dur) finishKick();
    // campo
    var sky = c.createLinearGradient(0, 0, 0, g.base); sky.addColorStop(0, "#0E2034"); sky.addColorStop(1, "#21405C"); c.fillStyle = sky; c.fillRect(0, 0, W, g.base);
    c.fillStyle = "#1A2C40"; c.fillRect(0, g.top - H * 0.08, W, H * 0.12);
    for (var i = 0; i < 80; i++) { c.fillStyle = ["#C62828", "#FDD835", "#fff", "#1565C0"][i % 4]; c.globalAlpha = 0.4; c.fillRect((i * 29) % W, g.top - H * 0.07 + (i * 7) % (H * 0.1), 2.5, 2.5); } c.globalAlpha = 1;
    for (var s = 0; s < 8; s++) { c.fillStyle = s % 2 ? "#2E7D32" : "#33873A"; var y0 = G.lerp(g.base - 4, H, s / 8), y1 = G.lerp(g.base - 4, H, (s + 1) / 8); c.fillRect(0, y0, W, y1 - y0 + 1); }
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, g.base); c.lineTo(W, g.base); c.stroke();
    c.beginPath(); c.moveTo(W * 0.02, g.base); c.lineTo(-W * 0.05, H * 0.66); c.lineTo(W * 1.05, H * 0.66); c.lineTo(W * 0.98, g.base); c.stroke();
    c.beginPath(); c.ellipse(g.spotX, g.spotY + 2, 4, 2, 0, 0, G.TAU); c.fillStyle = "#fff"; c.fill();
    // rete
    var net = st.phase === "result" && st.res === "gol" ? Math.max(0, 1 - (now - st.msgT) * 1.5) : 0;
    c.save(); c.strokeStyle = "rgba(255,255,255,.28)"; c.lineWidth = 1;
    for (var nx = 0; nx <= 24; nx++) { var xx = G.lerp(g.gx0, g.gx1, nx / 24); c.beginPath(); c.moveTo(xx, g.top); c.lineTo(xx + (nx - 12) * 0.5, g.base); c.stroke(); }
    for (var ny = 0; ny <= 10; ny++) { var yy = G.lerp(g.top, g.base, ny / 10); c.beginPath(); c.moveTo(g.gx0, yy); c.quadraticCurveTo((g.gx0 + g.gx1) / 2, yy - net * 10, g.gx1, yy); c.stroke(); }
    c.restore();
    // portiere (tu o la CPU)
    var kp = st.keeper, kAv = st.turn === "me" ? cpuAv : G.av, kt = st.kick && kp.t0 ? G.ease((now - kp.t0) / 0.42) : 0;
    var kx = G.lerp(0, kp.tx, kt), ky = G.lerp(0.12, kp.ty, kt), side = kp.tx < -0.15 ? -1 : kp.tx > 0.15 ? 1 : 0;
    var kScale = (g.base - g.top) * 0.82 / 215;
    var kPose = G.P({ al: [-0.9, 0.6], ar: [0.9, -0.6], ll: [-0.25, 0.1], lr: [0.25, -0.1] });
    if (side) kPose = G.mixPose(kPose, G.P({ al: [side * 2.9 - (side > 0 ? 0 : 0), 0], ar: [side * 2.9, 0], ll: [-side * 0.6, 0], lr: [-side * 0.3, 0], rot: side * 1.2 * Math.min(1, ky * 1.4 + 0.3), lift: ky * 110 }), kt);
    else if (kp.tx === 0 && st.kick) kPose = G.mixPose(kPose, G.P({ al: [-1.5, 0.2], ar: [1.5, -0.2], lift: ky * 60 }), kt);
    if (st.phase === "aim" || st.phase === "run") { var sway = Math.sin(now * 3) * 0.06; kx = sway; }
    var kxPix = GX(g, kx), kyPix = g.base - (side ? 0 : 0);
    G.drawGuy(c, kAv, kxPix, kyPix, kScale, kPose, { keeper: true });
    // pali e traversa
    c.strokeStyle = "#F4F4F4"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(g.gx0, g.base); c.lineTo(g.gx0, g.top); c.lineTo(g.gx1, g.top); c.lineTo(g.gx1, g.base); c.stroke();
    // tiratore di schiena
    var shAv = st.turn === "me" ? G.av : cpuAv, shS = H / 420, run = 0;
    if (st.phase === "run") run = 1 - G.clamp((st.runT - now) / (st.turn === "me" ? 0.45 : 0.9), 0, 1);
    else if (st.phase === "fly" || st.phase === "result") run = 1;
    var sx = G.lerp(W * 0.3, W * 0.44, run), sy = G.lerp(H * 0.99, H * 0.93, run), stride = Math.sin(run * 14) * 0.5 * (run < 1 ? 1 : 0);
    var shPose = G.P({ ll: [stride, 0.2], lr: [-stride, -0.2], al: [-0.4 - stride * 0.4, 0.3], ar: [0.4 + stride * 0.4, -0.3] });
    if (st.phase === "fly" || st.phase === "result") { var kk = G.clamp((now - st.kick.t0) / 0.2, 0, 1); shPose = G.P({ lr: [G.lerp(-0.9, 1.1, kk), G.lerp(0.9, 0.1, kk)], ll: [-0.1, 0], al: [-1.3, 0.3], ar: [0.7, -0.4], tilt: -0.12 }); }
    // pallone
    var bx = g.spotX, by = g.spotY - 9, br = 11 * shS * 1.4;
    if (st.kick && (st.phase === "fly" || st.phase === "result")) {
      var ft = G.clamp((now - st.kick.t0) / st.kick.dur, 0, 1), o = st.phase === "result" ? st.res : null;
      var tx = GX(g, st.kick.x), ty = GY(g, st.kick.y) - 8;
      bx = G.lerp(g.spotX, tx, ft); by = G.lerp(g.spotY - 9, ty, ft) - Math.sin(ft * Math.PI) * 25; br = G.lerp(br, br * 0.5, ft);
      if (st.kick.path && !o) {   // tiro disegnato: la palla rifa' la traiettoria coi tempi del dito
        var P = st.kick.path.pts, tt = ft * st.kick.path.dur, j = 1; while (j < P.length - 1 && P[j].t < tt) j++;
        var a0 = P[j - 1], a1 = P[j], kf = a1.t > a0.t ? G.clamp((tt - a0.t) / (a1.t - a0.t), 0, 1) : 1;
        bx = G.lerp(a0.x, a1.x, kf); by = G.lerp(a0.y, a1.y, kf); br = G.lerp(11 * shS * 1.4, 11 * shS * 0.7, G.clamp((g.spotY - by) / (g.spotY - g.base), 0, 1));
      }
      if (o === "parata" || o === "palo" || o === "traversa") { var rt = G.clamp((now - st.msgT) * 1.5, 0, 1); bx = tx + (st.kick.x < 0 ? -1 : 1) * rt * W * 0.25 * (o === "traversa" ? 0.3 : 1); by = ty + rt * (o === "traversa" ? -H * 0.15 : H * 0.12); }
      if (o === "gol") { var gt = G.clamp((now - st.msgT) * 2, 0, 1); by = ty + gt * 6; br *= 1 - gt * 0.15; }
    }
    var ballFirst = by > g.base;   // davanti al portiere solo se gia' in porta: disegno semplice
    G.drawGuy(c, shAv, sx, sy, shS, shPose, { back: true });
    G.drawBall(c, bx, by, br, (st.turn === "me" ? G.av : cpuAv).pallone, st.kick ? (now - st.kick.t0) * 12 : 0);
    // mira mentre trascini
    if (drag && drag.pts) { c.strokeStyle = "#E8A252"; c.lineWidth = 4; c.lineJoin = "round"; c.beginPath(); drag.pts.forEach(function (q, i) { c[i ? "lineTo" : "moveTo"](q.x, q.y); }); c.stroke();
      var left = Math.max(0, 1.5 - (performance.now() - drag.t) / 1000); c.font = "800 14px Archivo"; c.fillStyle = "#E8A252"; c.textAlign = "center"; c.fillText("Disegna il tiro: " + left.toFixed(1) + " s", W / 2, H * 0.72); }
    else if (st.kick && st.kick.path && st.phase === "fly") { c.strokeStyle = "rgba(232,162,82,.35)"; c.lineWidth = 3; c.beginPath(); st.kick.path.pts.forEach(function (q, i) { c[i ? "lineTo" : "moveTo"](q.x, q.y); }); c.stroke(); }
    else if (drag && st.turn === "me" && st.phase === "aim") { c.strokeStyle = "rgba(255,255,255,.7)"; c.setLineDash([6, 6]); c.lineWidth = 3; c.beginPath(); c.moveTo(drag.x, drag.y); c.lineTo(drag.cx, drag.cy); c.stroke(); c.setLineDash([]); }
    if (st.keepTarget && st.turn === "cpu" && st.phase !== "result") { c.strokeStyle = "#E8A252"; c.lineWidth = 3; c.beginPath(); c.arc(GX(g, st.keepTarget.x), GY(g, st.keepTarget.y), 14, 0, G.TAU); c.stroke(); }
    // scritta
    if (st.phase === "result" && st.msg) { var a = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = a; c.font = "800 " + Math.round(W * 0.1) + "px Archivo"; c.textAlign = "center"; c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.55); c.fillStyle = st.msgGood ? "#6FBE92" : "#E08268"; c.fillText(st.msg, W / 2, H * 0.55); c.restore(); }
    if (st.phase === "aim" && st.turn === "me") { c.font = "700 14px Archivo"; c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "center"; if (!drag) c.fillText("Trascina verso la porta · tieni premuto per l'effetto", W / 2, H * 0.72); }
    if (st.turn === "cpu" && st.phase === "run" && !st.keepTarget) { c.font = "700 14px Archivo"; c.fillStyle = "#E8A252"; c.textAlign = "center"; c.fillText("Tocca dove tuffarti!", W / 2, H * 0.55); }
    // fine: esultanza (o delusione) del tuo omino
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, ps = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, ps, {});
    }
  }
  window.Rigori = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.25, 190); },
    frame: frame
  };
})();
