// StatsFight giochi (prototipo 09/10): avatar a figura intera, foto profilo, rigori e tennis. Vedi giochi.html.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function load(k, d) { try { var x = JSON.parse(localStorage.getItem(k)); return x == null ? d : x; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(function () { el.classList.remove("on"); }, 1800); }

  // ------------------------------------------------------------------ catalogo (need = vittorie per sbloccare)
  var PELLE = ["#F6D7B8", "#EDC09A", "#D9A273", "#B97F51", "#8D5A35", "#5E3B22"];
  var CAPELLI_COL = ["#1E1712", "#4A2E1B", "#7A4B26", "#B7782F", "#E2C27A", "#B8B8B8", "#C0392B", "#2F6FB5"];
  var COLORI = ["#E8E8E8", "#1C1F24", "#C62828", "#1565C0", "#2E7D32", "#F9A825", "#6A1B9A", "#00838F", "#EF6C00", "#AD1457", "#5D4037", "#90CAF9"];
  var CAT = {
    capelli: [["corti", "Corti", 0], ["rasati", "Rasati", 0], ["frangia", "Frangia", 0], ["ricci", "Ricci", 0], ["lunghi", "Lunghi", 0], ["coda", "Coda", 1], ["cresta", "Cresta", 3], ["afro", "Afro", 2], ["calvo", "Calvo", 0]],
    barba: [["no", "Niente", 0], ["corta", "Corta", 0], ["baffi", "Baffi", 1], ["piena", "Piena", 2]],
    maglia: [["maglia", "Maglia", 0], ["strisce", "Strisce", 0], ["righe", "Righe", 1], ["meta", "Metà e metà", 2], ["banda", "Banda", 3], ["polo", "Polo tennis", 0], ["canotta", "Canotta", 1], ["felpa", "Felpa", 2], ["cappuccio", "Felpa col cappuccio", 4], ["tuta", "Giacca tuta", 5], ["portiere", "Maglia portiere", 6]],
    cappello: [["no", "Niente", 0], ["cappellino", "Cappellino", 0], ["rovescio", "Cappellino al contrario", 2], ["berretto", "Berretto di lana", 1], ["fascia", "Fascia", 0], ["bandana", "Bandana", 3], ["visiera", "Visiera", 2], ["corona", "Corona", 15]],
    accessorio: [["no", "Niente", 0], ["occhiali", "Occhiali da sole", 2], ["polsini", "Polsini", 1], ["capitano", "Fascia da capitano", 5], ["collana", "Catenina", 8]],
    scarpe: [["scarpini", "Scarpini", 0], ["tennis", "Scarpe da tennis", 0], ["oro", "Scarpini d'oro", 12]],
    pallone: [["classico", "Classico", 0], ["retro", "Cuoio anni '70", 1], ["notte", "Notturno", 3], ["arcobaleno", "Arcobaleno", 5], ["stelle", "Stelle", 7], ["fiamme", "Fiamme", 10], ["oro", "Pallone d'oro", 20]],
    racchetta: [["classica", "Classica", 0], ["rossa", "Rossa", 1], ["blu", "Blu", 2], ["legno", "Legno vintage", 4], ["neon", "Neon", 6], ["carbonio", "Carbonio", 9], ["oro", "Racchetta d'oro", 20]],
    guanti: [["verdi", "Verdi", 0], ["arancio", "Arancio", 2], ["rosa", "Rosa", 4], ["neri", "Neri e oro", 8]],
    posa: [["piedi", "In piedi", 0], ["saluto", "Saluto", 0], ["conserte", "Braccia conserte", 0], ["sottobraccio", "Pallone sotto il braccio", 0], ["spalla", "Racchetta in spalla", 0], ["palleggio", "Palleggio", 2], ["cielo", "Dito al cielo", 3], ["fianchi", "Mani sui fianchi", 1], ["pollice", "Pollice su", 4]],
    esulta: [["salto", "Salto di gioia", 0], ["braccia", "Braccia al cielo", 0], ["aereo", "Aeroplano", 2], ["ballo", "Ballo", 4], ["pugno", "Pugno", 1], ["inchino", "Inchino", 6], ["giro", "Giravolta", 9], ["trofeo", "Coppa alzata", 14]]
  };
  var AV_DEF = { pelle: 1, capelli: "corti", capCol: 1, barba: "no", maglia: "maglia", c1: 2, c2: 0, pant: 1, calze: 0, scarpe: "scarpini", scCol: 1, cappello: "no", hatCol: 3, accessorio: "no",
                 pallone: "classico", racchetta: "classica", guanti: "verdi", posa: "piedi", esulta: "salto", nome: "", num: 10 };
  var av = Object.assign({}, AV_DEF, load("statsight.avatar2", {}));
  var pg = Object.assign({ rigori: 0, tennis: 0, giocate: 0, tutto: false }, load("statsight.giochi", {}));
  function wins() { return pg.rigori + pg.tennis; }
  function unlocked(cat, id) { if (pg.tutto) return true; var it = CAT[cat].filter(function (x) { return x[0] === id; })[0]; return !it || wins() >= it[2]; }
  function saveAv() { save("statsight.avatar2", av); }
  function savePg() { save("statsight.giochi", pg); }

  // ------------------------------------------------------------------ disegno: pallone e racchetta
  function drawBall(c, x, y, r, id, rot) {
    id = id || "classico"; rot = rot || 0;
    c.save(); c.translate(x, y); c.rotate(rot);
    var base = { classico: "#FAFAFA", retro: "#8B5A2B", notte: "#14171C", arcobaleno: "#FFFFFF", stelle: "#1B2A6B", fiamme: "#FFF3E0", oro: "#F2C230" }[id] || "#FAFAFA";
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = base; c.fill();
    c.save(); c.clip();
    if (id === "arcobaleno") { ["#E53935", "#FB8C00", "#FDD835", "#43A047", "#1E88E5", "#8E24AA"].forEach(function (col, i) { c.fillStyle = col; c.fillRect(-r + i * r / 3, -r, r / 3 + 0.5, 2 * r); }); }
    if (id === "fiamme") { c.fillStyle = "#FF7043"; for (var i = 0; i < 5; i++) { c.beginPath(); var a = i / 5 * TAU; c.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); c.quadraticCurveTo(Math.cos(a + 0.5) * r, Math.sin(a + 0.5) * r, Math.cos(a + 0.2) * r * 1.1, Math.sin(a + 0.2) * r * 1.1); c.quadraticCurveTo(Math.cos(a - 0.1) * r * 0.7, Math.sin(a - 0.1) * r * 0.7, Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); c.fill(); } }
    if (id === "retro") { c.strokeStyle = "#5B3716"; c.lineWidth = Math.max(1, r * 0.08); for (var k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-r, k * r * 0.45); c.quadraticCurveTo(0, k * r * 0.45 + r * 0.25, r, k * r * 0.45); c.stroke(); } }
    else if (id === "stelle") { c.fillStyle = "#FFE082"; [[0, 0, 0.35], [-0.55, -0.45, 0.2], [0.55, 0.4, 0.22], [0.5, -0.55, 0.15], [-0.5, 0.55, 0.16]].forEach(function (s) { star(c, s[0] * r, s[1] * r, s[2] * r); }); }
    else if (id !== "arcobaleno") {
      var pc = { classico: "#1D2326", notte: "#39FF88", fiamme: "#D84315", oro: "#9C6B00" }[id] || "#1D2326";
      c.fillStyle = pc; pent(c, 0, 0, r * 0.36);
      for (var j = 0; j < 5; j++) { var b = j / 5 * TAU - Math.PI / 2; pent(c, Math.cos(b) * r * 0.92, Math.sin(b) * r * 0.92, r * 0.3); }
    }
    c.restore();
    var g = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(0,0,0,.28)");
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.restore();
  }
  function pent(c, x, y, r) { c.beginPath(); for (var i = 0; i < 5; i++) { var a = i / 5 * TAU - Math.PI / 2; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
  function star(c, x, y, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function drawTennisBall(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = "#D9F04A"; c.fill(); c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = Math.max(0.8, r * 0.18); c.beginPath(); c.arc(x - r * 0.9, y, r * 0.75, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + r * 0.9, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
  // racchetta con l'impugnatura in (0,0) e la testa verso l'alto (asse -y), lunghezza L
  function drawRacket(c, L, id) {
    var R = { classica: ["#2F3A40", "#E8E8E8", "#C62828"], rossa: ["#C62828", "#FFF", "#1C1F24"], blu: ["#1565C0", "#E3F2FD", "#0D47A1"], legno: ["#A0703A", "#F3E5C8", "#6D4C2A"],
              neon: ["#39FF88", "#E0FFE9", "#FF2D95"], carbonio: ["#22262B", "#9AA4AA", "#E8A252"], oro: ["#F2C230", "#FFF8DC", "#9C6B00"] }[id] || ["#2F3A40", "#E8E8E8", "#C62828"];
    c.save(); c.lineCap = "round";
    c.strokeStyle = R[2]; c.lineWidth = L * 0.09; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -L * 0.42); c.stroke();
    c.strokeStyle = R[0]; c.lineWidth = L * 0.05; c.beginPath(); c.moveTo(0, -L * 0.36); c.lineTo(-L * 0.08, -L * 0.5); c.moveTo(0, -L * 0.36); c.lineTo(L * 0.08, -L * 0.5); c.stroke();
    c.beginPath(); c.ellipse(0, -L * 0.72, L * 0.2, L * 0.27, 0, 0, TAU); c.fillStyle = "rgba(255,255,255,.08)"; c.fill();
    c.save(); c.clip(); c.strokeStyle = R[1]; c.globalAlpha = 0.7; c.lineWidth = Math.max(0.5, L * 0.008);
    for (var i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * L * 0.045, -L); c.lineTo(i * L * 0.045, -L * 0.4); c.stroke(); c.beginPath(); c.moveTo(-L * 0.3, -L * 0.72 + i * L * 0.055); c.lineTo(L * 0.3, -L * 0.72 + i * L * 0.055); c.stroke(); }
    c.restore();
    c.strokeStyle = R[0]; c.lineWidth = L * 0.05; c.beginPath(); c.ellipse(0, -L * 0.72, L * 0.2, L * 0.27, 0, 0, TAU); c.stroke();
    c.restore();
  }

  // ------------------------------------------------------------------ disegno: l'omino
  // Origine ai piedi, unita' = 1 px a scala 1 (alto circa 215). Una posa da' gli angoli degli arti (0 = in giu',
  // positivo = verso destra dello schermo), il busto inclinato e il salto. Si usa ovunque: editor, foto e giochi.
  var POSE0 = { al: [-0.18, 0.1], ar: [0.18, -0.1], ll: [-0.06, 0], lr: [0.06, 0], tilt: 0, lift: 0, face: "ok", hold: null };
  function P(o) { var p = JSON.parse(JSON.stringify(POSE0)); for (var k in o) p[k] = o[k]; return p; }
  function mixPose(a, b, t) {
    var o = {}; ["al", "ar", "ll", "lr"].forEach(function (k) { o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)]; });
    o.tilt = lerp(a.tilt, b.tilt, t); o.lift = lerp(a.lift, b.lift, t); o.face = t < 0.5 ? a.face : b.face; o.hold = t < 0.5 ? a.hold : b.hold; o.rot = lerp(a.rot || 0, b.rot || 0, t); o.flip = t < 0.5 ? a.flip : b.flip;
    return o;
  }
  function seg(c, x, y, a, len) { return [x + Math.sin(a) * len, y + Math.cos(a) * len]; }
  function limb(c, x, y, a1, a2, l1, l2, w1, w2, col1, col2, splitAt) {
    var k = seg(c, x, y, a1, l1), e = seg(c, k[0], k[1], a1 + a2, l2);
    c.lineCap = "round";
    if (splitAt != null && splitAt < 1) {   // prima parte di un colore (manica, pantaloncino), poi l'altro
      var m = [x + (k[0] - x) * splitAt, y + (k[1] - y) * splitAt];
      c.strokeStyle = col2; c.lineWidth = w1; c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(k[0], k[1]); c.stroke();
      c.strokeStyle = col1; c.lineWidth = w1 + 2; c.beginPath(); c.moveTo(x, y); c.lineTo(m[0], m[1]); c.stroke();
    } else { c.strokeStyle = col1; c.lineWidth = w1 + (splitAt === 1 ? 2 : 0); c.beginPath(); c.moveTo(x, y); c.lineTo(k[0], k[1]); c.stroke(); }
    c.strokeStyle = splitAt === 1 ? col1 : col2; c.lineWidth = w2 + (splitAt === 1 ? 2 : 0); c.beginPath(); c.moveTo(k[0], k[1]); c.lineTo(e[0], e[1]); c.stroke();
    return { knee: k, end: e, ang: a1 + a2 };
  }
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var m = function (v) { return Math.round(clamp(f < 0 ? v * (1 + f) : v + (255 - v) * f, 0, 255)); }; return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")"; }
  function drawGuy(c, A, x, y, s, pose, opt) {
    opt = opt || {}; pose = pose || POSE0;
    var skin = PELLE[A.pelle] || PELLE[1], hair = CAPELLI_COL[A.capCol] || CAPELLI_COL[1];
    var c1 = COLORI[A.c1], c2 = COLORI[A.c2], pant = COLORI[A.pant], socks = COLORI[A.calze];
    var keeper = !!opt.keeper, top = keeper ? "portiere" : A.maglia, back = !!opt.back;
    if (keeper && A.maglia !== "portiere") { c1 = "#2E7D32"; c2 = "#1B5E20"; }
    var longSleeve = top === "felpa" || top === "cappuccio" || top === "tuta" || top === "portiere", noSleeve = top === "canotta";
    var shoeCol = A.scarpe === "oro" ? "#F2C230" : A.scarpe === "tennis" ? "#F4F4F4" : COLORI[A.scCol];
    var glove = { verdi: "#7CB342", arancio: "#FB8C00", rosa: "#EC407A", neri: "#222" }[A.guanti] || "#7CB342";
    c.save(); c.translate(x, y - (pose.lift || 0) * s); c.scale(s * (pose.flip ? -1 : 1), s);
    if (pose.rot) { c.translate(0, -100); c.rotate(pose.rot); c.translate(0, 100); }
    if (!opt.noShadow) { c.save(); c.scale(1, 0.25); c.beginPath(); c.arc(0, (pose.lift || 0) * 4, 30, 0, TAU); c.fillStyle = "rgba(0,0,0,.25)"; c.fill(); c.restore(); }
    var hipY = -86, shY = -150;
    // gambe (calze sopra lo stinco, scarpe)
    [["ll", -9], ["lr", 9]].forEach(function (L) {
      var a = pose[L[0]], g = limb(c, L[1], hipY, a[0], a[1], 40, 40, 14, 12, skin, skin, null);
      c.lineCap = "round"; c.strokeStyle = socks; c.lineWidth = 13;
      var mid = [lerp(g.knee[0], g.end[0], 0.35), lerp(g.knee[1], g.end[1], 0.35)];
      c.beginPath(); c.moveTo(mid[0], mid[1]); c.lineTo(g.end[0], g.end[1]); c.stroke();
      c.save(); c.translate(g.end[0], g.end[1] + 3); c.rotate(-g.ang * 0.6);
      c.beginPath(); c.ellipse(L[1] < 0 ? -4 : 4, 0, 11, 6, 0, 0, TAU); c.fillStyle = shoeCol; c.fill();
      if (A.scarpe !== "tennis") { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-9, 4, 18, 2); } else { c.strokeStyle = "#90A4AE"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-9, 3); c.lineTo(9, 3); c.stroke(); }
      c.restore();
      // pantaloncino sulla coscia
      var sh = seg(c, L[1], hipY, a[0], 20); c.strokeStyle = pant; c.lineWidth = 19; c.beginPath(); c.moveTo(L[1], hipY); c.lineTo(sh[0], sh[1]); c.stroke();
    });
    c.save(); c.translate(0, hipY); c.rotate(pose.tilt || 0); c.translate(0, -hipY);
    // pantaloncini (vita)
    c.fillStyle = pant; rr(c, -21, hipY - 6, 42, 16, 6); c.fill();
    // cappuccio dietro la testa
    if (top === "cappuccio" && !back) { c.fillStyle = shade(c1, -0.25); c.beginPath(); c.ellipse(0, shY - 4, 24, 12, 0, 0, TAU); c.fill(); }
    // braccio dietro (a sinistra dello schermo se di schiena il destro... semplice: entrambi dopo il busto, tranne se all'indietro)
    var sleeveCol = noSleeve ? skin : c1;
    function arm(side) {
      var a = pose[side === -1 ? "al" : "ar"], sx = side * 20, g;
      g = limb(c, sx, shY + 4, a[0], a[1], 30, 28, 11, 10, sleeveCol, longSleeve ? sleeveCol : skin, longSleeve ? 1 : noSleeve ? 0 : 0.45);
      if (A.accessorio === "polsini" && !longSleeve) { var w = [lerp(g.knee[0], g.end[0], 0.75), lerp(g.knee[1], g.end[1], 0.75)]; c.strokeStyle = c2 === c1 ? "#fff" : c2; c.lineWidth = 12; c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(lerp(w[0], g.end[0], 0.5), lerp(w[1], g.end[1], 0.5)); c.stroke(); }
      if (A.accessorio === "capitano" && side === -1) { var cpt = [lerp(sx, g.knee[0], 0.55), lerp(shY + 4, g.knee[1], 0.55)]; c.strokeStyle = "#FDD835"; c.lineWidth = 13; c.beginPath(); c.moveTo(cpt[0], cpt[1] - 2); c.lineTo(cpt[0], cpt[1] + 2); c.stroke(); }
      c.beginPath(); c.arc(g.end[0], g.end[1], keeper ? 8.5 : 6.5, 0, TAU); c.fillStyle = keeper ? glove : skin; c.fill();
      return g;
    }
    var armL = arm(-1);
    // busto
    torso(c, top, c1, c2, -22, shY, 44, hipY - shY + 4, back, A, keeper);
    var armR = arm(1);
    // in mano
    if (pose.hold === "ball") drawBall(c, armL.end[0] + 2, armL.end[1] - 8, 13, A.pallone, 0.3);
    if (pose.hold === "racket" || opt.racket) { c.save(); c.translate(armR.end[0], armR.end[1]); c.rotate(pose.racketAng != null ? pose.racketAng : armR.ang + Math.PI); drawRacket(c, 62, A.racchetta); c.restore(); }
    if (pose.hold === "trofeo") { c.save(); c.translate((armL.end[0] + armR.end[0]) / 2, Math.min(armL.end[1], armR.end[1]) - 6); trophy(c); c.restore(); }
    // collo e testa
    c.fillStyle = shade(skin, -0.12); c.fillRect(-6, shY - 12, 12, 14);
    head(c, A, skin, hair, 0, shY - 34, back, pose.face, keeper);
    c.restore();
    c.restore();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function trophy(c) { c.fillStyle = "#F2C230"; c.beginPath(); c.moveTo(-14, -30); c.lineTo(14, -30); c.quadraticCurveTo(14, -6, 0, -4); c.quadraticCurveTo(-14, -6, -14, -30); c.fill(); c.fillRect(-3, -5, 6, 8); c.fillRect(-9, 2, 18, 5); c.strokeStyle = "#F2C230"; c.lineWidth = 3; c.beginPath(); c.arc(-15, -22, 6, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(15, -22, 6, -Math.PI * 0.5, Math.PI * 0.5); c.stroke(); }
  function torso(c, top, c1, c2, x, y, w, h, back, A, keeper) {
    c.save(); rr(c, x, y, w, h, 12); c.fillStyle = c1; c.fill(); c.clip();
    if (top === "strisce") { c.fillStyle = c2; for (var i = 0; i < 5; i += 2) c.fillRect(x + i * w / 5, y, w / 5, h); }
    else if (top === "righe") { c.fillStyle = c2; for (var j = 1; j < 6; j += 2) c.fillRect(x, y + j * h / 6, w, h / 6); }
    else if (top === "meta") { c.fillStyle = c2; c.fillRect(x + w / 2, y, w / 2, h); }
    else if (top === "banda") { c.fillStyle = c2; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 12, y); c.lineTo(x + w, y + h - 12); c.lineTo(x + w - 12, y + h); c.closePath(); c.fill(); }
    else if (top === "tuta") { c.fillStyle = c2; c.fillRect(x, y, 5, h); c.fillRect(x + w - 5, y, 5, h); if (!back) { c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(x + w / 2 - 1, y, 2, h); } }
    else if (top === "portiere") { c.fillStyle = c2; c.fillRect(x, y + h * 0.45, w, 6); }
    else if (top === "cappuccio" && !back) { c.fillStyle = shade(c1, -0.2); rr(c, x + 9, y + h * 0.55, w - 18, 14, 5); c.fill(); }
    c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(x + w - 8, y, 8, h);
    if (back) {   // numero e nome dietro
      c.fillStyle = top === "strisce" || top === "meta" ? "#fff" : (c2 === c1 ? "#fff" : c2);
      c.font = "800 " + (h * 0.45) + "px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 3; c.strokeText(String(A.num != null ? A.num : ""), x + w / 2, y + h * 0.58); c.fillText(String(A.num != null ? A.num : ""), x + w / 2, y + h * 0.58);
      if (A.nome) { c.font = "800 " + (h * 0.15) + "px Archivo, sans-serif"; c.fillText(String(A.nome).toUpperCase().slice(0, 10), x + w / 2, y + h * 0.2); }
    } else {
      if (top === "polo") { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x + w / 2 - 9, y); c.lineTo(x + w / 2, y + 9); c.lineTo(x + w / 2 + 9, y); c.fill(); }
      else if (top !== "canotta") { c.strokeStyle = c2 === c1 ? shade(c1, -0.3) : c2; c.lineWidth = 3; c.beginPath(); c.arc(x + w / 2, y - 2, 9, 0.2, Math.PI - 0.2); c.stroke(); }
      if (top !== "tuta" && top !== "cappuccio") { c.fillStyle = c2 === c1 ? "#fff" : c2; c.font = "800 " + (h * 0.22) + "px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(A.num != null ? A.num : ""), x + w * 0.7, y + h * 0.3); }
      if (A.accessorio === "collana") { c.strokeStyle = "#F2C230"; c.lineWidth = 1.6; c.beginPath(); c.arc(x + w / 2, y - 4, 11, 0.4, Math.PI - 0.4); c.stroke(); }
    }
    c.restore();
  }
  function head(c, A, skin, hair, x, y, back, face, keeper) {
    var R = 25, st = A.capelli;
    // capelli dietro la testa
    c.fillStyle = hair;
    if (st === "lunghi") { rr(c, x - R - 2, y - 6, 2 * R + 4, 40, 10); c.fill(); }
    if (st === "afro") { c.beginPath(); c.arc(x, y - 6, R + 11, 0, TAU); c.fill(); }
    if (st === "coda") { c.beginPath(); c.ellipse(x + (back ? 0 : R * 0.9), y + 6, 7, 18, back ? 0 : -0.3, 0, TAU); c.fill(); }
    // orecchie e testa
    c.fillStyle = skin; c.beginPath(); c.arc(x - R + 1, y + 3, 5, 0, TAU); c.arc(x + R - 1, y + 3, 5, 0, TAU); c.fill();
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
    if (back) {   // di schiena: capelli su tutta la nuca
      c.fillStyle = hair;
      if (st !== "calvo") { c.beginPath(); if (st === "rasati") c.globalAlpha = 0.45; c.arc(x, y - 1, R + 1, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(x + R, y + (st === "rasati" ? 8 : 14)); c.quadraticCurveTo(x, y + R + 2, x - R, y + (st === "rasati" ? 8 : 14)); c.closePath(); c.fill(); c.globalAlpha = 1; }
      if (st === "cresta") { for (var q = -2; q <= 2; q++) { c.beginPath(); c.moveTo(x - 5, y - R + 2 + q * 6); c.lineTo(x, y - R - 9 + Math.abs(q) * 3); c.lineTo(x + 5, y - R + 2 + q * 6); c.fill(); } }
      if (st === "ricci") for (var k2 = 0; k2 < 9; k2++) { c.beginPath(); c.arc(x + Math.cos(Math.PI + k2 / 8 * Math.PI) * R, y + Math.sin(Math.PI + k2 / 8 * Math.PI) * R, 8, 0, TAU); c.fill(); }
    } else {
      // occhi, sopracciglia, bocca
      var happy = face === "happy" || face === "shout", sad = face === "sad";
      c.fillStyle = "#1d2326";
      if (happy) { c.strokeStyle = "#1d2326"; c.lineWidth = 2.4; c.lineCap = "round"; c.beginPath(); c.arc(x - 9, y + 2, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.beginPath(); c.arc(x + 9, y + 2, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      else { c.beginPath(); c.ellipse(x - 9, y, 3, 3.8, 0, 0, TAU); c.ellipse(x + 9, y, 3, 3.8, 0, 0, TAU); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(x - 8, y - 1.3, 1.1, 0, TAU); c.arc(x + 10, y - 1.3, 1.1, 0, TAU); c.fill(); }
      c.strokeStyle = shade(hair, -0.1); c.lineWidth = 2.2; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - 13, y - 8 + (sad ? 2 : 0)); c.lineTo(x - 5, y - 9 - (sad ? 1 : 0)); c.moveTo(x + 5, y - 9 - (sad ? 1 : 0)); c.lineTo(x + 13, y - 8 + (sad ? 2 : 0)); c.stroke();
      c.fillStyle = "rgba(230,110,90,.25)"; c.beginPath(); c.arc(x - 15, y + 8, 4, 0, TAU); c.arc(x + 15, y + 8, 4, 0, TAU); c.fill();
      c.strokeStyle = "#5a2a1e"; c.lineWidth = 2.2;
      if (face === "shout") { c.fillStyle = "#5a2a1e"; c.beginPath(); c.ellipse(x, y + 12, 5, 6, 0, 0, TAU); c.fill(); }
      else if (sad) { c.beginPath(); c.arc(x, y + 17, 6, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
      else { c.beginPath(); c.arc(x, y + 7, happy ? 8 : 6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
      // barba
      if (A.barba !== "no") {
        c.fillStyle = hair;
        if (A.barba === "baffi") { c.beginPath(); c.ellipse(x - 4, y + 9, 5, 2.4, 0.2, 0, TAU); c.ellipse(x + 4, y + 9, 5, 2.4, -0.2, 0, TAU); c.fill(); }
        else { c.globalAlpha = A.barba === "corta" ? 0.45 : 0.95; c.beginPath(); c.arc(x, y + 2, R, 0.15 * Math.PI, 0.85 * Math.PI); c.quadraticCurveTo(x, y + (A.barba === "piena" ? 14 : 18), x + Math.cos(0.15 * Math.PI) * R, y + 2 + Math.sin(0.15 * Math.PI) * R); c.fill(); c.globalAlpha = 1; }
      }
      // capelli davanti
      c.fillStyle = hair;
      if (st === "corti" || st === "lunghi" || st === "coda") { c.beginPath(); c.arc(x, y - 2, R + 1, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(x + 8, y - 16, x - R + 2, y - 8); c.fill(); }
      if (st === "lunghi") { rr(c, x - R - 3, y - 10, 9, 36, 4); c.fill(); rr(c, x + R - 6, y - 10, 9, 36, 4); c.fill(); }
      if (st === "frangia") { c.beginPath(); c.arc(x, y - 2, R + 1, Math.PI * 1.0, Math.PI * 2.0); c.lineTo(x + R, y - 6); c.quadraticCurveTo(x, y - 4, x - R, y - 6); c.fill(); }
      if (st === "rasati") { c.globalAlpha = 0.45; c.beginPath(); c.arc(x, y - 1, R + 0.5, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(x, y - 18, x - R, y - 7); c.fill(); c.globalAlpha = 1; }
      if (st === "ricci") for (var k = 0; k < 9; k++) { c.beginPath(); c.arc(x + Math.cos(Math.PI + k / 8 * Math.PI) * R, y - 4 + Math.sin(Math.PI + k / 8 * Math.PI) * R * 0.9, 8, 0, TAU); c.fill(); }
      if (st === "cresta") { for (var q2 = -1; q2 <= 1; q2++) { c.beginPath(); c.moveTo(x - 7 + q2 * 5, y - R + 4); c.lineTo(x + q2 * 6, y - R - 12); c.lineTo(x + 7 + q2 * 5, y - R + 4); c.fill(); } }
      if (st === "afro") { c.beginPath(); c.arc(x, y - 8, R + 4, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(x, y - 18, x - R - 3, y - 10); c.fill(); }
      if (A.accessorio === "occhiali") { c.fillStyle = "#111"; rr(c, x - 17, y - 5, 14, 9, 3); c.fill(); rr(c, x + 3, y - 5, 14, 9, 3); c.fill(); c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 2); c.lineTo(x + 3, y - 2); c.stroke(); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x - 15, y - 4, 4, 2); c.fillRect(x + 5, y - 4, 4, 2); }
    }
    hat(c, A, x, y, R, back);
  }
  function hat(c, A, x, y, R, back) {
    var h = A.cappello, col = COLORI[A.hatCol] || "#1565C0";
    if (h === "no") return;
    c.fillStyle = col;
    if (h === "cappellino" || h === "rovescio") {
      c.beginPath(); c.arc(x, y - 4, R + 1, Math.PI, TAU); c.fill(); c.fillStyle = shade(col, -0.25);
      var front = (h === "cappellino") !== back;
      if (front) { c.beginPath(); c.ellipse(x, y - 4, R + 9, 6, 0, 0, Math.PI); c.fill(); } else { c.fillRect(x - 8, y - 6, 16, 4); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y - R - 3, 2.5, 0, TAU); c.fill();
    } else if (h === "berretto") {
      c.beginPath(); c.arc(x, y - 3, R + 2, Math.PI, TAU); c.fill(); c.fillStyle = shade(col, -0.25); c.fillRect(x - R - 2, y - 8, 2 * R + 4, 9);
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y - R - 6, 6, 0, TAU); c.fill();
    } else if (h === "fascia") { c.fillRect(x - R - 1, y - 14, 2 * R + 2, 7); }
    else if (h === "bandana") { c.beginPath(); c.arc(x, y - 4, R + 1, Math.PI, TAU); c.fill(); c.fillStyle = "#fff"; for (var i = -2; i <= 2; i++) { c.beginPath(); c.arc(x + i * 9, y - 14, 1.6, 0, TAU); c.fill(); } if (back) { c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, y - 6); c.lineTo(x - 12, y + 8); c.lineTo(x + 2, y + 2); c.fill(); } }
    else if (h === "visiera") { c.fillRect(x - R - 1, y - 13, 2 * R + 2, 6); if (!back) { c.fillStyle = shade(col, -0.25); c.beginPath(); c.ellipse(x, y - 8, R + 8, 5, 0, 0, Math.PI); c.fill(); } }
    else if (h === "corona") { c.fillStyle = "#F2C230"; c.beginPath(); c.moveTo(x - 18, y - 16); c.lineTo(x - 20, y - 36); c.lineTo(x - 9, y - 26); c.lineTo(x, y - 40); c.lineTo(x + 9, y - 26); c.lineTo(x + 20, y - 36); c.lineTo(x + 18, y - 16); c.closePath(); c.fill(); c.fillStyle = "#C62828"; c.beginPath(); c.arc(x, y - 22, 3, 0, TAU); c.fill(); }
  }

  // ------------------------------------------------------------------ pose ed esultanze (funzione del tempo)
  var POSES = {
    piedi: function () { return P({}); },
    saluto: function (t) { var w = Math.sin(t * 8) * 0.35; return P({ ar: [2.6 + w, 0.4], face: "happy" }); },
    conserte: function () { return P({ al: [0.5, 1.9], ar: [-0.5, -1.9] }); },
    sottobraccio: function () { return P({ al: [-0.35, 1.5], hold: "ball", face: "happy" }); },
    spalla: function () { return P({ ar: [1.2, 1.7], hold: "racket", racketAng: 2.6 }); },
    palleggio: function (t) { var k = Math.abs(Math.sin(t * 5)); return P({ ll: [0.5 * k, -0.6 * k], al: [-0.6, 0.2], ar: [0.6, -0.2], ballY: k }); },
    cielo: function () { return P({ ar: [2.9, 0.1], face: "happy" }); },
    fianchi: function () { return P({ al: [-0.8, 2.0], ar: [0.8, -2.0], face: "happy" }); },
    pollice: function () { return P({ ar: [1.5, 1.3], face: "happy", thumb: true }); }
  };
  var WINS = {
    salto: function (t) { var k = Math.abs(Math.sin(t * 4)); return P({ lift: 40 * k, al: [-2.6, 0.2], ar: [2.6, -0.2], ll: [-0.3 * k, 0.6 * k], lr: [0.3 * k, -0.6 * k], face: "happy" }); },
    braccia: function (t) { var w = Math.sin(t * 6) * 0.15; return P({ al: [-2.8 + w, 0], ar: [2.8 - w, 0], face: "shout" }); },
    aereo: function (t) { var w = Math.sin(t * 2.5); return P({ al: [-1.6, 0], ar: [1.6, 0], tilt: w * 0.35, ll: [-0.25, 0.3], lr: [0.25, -0.3], face: "happy" }); },
    ballo: function (t) { var w = Math.sin(t * 7); return P({ al: [-1.2 + w * 0.6, 1.2], ar: [1.2 + w * 0.6, -1.2], tilt: w * 0.18, ll: [-0.2 + w * 0.2, 0], lr: [0.2 + w * 0.2, 0], lift: Math.abs(w) * 8, face: "happy" }); },
    pugno: function (t) { var k = Math.min(1, (t % 1.6) * 3); return P({ ar: [lerp(0.5, 2.9, ease(k)), lerp(-2, 0, ease(k))], al: [-0.3, 0.3], face: "shout", ll: [-0.15, 0], lr: [0.25, 0] }); },
    inchino: function (t) { var k = (Math.sin(t * 2) + 1) / 2; return P({ tilt: 0.7 * k * (-1), al: [-0.2 + k * 0.6, 0.3], ar: [0.2 - k * 0.6, -0.3], face: "happy" }); },
    giro: function (t) { var k = (t * 1.2) % 1; return P({ flip: k > 0.5, al: [-2.6, 0], ar: [2.6, 0], lift: Math.sin(k * Math.PI) * 30, face: "happy" }); },
    trofeo: function (t) { var w = Math.sin(t * 3) * 0.12; return P({ al: [-3.0 + w, 0.2], ar: [3.0 - w, -0.2], hold: "trofeo", face: "shout", lift: Math.abs(Math.sin(t * 3)) * 10 }); }
  };
  var SAD = function (t) { return P({ al: [-0.1, 0.05], ar: [0.1, -0.05], tilt: 0.12, face: "sad", lift: 0 }); };
  function poseOf(name, t) { return (POSES[name] || WINS[name] || POSES.piedi)(t || 0); }
  function drawPoseExtras(c, A, x, y, s, name, pose) {   // pallone del palleggio
    if (name === "palleggio") drawBall(c, x - 12 * s, y - (20 + 70 * (1 - (pose.ballY || 0))) * s, 12 * s, A.pallone, (pose.ballY || 0) * 4);
  }
  // avatar a caso per l'avversario (la CPU), con un nome di fantasia dichiarato
  function randomAv() {
    return { pelle: Math.floor(rnd(0, 6)), capelli: pick(["corti", "rasati", "ricci", "lunghi", "frangia", "cresta"]), capCol: Math.floor(rnd(0, 6)), barba: pick(["no", "no", "corta", "baffi"]),
             maglia: pick(["maglia", "strisce", "righe", "meta", "polo"]), c1: Math.floor(rnd(0, 12)), c2: Math.floor(rnd(0, 12)), pant: Math.floor(rnd(0, 12)), calze: Math.floor(rnd(0, 12)),
             scarpe: "scarpini", scCol: Math.floor(rnd(0, 12)), cappello: pick(["no", "no", "fascia", "cappellino"]), hatCol: Math.floor(rnd(0, 12)), accessorio: "no", pallone: "classico", racchetta: pick(["classica", "rossa", "blu"]), guanti: pick(["verdi", "arancio", "rosa"]), nome: "CPU", num: Math.floor(rnd(2, 30)) };
  }

  // ------------------------------------------------------------------ tela con densita' giusta
  function setup(cv, ratio) {
    var w = cv.parentNode.clientWidth || 360, h = Math.round(w * ratio), d = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + "px";
    var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); return { c: c, W: w, H: h };
  }
  function pt(cv, e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  window.G = { $: $, TAU: TAU, clamp: clamp, lerp: lerp, ease: ease, rnd: rnd, pick: pick, load: load, save: save, toast: toast, CAT: CAT, PELLE: PELLE, CAPELLI_COL: CAPELLI_COL, COLORI: COLORI,
               get av() { return av; }, set av(v) { av = v; }, pg: pg, wins: wins, unlocked: unlocked, saveAv: saveAv, savePg: savePg, drawBall: drawBall, drawTennisBall: drawTennisBall, drawRacket: drawRacket,
               drawGuy: drawGuy, P: P, POSE0: POSE0, POSES: POSES, WINS: WINS, SAD: SAD, poseOf: poseOf, mixPose: mixPose, drawPoseExtras: drawPoseExtras, randomAv: randomAv, setup: setup, pt: pt, rr: rr, star: star };
})();
