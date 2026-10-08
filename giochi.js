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
  var CAPELLI_COL = ["#1E1712", "#4A2E1B", "#7A4B26", "#B7782F", "#E2C27A", "#B8B8B8", "#C0392B", "#2F6FB5", "#E2488F", "#36A86A", "#F4F4F4", "#7E57C2"];
  var COLORI = ["#E8E8E8", "#1C1F24", "#C62828", "#1565C0", "#2E7D32", "#F9A825", "#6A1B9A", "#00838F", "#EF6C00", "#AD1457", "#5D4037", "#90CAF9"];
  // req: numero = livello che lo sblocca (nel prototipo: vittorie); "c:N" = si compra con N monete (le cose strane)
  var CAT = {
    sesso: [["uomo", "Uomo", 0], ["donna", "Donna", 0]],
    statura: [["bassa", "Bassa", 0], ["media", "Media", 0], ["alta", "Alta", 0]],
    fisico: [["magro", "Magro", 0], ["normale", "Normale", 0], ["robusto", "Robusto", 0]],
    testa: [["ovale", "Ovale", 0], ["tonda", "Tonda", 0], ["squadrata", "Squadrata", 0], ["appuntita", "Appuntita", 3], ["larga", "Larga", 6]],
    occhi: [["normali", "Normali", 0], ["grandi", "Grandi", 0], ["sorridenti", "Sorridenti", 0], ["allungati", "Allungati", 2], ["assonnati", "Assonnati", 5], ["stelle", "A stella", "c:400"]],
    naso: [["piccolo", "Piccolo", 0], ["dritto", "Dritto", 0], ["largo", "Largo", 0], ["patata", "A patata", 4], ["aquilino", "Aquilino", 8]],
    bocca: [["sorriso", "Sorriso", 0], ["sorrisone", "Sorrisone", 0], ["seria", "Seria", 0], ["smorfia", "Smorfia", 3], ["furbo", "Sorriso furbo", 2], ["linguaccia", "Linguaccia", "c:250"], ["dente", "Dente d'oro", "c:600"]],
    capelli: [["corti", "Corti", 0], ["rasati", "Rasati", 0], ["frangia", "Frangia", 0], ["ricci", "Ricci", 0], ["lunghi", "Lunghi", 0], ["calvo", "Calvo", 0], ["coda", "Coda", 2], ["afro", "Afro", 4], ["cresta", "Cresta", 7], ["spettinati", "Spettinati", 0], ["chignon", "Chignon", 3], ["trecce", "Trecce", 5], ["ciuffo", "Ciuffo", 6], ["mullet", "Mullet", "c:350"]],
    barba: [["no", "Niente", 0], ["corta", "Corta", 0], ["baffi", "Baffi", 2], ["piena", "Piena", 5]],
    maglia: [["maglia", "Maglia", 0], ["strisce", "Strisce", 0], ["polo", "Polo tennis", 0], ["righe", "Righe", 2], ["canotta", "Canotta", 3], ["meta", "Metà e metà", 4], ["banda", "Banda", 6], ["felpa", "Felpa", 8], ["portiere", "Maglia portiere", 10], ["cappuccio", "Felpa col cappuccio", 12], ["tuta", "Giacca tuta", 15]],
    cappello: [["no", "Niente", 0], ["fascia", "Fascia", 0], ["cappellino", "Cappellino", 2], ["berretto", "Berretto di lana", 5], ["rovescio", "Cappellino al contrario", 9], ["visiera", "Visiera", 11], ["cuffie", "Cuffie", 4], ["cowboy", "Cappello da cowboy", 8], ["casco", "Casco da football", 10], ["bandana", "Bandana", "c:300"], ["cilindro", "Cilindro", "c:350"], ["vichingo", "Elmo vichingo", "c:900"], ["corona", "Corona", "c:1500"]],
    accessorio: [["no", "Niente", 0], ["tondi", "Occhiali tondi", 2], ["polsini", "Polsini", 3], ["quadrati", "Occhiali squadrati", 5], ["occhiali", "Occhiali da sole", 7], ["maschera", "Maschera da supereroe", 9], ["cuore", "Occhiali a cuore", "c:300"], ["capitano", "Fascia da capitano", 14], ["collana", "Catenina d'oro", "c:500"]],
    scarpe: [["scarpini", "Scarpini", 0], ["tennis", "Scarpe da tennis", 0], ["oro", "Scarpini d'oro", "c:1200"]],
    pallone: [["classico", "Classico", 0], ["retro", "Cuoio anni '70", 6], ["notte", "Notturno", 10], ["arcobaleno", "Arcobaleno", "c:400"], ["stelle", "Stelle", "c:600"], ["fiamme", "Fiamme", "c:800"], ["oro", "Pallone d'oro", "c:2000"]],
    racchetta: [["classica", "Classica", 0], ["rossa", "Rossa", 3], ["blu", "Blu", 5], ["legno", "Legno vintage", 9], ["neon", "Neon", "c:500"], ["carbonio", "Carbonio", "c:800"], ["oro", "Racchetta d'oro", "c:2000"]],
    guanti: [["verdi", "Verdi", 0], ["arancio", "Arancio", 4], ["rosa", "Rosa", 8], ["neri", "Neri e oro", "c:500"]],
    posa: [["piedi", "In piedi", 0], ["saluto", "Saluto", 0], ["conserte", "Braccia conserte", 0], ["sottobraccio", "Pallone sotto il braccio", 2], ["spalla", "Racchetta in spalla", 2], ["fianchi", "Mani sui fianchi", 4], ["palleggio", "Palleggio", 6], ["cielo", "Dito al cielo", 10], ["pollice", "Pollice su", 13]],
    esulta: [["salto", "Salto di gioia", 0], ["braccia", "Braccia al cielo", 0], ["pugno", "Pugno", 3], ["aereo", "Aeroplano", 7], ["ballo", "Ballo", "c:300"], ["inchino", "Inchino", 16], ["giro", "Giravolta", "c:700"], ["trofeo", "Coppa alzata", "c:1500"]]
  };
  function reqOf(cat, id) { var it = (CAT[cat] || []).filter(function (x) { return x[0] === id; })[0]; return it ? it[2] : 0; }
  function price(req) { return typeof req === "string" && req.slice(0, 2) === "c:" ? Number(req.slice(2)) : 0; }
  var AV_DEF = { sesso: "uomo", statura: "media", fisico: "normale", testa: "ovale", occhi: "normali", naso: "piccolo", bocca: "sorriso", pelle: 1, capelli: "corti", capCol: 1, barba: "no", maglia: "maglia", c1: 2, c2: 0, pant: 1, calze: 0, scarpe: "scarpini", scCol: 1, cappello: "no", hatCol: 3, accessorio: "no",
                 pallone: "classico", racchetta: "classica", guanti: "verdi", posa: "piedi", esulta: "salto", nome: "", num: 10 };
  var av = Object.assign({}, AV_DEF, load("statsight.avatar2", {}));
  var pg = Object.assign({ rigori: 0, tennis: 0, giocate: 0, tutto: false }, load("statsight.giochi", {}));
  function wins() { return pg.rigori + pg.tennis; }
  // chi decide gli sblocchi: nel prototipo le vittorie; nell'app il livello e gli acquisti (omino.js lo cambia)
  var unlockFn = function (cat, id) { if (pg.tutto) return true; var r = reqOf(cat, id); return typeof r === "number" ? wins() >= r : false; };
  function unlocked(cat, id) { return unlockFn(cat, id); }
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
  // mazza da baseball con l'impugnatura in (0,0) e la punta verso -y (10/10)
  function drawBat(c, L) {
    c.save(); c.lineCap = "round";
    c.fillStyle = "#C8924E"; c.beginPath(); c.moveTo(-2, 0); c.lineTo(-L * 0.06, -L); c.quadraticCurveTo(0, -L * 1.06, L * 0.06, -L); c.lineTo(2, 0); c.closePath(); c.fill();
    c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, -L, L * 0.05, L);
    c.strokeStyle = "#1C1F24"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -L * 0.22); c.stroke();
    c.restore();
  }
  // pallone ovale da football americano centrato in (x,y), raggio lungo r
  function drawFootball(c, x, y, r) {
    c.save(); c.translate(x, y);
    c.beginPath(); c.ellipse(0, 0, r, r * 0.6, 0, 0, TAU); c.fillStyle = "#8B4A22"; c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = Math.max(1, r * 0.1); c.beginPath(); c.moveTo(-r * 0.35, 0); c.lineTo(r * 0.35, 0); c.stroke();
    for (var i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * 0.14, -r * 0.12); c.lineTo(i * r * 0.14, r * 0.12); c.stroke(); }
    c.restore();
  }
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
    var hf = { bassa: 0.86, alta: 1.13 }[A.statura] || 1, wf = { magro: 0.86, robusto: 1.17 }[A.fisico] || 1;
    var hipY = -(6 + 80 * hf), shY = hipY - 64 * hf, LL = 40 * hf;
    // gambe (calze sopra lo stinco, scarpe)
    [["ll", -9 * wf], ["lr", 9 * wf]].forEach(function (L) {
      var a = pose[L[0]], g = limb(c, L[1], hipY, a[0], a[1], LL, LL, 14 * wf, 12 * wf, skin, skin, null);
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
    c.fillStyle = pant; rr(c, -21 * wf, hipY - 6, 42 * wf, 16, 6); c.fill();
    // cappuccio dietro la testa
    if (top === "cappuccio" && !back) { c.fillStyle = shade(c1, -0.25); c.beginPath(); c.ellipse(0, shY - 4, 24, 12, 0, 0, TAU); c.fill(); }
    // braccio dietro (a sinistra dello schermo se di schiena il destro... semplice: entrambi dopo il busto, tranne se all'indietro)
    var sleeveCol = noSleeve ? skin : c1;
    function arm(side) {
      var a = pose[side === -1 ? "al" : "ar"], sx = side * 20 * wf, g;
      g = limb(c, sx, shY + 4, a[0], a[1], 30, 28, 11, 10, sleeveCol, longSleeve ? sleeveCol : skin, longSleeve ? 1 : noSleeve ? 0 : 0.45);
      if (A.accessorio === "polsini" && !longSleeve) { var w = [lerp(g.knee[0], g.end[0], 0.75), lerp(g.knee[1], g.end[1], 0.75)]; c.strokeStyle = c2 === c1 ? "#fff" : c2; c.lineWidth = 12; c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(lerp(w[0], g.end[0], 0.5), lerp(w[1], g.end[1], 0.5)); c.stroke(); }
      if (A.accessorio === "capitano" && side === -1) { var cpt = [lerp(sx, g.knee[0], 0.55), lerp(shY + 4, g.knee[1], 0.55)]; c.strokeStyle = "#FDD835"; c.lineWidth = 13; c.beginPath(); c.moveTo(cpt[0], cpt[1] - 2); c.lineTo(cpt[0], cpt[1] + 2); c.stroke(); }
      c.beginPath(); c.arc(g.end[0], g.end[1], keeper ? 8.5 : 6.5, 0, TAU); c.fillStyle = keeper ? glove : skin; c.fill();
      return g;
    }
    var armL = arm(-1);
    // busto
    torso(c, top, c1, c2, -22 * wf, shY, 44 * wf, hipY - shY + 4, back, A, keeper);
    var armR = arm(1);
    // in mano
    if (pose.hold === "ball") drawBall(c, armL.end[0] + 2, armL.end[1] - 8, 13, A.pallone, 0.3);
    if (pose.hold === "racket" || opt.racket) { c.save(); c.translate(armR.end[0], armR.end[1]); c.rotate(pose.racketAng != null ? pose.racketAng : armR.ang + Math.PI); drawRacket(c, 62, A.racchetta); c.restore(); }
    if (pose.hold === "bat") { c.save(); c.translate((armL.end[0] + armR.end[0]) / 2, (armL.end[1] + armR.end[1]) / 2); c.rotate(pose.batAng || 0); drawBat(c, 78 * (pose.batLen || 1)); c.restore(); }
    if (pose.hold === "nfl") { c.save(); c.translate(armR.end[0], armR.end[1] - 6); c.rotate(-0.6); drawFootball(c, 0, 0, 11); c.restore(); }
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
  // misure della testa per forma (10/10): capelli, cappelli, barba e orecchie seguono la forma scelta.
  // w = mezza larghezza, top = dal centro alla sommita', chin = dal centro al mento
  function headDims(t, R) {
    if (t === "tonda") return { w: R * 1.02, top: R * 1.02, chin: R * 1.02 };
    if (t === "squadrata") return { w: R, top: R, chin: R + 2 };
    if (t === "appuntita") return { w: R, top: R + 2, chin: R + 3 };
    if (t === "larga") return { w: R * 1.14, top: R * 0.94 - 1, chin: R * 0.94 + 1 };
    return { w: R * 0.94, top: R * 1.06, chin: R * 1.06 };
  }
  // riempie la forma della testa (allargata di "grow") solo dentro la zona disegnata da "zone": cosi' ogni pezzo
  // ha il contorno della testa, qualunque forma sia
  function headPart(c, A, x, y, R, grow, zone) { c.save(); c.beginPath(); zone(); c.clip(); headShape(c, A.testa, x, y, R * grow); c.fill(); c.restore(); }
  // zona sopra una curva che va da (xr,yr) a (xl,yl) passando per il punto di controllo (cx,cy)
  function above(c, x, y, R, xr, yr, cx, cy, xl, yl) { c.moveTo(x + 3 * R, yr); c.lineTo(xr, yr); c.quadraticCurveTo(cx, cy, xl, yl); c.lineTo(x - 3 * R, yl); c.lineTo(x - 3 * R, y - 4 * R); c.lineTo(x + 3 * R, y - 4 * R); c.closePath(); }
  function below(c, x, y, R, xl, yl, cx, cy, xr, yr) { c.moveTo(x - 3 * R, yl); c.lineTo(xl, yl); c.quadraticCurveTo(cx, cy, xr, yr); c.lineTo(x + 3 * R, yr); c.lineTo(x + 3 * R, y + 4 * R); c.lineTo(x - 3 * R, y + 4 * R); c.closePath(); }
  function band(c, x, y, R, y0, y1) { c.rect(x - 3 * R, y0, 6 * R, y1 - y0); }
  // punto sul contorno alto della testa all'angolo a (fra PI e 2PI)
  function rim(t, D, x, y, a, k) {
    var ca = Math.cos(a), sa = Math.sin(a), f = t === "squadrata" ? 1 / Math.pow(Math.pow(Math.abs(ca), 4) + Math.pow(Math.abs(sa), 4), 0.25) : 1;
    return [x + ca * D.w * f, y + sa * D.top * f * (k || 1)];
  }
  function head(c, A, skin, hair, x, y, back, face, keeper) {
    var R = 25, st = A.capelli, D = headDims(A.testa, R), W = D.w;
    // capelli dietro la testa
    c.fillStyle = hair;
    if (st === "lunghi") { rr(c, x - W - 2, y - 6, 2 * W + 4, 40, 10); c.fill(); }
    if (st === "afro") { c.beginPath(); c.ellipse(x, y - 6 - (D.top - R) * 0.5, W + 11, D.top + 11, 0, 0, TAU); c.fill(); }
    if (st === "coda") { c.beginPath(); c.ellipse(x + (back ? 0 : W * 0.9), y + 6, 7, 18, back ? 0 : -0.3, 0, TAU); c.fill(); }
    if (st === "mullet") { rr(c, x - W * 0.8, y - 2, W * 1.6, 36, 8); c.fill(); }
    if (st === "chignon") { c.beginPath(); c.arc(x, y - D.top - 5, 10, 0, TAU); c.fill(); }
    if (st === "trecce") for (var b = 0; b < 6; b++) { c.beginPath(); c.arc(x - W - 1, y + 2 + b * 6.5, 4.6 - b * 0.25, 0, TAU); c.arc(x + W + 1, y + 2 + b * 6.5, 4.6 - b * 0.25, 0, TAU); c.fill(); }
    // orecchie e testa
    c.fillStyle = skin; c.beginPath(); c.arc(x - W + 1, y + 3, 5, 0, TAU); c.arc(x + W - 1, y + 3, 5, 0, TAU); c.fill();
    headShape(c, A.testa, x, y, R); c.fill();
    if (back) {   // di schiena: capelli su tutta la nuca, col contorno della testa
      c.fillStyle = hair;
      if (st !== "calvo") {
        var nape = st === "rasati" ? 8 : 14; if (st === "rasati") c.globalAlpha = 0.45;
        headPart(c, A, x, y, R, 1.04, function () { above(c, x, y, R, x + W + 2, y + nape, x, y + D.chin + 4, x - W - 2, y + nape); });
        c.globalAlpha = 1;
      }
      if (st === "cresta") { for (var q = -2; q <= 2; q++) { c.beginPath(); c.moveTo(x - 5, y - D.top + 2 + q * 6); c.lineTo(x, y - D.top - 9 + Math.abs(q) * 3); c.lineTo(x + 5, y - D.top + 2 + q * 6); c.fill(); } }
      if (st === "spettinati") spikes(c, A, D, x, y, 1.1);
      if (st === "ricci") for (var k2 = 0; k2 < 9; k2++) { var p2 = rim(A.testa, D, x, y, Math.PI + k2 / 8 * Math.PI); c.beginPath(); c.arc(p2[0], p2[1], 8, 0, TAU); c.fill(); }
    } else {
      // barba prima di naso e bocca, cosi' la bocca resta visibile; segue il mento della forma scelta
      if (A.barba !== "no" && A.barba !== "baffi") {
        c.fillStyle = hair; c.globalAlpha = A.barba === "corta" ? 0.45 : 0.95;
        // la barba parte sotto gli zigomi: fra cappello e barba resta la pelle (non fa il giro del viso)
        if (A.barba === "piena") headPart(c, A, x, y, R, 1.02, function () { below(c, x, y, R, x - W - 3, y + 8, x, y + 22, x + W + 3, y + 8); });
        else headPart(c, A, x, y, R, 1.0, function () { below(c, x, y, R, x - W - 3, y + 9, x, y + 24, x + W + 3, y + 9); });
        c.globalAlpha = 1;
      }
      // occhi, sopracciglia, naso, bocca (10/10: l'esultanza non cancella piu' gli occhi e la bocca scelti)
      var sad = face === "sad", eo = A.occhi, fem = A.sesso === "donna";
      var happy = face === "happy" || face === "shout";
      c.fillStyle = "#1d2326"; c.strokeStyle = "#1d2326"; c.lineCap = "round";
      if (eo === "sorridenti" || (happy && eo === "normali")) { c.lineWidth = 2.4; c.beginPath(); c.arc(x - 9, y + 2, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.beginPath(); c.arc(x + 9, y + 2, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      else if (eo === "stelle") { c.fillStyle = "#F2C230"; star(c, x - 9, y, 5); star(c, x + 9, y, 5); }
      else if (eo === "assonnati") { c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 13, y + 1); c.lineTo(x - 5, y + 1); c.moveTo(x + 5, y + 1); c.lineTo(x + 13, y + 1); c.stroke(); c.beginPath(); c.arc(x - 9, y + 1.5, 3, 0, Math.PI); c.arc(x + 9, y + 1.5, 3, 0, Math.PI); c.fill(); }
      else {
        var ex = eo === "grandi" || eo === "allungati" ? 3.8 : 3, ey = eo === "grandi" ? 4.8 : eo === "allungati" ? 2.3 : 3.8;
        c.beginPath(); c.ellipse(x - 9, y, ex, ey, 0, 0, TAU); c.ellipse(x + 9, y, ex, ey, 0, 0, TAU); c.fill();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(x - 8, y - 1.3, eo === "grandi" ? 1.6 : 1.1, 0, TAU); c.arc(x + 10, y - 1.3, eo === "grandi" ? 1.6 : 1.1, 0, TAU); c.fill();
      }
      if (fem && eo !== "stelle") { c.strokeStyle = "#1d2326"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 12.5, y - 3); c.lineTo(x - 15, y - 5.5); c.moveTo(x + 12.5, y - 3); c.lineTo(x + 15, y - 5.5); c.stroke(); }
      c.strokeStyle = shade(hair, -0.1); c.lineWidth = fem ? 1.6 : 2.2;
      c.beginPath(); c.moveTo(x - 13, y - 8 + (sad ? 2 : 0)); c.lineTo(x - 5, y - 9 - (sad ? 1 : 0)); c.moveTo(x + 5, y - 9 - (sad ? 1 : 0)); c.lineTo(x + 13, y - 8 + (sad ? 2 : 0)); c.stroke();
      c.fillStyle = "rgba(230,110,90,.25)"; c.beginPath(); c.arc(x - 15, y + 8, 4, 0, TAU); c.arc(x + 15, y + 8, 4, 0, TAU); c.fill();
      var nc = shade(skin, -0.3), no = A.naso; c.strokeStyle = nc; c.fillStyle = nc; c.lineWidth = 1.8;
      if (no === "dritto") { c.beginPath(); c.moveTo(x, y - 1); c.lineTo(x, y + 6); c.lineTo(x + 2.5, y + 6.5); c.stroke(); }
      else if (no === "largo") { c.beginPath(); c.arc(x - 3, y + 5.5, 1.8, 0, TAU); c.arc(x + 3, y + 5.5, 1.8, 0, TAU); c.fill(); }
      else if (no === "patata") { c.fillStyle = shade(skin, -0.12); c.beginPath(); c.arc(x, y + 4.5, 4.6, 0, TAU); c.fill(); }
      else if (no === "aquilino") { c.beginPath(); c.moveTo(x - 1, y - 2); c.quadraticCurveTo(x + 5, y + 2, x + 1, y + 7); c.stroke(); }
      else { c.beginPath(); c.arc(x, y + 5, 1.6, 0, TAU); c.fill(); }
      // bocche (10/10): ognuna con una forma sua, ben distinguibile anche in piccolo
      var mo = A.bocca, lip = fem ? "#C2525A" : "#5a2a1e", dark = "#4A1F16";
      if (happy && (mo === "seria" || mo === "smorfia")) mo = "sorriso";
      c.strokeStyle = lip; c.lineWidth = 2.2; c.lineJoin = "round";
      if (face === "shout") { c.fillStyle = dark; c.beginPath(); c.ellipse(x, y + 13, 5, 6, 0, 0, TAU); c.fill(); }
      else if (sad) { c.beginPath(); c.arc(x, y + 18, 6, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
      else if (mo === "seria") { c.beginPath(); c.moveTo(x - 5, y + 12); c.lineTo(x + 5, y + 12); c.stroke(); }
      else if (mo === "smorfia") { c.beginPath(); c.moveTo(x - 7, y + 12); c.quadraticCurveTo(x - 3.5, y + 9, x, y + 12); c.quadraticCurveTo(x + 3.5, y + 15, x + 7, y + 11); c.stroke(); }
      else if (mo === "furbo") { c.beginPath(); c.moveTo(x - 5, y + 12.5); c.quadraticCurveTo(x + 2, y + 13.5, x + 7, y + 8.5); c.stroke(); }
      else if (mo === "sorrisone") {   // bocca aperta a D: denti sopra, lingua sotto
        c.fillStyle = dark; c.beginPath(); c.moveTo(x - 9, y + 9); c.quadraticCurveTo(x, y + 23, x + 9, y + 9); c.closePath(); c.fill();
        c.save(); c.clip(); c.fillStyle = "#fff"; c.fillRect(x - 9, y + 9, 18, 3); c.fillStyle = "#E57373"; c.beginPath(); c.ellipse(x, y + 17, 5, 3.5, 0, 0, TAU); c.fill(); c.restore();
      }
      else if (mo === "linguaccia") { c.fillStyle = dark; c.beginPath(); c.moveTo(x - 6, y + 10); c.quadraticCurveTo(x, y + 15, x + 6, y + 10); c.closePath(); c.fill(); c.fillStyle = "#E57373"; c.beginPath(); c.moveTo(x - 4, y + 12); c.lineTo(x - 4, y + 17); c.arc(x, y + 17, 4, Math.PI, 0, true); c.lineTo(x + 4, y + 12); c.fill(); c.strokeStyle = "#C84B4B"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + 13); c.lineTo(x, y + 18); c.stroke(); }
      else if (mo === "dente") {   // sorriso largo a denti scoperti, uno d'oro
        c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x - 9, y + 10); c.quadraticCurveTo(x, y + 19, x + 9, y + 10); c.closePath(); c.fill();
        c.strokeStyle = "#B9B9B9"; c.lineWidth = 0.8; c.beginPath(); for (var tx = -6; tx <= 6; tx += 3) { c.moveTo(x + tx, y + 10); c.lineTo(x + tx, y + 15); } c.stroke();
        c.fillStyle = "#F2C230"; c.fillRect(x + 1, y + 10.3, 2.8, 4.2);
        c.strokeStyle = lip; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 9, y + 10); c.quadraticCurveTo(x, y + 19, x + 9, y + 10); c.closePath(); c.stroke();
      }
      else { c.beginPath(); c.moveTo(x - 7.5, y + 9); c.quadraticCurveTo(x, y + 16.5, x + 7.5, y + 9); c.stroke(); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 8.5, y + 8); c.lineTo(x - 7, y + 10); c.moveTo(x + 8.5, y + 8); c.lineTo(x + 7, y + 10); c.stroke(); }
      if (A.barba === "baffi") { c.fillStyle = hair; c.beginPath(); c.ellipse(x - 4, y + 9, 5, 2.4, 0.2, 0, TAU); c.ellipse(x + 4, y + 9, 5, 2.4, -0.2, 0, TAU); c.fill(); }
      // capelli davanti: la calotta prende il contorno della testa, l'attaccatura resta quella del taglio
      c.fillStyle = hair;
      if (st === "corti" || st === "lunghi" || st === "coda" || st === "mullet" || st === "trecce") headPart(c, A, x, y, R, 1.06, function () { above(c, x, y, R, x + W + 2, y - 2, x + 8, y - 16, x - W + 2, y - 8); });
      if (st === "lunghi") { rr(c, x - W - 3, y - 10, 9, 36, 4); c.fill(); rr(c, x + W - 6, y - 10, 9, 36, 4); c.fill(); }
      if (st === "frangia") headPart(c, A, x, y, R, 1.06, function () { above(c, x, y, R, x + W + 2, y - 6, x, y - 4, x - W - 2, y - 6); });
      if (st === "rasati") { c.globalAlpha = 0.45; headPart(c, A, x, y, R, 1.02, function () { above(c, x, y, R, x + W + 2, y - 5, x, y - 18, x - W - 2, y - 7); }); c.globalAlpha = 1; }
      if (st === "ricci") {
        headPart(c, A, x, y, R, 1.04, function () { above(c, x, y, R, x + W + 2, y - 4, x, y - 16, x - W - 2, y - 4); });
        for (var k = 0; k < 9; k++) { var p = rim(A.testa, D, x, y - 4, Math.PI + k / 8 * Math.PI, 0.9); c.beginPath(); c.arc(p[0], p[1], 8, 0, TAU); c.fill(); }
      }
      if (st === "cresta") { for (var q2 = -1; q2 <= 1; q2++) { c.beginPath(); c.moveTo(x - 7 + q2 * 5, y - D.top + 4); c.lineTo(x + q2 * 6, y - D.top - 12); c.lineTo(x + 7 + q2 * 5, y - D.top + 4); c.fill(); } }
      if (st === "chignon") headPart(c, A, x, y, R, 1.05, function () { above(c, x, y, R, x + W + 2, y - 3, x, y - 13, x - W - 2, y - 3); });
      if (st === "spettinati") { headPart(c, A, x, y, R, 1.05, function () { above(c, x, y, R, x + W + 2, y - 4, x, y - 10, x - W - 2, y - 6); }); spikes(c, A, D, x, y, 1); }
      if (st === "ciuffo") { headPart(c, A, x, y, R, 1.05, function () { above(c, x, y, R, x + W + 2, y - 6, x, y - 12, x - W - 2, y - 6); }); c.beginPath(); c.ellipse(x - 3, y - D.top - 3, W * 0.85, 11, -0.18, 0, TAU); c.fill(); c.fillStyle = shade(hair, 0.15); c.beginPath(); c.ellipse(x - 6, y - D.top - 6, W * 0.45, 4, -0.18, 0, TAU); c.fill(); c.fillStyle = hair; }
      if (st === "afro") headPart(c, A, x, y, R, 1.16, function () { above(c, x, y, R, x + W + 6, y - 12, x, y - 18, x - W - 6, y - 10); });
      if (A.accessorio === "tondi") { c.strokeStyle = "#8A6A1E"; c.lineWidth = 2; c.beginPath(); c.arc(x - 9, y, 7, 0, TAU); c.moveTo(x + 16, y); c.arc(x + 9, y, 7, 0, TAU); c.moveTo(x - 2, y - 1); c.lineTo(x + 2, y - 1); c.moveTo(x - 16, y - 1); c.lineTo(x - W, y - 2); c.moveTo(x + 16, y - 1); c.lineTo(x + W, y - 2); c.stroke(); c.fillStyle = "rgba(200,230,255,.18)"; c.beginPath(); c.arc(x - 9, y, 6, 0, TAU); c.arc(x + 9, y, 6, 0, TAU); c.fill(); }
      if (A.accessorio === "quadrati") { c.strokeStyle = "#1C1F24"; c.lineWidth = 3; rr(c, x - 17, y - 6, 14, 11, 2); c.stroke(); rr(c, x + 3, y - 6, 14, 11, 2); c.stroke(); c.beginPath(); c.moveTo(x - 3, y - 2); c.lineTo(x + 3, y - 2); c.moveTo(x - 17, y - 2); c.lineTo(x - W, y - 2); c.moveTo(x + 17, y - 2); c.lineTo(x + W, y - 2); c.stroke(); }
      if (A.accessorio === "maschera") { c.fillStyle = "#B71C1C"; c.beginPath(); c.moveTo(x - W, y - 7); c.quadraticCurveTo(x, y - 11, x + W, y - 7); c.lineTo(x + W, y + 4); c.quadraticCurveTo(x, y + 1, x - W, y + 4); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.ellipse(x - 9, y - 1, 4.5, 3.2, 0.15, 0, TAU); c.ellipse(x + 9, y - 1, 4.5, 3.2, -0.15, 0, TAU); c.fill(); c.fillStyle = "#1d2326"; c.beginPath(); c.arc(x - 9, y - 1, 1.8, 0, TAU); c.arc(x + 9, y - 1, 1.8, 0, TAU); c.fill(); }
      if (A.accessorio === "cuore") { c.fillStyle = "#E2488F"; [-9, 9].forEach(function (dx) { var hx = x + dx, hy = y - 4; c.beginPath(); c.moveTo(hx, hy + 9); c.bezierCurveTo(hx - 11, hy + 2, hx - 7, hy - 6, hx, hy - 1); c.bezierCurveTo(hx + 7, hy - 6, hx + 11, hy + 2, hx, hy + 9); c.fill(); }); c.strokeStyle = "#E2488F"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 1); c.lineTo(x + 3, y - 1); c.stroke(); }
      if (A.accessorio === "occhiali") { c.fillStyle = "#111"; rr(c, x - 17, y - 5, 14, 9, 3); c.fill(); rr(c, x + 3, y - 5, 14, 9, 3); c.fill(); c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 2); c.lineTo(x + 3, y - 2); c.moveTo(x - 17, y - 2); c.lineTo(x - W, y - 1); c.moveTo(x + 17, y - 2); c.lineTo(x + W, y - 1); c.stroke(); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x - 15, y - 4, 4, 2); c.fillRect(x + 5, y - 4, 4, 2); }
    }
    hat(c, A, x, y, R, back, D);
  }
  // ciuffi a punta tutto intorno alla testa (capelli spettinati)
  function spikes(c, A, D, x, y, k) {
    for (var i = 0; i <= 8; i++) {
      var a = Math.PI + i / 8 * Math.PI, p = rim(A.testa, D, x, y - 2, a), q = rim(A.testa, D, x, y - 2, a - 0.2), o = rim(A.testa, D, x, y - 2, a + 0.2);
      c.beginPath(); c.moveTo(q[0], q[1] + 4); c.lineTo(p[0] + Math.cos(a) * 10 * k, p[1] + Math.sin(a) * 11 * k); c.lineTo(o[0], o[1] + 4); c.closePath(); c.fill();
    }
  }
  function headShape(c, t, x, y, R) {
    c.beginPath();
    if (t === "tonda") c.arc(x, y, R * 1.02, 0, TAU);
    else if (t === "squadrata") rr(c, x - R, y - R, 2 * R, 2 * R + 2, R * 0.45);
    else if (t === "appuntita") { c.moveTo(x - R, y - 2); c.arc(x, y - 2, R, Math.PI, TAU); c.quadraticCurveTo(x + R, y + R * 0.7, x, y + R + 3); c.quadraticCurveTo(x - R, y + R * 0.7, x - R, y - 2); }
    else if (t === "larga") c.ellipse(x, y + 1, R * 1.14, R * 0.94, 0, 0, TAU);
    else c.ellipse(x, y, R * 0.94, R * 1.06, 0, 0, TAU);
  }
  // cappelli (10/10): la calotta e' la forma della testa allargata, tagliata all'altezza giusta
  function hat(c, A, x, y, R, back, D) {
    var h = A.cappello, col = COLORI[A.hatCol] || "#1565C0";
    if (h === "no") return;
    D = D || headDims(A.testa, R); var W = D.w;
    var hairUp = A.capelli === "afro" ? 1.12 : A.capelli === "ricci" ? 1.08 : 1;   // sopra i capelli gonfi il cappello e' piu' grande
    var cap = function (grow, cut) { headPart(c, A, x, y, R, grow * hairUp, function () { band(c, x, y, R, y - 3 * R, cut); }); };
    c.fillStyle = col;
    if (h === "cappellino" || h === "rovescio") {
      cap(1.07, y - 4); c.fillStyle = shade(col, -0.25);
      var front = (h === "cappellino") !== back;
      if (front) { c.beginPath(); c.ellipse(x, y - 4, W * hairUp + 9, 6, 0, 0, Math.PI); c.fill(); } else { c.fillRect(x - 8, y - 6, 16, 4); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y - D.top * 1.07 * hairUp - 1, 2.5, 0, TAU); c.fill();
    } else if (h === "berretto") {
      cap(1.09, y - 3); c.fillStyle = shade(col, -0.25); headPart(c, A, x, y, R, 1.1 * hairUp, function () { band(c, x, y, R, y - 8, y + 1); });
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y - D.top * 1.09 * hairUp - 2, 6, 0, TAU); c.fill();
    } else if (h === "fascia") { headPart(c, A, x, y, R, 1.05 * hairUp, function () { band(c, x, y, R, y - 14, y - 7); }); }
    else if (h === "bandana") { cap(1.06, y - 4); c.fillStyle = "#fff"; for (var i = -2; i <= 2; i++) { c.beginPath(); c.arc(x + i * W * 0.36, y - 14, 1.6, 0, TAU); c.fill(); } if (back) { c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, y - 6); c.lineTo(x - 12, y + 8); c.lineTo(x + 2, y + 2); c.fill(); } }
    else if (h === "visiera") { headPart(c, A, x, y, R, 1.05 * hairUp, function () { band(c, x, y, R, y - 13, y - 7); }); if (!back) { c.fillStyle = shade(col, -0.25); c.beginPath(); c.ellipse(x, y - 8, W * hairUp + 8, 5, 0, 0, Math.PI); c.fill(); } }
    else if (h === "cuffie") {
      c.strokeStyle = shade(col, -0.2); c.lineWidth = 5; c.beginPath(); c.ellipse(x, y - 2, W + 3, D.top + 4, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
      c.fillStyle = col; rr(c, x - W - 7, y - 8, 10, 17, 4); c.fill(); rr(c, x + W - 3, y - 8, 10, 17, 4); c.fill();
      c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(x - W - 5, y - 6, 2, 12); c.fillRect(x + W - 1, y - 6, 2, 12);
    }
    else if (h === "cowboy") {
      var by = y - D.top * 0.5; c.fillStyle = col; c.beginPath(); c.moveTo(x - W * 0.75, by); c.lineTo(x - W * 0.62, y - D.top - 13); c.quadraticCurveTo(x, y - D.top - 6, x + W * 0.62, y - D.top - 13); c.lineTo(x + W * 0.75, by); c.closePath(); c.fill();
      c.fillStyle = shade(col, -0.3); c.fillRect(x - W * 0.74, by - 6, W * 1.48, 5);
      c.fillStyle = shade(col, -0.12); c.beginPath(); c.ellipse(x, by, W * 1.45, 6, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(x - W * 1.45, by); c.quadraticCurveTo(x - W * 1.6, by - 10, x - W * 1.3, by - 9); c.lineTo(x - W * 1.1, by - 2); c.fill(); c.beginPath(); c.moveTo(x + W * 1.45, by); c.quadraticCurveTo(x + W * 1.6, by - 10, x + W * 1.3, by - 9); c.lineTo(x + W * 1.1, by - 2); c.fill();
    }
    else if (h === "cilindro") {
      var cb = y - D.top * 0.7; c.fillStyle = "#1C1F24"; rr(c, x - W * 0.66, cb - 34, W * 1.32, 34, 3); c.fill();
      c.fillStyle = col; c.fillRect(x - W * 0.66, cb - 9, W * 1.32, 6);
      c.fillStyle = "#1C1F24"; c.beginPath(); c.ellipse(x, cb, W + 7, 4.5, 0, 0, TAU); c.fill();
    }
    else if (h === "casco") {
      cap(1.14, y - 1); c.fillStyle = "rgba(255,255,255,.85)"; headPart(c, A, x, y, R, 1.15, function () { c.rect(x - 3, y - 3 * R, 6, 3 * R); });
      if (!back) { c.strokeStyle = "#B0B6BC"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - W * 0.95, y + 6); c.lineTo(x + W * 0.95, y + 6); c.moveTo(x - W * 0.8, y + 15); c.lineTo(x + W * 0.8, y + 15); c.moveTo(x, y + 6); c.lineTo(x, y + 15); c.stroke(); }
    }
    else if (h === "vichingo") {
      c.fillStyle = "#E8DCC4"; [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(x + sd * W * 0.7, y - D.top * 0.55); c.quadraticCurveTo(x + sd * (W + 16), y - D.top * 0.7, x + sd * (W + 12), y - D.top - 18); c.quadraticCurveTo(x + sd * (W + 4), y - D.top * 0.8, x + sd * W * 0.5, y - D.top * 0.85); c.closePath(); c.fill(); });
      c.fillStyle = "#9AA3AD"; cap(1.07, y - 6); c.fillStyle = "#6E7780"; headPart(c, A, x, y, R, 1.08 * hairUp, function () { band(c, x, y, R, y - 10, y - 5); });
      for (var r2 = -2; r2 <= 2; r2++) { c.beginPath(); c.arc(x + r2 * W * 0.35, y - 7.5, 1.4, 0, TAU); c.fill(); }
    }
    else if (h === "corona") { c.save(); c.translate(0, R * 1.06 - D.top * hairUp); var cw = W / (R * 0.94); c.fillStyle = "#F2C230"; c.beginPath(); c.moveTo(x - 18 * cw, y - 16); c.lineTo(x - 20 * cw, y - 36); c.lineTo(x - 9 * cw, y - 26); c.lineTo(x, y - 40); c.lineTo(x + 9 * cw, y - 26); c.lineTo(x + 20 * cw, y - 36); c.lineTo(x + 18 * cw, y - 16); c.closePath(); c.fill(); c.fillStyle = "#C62828"; c.beginPath(); c.arc(x, y - 22, 3, 0, TAU); c.fill(); c.restore(); }
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
  function setup(cv, ratio, fit) {
    // il campo deve stare nello schermo anche sui telefoni bassi: larghezza ridotta se serve (e centrata)
    var cs = getComputedStyle(cv.parentNode), full = (cv.parentNode.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0));
    if (!(full > 40)) full = Math.min(window.innerWidth || 360, 560) - 56;   // tela ancora nascosta
    var maxH = Math.max(260, (window.innerHeight || 700) - (fit || 0));
    var w = Math.min(full, Math.floor(maxH / ratio)), h = Math.round(w * ratio), d = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + "px"; cv.style.width = w + "px"; cv.style.margin = "0 auto";
    var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); return { c: c, W: w, H: h };
  }
  function pt(cv, e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  // sfondi della foto profilo
  // fondi a disegno col colore scelto (10/10): ognuno ha la foto col suo colore
  var FONDI = ["tinta", "righe", "pois", "raggi", "scacchi", "onde", "stelline"];
  function drawBg(c, W, H, bg, t, ci) {
    var g, base = COLORI[ci != null ? ci : 8] || "#EF6C00", dk = shade(base, -0.35), lt = shade(base, 0.3);
    if (FONDI.indexOf(bg) > 0) {
      c.fillStyle = base; c.fillRect(0, 0, W, H); c.fillStyle = dk;
      if (bg === "righe") { c.save(); c.translate(W / 2, H / 2); c.rotate(-0.6); for (var q = -12; q < 12; q += 2) c.fillRect(q * W / 10, -H, W / 10, 2 * H); c.restore(); }
      else if (bg === "pois") { c.fillStyle = lt; for (var py = 0; py < 9; py++) for (var px = 0; px < 9; px++) { c.beginPath(); c.arc((px + (py % 2) * 0.5) * W / 8, py * H / 8, W * 0.032, 0, TAU); c.fill(); } }
      else if (bg === "raggi") { for (var ra = 0; ra < 16; ra += 2) { c.beginPath(); c.moveTo(W / 2, H * 0.55); c.arc(W / 2, H * 0.55, W * 1.2, ra / 16 * TAU, (ra + 1) / 16 * TAU); c.closePath(); c.fill(); } }
      else if (bg === "scacchi") { for (var sy = 0; sy < 8; sy++) for (var sx = 0; sx < 8; sx++) if ((sx + sy) % 2) c.fillRect(sx * W / 8, sy * H / 8, W / 8 + 0.5, H / 8 + 0.5); }
      else if (bg === "onde") { c.lineWidth = H / 18; c.strokeStyle = dk; for (var oy = 0; oy < 9; oy += 1) { c.beginPath(); for (var ox = 0; ox <= W; ox += 4) c[ox ? "lineTo" : "moveTo"](ox, oy * H / 8 + Math.sin(ox / W * TAU * 1.5) * H * 0.03); c.stroke(); } }
      else if (bg === "stelline") { c.fillStyle = dk; c.fillRect(0, 0, W, H); c.fillStyle = lt; for (var si = 0; si < 22; si++) star(c, (si * 67) % W, (si * 139) % H, W * (0.015 + (si % 3) * 0.008)); }
      var vg = c.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H / 2, W * 0.75); vg.addColorStop(0, "rgba(255,255,255,.12)"); vg.addColorStop(1, "rgba(0,0,0,.25)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
      return;
    }
    if (bg === "stadio") {
      g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0B1A33"); g.addColorStop(0.55, "#1D3B5C"); g.addColorStop(0.56, "#2E7D32"); g.addColorStop(1, "#1B5E20"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = "#24364F"; c.fillRect(0, H * 0.36, W, H * 0.2);
      for (var i = 0; i < 60; i++) { c.fillStyle = ["#C62828", "#FDD835", "#fff", "#1565C0"][i % 4]; c.globalAlpha = 0.55; c.fillRect((i * 37) % W, H * 0.38 + (i * 13) % (H * 0.16), 3, 3); } c.globalAlpha = 1;
      [0.12, 0.88].forEach(function (x) { var lg = c.createRadialGradient(W * x, H * 0.12, 2, W * x, H * 0.12, H * 0.35); lg.addColorStop(0, "rgba(255,255,230,.9)"); lg.addColorStop(1, "rgba(255,255,230,0)"); c.fillStyle = lg; c.fillRect(0, 0, W, H * 0.6); });
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2; c.beginPath(); c.ellipse(W / 2, H * 0.78, W * 0.3, H * 0.07, 0, 0, Math.PI * 2); c.stroke();
    } else if (bg === "tennis" || bg === "terra") {
      var out = bg === "tennis" ? "#2E6B4F" : "#B4532A", inn = bg === "tennis" ? "#2B5DA8" : "#C8663A";
      c.fillStyle = out; c.fillRect(0, 0, W, H); c.fillStyle = bg === "tennis" ? "#1A2E3D" : "#8C3F1E"; c.fillRect(0, 0, W, H * 0.4);
      c.fillStyle = inn; c.beginPath(); c.moveTo(W * 0.2, H * 0.45); c.lineTo(W * 0.8, H * 0.45); c.lineTo(W * 1.05, H); c.lineTo(-W * 0.05, H); c.fill();
      c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(W * 0.2, H * 0.45); c.lineTo(W * 0.8, H * 0.45); c.moveTo(W * 0.5, H * 0.45); c.lineTo(W * 0.5, H); c.stroke();
      c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(0, H * 0.58, W, 2); c.fillStyle = "rgba(20,20,20,.25)"; for (var n = 0; n < W; n += 6) c.fillRect(n, H * 0.5, 1, H * 0.08);
    } else if (bg === "tramonto") {
      g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2B1B4A"); g.addColorStop(0.5, "#E0703A"); g.addColorStop(0.75, "#F7C25C"); g.addColorStop(0.76, "#3D6B3A"); g.addColorStop(1, "#24452A"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = "rgba(255,230,160,.85)"; c.beginPath(); c.arc(W * 0.7, H * 0.62, W * 0.12, Math.PI, 0); c.fill();
    } else if (bg === "tinta") {
      g = c.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, W * 0.75); g.addColorStop(0, lt); g.addColorStop(1, dk); c.fillStyle = g; c.fillRect(0, 0, W, H);
    } else {
      c.fillStyle = "#132029"; c.fillRect(0, 0, W, H);
      for (var k = 0; k < 70; k++) { var x = (k * 53 + t * 20 * ((k % 3) + 1)) % W, y = (k * 97 + t * 60 * ((k % 4) + 1)) % H; c.save(); c.translate(x, y); c.rotate(t * 2 + k); c.fillStyle = ["#E8A252", "#6FBE92", "#E08268", "#90CAF9", "#FDD835"][k % 5]; c.fillRect(-3, -5, 6, 10); c.restore(); }
    }
  }
  // cornice della foto secondo il livello (10/10): bronzo dal 5, argento dal 10, oro dal 20, diamante dal 35
  var CORNICI = [[35, "Diamante", ["#E1F5FE", "#4FC3F7", "#B3E5FC"]], [20, "Oro", ["#FFF3C4", "#C9A227", "#FFE082"]], [10, "Argento", ["#FFFFFF", "#90A4AE", "#ECEFF1"]], [5, "Bronzo", ["#F3D2B3", "#8D5524", "#E0A46A"]]];
  function cornice(lv) { for (var i = 0; i < CORNICI.length; i++) if (lv >= CORNICI[i][0]) return CORNICI[i]; return null; }
  function drawFrame(c, W, H, lv) {
    var f = cornice(lv), lw = W * 0.075;
    if (f) {
      var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, f[2][0]); g.addColorStop(0.45, f[2][1]); g.addColorStop(0.55, f[2][2]); g.addColorStop(1, f[2][1]);
      c.save(); c.lineWidth = lw; c.strokeStyle = g; rr(c, lw / 2, lw / 2, W - lw, H - lw, W * 0.24); c.stroke();
      c.lineWidth = 1.5; c.strokeStyle = "rgba(0,0,0,.25)"; rr(c, lw, lw, W - 2 * lw, H - 2 * lw, W * 0.2); c.stroke(); c.restore();
    }
    // numero del livello in basso a destra
    var r = W * 0.095, bx = W - r * 1.3, by = H - r * 1.3;
    c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fillStyle = f ? f[2][1] : "#2B3A44"; c.fill(); c.lineWidth = W * 0.015; c.strokeStyle = "#fff"; c.stroke();
    c.fillStyle = "#fff"; c.font = "800 " + Math.round(r * 1.05) + "px Archivo, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(lv), bx, by + r * 0.05);
  }
  window.G = { $: $, TAU: TAU, clamp: clamp, lerp: lerp, ease: ease, rnd: rnd, pick: pick, load: load, save: save, toast: toast, CAT: CAT, PELLE: PELLE, CAPELLI_COL: CAPELLI_COL, COLORI: COLORI,
               get av() { return av; }, set av(v) { av = v; }, pg: pg, wins: wins, unlocked: unlocked, reqOf: reqOf, price: price, AV_DEF: AV_DEF,
               setUnlock: function (fn) { unlockFn = fn; }, saveAv: saveAv, savePg: savePg, drawBall: drawBall, drawTennisBall: drawTennisBall, drawRacket: drawRacket, drawBat: drawBat, drawFootball: drawFootball, shade: shade,
               drawGuy: drawGuy, drawBg: drawBg, FONDI: FONDI, CORNICI: CORNICI, cornice: cornice, drawFrame: drawFrame, P: P, POSE0: POSE0, POSES: POSES, WINS: WINS, SAD: SAD, poseOf: poseOf, mixPose: mixPose, drawPoseExtras: drawPoseExtras, randomAv: randomAv, setup: setup, pt: pt, rr: rr, star: star };
})();
