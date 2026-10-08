// StatsFight giochi (10/10): sfida a canestro. Cinque posizioni (sotto canestro, media, tiro libero, tripla
// dall'angolo, tripla frontale): tiri tu, poi la CPU dallo stesso punto; 2 o 3 punti a canestro. Pari dopo 5 giri:
// tiri liberi a oltranza. Tiro: trascina il dito verso l'alto, la direzione e' la mira e la lunghezza la forza; la
// barra a destra mostra la forza e la zona verde quella giusta per quella posizione (piu' stretta per le triple).
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("bcv"), S = null, st = null, cpuAv = null, drag = null;
  // u = lato (-1 sinistra, 1 destra), v = distanza dal fondo (0 linea di fondo .. 1 vicino a te), pow = forza giusta
  var SPOTS = [
    { nome: "Sotto canestro", u: 0.4, v: 0.3, pts: 2, pow: 0.42, cpu: 0.8 },
    { nome: "Media distanza", u: -0.55, v: 0.42, pts: 2, pow: 0.6, cpu: 0.55 },
    { nome: "Tiro libero", u: 0, v: 0.36, pts: 2, pow: 0.56, cpu: 0.7 },
    { nome: "Tripla dall'angolo", u: 0.95, v: 0.1, pts: 3, pow: 0.78, cpu: 0.4 },
    { nome: "Tripla frontale", u: 0, v: 0.85, pts: 3, pow: 0.9, cpu: 0.38 }
  ];
  var FT = SPOTS[2];
  function newGame() {
    cpuAv = G.randomAv();
    st = { round: 0, turn: "me", me: 0, cpu: 0, log: [], phase: "aim", shot: null, msg: "", msgT: 0, celebrate: null, extra: false };
    $("bover").hidden = true; startTurn();
  }
  function spot() { return st.extra ? FT : SPOTS[Math.min(st.round, SPOTS.length - 1)]; }
  function hud() {
    $("bme").textContent = G.av.nome || "Tu"; $("bcpu").textContent = "CPU";
    $("bsc").textContent = st.me + " - " + st.cpu;
    var sp = spot();
    $("bhelp").textContent = (st.extra ? "Pari: tiri liberi a oltranza. " : "Giro " + (st.round + 1) + " di " + SPOTS.length + ": " + sp.nome + " (" + sp.pts + " punti). ")
      + (st.turn === "me" ? "Trascina il dito verso l'alto: la direzione è la mira, la lunghezza è la forza. Fermati nella zona verde della barra." : "Tira la CPU dallo stesso punto.");
  }
  function startTurn() {
    st.phase = "aim"; st.shot = null; hud();
    if (st.turn === "cpu") { st.phase = "wait"; st.waitT = performance.now() / 1000 + 0.9; }
  }
  // geometria dello schermo
  function geo() {
    var W = S.W, H = S.H;
    return { W: W, H: H, rimX: W / 2, rimY: H * 0.3, rimR: W * 0.085, base: H * 0.46 };
  }
  function court(g, u, v) { var hw = G.lerp(g.W * 0.27, g.W * 0.56, v); return { x: g.W / 2 + u * hw, y: G.lerp(g.H * 0.5, g.H * 0.97, v), s: G.lerp(0.42, 0.78, v) * g.H / 430 }; }
  function hands(g, sp) { var p = court(g, sp.u, sp.v); return { x: p.x + 2 * p.s, y: p.y - 232 * p.s, r: 13 * p.s * 1.25, s: p.s, px: p.x, py: p.y }; }
  // direzione giusta del dito: verso il ferro, contando un'altezza fissa (la palla parte spesso alla quota del ferro)
  function aimTo(g, h) { return Math.atan2(g.rimX - h.x, g.H * 0.4); }
  function tolP(sp) { return sp.pts === 3 ? 0.045 : 0.06; }
  var TOL_A = 0.085;   // radianti di errore di mira che portano al bordo del ferro
  // esito dagli errori (in unita' di tolleranza: 1 = bordo del ferro)
  function judge(ae, pe) {
    var e = Math.hypot(ae, pe);
    if (e < 0.45) return { r: "ciuff", dentro: true };
    if (e < 1) return Math.random() < 1 - e * 0.55 ? { r: "ferro_dentro", dentro: true } : { r: "ferro", dentro: false };
    if (pe > 1 && Math.abs(ae) < 1.3) return Math.random() < 0.35 ? { r: "tabella", dentro: true } : { r: "tabellone", dentro: false };
    if (pe < -1.6) return { r: "air", dentro: false };
    return { r: "fuori", dentro: false };
  }
  function release(ae, pe, res) {
    var sp = spot(), now = performance.now() / 1000;
    st.shot = { ae: ae, pe: pe, res: res, t0: now, dur: 0.75 + 0.3 * sp.pow };
    st.phase = "fly";
  }
  function cpuShoot() {
    var sp = spot(), dentro = Math.random() < sp.cpu, ae, pe, res;
    for (var i = 0; i < 40; i++) {   // errori finti coerenti con l'esito scelto
      var k = dentro ? G.rnd(0, 0.95) : G.rnd(0.9, 2.2), a = G.rnd(0, G.TAU);
      ae = Math.cos(a) * k; pe = Math.sin(a) * k; res = judge(ae, pe);
      if (res.dentro === dentro) break;
    }
    release(ae, pe, res);
  }
  function finishShot() {
    var sp = spot(), r = st.shot.res, mine = st.turn === "me";
    if (r.dentro) { if (mine) st.me += sp.pts; else st.cpu += sp.pts; }
    st.msg = { ciuff: "Ciuff!", ferro_dentro: "Dentro dopo il ferro", tabella: "Di tabella!", ferro: "Ferro!", tabellone: "Lungo sul tabellone", air: "Air ball!", fuori: "Fuori!" }[r.r]
      + (r.dentro ? " +" + sp.pts : "");
    st.msgGood = mine === r.dentro; st.msgT = performance.now() / 1000; st.phase = "result"; hud();
    setTimeout(next, 1500);
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
    var nuovi = win ? UI.onWin("basket") : (G.pg.giocate++, G.savePg(), []);
    $("bover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="bagain">Rivincita</button>';
    $("bover").style.justifyContent = "flex-end"; $("bover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("bover").hidden = false;
    $("bagain").onclick = newGame;
  }

  // ------------------------------------------------------------------ comandi
  function power(d) { return G.clamp(Math.hypot(d.dx, d.dy) / (S.H * 0.5), 0, 1.3); }
  cv.addEventListener("pointerdown", function (e) {
    if (!st || st.turn !== "me" || st.phase !== "aim") return;
    var p = G.pt(cv, e); drag = { x: p.x, y: p.y, dx: 0, dy: 0 };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener("pointermove", function (e) { if (!drag) return; var p = G.pt(cv, e); drag.dx = p.x - drag.x; drag.dy = p.y - drag.y; });
  cv.addEventListener("pointerup", function (e) {
    if (!drag || !st) return; var d = drag; drag = null;
    if (st.turn !== "me" || st.phase !== "aim" || d.dy > -20) return;
    var g = geo(), sp = spot(), h = hands(g, sp);
    var want = aimTo(g, h), got = Math.atan2(d.dx, -d.dy);   // 0 = dritto in su
    var ae = (got - want) / TOL_A, pe = (power(d) - sp.pow) / tolP(sp);
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
  function arena(c, g) {
    var W = g.W, H = g.H, sky = c.createLinearGradient(0, 0, 0, g.base); sky.addColorStop(0, "#07090D"); sky.addColorStop(1, "#141B26"); c.fillStyle = sky; c.fillRect(0, 0, W, g.base);
    for (var row = 0; row < 9; row++) {   // tribune
      var y = H * 0.12 + row * H * 0.037, a = 0.25 + row * 0.07;
      for (var i = 0; i < 46; i++) { c.globalAlpha = a; c.fillStyle = ["#8E9AAA", "#5D6878", "#B54A4A", "#C9CED6", "#3E4A5C"][(i * 7 + row * 3) % 5]; c.beginPath(); c.arc((i + (row % 2) * 0.5) * W / 45, y, W * 0.009, 0, G.TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    c.fillStyle = "#16306B"; c.fillRect(0, H * 0.075, W, H * 0.022); c.fillStyle = "#B3202E"; c.fillRect(W * 0.62, H * 0.075, W * 0.38, H * 0.022);
    c.fillStyle = "rgba(255,255,255,.75)"; c.font = "700 " + Math.round(H * 0.013) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("STATSFIGHT ARENA", W * 0.3, H * 0.086);
    // parquet in prospettiva
    var fl = c.createLinearGradient(0, g.base, 0, H); fl.addColorStop(0, "#C99F6E"); fl.addColorStop(1, "#E3C095"); c.fillStyle = fl; c.fillRect(0, g.base, W, H - g.base);
    c.strokeStyle = "rgba(120,80,40,.18)"; c.lineWidth = 1;
    for (var k = -12; k <= 12; k++) { c.beginPath(); c.moveTo(W / 2 + k * W * 0.05, g.base); c.lineTo(W / 2 + k * W * 0.16, H); c.stroke(); }
    // area (vernice) e linee
    var ft = court(g, 0, FT.v), kb = court(g, 0, 0);
    c.fillStyle = "#1C8C8A"; c.beginPath(); c.moveTo(W * 0.38, g.base + 2); c.lineTo(W * 0.62, g.base + 2); c.lineTo(W / 2 + W * 0.17, ft.y); c.lineTo(W / 2 - W * 0.17, ft.y); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.5; c.stroke();
    c.beginPath(); c.moveTo(0, g.base + 2); c.lineTo(W, g.base + 2); c.stroke();
    c.beginPath(); c.ellipse(W / 2, ft.y, W * 0.17, H * 0.035, 0, 0, Math.PI); c.stroke();
    c.setLineDash([6, 6]); c.beginPath(); c.ellipse(W / 2, ft.y, W * 0.17, H * 0.035, 0, Math.PI, G.TAU); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.ellipse(W / 2, kb.y - 2, W * 0.5, H * 0.42, 0, 0.02, Math.PI - 0.02); c.stroke();   // linea da tre
  }
  function hoopBack(c, g, sway) {
    var W = g.W, H = g.H, bx = g.rimX, bw = W * 0.36, top = g.rimY - H * 0.16, bot = g.rimY + H * 0.012;
    // sostegno dietro al tabellone
    c.fillStyle = "#9AA3AD"; c.fillRect(bx - 4, bot, 8, g.base - bot - 4);
    c.fillStyle = "#C62828"; c.fillRect(bx - W * 0.06, g.base - H * 0.05, W * 0.12, H * 0.05);
    c.fillStyle = "rgba(20,24,30,.55)"; c.fillRect(bx - bw / 2, top, bw, bot - top);
    c.strokeStyle = "#F4F4F4"; c.lineWidth = 4; c.strokeRect(bx - bw / 2, top, bw, bot - top);
    c.lineWidth = 3; c.strokeRect(bx - W * 0.07, g.rimY - H * 0.07, W * 0.14, H * 0.06);
    // ferro dietro
    c.strokeStyle = "#D84315"; c.lineWidth = 3; c.beginPath(); c.ellipse(g.rimX, g.rimY, g.rimR, g.rimR * 0.28, 0, Math.PI, G.TAU); c.stroke();
  }
  function hoopFront(c, g, sway) {
    var r = g.rimR, y = g.rimY, nh = g.H * 0.075;
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.2;
    for (var i = 0; i <= 8; i++) {   // rete
      var a = Math.PI * i / 8, x0 = g.rimX + Math.cos(a) * r, x1 = g.rimX + Math.cos(a) * r * 0.55 + sway * 6;
      c.beginPath(); c.moveTo(x0, y + Math.sin(a) * r * 0.28); c.lineTo(x1, y + nh); c.stroke();
    }
    for (var j = 1; j <= 3; j++) { var f = j / 3.4; c.beginPath(); c.ellipse(g.rimX + sway * 6 * f, y + nh * f, r * (1 - 0.45 * f), r * 0.2, 0, 0, Math.PI); c.stroke(); }
    c.strokeStyle = "#E64A19"; c.lineWidth = 3.5; c.beginPath(); c.ellipse(g.rimX, y, r, r * 0.28, 0, 0, Math.PI); c.stroke();
  }
  // posizione della palla in volo e dopo
  function ballAt(g, now) {
    var sp = spot(), h = hands(g, sp), sh = st.shot;
    if (!sh) return { x: h.x, y: h.y, r: h.r, rot: 0, behind: false };
    var t = G.clamp((now - sh.t0) / sh.dur, 0, 1);
    var ex = g.rimX + G.clamp(sh.ae, -3.5, 3.5) * g.rimR * 0.95, ey = g.rimY - 4 - G.clamp(sh.pe, -3, 3) * g.rimR * 0.45;
    var rEnd = g.rimR * 0.42, apex = g.H * 0.24 + (1 - sp.v) * g.H * 0.05;
    var x = G.lerp(h.x, ex, t), y = G.lerp(h.y, ey, t) - 4 * apex * t * (1 - t), r = G.lerp(h.r, rEnd, Math.sqrt(t));
    var res = st.phase === "result" ? sh.res.r : null, rt = res ? G.clamp((now - st.msgT) / 0.9, 0, 1) : 0, side = sh.ae < 0 ? -1 : 1;
    if (!res) return { x: x, y: y, r: r, rot: t * 9, behind: false };
    if (res === "ciuff" || res === "ferro_dentro" || res === "tabella") {
      var wob = res === "ferro_dentro" ? Math.sin(rt * 18) * (1 - rt) * g.rimR * 0.5 : 0, dy0 = res === "tabella" ? -g.rimR * 0.4 * (1 - rt) : 0;
      return { x: g.rimX + wob, y: g.rimY - 2 + dy0 + rt * rt * g.H * 0.2, r: rEnd, rot: 9 + rt * 4, behind: true };
    }
    if (res === "ferro") return { x: ex + side * rt * g.W * 0.28, y: ey - Math.sin(rt * Math.PI) * g.H * 0.07 + rt * g.H * 0.16, r: rEnd * (1 + rt * 0.3), rot: 9 + rt * 6, behind: false };
    if (res === "tabellone") return { x: ex + side * rt * g.W * 0.12, y: ey + rt * g.H * 0.3, r: rEnd * (1 + rt * 0.8), rot: 9 - rt * 6, behind: false };
    return { x: ex + side * rt * g.W * 0.05, y: ey + rt * g.H * 0.22, r: rEnd * (1 + rt * 0.2), rot: 9 + rt * 3, behind: false };
  }
  function frame() {
    if (!S || !st) return;
    var c = S.c, g = geo(), W = g.W, H = g.H, now = performance.now() / 1000, sp = spot();
    if (st.phase === "wait" && now >= st.waitT) cpuShoot();
    if (st.phase === "fly" && now - st.shot.t0 >= st.shot.dur) finishShot();
    var inNet = st.phase === "result" && st.shot && st.shot.res.dentro, sway = inNet ? Math.sin((now - st.msgT) * 14) * Math.max(0, 1 - (now - st.msgT) * 1.4) : 0;
    arena(c, g); hoopBack(c, g, sway);
    var b = ballAt(g, now);
    if (b.behind) ball(c, b.x, b.y, b.r, b.rot);
    hoopFront(c, g, sway);
    // tiratore di schiena: braccia su col pallone, poi il rilascio con un saltino
    var p = court(g, sp.u, sp.v), av = st.turn === "me" ? G.av : cpuAv, rel = st.shot ? G.clamp((now - st.shot.t0) / 0.25, 0, 1) : 0;
    var jump = st.shot ? Math.sin(Math.min(1, (now - st.shot.t0) / 0.5) * Math.PI) * 18 : 0;
    var pose = st.shot ? G.P({ al: [-2.95, 0.05], ar: [2.95, -0.05], lift: jump, ll: [-0.1, 0.25], lr: [0.1, -0.25] })
      : G.P({ al: [-2.75, 0.35], ar: [2.75, -0.35], ll: [-0.1, 0.2], lr: [0.12, -0.2] });
    if (st.phase !== "end") G.drawGuy(c, av, p.x, p.y, p.s, pose, { back: true });
    if (!b.behind && st.phase !== "end") ball(c, b.x, b.y - (st.shot ? 0 : jump * p.s), b.r, b.rot);
    // mira e forza mentre trascini
    if (drag && drag.dy < -5) {
      var h = hands(g, sp), pw = power(drag), L = H * 0.3;
      var ang = Math.atan2(drag.dx, -drag.dy);
      c.strokeStyle = "rgba(255,255,255,.75)"; c.setLineDash([6, 6]); c.lineWidth = 3; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.sin(ang) * L, h.y - Math.cos(ang) * L); c.stroke(); c.setLineDash([]);
      var bx = W - 22, by0 = H * 0.86, bh = H * 0.5, k = 1 / 1.3;
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(bx - 7, by0 - bh, 14, bh);
      c.fillStyle = "#6FBE92"; c.fillRect(bx - 7, by0 - bh * (sp.pow + tolP(sp)) * k, 14, bh * 2 * tolP(sp) * k);
      c.fillStyle = pw > sp.pow + tolP(sp) ? "#E08268" : "#E8A252"; c.fillRect(bx - 4, by0 - bh * pw * k, 8, bh * pw * k);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1.5; c.strokeRect(bx - 7, by0 - bh, 14, bh);
    }
    if (st.phase === "aim" && st.turn === "me" && !drag) {
      var hh = hands(g, sp), pulse = 0.5 + 0.5 * Math.sin(now * 5);
      c.strokeStyle = "rgba(255,213,79," + (0.4 + 0.5 * pulse) + ")"; c.lineWidth = 4;
      for (var i = 0; i < 3; i++) { var yy = hh.y - H * 0.06 - i * H * 0.03; c.beginPath(); c.moveTo(hh.x - 10, yy + 8); c.lineTo(hh.x, yy); c.lineTo(hh.x + 10, yy + 8); c.stroke(); }
      c.font = "800 " + Math.round(W * 0.06) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,.6)";
      var lbl = sp.nome + " · " + sp.pts + " punti"; c.strokeText(lbl, W / 2, H * 0.94); c.fillStyle = "#FFD54F"; c.fillText(lbl, W / 2, H * 0.94);
    }
    if (st.phase === "wait") { c.font = "700 14px Archivo"; c.fillStyle = "#E8A252"; c.textAlign = "center"; c.fillText("Tira la CPU", W / 2, H * 0.52); }
    if (st.phase === "result" && st.msg) {
      var a = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = a; c.font = "800 " + Math.round(W * 0.09) + "px Archivo"; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(st.msg, W / 2, H * 0.55); c.fillStyle = st.msgGood ? "#6FBE92" : "#E08268"; c.fillText(st.msg, W / 2, H * 0.55); c.restore();
    }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, ps = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.72, H / 330, ps, {});
    }
  }
  window.Basket = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.25, 190); },
    frame: frame,
    _st: function () { return st; }, _spot: function () { var g = geo(), sp = spot(), h = hands(g, sp); return { want: aimTo(g, h), len: sp.pow * S.H * 0.5 }; }
  };
})();
