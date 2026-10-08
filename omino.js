// L'omino nell'app (09/10, dal prototipo giochi.html approvato dall'utente): editor a figura intera, negozio con le
// monete, foto profilo scattata all'omino (niente foto caricate dal telefono) e i minigiochi di StatsFight (rigori e
// tennis, giochi_rigori.js e giochi_tennis.js). Disegno in giochi.js (window.G). L'app passa da window.SS:
//   level(), coins(), spent(), setPic(dataURL), toast(t,s), refresh(), show(view)
// Sul telefono: statsight.avatar2 (l'omino), statsight.omino (acquisti, regali della ruota, partite premiate).
// Col server: tutto sull'account (docs/piano_server.md); l'avversario dei minigiochi sara' l'omino dell'altro.
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var OM_KEY = "statsight.omino", GAME_COINS = 15, GAME_COINS_DAY = 5;
  var om = Object.assign({ buy: {}, regali: [], games: [], gx: {} }, G.load(OM_KEY, {}));
  // livello di ogni minigioco (10/10): esperienza propria (vittoria 30, sconfitta 10) e premi per l'omino che si
  // aprono a quel livello del gioco, anche se il livello dell'app e' piu' basso
  var GX_WIN = 30, GX_LOSS = 10, GX_STEPS = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080];
  var GAME_REW = {
    rigori: [[2, "guanti", "arancio"], [3, "pallone", "retro"], [4, "maglia", "portiere"], [6, "pallone", "notte"], [8, "guanti", "rosa"]],
    tennis: [[2, "racchetta", "rossa"], [3, "cappello", "visiera"], [4, "racchetta", "blu"], [6, "racchetta", "legno"], [8, "accessorio", "polsini"]],
    basket: [[2, "maglia", "canotta"], [3, "accessorio", "polsini"], [4, "capelli", "afro"], [6, "cappello", "rovescio"], [8, "accessorio", "occhiali"]],
    baseball: [[2, "cappello", "cappellino"], [3, "cappello", "rovescio"], [5, "capelli", "mullet"], [7, "accessorio", "quadrati"]],
    football: [[2, "cappello", "casco"], [3, "maglia", "banda"], [5, "maglia", "tuta"], [7, "esulta", "pugno"]],
    airhockey: [[2, "accessorio", "tondi"], [3, "cappello", "cuffie"], [5, "capelli", "ciuffo"], [7, "esulta", "aereo"]]
  };
  function gxLevel(xp) { var l = 1; while (l < GX_STEPS.length && xp >= GX_STEPS[l]) l++; if (l === GX_STEPS.length) l += Math.floor((xp - GX_STEPS[GX_STEPS.length - 1]) / 220); return l; }
  function gxNext(l) { return l < GX_STEPS.length ? GX_STEPS[l] : GX_STEPS[GX_STEPS.length - 1] + (l - GX_STEPS.length + 1) * 220; }
  function gameInfo(g) { var xp = (om.gx || {})[g] || 0, l = gxLevel(xp); return { xp: xp, lv: l, next: gxNext(l), rew: GAME_REW[g] || [] }; }
  function itemName(cat, id) { var it = (G.CAT[cat] || []).filter(function (x) { return x[0] === id; })[0]; return it ? it[1] : id; }
  function gameUnlocked(cat, id) { return Object.keys(GAME_REW).some(function (g) { var lv = gameInfo(g).lv; return GAME_REW[g].some(function (r) { return r[1] === cat && r[2] === id && lv >= r[0]; }); }); }
  function saveOm() { G.save(OM_KEY, om); }
  function SS() { return window.SS || { level: function () { return 1; }, coins: function () { return 0; }, toast: G.toast }; }
  function key(cat, id) { return cat + ":" + id; }
  // sbloccato: pezzo base col livello, pezzo strano solo comprato (o vinto alla ruota)
  G.setUnlock(function (cat, id) {
    var r = G.reqOf(cat, id);
    if (om.buy[key(cat, id)] || om.regali.indexOf(key(cat, id)) >= 0 || gameUnlocked(cat, id)) return true;
    return typeof r === "number" ? SS().level() >= r : false;
  });
  // monete: spese al negozio (-) e vinte ai minigiochi (+), dentro rewardState dell'app
  function spent() { return Object.keys(om.buy).reduce(function (t, k) { return t + (om.buy[k] || 0); }, 0); }
  function gameCoins() { return om.games.reduce(function (t, g) { return t + (g.coins || 0); }, 0); }
  // un regalo della ruota: un pezzo base ancora chiuso (null se sono tutti aperti)
  function regalo() {
    var lv = SS().level(), chiusi = [];
    Object.keys(G.CAT).forEach(function (cat) { G.CAT[cat].forEach(function (it) { var k = key(cat, it[0]); if (typeof it[2] === "number" && it[2] > lv && om.regali.indexOf(k) < 0) chiusi.push([k, it[1]]); }); });
    if (!chiusi.length) return null;
    var x = chiusi[Math.floor(Math.random() * chiusi.length)]; om.regali.push(x[0]); saveOm(); return x[1];
  }
  window.OMINO = { spent: spent, gameCoins: gameCoins, regalo: regalo, open: openEditor, openGame: openGame, avatar: function () { return G.av; } };

  // ------------------------------------------------------------------ editor
  // ordine (10/10): prima la forma della testa e il viso, poi capelli e cappelli che ci si adattano, poi il corpo
  var EDCATS = [["corpo", "Testa e viso"], ["capelli", "Capelli e barba"], ["cappello", "Cappelli"], ["fisico", "Corpo"], ["maglia", "Maglia"], ["sotto", "Pantaloncini e scarpe"], ["accessorio", "Accessori"],
                ["pallone", "Palloni"], ["racchetta", "Racchette"], ["guanti", "Guanti"], ["posa", "Pose"], ["esulta", "Esultanze"], ["foto", "Foto profilo"]];
  var LBL = { sesso: "Corpo", statura: "Statura", fisico: "Fisico", testa: "Forma della testa", occhi: "Occhi", naso: "Naso", bocca: "Bocca", capelli: "Taglio", barba: "Barba", scarpe: "Scarpe" };
  var edCat = "corpo", prev = null, preview = { pose: null, t: 0 }, t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }
  function itemsHtml(cat, k) {
    k = k || cat;
    return (LBL[cat] ? '<div class="omlbl">' + LBL[cat] + '</div>' : "") + '<div class="omgrid">' + G.CAT[cat].map(function (it) {
      var open = G.unlocked(cat, it[0]), p = G.price(it[2]), tag = open ? "" : p ? '<em class="omprice">' + p + ' monete</em>' : '<em>livello ' + it[2] + '</em>';
      return '<button class="omit' + (open ? "" : " lock") + '" type="button" data-omcat="' + cat + '" data-omkey="' + k + '" data-omval="' + it[0] + '" aria-pressed="' + (G.av[k] === it[0]) + '">'
        + '<canvas width="140" height="140" data-omthumb="' + cat + ':' + it[0] + '"></canvas><span>' + it[1] + '</span>' + tag + '</button>';
    }).join("") + '</div>';
  }
  function swatches(k, list, label) {
    return '<div class="omlbl">' + label + '</div><div class="omsw">' + list.map(function (col, i) { return '<button type="button" data-omsw="' + k + '" data-i="' + i + '" style="background:' + col + '" aria-pressed="' + (G.av[k] === i) + '" aria-label="' + label + ' ' + (i + 1) + '"></button>'; }).join("") + '</div>';
  }
  function renderEditor() {
    var box = $("omino"); if (!box) return;
    var lv = SS().level(), coins = SS().coins();
    var h = '<div class="omtop"><span class="omcoins"><svg class="ico"><use href="#i-coin"/></svg><b>' + coins + '</b> monete</span><span class="k">livello ' + lv + '</span><button class="chip" type="button" data-omrandom>Casuale</button></div>'
      + '<div class="card omstage"><canvas id="omprev"></canvas><div class="omrow"><input class="meinput" id="omnome" maxlength="12" placeholder="Nome sulla maglia" value="' + esc(G.av.nome || "") + '"><input class="meinput" id="omnum" type="number" min="0" max="99" inputmode="numeric" value="' + esc(String(G.av.num != null ? G.av.num : "")) + '"></div></div>'
      + '<div class="omcats">' + EDCATS.map(function (x) { return '<button type="button" data-omtab="' + x[0] + '" aria-pressed="' + (x[0] === edCat) + '">' + x[1] + '</button>'; }).join("") + '</div><div class="card">';
    if (edCat === "corpo") h += ["testa", "occhi", "naso", "bocca"].map(function (k) { return itemsHtml(k); }).join("") + swatches("pelle", G.PELLE, "Pelle");
    if (edCat === "fisico") h += ["sesso", "statura", "fisico"].map(function (k) { return itemsHtml(k); }).join("");
    if (edCat === "capelli") h += itemsHtml("capelli") + swatches("capCol", G.CAPELLI_COL, "Colore dei capelli") + itemsHtml("barba");
    if (edCat === "maglia") h += itemsHtml("maglia") + swatches("c1", G.COLORI, "Colore principale") + swatches("c2", G.COLORI, "Secondo colore");
    if (edCat === "sotto") h += swatches("pant", G.COLORI, "Pantaloncini") + swatches("calze", G.COLORI, "Calzettoni") + itemsHtml("scarpe") + swatches("scCol", G.COLORI, "Colore degli scarpini");
    if (edCat === "cappello") h += itemsHtml("cappello") + swatches("hatCol", G.COLORI, "Colore");
    if (["accessorio", "pallone", "racchetta", "guanti", "posa", "esulta"].indexOf(edCat) >= 0) h += '<div class="k">' + { accessorio: "", pallone: "Il pallone dei rigori e delle foto.", racchetta: "La racchetta del tennis.", guanti: "I guanti quando sei in porta.", posa: "La posa delle foto.", esulta: "Cosa fa il tuo omino quando vince." }[edCat] + '</div>' + itemsHtml(edCat);
    if (edCat === "foto") h += fotoHtml();
    h += '</div><div class="note">I pezzi base si aprono salendo di livello; quelli più strani si comprano con le monete che guadagni coi pronostici, le leghe e i minigiochi. Le monete non si comprano e non diventano soldi.</div>';
    box.innerHTML = h;
    prev = G.setup($("omprev"), 0.62);
    if (edCat === "foto") foto.cv = G.setup($("omfotocv"), 1);
    drawThumbs();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function drawThumbs() {
    document.querySelectorAll("#omino [data-omthumb]").forEach(function (cv) {
      var p = cv.dataset.omthumb.split(":"), cat = p[0], v = p[1], c = cv.getContext("2d"); c.clearRect(0, 0, 140, 140);
      if (cat === "pallone") { G.drawBall(c, 70, 70, 46, v, 0.4); return; }
      if (cat === "racchetta") { c.save(); c.translate(80, 128); c.rotate(-0.5); G.drawRacket(c, 120, v); c.restore(); return; }
      var A = Object.assign({}, G.av); if (cat !== "posa" && cat !== "esulta") A[cat] = v;
      var hy = 40 + 144 * ({ bassa: 0.86, alta: 1.13 }[A.statura] || 1);   // dai piedi al centro della testa
      if (["occhi", "naso", "bocca"].indexOf(cat) >= 0) { G.drawGuy(c, A, 70, 64 + hy * 2.3, 2.3, G.P({}), { noShadow: true }); return; }   // viso da vicino
      if (["capelli", "barba", "cappello", "accessorio", "testa"].indexOf(cat) >= 0) { G.drawGuy(c, A, 70, 88 + hy * 1.15, 1.15, G.P({}), { noShadow: true }); return; }
      if (cat === "guanti") { G.drawGuy(c, A, 70, 132, 0.56, G.P({ al: [-2.4, 0.3], ar: [2.4, -0.3] }), { keeper: true }); return; }
      if (cat === "posa" || cat === "esulta") { var ps = G.poseOf(v, 0.4); G.drawGuy(c, A, 70, 132, 0.55, ps, {}); G.drawPoseExtras(c, A, 70, 132, 0.55, v, ps); return; }
      if (cat === "maglia") { G.drawGuy(c, A, 70, 172, 0.8, G.P({}), { noShadow: true }); return; }
      G.drawGuy(c, A, 70, 134, 0.52, G.P({}), {});
    });
  }
  // l'omino e' cambiato: la foto del profilo si rifa' da sola (se non ne hai scattata una tu)
  var picT = null;
  function changed() { clearTimeout(picT); picT = setTimeout(function () { if (SS().setPic) SS().setPic(renderPic(), "rifai"); }, 400); }
  // omino a caso (10/10, per chi non vuole configurarlo): solo pezzi gia' aperti, colori a caso, maglia a due colori
  function casuale() {
    var pick = function (cat) { var ok = G.CAT[cat].filter(function (it) { return G.unlocked(cat, it[0]); }); return (ok.length ? G.pick(ok) : G.CAT[cat][0])[0]; };
    ["sesso", "statura", "fisico", "testa", "occhi", "naso", "bocca", "capelli", "barba", "maglia", "scarpe", "cappello"].forEach(function (k) { G.av[k] = pick(k); });
    if (G.av.sesso === "donna" && Math.random() < 0.85) G.av.barba = "no";
    if (Math.random() < 0.5) G.av.cappello = "no";
    var n = function (list) { return Math.floor(Math.random() * list.length); };
    G.av.pelle = n(G.PELLE); G.av.capCol = Math.random() < 0.8 ? n(G.CAPELLI_COL.slice(0, 6)) : n(G.CAPELLI_COL);
    G.av.c1 = n(G.COLORI); do { G.av.c2 = n(G.COLORI); } while (G.av.c2 === G.av.c1);
    G.av.pant = n(G.COLORI); G.av.calze = n(G.COLORI); G.av.scCol = n(G.COLORI); G.av.hatCol = n(G.COLORI);
    G.av.num = Math.floor(Math.random() * 99) + 1; G.av.fbg = G.pick(G.FONDI); G.av.fcol = n(G.COLORI);
    G.saveAv(); changed(); renderEditor();
  }
  function itemOf(cat, id) { return G.CAT[cat].filter(function (x) { return x[0] === id; })[0]; }
  function onClick(e) {
    var t = e.target.closest("button"); if (!t) return; var d = t.dataset;
    if (d.omtab) { edCat = d.omtab; renderEditor(); return; }
    if (d.omrandom != null) { casuale(); return; }
    if (d.omsw) { G.av[d.omsw] = Number(d.i); G.saveAv(); changed(); renderEditor(); return; }
    if (d.omval) {
      var it = itemOf(d.omcat, d.omval);
      if (!G.unlocked(d.omcat, it[0])) {
        var p = G.price(it[2]);
        if (!p) { SS().toast("Si apre al livello " + it[2], "Sali di livello coi pronostici"); return; }
        if (SS().coins() < p) { SS().toast("Servono " + p + " monete", "Ne hai " + SS().coins()); return; }
        if (!window.confirm("Comprare " + it[1] + " per " + p + " monete?")) return;
        om.buy[key(d.omcat, it[0])] = p; saveOm(); SS().refresh(); SS().toast("Comprato: " + it[1], "-" + p + " monete");
      }
      G.av[d.omkey] = it[0]; G.saveAv(); changed(); if (d.omcat === "posa" || d.omcat === "esulta") preview = { pose: it[0], t: now() };
      renderEditor(); return;
    }
    if (d.ombg) { G.av.fbg = d.ombg; G.saveAv(); changed(); renderEditor(); return; }
    if (d.omzoom) { G.av.fzoom = d.omzoom; G.saveAv(); changed(); renderEditor(); return; }
    if (d.omfp) { var fi = itemOf(d.omfcat, d.omfp); if (!G.unlocked(d.omfcat, d.omfp)) { SS().toast(G.price(fi[2]) ? "Si compra con " + G.price(fi[2]) + " monete" : "Si apre al livello " + fi[2], ""); return; } G.av.fpose = d.omfp; foto.t = now(); G.saveAv(); changed(); renderEditor(); return; }
    if (d.omscatta) { scatta(); return; }
    if (d.omgioca) { openGame(d.omgioca); return; }
  }
  // ------------------------------------------------------------------ foto profilo
  // Foto del profilo (10/10): sfondo (scena o disegno col colore scelto), posa e inquadratura restano salvati
  // nell'omino; la foto si rifa' da sola quando cambi l'omino o sali di livello (cornice e numero del livello),
  // cosi' fra tanti utenti ognuno si riconosce dal suo colore, dalla cornice e dal livello.
  var BGS = [["tinta", "Tinta unita"], ["righe", "Righe"], ["pois", "Pois"], ["raggi", "Raggi"], ["scacchi", "Scacchi"], ["onde", "Onde"], ["stelline", "Stelline"],
             ["stadio", "Stadio"], ["tennis", "Campo da tennis"], ["terra", "Terra rossa"], ["tramonto", "Tramonto"], ["coriandoli", "Coriandoli"]];
  var foto = { cv: null, t: 0 };
  function fset() { var a = G.av; return { bg: a.fbg || "tinta", col: a.fcol != null ? a.fcol : 8, pose: a.fpose || "piedi", zoom: a.fzoom || "busto" }; }
  if (G.av.fbg == null) {   // chi non l'ha mai scelto parte da un disegno e un colore a caso, non tutti uguali
    G.av.fbg = G.pick(G.FONDI); G.av.fcol = Math.floor(Math.random() * G.COLORI.length); G.saveAv();
  }
  function lvl() { var l = SS().level(); return l > 0 ? l : 1; }
  function fotoHtml() {
    var f = fset(), lv = lvl(), cn = G.cornice(lv), nx = G.CORNICI.slice().reverse().filter(function (x) { return x[0] > lv; })[0];
    var ch = function (cat) { return G.CAT[cat].map(function (p) { var lock = !G.unlocked(cat, p[0]); return '<button type="button" data-omfp="' + p[0] + '" data-omfcat="' + cat + '" aria-pressed="' + (p[0] === f.pose) + '"' + (lock ? ' class="lk"' : "") + '>' + p[1] + '</button>'; }).join(""); };
    return '<div class="omshot"><canvas id="omfotocv"></canvas><div class="omflash" id="omflash"></div></div>'
      + '<div class="k" style="margin:6px 0 2px;">Cornice: <b>' + (cn ? cn[1] : "nessuna") + '</b>' + (nx ? " · " + nx[1].toLowerCase() + " al livello " + nx[0] : "") + '. Il numero è il tuo livello.</div>'
      + '<div class="omlbl">Inquadratura</div><div class="omcats">' + [["busto", "Mezzo busto"], ["intero", "Figura intera"]].map(function (z) { return '<button type="button" data-omzoom="' + z[0] + '" aria-pressed="' + (z[0] === f.zoom) + '">' + z[1] + '</button>'; }).join("") + '</div>'
      + '<div class="omlbl">Sfondo</div><div class="omcats">' + BGS.map(function (b) { return '<button type="button" data-ombg="' + b[0] + '" aria-pressed="' + (b[0] === f.bg) + '">' + b[1] + '</button>'; }).join("") + '</div>'
      + (G.FONDI.indexOf(f.bg) >= 0 ? swatches("fcol", G.COLORI, "Colore dello sfondo") : "")
      + '<div class="omlbl">Posa</div><div class="omcats">' + ch("posa") + '</div><div class="omlbl">Esultanza</div><div class="omcats">' + ch("esulta") + '</div>'
      + '<button class="primary" type="button" data-omscatta="1" style="width:100%;margin-top:10px;">Scatta e usa come foto profilo</button>'
      + '<div class="k" style="margin-top:6px;">È la tua foto nell\'app: niente foto dal telefono, solo il tuo omino. Si aggiorna da sola quando cambi l\'omino o sali di livello.</div>';
  }
  var drawBg = G.drawBg;
  function paint(c, W, H, t) {   // la foto: sfondo, omino, cornice e livello
    var f = fset(); drawBg(c, W, H, f.bg, t, f.col);
    // mezzo busto: la testa grande al centro (in piccolo nel social si deve riconoscere la faccia)
    var hf = { bassa: 0.86, alta: 1.13 }[G.av.statura] || 1, big = f.zoom === "busto", s = big ? H / 118 : H / 260, fy = big ? H * 0.43 + (40 + 144 * hf) * s : H * 0.96, ps = G.poseOf(f.pose, t);
    G.drawGuy(c, G.av, W / 2, fy, s, ps, {}); G.drawPoseExtras(c, G.av, W / 2, fy, s, f.pose, ps);
    G.drawFrame(c, W, H, lvl());
  }
  function drawFoto(t) { if (foto.cv && $("omfotocv")) paint(foto.cv.c, foto.cv.W, foto.cv.H, t - foto.t); }
  function renderPic() { var cv = document.createElement("canvas"); cv.width = 256; cv.height = 256; paint(cv.getContext("2d"), 256, 256, 0.4); return cv.toDataURL("image/jpeg", 0.86); }
  function scatta() {
    var fl = $("omflash");
    if (fl) { fl.style.transition = "none"; fl.style.opacity = "0.9"; setTimeout(function () { fl.style.transition = "opacity .35s"; fl.style.opacity = "0"; }, 40); }
    SS().setPic(renderPic()); SS().toast("Foto profilo aggiornata", "La vedono tutti nell'app");
  }
  var autoPic = renderPic;
  window.OMINO.autoPic = autoPic;
  function drawPreview(t) {
    if (!prev || !$("omprev")) return;
    var c = prev.c, W = prev.W, H = prev.H, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1C3340"); g.addColorStop(1, "#0F1C22"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#2E5E3A"; c.fillRect(0, H * 0.84, W, H * 0.16);
    var s = H / 290, name = preview.pose || "piedi", ps = G.poseOf(name, t - preview.t);
    G.drawGuy(c, G.av, W * 0.32, H * 0.93, s, ps, {}); G.drawPoseExtras(c, G.av, W * 0.32, H * 0.93, s, name, ps);
    G.drawGuy(c, G.av, W * 0.72, H * 0.93, s * 0.8, G.P({}), { back: true });
    G.drawBall(c, W * 0.9, H * 0.88, 12 * s, G.av.pallone, t);
    c.save(); c.translate(W * 0.55, H * 0.95); c.rotate(-1.2); G.drawRacket(c, 52 * s, G.av.racchetta); c.restore();
  }
  function openEditor(tab) { if (tab) edCat = tab; SS().show("omino"); renderEditor(); window.scrollTo(0, 0); }

  // ------------------------------------------------------------------ minigiochi
  var game = null;
  var GIOCHI = { rigori: ["Rigori", "Sfida ai rigori"], tennis: ["Tennis", "Sfida a tennis"], basket: ["Basket", "Sfida a canestro"], baseball: ["Baseball", "Sfida a baseball"], football: ["Football", "Sfida di football americano"], airhockey: ["Airhockey", "Air hockey"] };
  // classifica generale del gioco per esperienza: tu e i personaggi del Team StatSight (dichiarati: giocano con una
  // regola fissa, piu' o meno forti, e salgono un po' ogni giorno). Col server diventa quella degli utenti veri.
  function hashStr(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function board(g) {
    var team = SS().team ? SS().team() : [], days = Math.max(1, Math.floor((Date.now() - Date.UTC(2026, 9, 1)) / 864e5));
    var rows = team.map(function (p) { var h = hashStr(p.id + ":" + g), skill = 0.25 + (h % 1000) / 1000; return { id: p.id, name: p.name, xp: Math.round(skill * (40 + days * (8 + (h >> 10) % 14))) }; });
    rows.push({ me: true, name: SS().myName ? SS().myName() : "Tu", xp: gameInfo(g).xp });
    rows.sort(function (a, b) { return b.xp - a.xp; });
    var pos = rows.findIndex(function (r) { return r.me; }), from = Math.max(0, Math.min(pos - 2, rows.length - 5));
    var view = rows.slice(from, from + 5);
    return '<div class="lb"><b>Classifica generale</b> <span style="opacity:.7">· sei ' + (pos + 1) + '° su ' + rows.length + '</span>' + view.map(function (r) {
      var i = rows.indexOf(r);
      return '<div class="lbr' + (r.me ? " me" : "") + '"><i>' + (i + 1) + '</i>' + (r.me ? (SS().myAvatar ? SS().myAvatar(20) : "") : (SS().avatar ? SS().avatar(r.id, 20) : "")) + '<span>' + esc(r.name) + (r.me ? "" : ' <span style="opacity:.6">(Team)</span>') + '</span><em>liv ' + gxLevel(r.xp) + ' · ' + r.xp + '</em></div>';
    }).join("") + '</div>';
  }
  // sotto il titolo del gioco: livello, esperienza e prossimo premio
  function gameHead(g) {
    var el = $("giocolv"); if (!el) return; var i = gameInfo(g), nx = i.rew.filter(function (r) { return r[0] > i.lv; })[0];
    var prev = i.lv - 1 < GX_STEPS.length ? GX_STEPS[i.lv - 1] : gxNext(i.lv - 1), pc = Math.round(100 * (i.xp - prev) / Math.max(1, i.next - prev));
    el.innerHTML = '<b>Livello ' + i.lv + '</b> <span class="k">' + i.xp + "/" + i.next + ' esperienza' + (nx ? " · al livello " + nx[0] + ": " + itemName(nx[1], nx[2]) : "") + '</span><div class="gxbar"><i style="width:' + Math.max(0, Math.min(100, pc)) + '%"></i></div>';
  }
  function mod(which) { return window[GIOCHI[which][0]]; }
  function openGame(which) {
    game = which;
    Object.keys(GIOCHI).forEach(function (k) { $("t-" + k).hidden = k !== which; });
    $("giocotitle").textContent = GIOCHI[which][1]; gameHead(which);
    SS().show("gioco"); window.scrollTo(0, 0);
    setTimeout(function () { var M = mod(which); M.resize(); M.show(); }, 30);
  }
  // vittoria: monete (al massimo GAME_COINS_DAY partite premiate al giorno, per non farne un rubinetto)
  window.UI = {
    tab: function () { return game && !$("view-gioco").hidden ? game : ""; },
    // fine partita (vinta o persa): esperienza del gioco, livello nuovo e premi; le monete solo se vinci
    // a = tuo punteggio, b = dell'avversario. Statistiche e record del gioco (om.gs), premi: vittoria (monete, max 5 al
    // giorno), prima vittoria del giorno in quel gioco (+10), nuovo record (+10), livello nuovo (+20 x livello)
    onEnd: function (g, win, a, b) {
      var before = gameInfo(g), today = new Date().toISOString().slice(0, 10); om.gx = om.gx || {}; om.gs = om.gs || {};
      var s = om.gs[g] = Object.assign({ p: 0, w: 0, cur: 0, best: 0, rec: null, day: "" }, om.gs[g] || {});
      s.p++; if (win) { s.w++; s.cur++; s.best = Math.max(s.best, s.cur); } else s.cur = 0;
      om.gx[g] = before.xp + (win ? GX_WIN : GX_LOSS);
      var after = gameInfo(g), out = win ? UI.onWin(g) : (G.pg.giocate++, G.savePg(), []), bonus = 0;
      if (win && s.day !== today) { s.day = today; bonus += 10; out.push("prima vittoria del giorno: +10 monete"); }
      var m = a != null && b != null ? a - b : null;
      if (win && m != null && (s.rec == null || m > s.rec)) { if (s.rec != null) { bonus += 10; out.push("nuovo record: +10 monete"); } s.rec = m; }
      out.push("+" + (win ? GX_WIN : GX_LOSS) + " esperienza");
      if (after.lv > before.lv) {
        bonus += 20 * after.lv; out.push("Livello " + after.lv + "! +" + 20 * after.lv + " monete");
        after.rew.filter(function (r) { return r[0] > before.lv && r[0] <= after.lv; }).forEach(function (r) { out.push("Sbloccato: " + itemName(r[1], r[2])); });
      }
      if (bonus) { om.games.push({ g: g, d: today, coins: bonus, bonus: 1 }); SS().refresh(); }
      saveOm(); gameHead(g); return out;
    },
    // riepilogo di fine partita: livello del gioco, statistiche, record, premi e classifica generale
    endCard: function (g, out) {
      var i = gameInfo(g), s = (om.gs || {})[g] || { p: 0, w: 0, best: 0, rec: null }, prev = i.lv - 1 < GX_STEPS.length ? GX_STEPS[i.lv - 1] : gxNext(i.lv - 1), pc = Math.round(100 * (i.xp - prev) / Math.max(1, i.next - prev));
      var nx = i.rew.filter(function (r) { return r[0] > i.lv; })[0];
      return '<div class="gend"><div class="gl"><b>Livello ' + i.lv + '</b><span>' + i.xp + "/" + i.next + ' esperienza</span></div><div class="gxbar"><i style="width:' + Math.max(0, Math.min(100, pc)) + '%"></i></div>'
        + (nx ? '<div style="opacity:.8">Al livello ' + nx[0] + ': ' + esc(itemName(nx[1], nx[2])) + '</div>' : "")
        + '<div class="gs"><div><b>' + s.p + '</b><span>partite</span></div><div><b>' + s.w + '</b><span>vinte</span></div><div><b>' + s.best + '</b><span>serie record</span></div><div><b>' + (s.rec != null ? (s.rec > 0 ? "+" : "") + s.rec : "–") + '</b><span>miglior scarto</span></div></div>'
        + (out && out.length ? '<div class="gn">' + out.map(esc).join(" · ") + '</div>' : "") + board(g) + '</div>';
    },
    onWin: function (g) {
      var today = new Date().toISOString().slice(0, 10), n = om.games.filter(function (x) { return x.d === today && x.coins && !x.bonus; }).length;
      var c = n < GAME_COINS_DAY ? GAME_COINS : 0;
      om.games.push({ g: g, d: today, coins: c }); saveOm(); SS().refresh();
      return [c ? "+" + c + " monete" : "monete del giorno già prese (" + GAME_COINS_DAY + " vittorie)"];
    }
  };
  document.addEventListener("click", function (e) { if (e.target.closest("#omino")) onClick(e); });
  document.addEventListener("input", function (e) {
    if (e.target.id === "omnome") { G.av.nome = e.target.value.slice(0, 12); G.saveAv(); changed(); }
    if (e.target.id === "omnum") { var n = parseInt(e.target.value, 10); G.av.num = isNaN(n) ? "" : Math.max(0, Math.min(99, n)); G.saveAv(); }
  });
  // la tastiera del telefono cambia l'altezza dello schermo: se stai scrivendo il nome non si ridisegna (si chiuderebbe)
  window.addEventListener("resize", function () { var ae = document.activeElement; if (ae && ae.closest && ae.closest("#omino") && /INPUT|TEXTAREA/.test(ae.tagName)) return; if ($("view-omino") && !$("view-omino").hidden) renderEditor(); else if (game && !$("view-gioco").hidden) mod(game).resize(); });
  var lvT = 0;
  function loop() {
    var t = now();
    if (t - lvT > 3) { lvT = t; var L = SS().level(); if (window.SS && L > 0 && om.picLv !== L) { om.picLv = L; saveOm(); if (SS().setPic) SS().setPic(renderPic(), "rifai"); } }
    if ($("view-omino") && !$("view-omino").hidden) { drawPreview(t); drawFoto(t); }
    if (game && $("view-gioco") && !$("view-gioco").hidden) mod(game).frame(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
