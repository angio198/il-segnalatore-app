// Profilazione dell'utente (richiesta 02/10/2026): nazione, sport, squadre e tennisti preferiti. Da qui l'app
// decide cosa mettere in primo piano nelle Partite e quali sfide settimanali mostrare.
// - COMPS: competizioni riconosciute dal nome Betfair (regex), con la sfida settimanale che portano.
// - SPOT: le coppe e le nazionali vanno in primo piano nei giorni in cui giocano (Champions mar/mer, Europa e
//   Conference il giovedi', Nations League nelle soste; qualificazioni e amichevoli delle nazionali).
// - PAESI: per ogni nazione i campionati di casa in ordine, la nazionale, gli sport di partenza. Gli Stati Uniti
//   partono dai loro sport (NBA, NHL, MLS): li' si segue poco il resto.
// - LEGHE / SQUADRE / COLORI: la scelta del preferito (sport -> campionato -> squadra o tennista).
// Niente stemmi veri (sono marchi): l'app disegna un logo suo con colori e iniziali (teamLogo in index.html).
(function () {
  "use strict";
  var COMPS = [
    { id: "ucl", re: /uefa champions league/i, label: "Champions League", sport: "calcio" },
    { id: "uel", re: /uefa europa league/i, label: "Europa League", sport: "calcio" },
    { id: "uecl", re: /uefa (europa )?conference league/i, label: "Conference League", sport: "calcio" },
    { id: "unl", re: /uefa nations league/i, label: "Nations League", sport: "calcio" },
    { id: "cnl", re: /concacaf nations league|gold cup/i, label: "CONCACAF", sport: "calcio" },
    { id: "naz", re: /world cup qual|wc qual|euro qual|european championship qual|friendlies international/i, label: "Nazionali", sport: "calcio" },
    { id: "ita1", re: /^italian serie a/i, label: "Serie A", sport: "calcio" },
    { id: "ita2", re: /^italian serie b/i, label: "Serie B", sport: "calcio" },
    { id: "ita3", re: /^italian serie c|lega pro/i, label: "Serie C", sport: "calcio" },
    { id: "itac", re: /italian cup|coppa italia/i, label: "Coppa Italia", sport: "calcio" },
    { id: "eng1", re: /english premier league/i, label: "Premier League", sport: "calcio" },
    { id: "eng2", re: /english championship/i, label: "Championship", sport: "calcio" },
    { id: "engc", re: /english fa cup|^fa cup|english league cup|carabao/i, label: "Coppe inglesi", sport: "calcio" },
    { id: "esp1", re: /spanish la ?liga|^la liga/i, label: "LaLiga", sport: "calcio" },
    { id: "esp2", re: /spanish segunda/i, label: "Segunda", sport: "calcio" },
    { id: "ger1", re: /german bundesliga(?! 2)/i, label: "Bundesliga", sport: "calcio" },
    { id: "ger2", re: /german bundesliga 2/i, label: "2. Bundesliga", sport: "calcio" },
    { id: "fra1", re: /french ligue 1/i, label: "Ligue 1", sport: "calcio" },
    { id: "fra2", re: /french ligue 2/i, label: "Ligue 2", sport: "calcio" },
    { id: "por1", re: /portuguese primeira|liga portugal/i, label: "Liga Portugal", sport: "calcio" },
    { id: "ned1", re: /dutch eredivisie/i, label: "Eredivisie", sport: "calcio" },
    { id: "mls", re: /\bmls\b|us major league soccer/i, label: "MLS", sport: "calcio" },
    { id: "bra1", re: /brazilian serie a/i, label: "Brasileirão", sport: "calcio" },
    { id: "arg1", re: /argentinian primera division/i, label: "Liga Argentina", sport: "calcio" },
    { id: "atp", re: /^atp\b|atp singles|^atp /i, label: "ATP", sport: "tennis" },
    { id: "wta", re: /^wta\b|wta singles/i, label: "WTA", sport: "tennis" },
    { id: "chal", re: /challenger/i, label: "Challenger", sport: "tennis" },
    { id: "nba", re: /\bnba\b/i, label: "NBA", sport: "basket" },
    { id: "euro", re: /euroleague|eurocup/i, label: "EuroLeague", sport: "basket" },
    { id: "nhl", re: /\bnhl\b/i, label: "NHL", sport: "hockey" }
  ];
  var SPOT = ["ucl", "uel", "uecl", "unl", "naz"];   // la CONCACAF va in primo piano solo per gli USA (PAESI.US)
  var BIG = ["eng1", "esp1", "ita1", "ger1", "fra1", "atp", "wta", "nba", "nhl"];
  var PAESI = {
    IT: { name: "Italia", flag: "🇮🇹", leagues: ["ita1", "ita2", "ita3", "itac"], nat: ["Italy", "Italia"], sports: ["calcio", "tennis"] },
    GB: { name: "Regno Unito", flag: "🇬🇧", leagues: ["eng1", "eng2", "engc"], nat: ["England", "Scotland", "Wales"], sports: ["calcio", "tennis"] },
    ES: { name: "Spagna", flag: "🇪🇸", leagues: ["esp1", "esp2"], nat: ["Spain"], sports: ["calcio", "tennis", "basket"] },
    DE: { name: "Germania", flag: "🇩🇪", leagues: ["ger1", "ger2"], nat: ["Germany"], sports: ["calcio", "hockey"] },
    FR: { name: "Francia", flag: "🇫🇷", leagues: ["fra1", "fra2"], nat: ["France"], sports: ["calcio", "tennis"] },
    PT: { name: "Portogallo", flag: "🇵🇹", leagues: ["por1"], nat: ["Portugal"], sports: ["calcio"] },
    NL: { name: "Paesi Bassi", flag: "🇳🇱", leagues: ["ned1"], nat: ["Netherlands"], sports: ["calcio"] },
    US: { name: "Stati Uniti", flag: "🇺🇸", leagues: ["nba", "nhl", "mls", "cnl"], nat: ["USA", "United States"], sports: ["basket", "hockey"] },
    BR: { name: "Brasile", flag: "🇧🇷", leagues: ["bra1"], nat: ["Brazil"], sports: ["calcio"] },
    AR: { name: "Argentina", flag: "🇦🇷", leagues: ["arg1"], nat: ["Argentina"], sports: ["calcio", "tennis"] },
    XX: { name: "Altro", flag: "🌍", leagues: [], nat: [], sports: ["calcio"] }
  };
  // Scelta del preferito, un solo percorso (richiesta utente 02/10): sport -> campionato -> squadra (o tennista).
  // LEGHE: i campionati da scegliere per sport (quelli del paese dell'utente vanno davanti, in index.html).
  // SQUADRE: per campionato. Serie A, B, Premier, LaLiga, Bundesliga e Ligue 1 della stagione 2026-27, le altre
  // della 2025-26: da ricontrollare a ogni stagione; si puo' sempre
  // scrivere un nome che manca. I nomi delle squadre si usano come fanno tutti i siti di risultati (servono a
  // riconoscere le partite); gli stemmi NO: il logo lo disegna l'app (teamLogo) con i colori sociali di COLORI.
  var LEGHE = {
    calcio: ["ita1", "ita2", "eng1", "esp1", "ger1", "fra1", "por1", "ned1", "naz", "mls", "bra1", "arg1"],
    tennis: ["atp", "wta"],
    basket: ["nba", "euro"],
    hockey: ["nhl"],
    ippica: []
  };
  var SQUADRE = {
    // 2026-27 (aggiornate il 04/10/2026; nomi come li scrive Betfair)
    ita1: ["Atalanta", "Bologna", "Cagliari", "Como", "Fiorentina", "Frosinone", "Genoa", "Inter", "Juventus", "Lazio",
           "Lecce", "AC Milan", "Monza", "Napoli", "Parma", "Roma", "Sassuolo", "Torino", "Udinese", "Venezia"],
    ita2: ["Arezzo", "Ascoli", "Avellino", "Benevento", "Carrarese", "Catanzaro", "Cesena", "Cremonese", "Empoli", "Entella",
           "Juve Stabia", "Mantova", "Modena", "Padova", "Palermo", "Pisa", "Sampdoria", "Sudtirol", "Verona", "Vicenza"],
    eng1: ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Chelsea", "Coventry", "Crystal Palace", "Everton", "Fulham",
           "Hull", "Ipswich", "Leeds", "Liverpool", "Man City", "Man Utd", "Newcastle", "Nottm Forest", "Sunderland", "Tottenham"],
    esp1: ["Alaves", "Athletic Bilbao", "Atletico Madrid", "Barcelona", "Betis", "Celta Vigo", "Deportivo", "Elche", "Espanyol", "Getafe",
           "Levante", "Malaga", "Osasuna", "Racing Santander", "Rayo Vallecano", "Real Madrid", "Real Sociedad", "Sevilla", "Valencia", "Villarreal"],
    ger1: ["Augsburg", "Bayern Munich", "Dortmund", "Eintracht Frankfurt", "Elversberg", "FC Koln", "Freiburg", "Gladbach", "Hamburger SV",
           "Hoffenheim", "Leverkusen", "Mainz", "Paderborn", "RB Leipzig", "Schalke 04", "Stuttgart", "Union Berlin", "Werder Bremen"],
    fra1: ["Angers", "Auxerre", "Brest", "Le Havre", "Le Mans", "Lens", "Lille", "Lorient", "Lyon", "Marseille", "Monaco", "Nice",
           "Paris FC", "Paris St-G", "Rennes", "Strasbourg", "Toulouse", "Troyes"],
    por1: ["Benfica", "Porto", "Sporting Lisbon", "Braga", "Vitoria Guimaraes", "Famalicao"],
    ned1: ["Ajax", "PSV", "Feyenoord", "AZ Alkmaar", "Twente", "Utrecht"],
    naz: ["Italy", "England", "Spain", "Germany", "France", "Portugal", "Netherlands", "Belgium", "Croatia", "Brazil", "Argentina", "USA"],
    mls: ["Inter Miami", "LA Galaxy", "LAFC", "Seattle Sounders", "Atlanta Utd", "New York Red Bulls", "New York City", "Columbus Crew",
          "FC Cincinnati", "Philadelphia Union"],
    bra1: ["Flamengo", "Palmeiras", "Corinthians", "Sao Paulo", "Santos", "Fluminense", "Botafogo", "Gremio", "Internacional",
           "Atletico Mineiro", "Cruzeiro", "Vasco da Gama"],
    arg1: ["Boca Juniors", "River Plate", "Racing Club", "Independiente", "San Lorenzo", "Estudiantes", "Velez Sarsfield", "Rosario Central",
           "Newells Old Boys", "Talleres"],
    atp: ["Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev", "Taylor Fritz", "Jack Draper", "Lorenzo Musetti", "Ben Shelton",
          "Alex de Minaur", "Casper Ruud", "Daniil Medvedev", "Holger Rune", "Andrey Rublev", "Tommy Paul", "Jakub Mensik", "Joao Fonseca",
          "Flavio Cobolli", "Matteo Berrettini", "Luciano Darderi", "Matteo Arnaldi", "Lorenzo Sonego", "Francisco Cerundolo", "Alexander Bublik",
          "Stefanos Tsitsipas", "Grigor Dimitrov", "Frances Tiafoe", "Arthur Fils", "Ugo Humbert", "Karen Khachanov", "Tomas Machac"],
    wta: ["Aryna Sabalenka", "Iga Swiatek", "Coco Gauff", "Elena Rybakina", "Jessica Pegula", "Mirra Andreeva", "Jasmine Paolini",
          "Madison Keys", "Qinwen Zheng", "Emma Navarro", "Amanda Anisimova", "Victoria Mboko", "Elina Svitolina", "Paula Badosa",
          "Belinda Bencic", "Karolina Muchova", "Naomi Osaka", "Emma Raducanu", "Clara Tauson", "Ekaterina Alexandrova", "Elisabetta Cocciaretto"],
    nba: ["Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks",
          "Denver Nuggets", "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers", "LA Clippers", "LA Lakers",
          "Memphis Grizzlies", "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
          "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings",
          "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards"],
    euro: ["Olimpia Milano", "Virtus Bologna", "Real Madrid", "Barcelona", "Fenerbahce", "Olympiacos", "Panathinaikos", "Anadolu Efes",
           "Monaco", "Partizan", "Crvena Zvezda", "Zalgiris", "Maccabi Tel Aviv", "Bayern Munich", "Baskonia", "Valencia"],
    nhl: ["Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames", "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche",
          "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers", "Florida Panthers", "Los Angeles Kings", "Minnesota Wild",
          "Montreal Canadiens", "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers", "Ottawa Senators",
          "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken", "St. Louis Blues", "Tampa Bay Lightning",
          "Toronto Maple Leafs", "Utah Mammoth", "Vancouver Canucks", "Vegas Golden Knights", "Washington Capitals", "Winnipeg Jets"]
  };
  // colori sociali per il logo disegnato da noi: [colore 1, colore 2, disegno] (s strisce, h a meta', d diagonale, p pieno)
  var COLORI = {
    "Atalanta": ["#1E71B8", "#111111", "s"], "Bologna": ["#A21C26", "#1A2F48", "h"], "Cagliari": ["#A6192E", "#002350", "h"],
    "Como": ["#1D4E9E", "#1D4E9E", "p"], "Cremonese": ["#C8102E", "#8A8D8F", "s"], "Fiorentina": ["#482E92", "#482E92", "p"],
    "Genoa": ["#A0182F", "#002855", "h"], "Hellas Verona": ["#002F6C", "#FFD100", "d"], "Inter": ["#0A3D91", "#111111", "s"],
    "Juventus": ["#111111", "#F2F2F2", "s"], "Lazio": ["#5DB7E6", "#FFFFFF", "d"], "Lecce": ["#E8B800", "#C8102E", "s"],
    "AC Milan": ["#C8102E", "#111111", "s"], "Napoli": ["#12A0D7", "#12A0D7", "p"], "Parma": ["#E8B800", "#1F3A93", "d"],
    "Pisa": ["#1C2A5C", "#111111", "s"], "Roma": ["#8E1F2F", "#F0BC42", "d"], "Sassuolo": ["#00A651", "#111111", "s"],
    "Torino": ["#8A1E03", "#8A1E03", "p"], "Udinese": ["#111111", "#F2F2F2", "s"], "Venezia": ["#111111", "#E87722", "d"],
    "Verona": ["#002F6C", "#FFD100", "d"], "Frosinone": ["#FFD200", "#1C3F94", "h"], "Monza": ["#E2001A", "#FFFFFF", "h"],
    "Vicenza": ["#E2001A", "#FFFFFF", "s"], "Arezzo": ["#8B1E3F", "#8B1E3F", "p"], "Benevento": ["#FFD200", "#C8102E", "s"],
    "Ascoli": ["#111111", "#FFFFFF", "s"], "Coventry": ["#59CBE8", "#FFFFFF", "d"], "Ipswich": ["#0044A9", "#FFFFFF", "d"],
    "Hull": ["#F5A12D", "#111111", "s"], "Deportivo": ["#1B4F9C", "#FFFFFF", "s"], "Malaga": ["#1E5AA8", "#FFFFFF", "s"],
    "Racing Santander": ["#00843D", "#FFFFFF", "d"], "Schalke 04": ["#004D9D", "#FFFFFF", "h"], "Elversberg": ["#111111", "#FFFFFF", "d"],
    "Paderborn": ["#005CA9", "#111111", "s"], "Troyes": ["#005BAC", "#FFFFFF", "d"], "Le Mans": ["#E30613", "#FFD200", "h"],
    "Sampdoria": ["#1B5FAA", "#FFFFFF", "d"], "Palermo": ["#F3A6C0", "#111111", "h"], "Bari": ["#C8102E", "#FFFFFF", "d"],
    "Real Madrid": ["#F2F2F2", "#C9A227", "d"], "Barcelona": ["#A50044", "#004D98", "s"], "Atletico Madrid": ["#CB3524", "#F2F2F2", "s"],
    "Man City": ["#6CABDD", "#6CABDD", "p"], "Man Utd": ["#DA291C", "#111111", "d"], "Liverpool": ["#C8102E", "#C8102E", "p"],
    "Arsenal": ["#EF0107", "#FFFFFF", "d"], "Chelsea": ["#034694", "#034694", "p"], "Tottenham": ["#132257", "#FFFFFF", "d"],
    "Newcastle": ["#111111", "#F2F2F2", "s"], "Bayern Munich": ["#DC052D", "#FFFFFF", "d"], "Dortmund": ["#FDE100", "#111111", "d"],
    "Leverkusen": ["#E32221", "#111111", "h"], "Paris St-G": ["#004170", "#DA291C", "s"], "Marseille": ["#2FAEE0", "#FFFFFF", "d"],
    "Benfica": ["#E83030", "#E83030", "p"], "Porto": ["#00428C", "#FFFFFF", "s"], "Sporting Lisbon": ["#008057", "#FFFFFF", "h"],
    "Ajax": ["#D2122E", "#FFFFFF", "s"], "Boca Juniors": ["#103F79", "#F3B229", "h"], "River Plate": ["#F2F2F2", "#D2122E", "d"],
    "Flamengo": ["#C8102E", "#111111", "s"], "Palmeiras": ["#006437", "#006437", "p"],
    "Italy": ["#0066CC", "#0066CC", "p"], "England": ["#F2F2F2", "#CF142B", "d"], "Spain": ["#C60B1E", "#FFC400", "h"],
    "Germany": ["#111111", "#DD0000", "d"], "France": ["#002395", "#ED2939", "h"], "Brazil": ["#FFDF00", "#009C3B", "d"],
    "Argentina": ["#75AADB", "#FFFFFF", "s"], "Portugal": ["#C8102E", "#046A38", "h"], "Netherlands": ["#F36C21", "#F36C21", "p"]
  };
  // Nazione dei tennisti (04/10): il loro logo e' un cerchio coi colori della bandiera e le iniziali.
  // Russi e bielorussi giocano come neutrali nei tornei: per loro colori neutri ("NEU"), niente bandiera.
  var TENNISTI = {
    "Jannik Sinner": "ITA", "Carlos Alcaraz": "ESP", "Novak Djokovic": "SRB", "Alexander Zverev": "GER", "Taylor Fritz": "USA", "Jack Draper": "GBR",
    "Lorenzo Musetti": "ITA", "Ben Shelton": "USA", "Alex de Minaur": "AUS", "Casper Ruud": "NOR", "Daniil Medvedev": "NEU", "Holger Rune": "DEN",
    "Andrey Rublev": "NEU", "Tommy Paul": "USA", "Jakub Mensik": "CZE", "Joao Fonseca": "BRA", "Flavio Cobolli": "ITA", "Matteo Berrettini": "ITA",
    "Luciano Darderi": "ITA", "Matteo Arnaldi": "ITA", "Lorenzo Sonego": "ITA", "Francisco Cerundolo": "ARG", "Alexander Bublik": "KAZ",
    "Stefanos Tsitsipas": "GRE", "Grigor Dimitrov": "BUL", "Frances Tiafoe": "USA", "Arthur Fils": "FRA", "Ugo Humbert": "FRA", "Karen Khachanov": "NEU",
    "Tomas Machac": "CZE", "Aryna Sabalenka": "NEU", "Iga Swiatek": "POL", "Coco Gauff": "USA", "Elena Rybakina": "KAZ", "Jessica Pegula": "USA",
    "Mirra Andreeva": "NEU", "Jasmine Paolini": "ITA", "Madison Keys": "USA", "Qinwen Zheng": "CHN", "Emma Navarro": "USA", "Amanda Anisimova": "USA",
    "Victoria Mboko": "CAN", "Elina Svitolina": "UKR", "Paula Badosa": "ESP", "Belinda Bencic": "SUI", "Karolina Muchova": "CZE", "Naomi Osaka": "JPN",
    "Emma Raducanu": "GBR", "Clara Tauson": "DEN", "Ekaterina Alexandrova": "NEU", "Elisabetta Cocciaretto": "ITA"
  };
  // colori della bandiera, semplificati in bande: v verticali, h orizzontali
  var BANDIERE = {
    ITA: ["v", "#009246", "#FFFFFF", "#CE2B37"], FRA: ["v", "#002395", "#FFFFFF", "#ED2939"], ESP: ["h", "#AA151B", "#F1BF00", "#AA151B"],
    GER: ["h", "#111111", "#DD0000", "#FFCE00"], SRB: ["h", "#C6363C", "#0C4076", "#FFFFFF"], USA: ["h", "#B22234", "#FFFFFF", "#3C3B6E"],
    GBR: ["h", "#012169", "#FFFFFF", "#C8102E"], AUS: ["h", "#012169", "#FFFFFF", "#E4002B"], NOR: ["h", "#BA0C2F", "#FFFFFF", "#00205B"],
    DEN: ["h", "#C8102E", "#FFFFFF", "#C8102E"], CZE: ["h", "#FFFFFF", "#D7141A", "#11457E"], BRA: ["h", "#009C3B", "#FFDF00", "#002776"],
    ARG: ["h", "#75AADB", "#FFFFFF", "#75AADB"], KAZ: ["h", "#00AFCA", "#FEC50C", "#00AFCA"], GRE: ["h", "#0D5EAF", "#FFFFFF", "#0D5EAF"],
    BUL: ["h", "#FFFFFF", "#00966E", "#D62612"], POL: ["h", "#FFFFFF", "#DC143C"], CHN: ["h", "#DE2910", "#FFDE00", "#DE2910"],
    CAN: ["v", "#D52B1E", "#FFFFFF", "#D52B1E"], UKR: ["h", "#0057B7", "#FFD700"], SUI: ["h", "#D52B1E", "#FFFFFF", "#D52B1E"],
    JPN: ["h", "#FFFFFF", "#BC002D", "#FFFFFF"], NEU: ["h", "#7D878E", "#B9C0C5", "#7D878E"]
  };
  function nazioneTennista(name) {   // anche "J. Sinner" o "Sinner J." come nei dati: si guarda il cognome
    if (TENNISTI[name]) return TENNISTI[name];
    var w = String(name || "").toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter(function (x) { return x.length > 2; });
    for (var k in TENNISTI) { var last = k.toLowerCase().split(" ").slice(-1)[0]; if (w.indexOf(last) >= 0) return TENNISTI[k]; }
    return null;
  }
  // nazione di partenza dalla lingua del telefono
  function guessCountry() {
    var l = (navigator.language || "it").toLowerCase();
    if (/^it/.test(l)) return "IT";
    if (l === "en-us") return "US";
    if (/^en/.test(l)) return "GB";
    var m = { es: "ES", de: "DE", fr: "FR", pt: "PT", nl: "NL" }[l.slice(0, 2)];
    return m || (l === "pt-br" ? "BR" : "XX");
  }
  function compOf(name) {
    for (var i = 0; i < COMPS.length; i++) if (COMPS[i].re.test(name || "")) return COMPS[i];
    return null;
  }
  window.ANAGRAFICA = { COMPS: COMPS, SPOT: SPOT, BIG: BIG, PAESI: PAESI, LEGHE: LEGHE, SQUADRE: SQUADRE, COLORI: COLORI, TENNISTI: TENNISTI, BANDIERE: BANDIERE, nazioneTennista: nazioneTennista, guessCountry: guessCountry, compOf: compOf };
})();
