// StatsFight giochi (prototipo 09/10): schede, editor dell'omino, modalita' foto. Usa window.G (giochi.js).
(function () {
  "use strict";
  var G = window.G, $ = G.$;
  var tab = "avatar", t0 = performance.now();
  window.UI = { tab: function () { return tab; }, time: function () { return (performance.now() - t0) / 1000; }, onWin: onWin };

  // ------------------------------------------------------------------ schede
  $("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab;
    document.querySelectorAll("#tabs [data-tab]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    ["avatar", "foto", "rigori", "tennis"].forEach(function (k) { $("t-" + k).hidden = k !== tab; });
    resize();
    if (tab === "rigori" && window.Rigori) window.Rigori.show();
    if (tab === "tennis" && window.Tennis) window.Tennis.show();
  });

  // ------------------------------------------------------------------ editor
  var EDCATS = [["corpo", "Corpo"], ["maglia", "Maglia"], ["sotto", "Pantaloncini"], ["scarpe", "Scarpe"], ["cappello", "Cappello"], ["accessorio", "Accessori"],
                ["pallone", "Palloni"], ["racchetta", "Racchette"], ["guanti", "Guanti"], ["posa", "Pose"], ["esulta", "Esultanze"]];
  var edCat = "corpo", prev = null, preview = { pose: null };
  function itemsHtml(cat, key) {
    return '<div class="grid">' + G.CAT[cat].map(function (it) {
      var lock = !G.unlocked(cat, it[0]);
      return '<button class="it' + (lock ? " lock" : "") + '" type="button" data-cat="' + cat + '" data-key="' + key + '" data-val="' + it[0] + '" aria-pressed="' + (G.av[key] === it[0]) + '">'
        + '<canvas width="140" height="140" data-thumb="' + cat + ':' + it[0] + '"></canvas><span>' + it[1] + (lock ? '<br>' + it[2] + (it[2] === 1 ? " vittoria" : " vittorie") : "") + '</span>'
        + (lock ? '<svg class="lk"><use href="#i-lock"/></svg>' : "") + '</button>';
    }).join("") + '</div>';
  }
  function swatches(key, list, label) {
    return '<div class="lbl">' + label + '</div><div class="sw">' + list.map(function (col, i) { return '<button type="button" data-sw="' + key + '" data-i="' + i + '" style="background:' + col + '" aria-pressed="' + (G.av[key] === i) + '" aria-label="Colore ' + (i + 1) + '"></button>'; }).join("") + '</div>';
  }
  function renderPanel() {
    $("avcats").innerHTML = EDCATS.map(function (x) { return '<button type="button" data-ecat="' + x[0] + '" aria-pressed="' + (x[0] === edCat) + '">' + x[1] + '</button>'; }).join("");
    var h = "";
    if (edCat === "corpo") h = swatches("pelle", G.PELLE, "Pelle") + '<div class="lbl">Capelli</div>' + itemsHtml("capelli", "capelli") + swatches("capCol", G.CAPELLI_COL, "Colore dei capelli") + '<div class="lbl">Barba</div>' + itemsHtml("barba", "barba");
    if (edCat === "maglia") h = itemsHtml("maglia", "maglia") + swatches("c1", G.COLORI, "Colore principale") + swatches("c2", G.COLORI, "Secondo colore");
    if (edCat === "sotto") h = swatches("pant", G.COLORI, "Pantaloncini") + swatches("calze", G.COLORI, "Calzettoni");
    if (edCat === "scarpe") h = itemsHtml("scarpe", "scarpe") + swatches("scCol", G.COLORI, "Colore degli scarpini");
    if (edCat === "cappello") h = itemsHtml("cappello", "cappello") + swatches("hatCol", G.COLORI, "Colore");
    if (edCat === "accessorio") h = itemsHtml("accessorio", "accessorio");
    if (edCat === "pallone") h = '<div class="k">Il pallone che usi ai rigori e nelle foto.</div>' + itemsHtml("pallone", "pallone");
    if (edCat === "racchetta") h = '<div class="k">La racchetta che usi a tennis.</div>' + itemsHtml("racchetta", "racchetta");
    if (edCat === "guanti") h = '<div class="k">I guanti quando sei in porta.</div>' + itemsHtml("guanti", "guanti");
    if (edCat === "posa") h = '<div class="k">La posa delle foto.</div>' + itemsHtml("posa", "posa");
    if (edCat === "esulta") h = '<div class="k">Quello che fa il tuo omino quando vince.</div>' + itemsHtml("esulta", "esulta");
    $("avpanel").innerHTML = h;
    drawThumbs();
    $("pgtxt").textContent = "Vittorie: " + G.wins() + " (rigori " + G.pg.rigori + ", tennis " + G.pg.tennis + "). Ogni vittoria sblocca vestiti, palloni, racchette, pose ed esultanze.";
    $("unlockall").checked = !!G.pg.tutto;
    $("avname").value = G.av.nome || ""; $("avnum").value = G.av.num;
  }
  function drawThumbs() {
    document.querySelectorAll("[data-thumb]").forEach(function (cv) {
      var p = cv.dataset.thumb.split(":"), cat = p[0], v = p[1], c = cv.getContext("2d");
      c.clearRect(0, 0, 140, 140);
      if (cat === "pallone") { G.drawBall(c, 70, 70, 46, v, 0.4); return; }
      if (cat === "racchetta") { c.save(); c.translate(80, 128); c.rotate(-0.5); G.drawRacket(c, 120, v); c.restore(); return; }
      var A = Object.assign({}, G.av); var key = { capelli: "capelli", barba: "barba", maglia: "maglia", cappello: "cappello", accessorio: "accessorio", scarpe: "scarpe", guanti: "guanti" }[cat];
      if (key) A[key] = v;
      if (cat === "capelli" || cat === "barba" || cat === "cappello" || cat === "accessorio") { G.drawGuy(c, A, 70, 300, 1.15, G.P({}), { noShadow: true }); return; }
      if (cat === "scarpe") { G.drawGuy(c, A, 70, 128, 0.55, G.P({}), {}); return; }
      if (cat === "guanti") { G.drawGuy(c, A, 70, 132, 0.56, G.P({ al: [-2.4, 0.3], ar: [2.4, -0.3] }), { keeper: true }); return; }
      if (cat === "posa" || cat === "esulta") { var ps = G.poseOf(v, 0.4); G.drawGuy(c, A, 70, 132, 0.55, ps, {}); G.drawPoseExtras(c, A, 70, 132, 0.55, v, ps); return; }
      G.drawGuy(c, A, 70, 172, 0.8, G.P({}), { noShadow: true });
    });
  }
  $("avcats").addEventListener("click", function (e) { var b = e.target.closest("[data-ecat]"); if (!b) return; edCat = b.dataset.ecat; renderPanel(); });
  $("avpanel").addEventListener("click", function (e) {
    var s = e.target.closest("[data-sw]"); if (s) { G.av[s.dataset.sw] = Number(s.dataset.i); G.saveAv(); renderPanel(); return; }
    var b = e.target.closest("[data-val]"); if (!b) return;
    var cat = b.dataset.cat, it = G.CAT[cat].filter(function (x) { return x[0] === b.dataset.val; })[0];
    if (!G.unlocked(cat, it[0])) { G.toast("Vinci " + it[2] + (it[2] === 1 ? " partita" : " partite") + " per sbloccarlo"); return; }
    G.av[b.dataset.key] = it[0]; G.saveAv(); renderPanel();
    if (cat === "posa" || cat === "esulta") { preview.pose = it[0]; preview.t = UI.time(); }
  });
  $("avname").addEventListener("input", function (e) { G.av.nome = e.target.value.slice(0, 14); G.saveAv(); });
  $("avnum").addEventListener("input", function (e) { var n = parseInt(e.target.value, 10); G.av.num = isNaN(n) ? "" : Math.max(0, Math.min(99, n)); G.saveAv(); });
  $("unlockall").addEventListener("change", function (e) { G.pg.tutto = e.target.checked; G.savePg(); renderPanel(); });
  function drawPreview(t) {
    if (!prev) return;
    var c = prev.c, W = prev.W, H = prev.H;
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1C3340"); g.addColorStop(1, "#0F1C22"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#2E5E3A"; c.fillRect(0, H * 0.82, W, H * 0.18);
    var s = H / 300, name = preview.pose || "piedi", ps = G.poseOf(name, t);
    G.drawGuy(c, G.av, W * 0.32, H * 0.9, s, ps, {}); G.drawPoseExtras(c, G.av, W * 0.32, H * 0.9, s, name, ps);
    G.drawGuy(c, G.av, W * 0.72, H * 0.9, s * 0.8, G.P({}), { back: true });
    G.drawBall(c, W * 0.9, H * 0.86, 13 * s, G.av.pallone, t);
    c.save(); c.translate(W * 0.55, H * 0.93); c.rotate(-1.2); G.drawRacket(c, 55 * s, G.av.racchetta); c.restore();
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = "600 11px Archivo"; c.textAlign = "center"; c.fillText("davanti", W * 0.32, 16); c.fillText("di schiena", W * 0.72, 16);
  }

  // ------------------------------------------------------------------ foto profilo
  var BGS = [["stadio", "Stadio"], ["tennis", "Campo da tennis"], ["terra", "Terra rossa"], ["tramonto", "Tramonto"], ["tinta", "Tinta unita"], ["coriandoli", "Coriandoli"]];
  var foto = { bg: "stadio", pose: G.av.posa || "piedi", cv: null, zoom: "busto" };
  function drawBg(c, W, H, bg, t) {
    var g;
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
      g = c.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, W * 0.75); g.addColorStop(0, "#F0B36B"); g.addColorStop(1, "#8A5115"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    } else {
      c.fillStyle = "#132029"; c.fillRect(0, 0, W, H);
      for (var k = 0; k < 70; k++) { var x = (k * 53 + t * 20 * ((k % 3) + 1)) % W, y = (k * 97 + t * 60 * ((k % 4) + 1)) % H; c.save(); c.translate(x, y); c.rotate(t * 2 + k); c.fillStyle = ["#E8A252", "#6FBE92", "#E08268", "#90CAF9", "#FDD835"][k % 5]; c.fillRect(-3, -5, 6, 10); c.restore(); }
    }
  }
  function renderFotoChips() {
    $("fzoom").innerHTML = [["busto", "Mezzo busto"], ["intero", "Figura intera"]].map(function (z) { return '<button type="button" data-zoom="' + z[0] + '" aria-pressed="' + (z[0] === foto.zoom) + '">' + z[1] + '</button>'; }).join("");
    $("fbg").innerHTML = BGS.map(function (b) { return '<button type="button" data-bg="' + b[0] + '" aria-pressed="' + (b[0] === foto.bg) + '">' + b[1] + '</button>'; }).join("");
    var ch = function (cat) { return G.CAT[cat].map(function (p) { var lock = !G.unlocked(cat, p[0]); return '<button type="button" data-fp="' + p[0] + '" data-fcat="' + cat + '" aria-pressed="' + (p[0] === foto.pose) + '"' + (lock ? ' style="opacity:.45"' : "") + '>' + p[1] + (lock ? " (bloccata)" : "") + '</button>'; }).join(""); };
    $("fpose").innerHTML = ch("posa"); $("fwin").innerHTML = ch("esulta");
  }
  $("fzoom").addEventListener("click", function (e) { var b = e.target.closest("[data-zoom]"); if (b) { foto.zoom = b.dataset.zoom; renderFotoChips(); } });
  $("fbg").addEventListener("click", function (e) { var b = e.target.closest("[data-bg]"); if (b) { foto.bg = b.dataset.bg; renderFotoChips(); } });
  function fotoPose(e) { var b = e.target.closest("[data-fp]"); if (!b) return; if (!G.unlocked(b.dataset.fcat, b.dataset.fp)) { var it = G.CAT[b.dataset.fcat].filter(function (x) { return x[0] === b.dataset.fp; })[0]; G.toast("Vinci " + it[2] + " partite per sbloccarla"); return; } foto.pose = b.dataset.fp; foto.t = UI.time(); renderFotoChips(); }
  $("fpose").addEventListener("click", fotoPose); $("fwin").addEventListener("click", fotoPose);
  function drawFoto(t) {
    if (!foto.cv) return;
    var c = foto.cv.c, W = foto.cv.W, H = foto.cv.H;
    drawBg(c, W, H, foto.bg, t);
    var big = foto.zoom === "busto", s = big ? H / 205 : H / 260, fy = big ? H * 1.22 : H * 0.96, ps = G.poseOf(foto.pose, t - (foto.t || 0));
    G.drawGuy(c, G.av, W / 2, fy, s, ps, {}); G.drawPoseExtras(c, G.av, W / 2, fy, s, foto.pose, ps);
  }
  $("scatta").addEventListener("click", function () {
    var src = $("fotocv"), out = document.createElement("canvas"), n = 512;
    out.width = n; out.height = n; out.getContext("2d").drawImage(src, 0, 0, n, n);
    var url = out.toDataURL("image/png");
    $("flash").style.transition = "none"; $("flash").style.opacity = "0.9"; setTimeout(function () { $("flash").style.transition = "opacity .35s"; $("flash").style.opacity = "0"; }, 40);
    $("fimg").src = url; $("fdl").href = url; $("fres").hidden = false;
  });
  $("fuse").addEventListener("click", function () { try { localStorage.setItem("statsight.foto2", $("fimg").src); } catch (e) {} headPic(); G.toast("Foto profilo salvata"); });
  function headPic() { var u = null; try { u = localStorage.getItem("statsight.foto2"); } catch (e) {} $("hpic").innerHTML = u ? '<img src="' + u + '" alt="La tua foto">' : ""; }

  // ------------------------------------------------------------------ vittoria: sblocchi nuovi
  function onWin(game) {
    var before = G.wins();
    G.pg[game]++; G.pg.giocate++; G.savePg();
    var nuovi = [];
    Object.keys(G.CAT).forEach(function (cat) { G.CAT[cat].forEach(function (it) { if (it[2] > before && it[2] <= G.wins()) nuovi.push(it[1]); }); });
    return nuovi;
  }

  // ------------------------------------------------------------------ ciclo
  function resize() {
    if (tab === "avatar") { prev = G.setup($("avprev"), 0.72); renderPanel(); }
    if (tab === "foto") { foto.cv = G.setup($("fotocv"), 1); renderFotoChips(); }
    if (tab === "rigori" && window.Rigori) window.Rigori.resize();
    if (tab === "tennis" && window.Tennis) window.Tennis.resize();
  }
  window.addEventListener("resize", function () { clearTimeout(resize.h); resize.h = setTimeout(resize, 150); });
  function loop() {
    var t = UI.time();
    if (tab === "avatar") drawPreview(t - (preview.t || 0));
    if (tab === "foto") drawFoto(t);
    if (tab === "rigori" && window.Rigori) window.Rigori.frame(t);
    if (tab === "tennis" && window.Tennis) window.Tennis.frame(t);
    requestAnimationFrame(loop);
  }
  window.UI.renderPanel = renderPanel;
  document.addEventListener("DOMContentLoaded", function () { headPic(); resize(); requestAnimationFrame(loop); });
  if (document.readyState !== "loading") { headPic(); setTimeout(function () { resize(); requestAnimationFrame(loop); }, 0); }
})();
