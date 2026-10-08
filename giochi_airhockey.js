// StatsFight giochi (10/10): air hockey, tavolo visto dall'alto. La tua racchetta (in basso) segue il dito nella tua
// meta' campo; quella della CPU difende e attacca da sola. Vince chi arriva a 7 gol. Sulle racchette c'e' la faccia
// del tuo omino e di quello della CPU.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var cv = $("hcv"), S = null, st = null, cpuAv = null, finger = null;
  var WIN_AT = 7;
  function newGame() {
    cpuAv = G.randomAv();
    st = { me: 0, cpu: 0, phase: "play", msg: "", msgT: 0, celebrate: null, last: null };
    place("me"); $("hover").hidden = true; hud();
  }
  function hud() {
    $("hme").textContent = G.av.nome || "Tu"; $("hcpu").textContent = "CPU"; $("hsc").textContent = st.me + " - " + st.cpu;
    $("hhelp").textContent = "Trascina il dito: la tua racchetta lo segue nella tua metà del tavolo. Colpisci il dischetto e mandalo nella porta in alto. Vince chi arriva a " + WIN_AT + " gol.";
  }
  // misure in frazioni della larghezza W del tavolo
  function D() { var W = S.W, H = S.H; return { W: W, H: H, puckR: W * 0.045, malR: W * 0.075, goal: W * 0.34, m: W * 0.04 }; }
  function place(side) {   // dopo un gol il dischetto riparte fermo nella meta' di chi ha subito
    var d = D(); st.puck = { x: d.W / 2, y: side === "me" ? d.H * 0.62 : d.H * 0.38, vx: 0, vy: 0 };
    st.my = st.my || { x: d.W / 2, y: d.H * 0.85, vx: 0, vy: 0 }; st.cpuM = st.cpuM || { x: d.W / 2, y: d.H * 0.15, vx: 0, vy: 0 };
    st.my.x = d.W / 2; st.my.y = d.H * 0.85; st.cpuM.x = d.W / 2; st.cpuM.y = d.H * 0.15;
  }
  function goal(who) {
    if (who === "me") st.me++; else st.cpu++;
    if (window.SFX) { SFX.play("sirena"); SFX.play(who === "me" ? "folla" : "delusione", 0.2); }
    st.msg = who === "me" ? "Gol!" : "Gol della CPU"; st.msgGood = who === "me"; st.msgT = performance.now() / 1000; st.phase = "goal"; hud();
    setTimeout(function () { if (st.me >= WIN_AT || st.cpu >= WIN_AT) return end(); place(who === "me" ? "cpu" : "me"); st.phase = "play"; }, 1200);
  }
  function end() {
    var win = st.me > st.cpu;
    st.phase = "end"; st.celebrate = { win: win, t0: performance.now() / 1000 };
    if (window.SFX) SFX.play(win ? "vittoria" : "sconfitta");
    var nuovi = UI.onEnd("airhockey", win);
    $("hover").innerHTML = '<div style="margin-top:auto"></div><b>' + (win ? "Hai vinto " : "Hai perso ") + st.me + "-" + st.cpu + '</b>'
      + (nuovi.length ? '<div class="k">' + nuovi.join(" · ") + '</div>' : "") + '<button class="primary" type="button" id="hagain">Rivincita</button>';
    $("hover").style.justifyContent = "flex-end"; $("hover").style.background = "linear-gradient(transparent 55%, rgba(8,14,18,.85))"; $("hover").hidden = false;
    $("hagain").onclick = newGame;
  }
  // ------------------------------------------------------------------ comandi
  cv.addEventListener("pointerdown", function (e) { finger = G.pt(cv, e); try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", function (e) { if (finger) finger = G.pt(cv, e); });
  ["pointerup", "pointercancel"].forEach(function (n) { cv.addEventListener(n, function () { finger = null; }); });
  // ------------------------------------------------------------------ fisica
  function moveMallet(m, tx, ty, vmax, dt, yMin, yMax) {
    var d = D(); tx = G.clamp(tx, d.m + d.malR, d.W - d.m - d.malR); ty = G.clamp(ty, yMin, yMax);
    var dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy), k = l > vmax * dt ? vmax * dt / l : 1;
    m.vx = dx * k / dt; m.vy = dy * k / dt; m.x += dx * k; m.y += dy * k;
  }
  function hit(m) {
    var p = st.puck, d = D(), dx = p.x - m.x, dy = p.y - m.y, l = Math.hypot(dx, dy), min = d.puckR + d.malR;
    if (l >= min || l === 0) return;
    var nx = dx / l, ny = dy / l; p.x = m.x + nx * min; p.y = m.y + ny * min;   // fuori dalla racchetta
    var rvx = p.vx - m.vx, rvy = p.vy - m.vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { p.vx -= 1.9 * vn * nx; p.vy -= 1.9 * vn * ny; if (window.SFX && -vn > d.W * 0.3) SFX.play("disco"); }
    var sp = Math.hypot(p.vx, p.vy), max = d.W * 4.2; if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  }
  function physics(dt) {
    var d = D(), p = st.puck, now = performance.now() / 1000;
    // la tua racchetta segue il dito (un po' sopra, per vederla sotto il dito)
    if (finger) moveMallet(st.my, finger.x, finger.y - d.W * 0.06, d.W * 6, dt, d.H / 2 + d.malR, d.H - d.m - d.malR);
    else { st.my.vx = 0; st.my.vy = 0; }
    // CPU: se il dischetto e' nella sua meta' lo attacca da dietro, altrimenti difende la porta seguendolo
    var c = st.cpuM, lvl = 0.55 + Math.min(0.35, (st.me - st.cpu + 3) * 0.05), tx, ty;
    if (p.y < d.H / 2 && (p.vy < d.W * 0.6)) {   // attacco: si mette dietro al dischetto (rispetto alla tua porta) e lo colpisce
      var gx = d.W / 2 - p.x, gy = d.H - p.y, gl = Math.hypot(gx, gy); gx /= gl; gy /= gl;
      var bx = p.x - gx * (d.malR + d.puckR) * 1.1, by = p.y - gy * (d.malR + d.puckR) * 1.1;
      if (by < d.m + d.malR + 2 || Math.hypot(c.x - bx, c.y - by) < d.W * 0.03) { tx = p.x + gx * d.W * 0.1; ty = p.y + gy * d.W * 0.1; }
      else { tx = bx; ty = by; }
    }
    else { tx = d.W / 2 + (p.x - d.W / 2) * 0.55; ty = d.H * 0.12; }
    moveMallet(c, tx, ty, d.W * 3.4 * lvl, dt, d.m + d.malR, d.H / 2 - d.malR);
    var steps = 4; for (var i = 0; i < steps; i++) {
      var h = dt / steps; p.x += p.vx * h; p.y += p.vy * h;
      hit(st.my); hit(c);   // prima le racchette, poi le sponde: il dischetto non esce mai dal tavolo
      var L = d.m + d.puckR, R = d.W - d.m - d.puckR, inGoal = Math.abs(p.x - d.W / 2) < d.goal / 2 - d.puckR * 0.3;
      if (p.x < L) { p.x = L; p.vx = Math.abs(p.vx) * 0.9; } if (p.x > R) { p.x = R; p.vx = -Math.abs(p.vx) * 0.9; }
      if (p.y < d.m + d.puckR && !inGoal) { p.y = d.m + d.puckR; p.vy = Math.abs(p.vy) * 0.9; }
      if (p.y > d.H - d.m - d.puckR && !inGoal) { p.y = d.H - d.m - d.puckR; p.vy = -Math.abs(p.vy) * 0.9; }
      if (p.y < -d.puckR) return goal("me");
      if (p.y > d.H + d.puckR) return goal("cpu");
    }
    var fr = Math.pow(0.75, dt); p.vx *= fr; p.vy *= fr;
    // dischetto quasi fermo contro una sponda per piu' di un secondo: il soffio del tavolo lo stacca verso il centro
    var slow = Math.hypot(p.vx, p.vy) < d.W * 0.05, edge = p.x < d.m + d.puckR * 1.5 || p.x > d.W - d.m - d.puckR * 1.5 || p.y < d.m + d.puckR * 1.5 || p.y > d.H - d.m - d.puckR * 1.5;
    st.stuck = slow && edge ? (st.stuck || 0) + dt : 0;
    if (st.stuck > 1.2) { p.vx += (d.W / 2 - p.x) * 1.5; p.vy += (d.H / 2 - p.y) * 0.8; st.stuck = 0; }
    if (!isFinite(p.x + p.y + p.vx + p.vy)) place(p.y < d.H / 2 ? "cpu" : "me");
    // dischetto fermo troppo a lungo nella meta' della CPU: la CPU ci va sopra (lo fa gia'); nella tua: niente
  }
  // ------------------------------------------------------------------ disegno
  function mallet(c, m, av, col, r) {
    c.beginPath(); c.arc(m.x + 3, m.y + 4, r, 0, G.TAU); c.fillStyle = "rgba(0,0,0,.25)"; c.fill();
    c.beginPath(); c.arc(m.x, m.y, r, 0, G.TAU); c.fillStyle = col; c.fill();
    c.beginPath(); c.arc(m.x, m.y, r * 0.78, 0, G.TAU); c.fillStyle = G.shade(col, -0.25); c.fill();
    // la faccia dell'omino dentro la racchetta
    c.save(); c.beginPath(); c.arc(m.x, m.y, r * 0.72, 0, G.TAU); c.clip();
    c.fillStyle = "rgba(255,255,255,.18)"; c.fill();
    var s = r * 0.62 / 25, hf = { bassa: 0.86, alta: 1.13 }[av.statura] || 1;
    G.drawGuy(c, av, m.x, m.y + (40 + 144 * hf) * s + r * 0.12, s, G.P({}), { noShadow: true });
    c.restore();
    c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(m.x, m.y, r, 0, G.TAU); c.stroke();
  }
  function frame() {
    if (!S || !st) return;
    var c = S.c, d = D(), W = d.W, H = d.H, now = performance.now() / 1000, dt = Math.min(0.033, now - (st.last || now)); st.last = now;
    if (st.phase === "play" && dt > 0.001) physics(dt);   // due frame nello stesso millisecondo: niente divisioni per zero
    // tavolo
    c.fillStyle = "#24313C"; c.fillRect(0, 0, W, H);
    G.rr(c, d.m * 0.4, d.m * 0.4, W - d.m * 0.8, H - d.m * 0.8, W * 0.08); c.fillStyle = "#3A5068"; c.fill();
    G.rr(c, d.m, d.m, W - 2 * d.m, H - 2 * d.m, W * 0.06); var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#D9EAF5"); g.addColorStop(1, "#C3DBEC"); c.fillStyle = g; c.fill();
    c.fillStyle = "rgba(60,90,120,.18)"; for (var y = d.m + 10; y < H - d.m; y += 14) for (var x = d.m + 10; x < W - d.m; x += 14) c.fillRect(x, y, 1.6, 1.6);
    c.strokeStyle = "#C62828"; c.lineWidth = 3; c.beginPath(); c.moveTo(d.m, H / 2); c.lineTo(W - d.m, H / 2); c.stroke();
    c.beginPath(); c.arc(W / 2, H / 2, W * 0.16, 0, G.TAU); c.stroke();
    c.strokeStyle = "#1565C0"; c.lineWidth = 2.5; c.beginPath(); c.arc(W / 2, d.m, d.goal * 0.75, 0, Math.PI); c.stroke(); c.beginPath(); c.arc(W / 2, H - d.m, d.goal * 0.75, Math.PI, G.TAU); c.stroke();
    c.fillStyle = "#11171D"; c.fillRect(W / 2 - d.goal / 2, 0, d.goal, d.m + 2); c.fillRect(W / 2 - d.goal / 2, H - d.m - 2, d.goal, d.m + 2);
    // dischetto e racchette
    var p = st.puck;
    if (p) { c.beginPath(); c.arc(p.x + 2, p.y + 3, d.puckR, 0, G.TAU); c.fillStyle = "rgba(0,0,0,.25)"; c.fill(); c.beginPath(); c.arc(p.x, p.y, d.puckR, 0, G.TAU); c.fillStyle = "#1C1F24"; c.fill(); c.strokeStyle = "#555"; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, d.puckR * 0.6, 0, G.TAU); c.stroke(); }
    mallet(c, st.cpuM, cpuAv, G.COLORI[cpuAv.c1] || "#1565C0", d.malR);
    mallet(c, st.my, G.av, G.COLORI[G.av.c1] || "#C62828", d.malR);
    c.textAlign = "center"; c.textBaseline = "middle";
    if (!finger && st.phase === "play" && st.me + st.cpu === 0 && Math.hypot(p.vx, p.vy) < 1) { c.font = "800 " + Math.round(W * 0.05) + "px Archivo"; c.fillStyle = "#1D3B5C"; c.fillText("Trascina la tua racchetta", W / 2, H * 0.7); }
    if (st.phase === "goal") { var al = Math.min(1, (now - st.msgT) * 4); c.save(); c.globalAlpha = al; c.font = "800 " + Math.round(W * 0.11) + "px Archivo"; c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.5)"; c.strokeText(st.msg, W / 2, H / 2); c.fillStyle = st.msgGood ? "#2E9E5B" : "#D9534F"; c.fillText(st.msg, W / 2, H / 2); c.restore(); }
    if (st.phase === "end") {
      c.fillStyle = "rgba(8,14,18,.55)"; c.fillRect(0, 0, W, H);
      var ct = now - st.celebrate.t0, pz = st.celebrate.win ? G.poseOf(G.av.esulta, ct) : G.SAD(ct);
      G.drawGuy(c, G.av, W / 2, H * 0.68, H / 380, pz, {});
    }
  }
  window.Airhockey = {
    show: function () { if (!st) newGame(); else hud(); },
    resize: function () { S = G.setup(cv, 1.45, 190); if (st) place("me"); },
    frame: frame,
    _st: function () { return st; }
  };
})();
