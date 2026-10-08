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
  var om = Object.assign({ buy: {}, regali: [], games: [] }, G.load(OM_KEY, {}));
  function saveOm() { G.save(OM_KEY, om); }
  function SS() { return window.SS || { level: function () { return 1; }, coins: function () { return 0; }, toast: G.toast }; }
  function key(cat, id) { return cat + ":" + id; }
  // sbloccato: pezzo base col livello, pezzo strano solo comprato (o vinto alla ruota)
  G.setUnlock(function (cat, id) {
    var r = G.reqOf(cat, id);
    if (om.buy[key(cat, id)] || om.regali.indexOf(key(cat, id)) >= 0) return true;
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
  function changed() { clearTimeout(picT); picT = setTimeout(function () { if (SS().setPic) SS().setPic(autoPic(), true); }, 400); }
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
    G.av.num = Math.floor(Math.random() * 99) + 1;
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
    if (d.ombg) { foto.bg = d.ombg; renderEditor(); return; }
    if (d.omzoom) { foto.zoom = d.omzoom; renderEditor(); return; }
    if (d.omfp) { var fi = itemOf(d.omfcat, d.omfp); if (!G.unlocked(d.omfcat, d.omfp)) { SS().toast(G.price(fi[2]) ? "Si compra con " + G.price(fi[2]) + " monete" : "Si apre al livello " + fi[2], ""); return; } foto.pose = d.omfp; foto.t = now(); renderEditor(); return; }
    if (d.omscatta) { scatta(); return; }
    if (d.omgioca) { openGame(d.omgioca); return; }
  }
  // ------------------------------------------------------------------ foto profilo
  var BGS = [["stadio", "Stadio"], ["tennis", "Campo da tennis"], ["terra", "Terra rossa"], ["tramonto", "Tramonto"], ["tinta", "Tinta unita"], ["coriandoli", "Coriandoli"]];
  var foto = { bg: "stadio", pose: "piedi", zoom: "busto", cv: null, t: 0 };
  function fotoHtml() {
    var ch = function (cat) { return G.CAT[cat].map(function (p) { var lock = !G.unlocked(cat, p[0]); return '<button type="button" data-omfp="' + p[0] + '" data-omfcat="' + cat + '" aria-pressed="' + (p[0] === foto.pose) + '"' + (lock ? ' class="lk"' : "") + '>' + p[1] + '</button>'; }).join(""); };
    return '<div class="omshot"><canvas id="omfotocv"></canvas><div class="omflash" id="omflash"></div></div>'
      + '<div class="omlbl">Inquadratura</div><div class="omcats">' + [["busto", "Mezzo busto"], ["intero", "Figura intera"]].map(function (z) { return '<button type="button" data-omzoom="' + z[0] + '" aria-pressed="' + (z[0] === foto.zoom) + '">' + z[1] + '</button>'; }).join("") + '</div>'
      + '<div class="omlbl">Sfondo</div><div class="omcats">' + BGS.map(function (b) { return '<button type="button" data-ombg="' + b[0] + '" aria-pressed="' + (b[0] === foto.bg) + '">' + b[1] + '</button>'; }).join("") + '</div>'
      + '<div class="omlbl">Posa</div><div class="omcats">' + ch("posa") + '</div><div class="omlbl">Esultanza</div><div class="omcats">' + ch("esulta") + '</div>'
      + '<button class="primary" type="button" data-omscatta="1" style="width:100%;margin-top:10px;">Scatta e usa come foto profilo</button>'
      + '<div class="k" style="margin-top:6px;">È la tua foto nell\'app: niente foto dal telefono, solo il tuo omino.</div>';
  }
  var drawBg = G.drawBg;
  function drawFoto(t) {
    if (!foto.cv || !$("omfotocv")) return;
    var c = foto.cv.c, W = foto.cv.W, H = foto.cv.H;
    drawBg(c, W, H, foto.bg, t);
    var big = foto.zoom === "busto", s = big ? H / 205 : H / 260, fy = big ? H * 1.22 : H * 0.96, ps = G.poseOf(foto.pose, t - foto.t);
    G.drawGuy(c, G.av, W / 2, fy, s, ps, {}); G.drawPoseExtras(c, G.av, W / 2, fy, s, foto.pose, ps);
  }
  function scatta() {
    var src = $("omfotocv"), out = document.createElement("canvas"); out.width = 256; out.height = 256;
    out.getContext("2d").drawImage(src, 0, 0, 256, 256);
    var url = out.toDataURL("image/jpeg", 0.86), fl = $("omflash");
    if (fl) { fl.style.transition = "none"; fl.style.opacity = "0.9"; setTimeout(function () { fl.style.transition = "opacity .35s"; fl.style.opacity = "0"; }, 40); }
    SS().setPic(url); SS().toast("Foto profilo aggiornata", "La vedono tutti nell'app");
  }
  // foto automatica (mezzo busto, stadio) per chi non ne ha ancora scattata una
  function autoPic() {
    var cv = document.createElement("canvas"); cv.width = 256; cv.height = 256; var c = cv.getContext("2d");
    drawBg(c, 256, 256, "stadio", 0); G.drawGuy(c, G.av, 128, 256 * 1.22, 256 / 205, G.P({ face: "happy" }), {});
    return cv.toDataURL("image/jpeg", 0.86);
  }
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
  function mod(which) { return window[GIOCHI[which][0]]; }
  function openGame(which) {
    game = which;
    Object.keys(GIOCHI).forEach(function (k) { $("t-" + k).hidden = k !== which; });
    $("giocotitle").textContent = GIOCHI[which][1];
    SS().show("gioco"); window.scrollTo(0, 0);
    setTimeout(function () { var M = mod(which); M.resize(); M.show(); }, 30);
  }
  // vittoria: monete (al massimo GAME_COINS_DAY partite premiate al giorno, per non farne un rubinetto)
  window.UI = {
    tab: function () { return game && !$("view-gioco").hidden ? game : ""; },
    onWin: function (g) {
      var today = new Date().toISOString().slice(0, 10), n = om.games.filter(function (x) { return x.d === today && x.coins; }).length;
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
  window.addEventListener("resize", function () { if ($("view-omino") && !$("view-omino").hidden) renderEditor(); else if (game && !$("view-gioco").hidden) mod(game).resize(); });
  function loop() {
    var t = now();
    if ($("view-omino") && !$("view-omino").hidden) { drawPreview(t); drawFoto(t); }
    if (game && $("view-gioco") && !$("view-gioco").hidden) mod(game).frame(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
