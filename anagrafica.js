// Profilazione dell'utente (richiesta 02/10/2026): nazione, sport, squadre e tennisti preferiti. Da qui l'app
// decide cosa mettere in primo piano nelle Partite e quali sfide settimanali mostrare.
// - COMPS: competizioni riconosciute dal nome Betfair (regex), con la sfida settimanale che portano.
// - SPOT: le coppe e le nazionali vanno in primo piano nei giorni in cui giocano (Champions mar/mer, Europa e
//   Conference il giovedi', Nations League nelle soste; qualificazioni e amichevoli delle nazionali).
// - PAESI: per ogni nazione i campionati di casa in ordine, la nazionale, gli sport di partenza. Gli Stati Uniti
//   partono dai loro sport (NBA, NHL, MLS): li' si segue poco il resto.
// - SQUADRE / TENNISTI: solo per i suggerimenti mentre si scrive; si puo' aggiungere qualsiasi nome.
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
  var SQUADRE = {
    calcio: [
      "Atalanta", "Bologna", "Cagliari", "Como", "Cremonese", "Fiorentina", "Genoa", "Hellas Verona", "Inter", "Juventus",
      "Lazio", "Lecce", "AC Milan", "Napoli", "Parma", "Pisa", "Roma", "Sassuolo", "Torino", "Udinese",
      "Venezia", "Empoli", "Monza", "Palermo", "Sampdoria", "Frosinone", "Spezia", "Bari", "Salernitana", "Cesena",
      "Modena", "Catanzaro", "Reggiana", "Padova", "Avellino", "Juve Stabia", "Carrarese", "Mantova", "Sudtirol", "Entella",
      "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham",
      "Leeds", "Liverpool", "Man City", "Man Utd", "Newcastle", "Nottm Forest", "Sunderland", "Tottenham", "West Ham", "Wolves",
      "Real Madrid", "Barcelona", "Atletico Madrid", "Athletic Bilbao", "Real Sociedad", "Betis", "Sevilla", "Villarreal", "Valencia", "Girona",
      "Bayern Munich", "Dortmund", "Leverkusen", "RB Leipzig", "Eintracht Frankfurt", "Stuttgart", "Wolfsburg", "Freiburg", "Gladbach", "Werder Bremen",
      "Paris St-G", "Marseille", "Monaco", "Lyon", "Lille", "Nice", "Lens", "Rennes",
      "Benfica", "Porto", "Sporting Lisbon", "Ajax", "PSV", "Feyenoord", "Celtic", "Rangers", "Galatasaray", "Fenerbahce",
      "Inter Miami", "LA Galaxy", "LAFC", "Boca Juniors", "River Plate", "Flamengo", "Palmeiras",
      "Italy", "England", "Spain", "Germany", "France", "Portugal", "Netherlands", "Brazil", "Argentina", "USA"
    ],
    basket: [
      "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks",
      "Denver Nuggets", "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers", "LA Clippers", "LA Lakers",
      "Memphis Grizzlies", "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
      "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings",
      "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards",
      "Olimpia Milano", "Virtus Bologna", "Real Madrid", "Barcelona", "Fenerbahce", "Olympiacos", "Panathinaikos"
    ],
    hockey: [
      "Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames", "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche",
      "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers", "Florida Panthers", "Los Angeles Kings", "Minnesota Wild",
      "Montreal Canadiens", "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers", "Ottawa Senators",
      "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken", "St. Louis Blues", "Tampa Bay Lightning",
      "Toronto Maple Leafs", "Utah Mammoth", "Vancouver Canucks", "Vegas Golden Knights", "Washington Capitals", "Winnipeg Jets"
    ],
    ippica: []
  };
  var TENNISTI = [
    "Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev", "Taylor Fritz", "Jack Draper", "Lorenzo Musetti", "Ben Shelton",
    "Alex de Minaur", "Casper Ruud", "Daniil Medvedev", "Holger Rune", "Andrey Rublev", "Tommy Paul", "Jakub Mensik", "Joao Fonseca",
    "Flavio Cobolli", "Matteo Berrettini", "Luciano Darderi", "Matteo Arnaldi", "Lorenzo Sonego", "Francisco Cerundolo", "Alexander Bublik",
    "Stefanos Tsitsipas", "Grigor Dimitrov", "Frances Tiafoe", "Arthur Fils", "Ugo Humbert", "Karen Khachanov", "Tomas Machac",
    "Aryna Sabalenka", "Iga Swiatek", "Coco Gauff", "Elena Rybakina", "Jessica Pegula", "Mirra Andreeva", "Jasmine Paolini",
    "Madison Keys", "Qinwen Zheng", "Emma Navarro", "Amanda Anisimova", "Victoria Mboko", "Elina Svitolina", "Paula Badosa",
    "Belinda Bencic", "Karolina Muchova", "Naomi Osaka", "Emma Raducanu", "Clara Tauson", "Ekaterina Alexandrova", "Elisabetta Cocciaretto"
  ];
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
  window.ANAGRAFICA = { COMPS: COMPS, SPOT: SPOT, BIG: BIG, PAESI: PAESI, SQUADRE: SQUADRE, TENNISTI: TENNISTI, guessCountry: guessCountry, compOf: compOf };
})();
