'use strict';
// ---------------------------------------------------------------------------
// Spelgegevens: catalogus, gasttypes, personeel, dieren, seizoenen, doelen
// ---------------------------------------------------------------------------
const DATA = {};

DATA.TILE_W = 64;
DATA.TILE_H = 32;
DATA.DAY_SECONDS = 60;      // echte seconden per speldag op snelheid 1
DATA.DAYS_PER_MONTH = 12;
DATA.START_MONTH = 4;       // mei (0 = januari)
DATA.START_MONEY = 120000;
DATA.EXTRA_PERSON = 7;      // toeslag per nacht per persoon boven de 2
DATA.MAP_MAX = 72;          // totale kaartgrootte; het gekochte deel groeit door grond bij te kopen
DATA.LAND_STRIP = 8;        // breedte van een strook grond
DATA.LAND_PRICE = 55;       // prijs per tegel
DATA.SAVE_SLOTS = 4;

DATA.months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
DATA.monthsShort = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
// aantrekkingskracht per maand (0 = januari)
DATA.seasonFactor = [0.06, 0.06, 0.12, 0.35, 0.6, 0.85, 1.0, 1.0, 0.6, 0.3, 0.1, 0.06];
// accommodaties (hutten, chalets...) hebben een vlakkere curve: ook in de winter en rond kerst vraag
DATA.accSeasonFactor = [0.4, 0.35, 0.4, 0.55, 0.7, 0.9, 1.0, 1.0, 0.75, 0.6, 0.4, 0.55];
DATA.pitchWants = ['tent', 'caravan', 'camper'];
// weerkansen per maand [zon, bewolkt, regen]
DATA.weatherTable = [
  [0.15, 0.4, 0.45], [0.2, 0.4, 0.4], [0.3, 0.4, 0.3], [0.4, 0.35, 0.25], [0.5, 0.3, 0.2], [0.6, 0.25, 0.15],
  [0.65, 0.22, 0.13], [0.6, 0.25, 0.15], [0.45, 0.3, 0.25], [0.3, 0.35, 0.35], [0.2, 0.4, 0.4], [0.15, 0.4, 0.45],
];
DATA.seasonOf = m => (m >= 11 || m <= 1) ? 'winter' : m <= 4 ? 'lente' : m <= 7 ? 'zomer' : 'herfst';

DATA.categories = [
  { id: 'paden', name: 'Paden', icon: '🛤️' },
  { id: 'staplekken', name: 'Staplekken', icon: '⛺' },
  { id: 'verhuur', name: 'Verhuur', icon: '🏡' },
  { id: 'voorzieningen', name: 'Voorzieningen', icon: '🚿' },
  { id: 'recreatie', name: 'Recreatie', icon: '🎪' },
  { id: 'natuur', name: 'Natuur', icon: '🌳' },
  { id: 'dieren', name: 'Dieren', icon: '🐐' },
  { id: 'personeel', name: 'Personeel', icon: '👷' },
  { id: 'terrein', name: 'Terrein', icon: '🏞️' },
  { id: 'slopen', name: 'Slopen', icon: '🧨' },
];

// Publiek-voorkeuren: kid / gezin / stel / jongeren / senioren  (volwassenen per gezelschapstype)
const AUD_ALL = { kid: 1, gezin: 1, stel: 1, jongeren: 1, senioren: 1 };

DATA.items = {};
const addItem = (o) => { DATA.items[o.id] = o; return o; };

// ---- PADEN ---------------------------------------------------------------
addItem({ id: 'grindpad', cat: 'paden', name: 'Grindpad', kind: 'path', pathType: 1, cost: 15, w: 1, h: 1,
  desc: 'Eenvoudig grindpad. Gasten en personeel lopen alleen over paden.' });
addItem({ id: 'tegelpad', cat: 'paden', name: 'Tegelpad', kind: 'path', pathType: 2, cost: 25, w: 1, h: 1,
  desc: 'Nette betontegels. Iets duurder, maar het staat verzorgd.' });

// ---- STAPLEKKEN ----------------------------------------------------------
addItem({ seasonal: true, id: 'tentplek', care: 3, cat: 'staplekken', name: 'Tentplek', kind: 'spot', w: 2, h: 2, cost: 350, upkeep: 1, sh: 40,
  accepts: ['tent'], price: 30, comfort: 1, desc: 'Een grasveldje voor een tent. Goedkoop en populair bij jongeren en gezinnen.' });
addItem({ seasonal: true, id: 'caravanplek', care: 3, cat: 'staplekken', name: 'Caravanplek', kind: 'spot', w: 2, h: 2, cost: 650, upkeep: 2, sh: 48,
  accepts: ['caravan', 'camper'], price: 40, comfort: 1.2, desc: 'Plek met stroomaansluiting voor caravans en campers.' });
addItem({ seasonal: true, id: 'comfortplek', care: 3, cat: 'staplekken', name: 'Comfortplek', kind: 'spot', w: 3, h: 3, cost: 1400, upkeep: 3, sh: 48,
  accepts: ['tent', 'caravan', 'camper'], price: 52, comfort: 1.5, desc: 'Ruime plek met water, stroom en afvoer. Voor iedereen geschikt.' });

// ---- VERHUUR -------------------------------------------------------------
addItem({ seasonal: true, id: 'trekkershut', care: 3, cat: 'verhuur', name: 'Trekkershut', kind: 'spot', w: 2, h: 2, cost: 5500, upkeep: 5, sh: 70,
  accepts: ['hut'], price: 80, comfort: 1.6, acc: true, desc: 'Knus houten hutje voor 2-4 personen. Ook buiten het seizoen in trek.' });
addItem({ seasonal: true, id: 'glampingtent', care: 3, cat: 'verhuur', name: 'Glampingtent', kind: 'spot', w: 2, h: 2, cost: 6500, upkeep: 5, sh: 64,
  accepts: ['glamping'], price: 120, comfort: 2, acc: true, desc: 'Luxe safaritent op een houten vlonder. Stellen zijn er dol op.' });
addItem({ seasonal: true, id: 'stacaravan', care: 3, cat: 'verhuur', name: 'Stacaravan', kind: 'spot', w: 3, h: 2, cost: 10000, upkeep: 7, sh: 64,
  accepts: ['stacaravan'], price: 105, comfort: 1.8, acc: true, desc: 'Vaste caravan met terras. Favoriet bij senioren.' });
addItem({ seasonal: true, id: 'chalet', care: 3, cat: 'verhuur', name: 'Chalet', kind: 'spot', w: 3, h: 3, cost: 22000, upkeep: 10, sh: 96,
  accepts: ['chalet'], price: 200, comfort: 2.5, acc: true, desc: 'Luxe vakantiehuis met veranda. Het hele jaar verhuurbaar.' });
addItem({ seasonal: true, id: 'pipowagen', care: 3, cat: 'verhuur', name: 'Pipowagen', kind: 'spot', w: 2, h: 1, cost: 4800, upkeep: 4, sh: 64,
  accepts: ['pipowagen'], price: 95, comfort: 1.7, acc: true, desc: 'Vrolijk beschilderde woonwagen. Kinderen vinden hem geweldig.' });

// ---- VOORZIENINGEN -------------------------------------------------------
addItem({ id: 'receptie', cat: 'voorzieningen', name: 'Receptie', kind: 'facility', w: 2, h: 2, cost: 6000, upkeep: 8, sh: 72,
  service: 'checkin', indoor: true, capacity: 4, duration: 3, quality: 1, desc: 'Verplicht! Gasten checken hier in. Moet via een pad bereikbaar zijn vanaf de ingang.' });
addItem({ id: 'slagboom', cat: 'voorzieningen', name: 'Slagboom', kind: 'pathobj', w: 1, h: 1, cost: 1200, upkeep: 1, sh: 40,
  effect: 'security', desc: 'Houdt ongewenst bezoek buiten. Gasten voelen zich veiliger. Plaats op een pad.' });
addItem({ id: 'sanitairgebouw', cat: 'voorzieningen', name: 'Sanitairgebouw', kind: 'facility', w: 3, h: 2, cost: 12000, upkeep: 10, sh: 64,
  service: 'hygiene', amount: 100, duration: 6, capacity: 8, indoor: true, quality: 2, dirtRate: 1.5, breakable: true, wear: 1.5,
  desc: 'Douches en toiletten. Wordt vies bij gebruik; laat een schoonmaker langskomen.' });
addItem({ id: 'toiletunit', cat: 'voorzieningen', name: 'Toiletunit', kind: 'facility', w: 1, h: 1, cost: 2500, upkeep: 2, sh: 48,
  service: 'hygiene', amount: 55, duration: 3, capacity: 1, indoor: true, quality: 1, dirtRate: 6, breakable: true, wear: 2,
  desc: 'Eenvoudige toiletcabine. Snel vies en niet erg geliefd, maar beter dan niets.' });
addItem({ id: 'restaurant', cat: 'voorzieningen', name: 'Restaurant', kind: 'facility', w: 3, h: 3, cost: 24000, upkeep: 20, sh: 80,
  service: 'food', amount: 100, duration: 10, capacity: 16, indoor: true, quality: 3, feeKey: 'restaurant', breakable: true, wear: 0.5,
  aud: { kid: 0.8, gezin: 1, stel: 1.4, jongeren: 0.7, senioren: 1.3 },
  desc: 'Restaurant met terras. Gasten eten hier graag en het levert flink wat op.' });
addItem({ id: 'snackbar', cat: 'voorzieningen', name: 'Snackbar', kind: 'facility', w: 2, h: 1, cost: 6500, upkeep: 6, sh: 56,
  service: 'food', amount: 70, duration: 4, capacity: 6, style: 'door', quality: 2, feeKey: 'snackbar', breakable: true, wear: 1,
  aud: { kid: 1.3, gezin: 1.1, stel: 0.7, jongeren: 1.5, senioren: 0.6 },
  desc: 'Patat, frikandellen en ijsjes. Snel en goedkoop. Let op: veel zwerfafval.' });
addItem({ id: 'winkeltje', cat: 'voorzieningen', name: 'Campingwinkel', kind: 'facility', w: 2, h: 2, cost: 9000, upkeep: 8, sh: 64,
  service: 'food', amount: 80, duration: 5, capacity: 8, indoor: true, quality: 2, feeKey: 'winkel', breakable: false,
  aud: { kid: 0.6, gezin: 1.2, stel: 1, jongeren: 1, senioren: 1.1 },
  desc: 'Verse broodjes en boodschappen. Gasten koken daarna lekker bij hun tent.' });
addItem({ id: 'pizzeria', cat: 'voorzieningen', name: 'Pizzeria', kind: 'facility', w: 3, h: 2, cost: 16000, upkeep: 12, sh: 64,
  service: 'food', amount: 90, duration: 8, capacity: 10, indoor: true, quality: 2.5, feeKey: 'pizzeria', breakable: true, wear: 0.5,
  aud: { kid: 1.3, gezin: 1.3, stel: 1, jongeren: 1.4, senioren: 0.7 },
  desc: 'Houtoven-pizza\'s. Favoriet bij gezinnen en jongeren.' });
addItem({ id: 'bakker', cat: 'voorzieningen', name: 'Bakker', kind: 'facility', w: 2, h: 1, cost: 7000, upkeep: 5, sh: 56,
  service: 'food', amount: 55, duration: 3, capacity: 6, style: 'door', quality: 2, feeKey: 'bakker', breakable: true, wear: 0.5, morning: true,
  aud: { kid: 0.8, gezin: 1.2, stel: 1.1, jongeren: 0.6, senioren: 1.4 },
  desc: 'Verse broodjes en croissants. Vooral \'s ochtends druk.' });
addItem({ id: 'ijssalon', cat: 'voorzieningen', name: 'IJssalon', kind: 'facility', w: 1, h: 1, cost: 4500, upkeep: 3, sh: 52,
  service: 'food', amount: 30, duration: 3, capacity: 4, style: 'door', quality: 2, feeKey: 'ijs', breakable: true, wear: 0.8, sunBonus: true,
  aud: { kid: 1.8, gezin: 1.2, stel: 1.1, jongeren: 1.2, senioren: 0.9 },
  desc: 'Schepijs in twintig smaken. Bij zonnig weer staat er een rij.' });
addItem({ id: 'wasserette', cat: 'voorzieningen', name: 'Wasserette', kind: 'facility', w: 1, h: 1, cost: 4000, upkeep: 3, sh: 48,
  service: 'hygiene', amount: 25, duration: 5, capacity: 2, indoor: true, quality: 1, feeKey: 'wasserette', breakable: true, wear: 1,
  aud: { kid: 0, gezin: 1, stel: 0.6, jongeren: 0.3, senioren: 1.2 },
  desc: 'Wasmachines voor gasten die langer blijven.' });
addItem({ id: 'prullenbak', cat: 'voorzieningen', name: 'Prullenbak', kind: 'pathobj', w: 1, h: 1, cost: 80, upkeep: 0, sh: 24,
  effect: 'bin', binRadius: 3, desc: 'Gasten gooien hun afval erin in plaats van op de grond. Plaats op een pad.' });
addItem({ id: 'bankje', cat: 'voorzieningen', name: 'Bankje', kind: 'facility', w: 1, h: 1, cost: 150, upkeep: 0, sh: 24, onPath: true,
  service: 'rest', amount: 45, duration: 5, capacity: 2, style: 'sit', quality: 1,
  aud: { kid: 0.5, gezin: 1, stel: 1.2, jongeren: 0.6, senioren: 1.6 },
  desc: 'Even uitrusten. Mag op gras of op een pad.' });
addItem({ id: 'lantaarn', cat: 'voorzieningen', name: 'Lantaarnpaal', kind: 'pathobj', w: 1, h: 1, cost: 200, upkeep: 0, sh: 48,
  effect: 'light', desc: 'Verlicht het pad \'s nachts. Gasten voelen zich veiliger in het donker.' });
addItem({ id: 'picknicktafel', cat: 'voorzieningen', name: 'Picknicktafel', kind: 'facility', w: 1, h: 1, cost: 250, upkeep: 0, sh: 24,
  service: 'rest', amount: 55, duration: 6, capacity: 4, style: 'sit', quality: 1.2, aud: AUD_ALL,
  desc: 'Gezellig samen aan tafel. Gasten rusten hier uit.' });
addItem({ id: 'informatiebord', cat: 'voorzieningen', name: 'Informatiebord', kind: 'pathobj', w: 1, h: 1, cost: 300, upkeep: 0, sh: 36,
  effect: 'info', desc: 'Plattegrond van de camping. Gasten vinden sneller wat ze zoeken.' });
addItem({ id: 'fietsverhuur', cat: 'voorzieningen', name: 'Fietsverhuur', kind: 'facility', w: 1, h: 1, cost: 4000, upkeep: 3, sh: 40,
  service: 'fun', amount: 65, duration: 9, capacity: 4, indoor: true, hideText: 'op fietstocht', quality: 2, feeKey: 'fiets', breakable: true, wear: 1,
  aud: { kid: 0.4, gezin: 1, stel: 1.3, jongeren: 0.8, senioren: 1.4 },
  desc: 'Verhuur van fietsen voor een tochtje door de omgeving.' });
addItem({ id: 'afvalstation', cat: 'voorzieningen', name: 'Afvalstation', kind: 'facility', w: 2, h: 1, cost: 2500, upkeep: 2, sh: 36,
  effect: 'bin', binRadius: 7, desc: 'Containers voor glas, papier en restafval. Gasten in een ruime omgeving brengen hun afval hierheen.' });
addItem({ id: 'camperservice', cat: 'voorzieningen', name: 'Camperservicepunt', kind: 'facility', w: 1, h: 1, cost: 3500, upkeep: 2, sh: 40,
  effect: 'camperservice', desc: 'Lozen van grijswater en vers water tanken. Caravan- en campergasten verwachten dit.' });
addItem({ id: 'parkeerplaats', cat: 'voorzieningen', name: 'Parkeerplaats', kind: 'facility', w: 2, h: 2, cost: 3000, upkeep: 2, sh: 24,
  effect: 'parking', desc: 'Parkeerplaats voor gasten van hutten en chalets. Verhoogt de beoordeling.' });

// ---- RECREATIE -----------------------------------------------------------
addItem({ id: 'speeltuin', cat: 'recreatie', name: 'Speeltuin', kind: 'facility', w: 2, h: 2, cost: 6000, upkeep: 4, sh: 56,
  service: 'fun', amount: 70, duration: 8, capacity: 8, style: 'inside', quality: 2, breakable: true, wear: 1, outdoor: true,
  aud: { kid: 1.6, gezin: 0.5, stel: 0, jongeren: 0.1, senioren: 0.1 },
  desc: 'Glijbaan, schommel en klimrek. Kinderen zijn er niet weg te slaan.' });
addItem({ id: 'zwembad', cat: 'recreatie', name: 'Zwembad', kind: 'facility', w: 3, h: 3, cost: 32000, upkeep: 24, sh: 40,
  service: 'fun', amount: 95, duration: 10, capacity: 14, style: 'swim', quality: 3, feeKey: 'zwembad', breakable: true, wear: 0.6,
  outdoor: true, noRain: true, noWinter: true, sunBonus: true,
  aud: { kid: 1.5, gezin: 1.2, stel: 1, jongeren: 1.4, senioren: 0.7 },
  desc: 'Het pronkstuk van elke camping. Dicht bij regen en in de winter.' });
addItem({ id: 'trampoline', cat: 'recreatie', name: 'Trampoline', kind: 'facility', w: 1, h: 1, cost: 1500, upkeep: 2, sh: 40,
  service: 'fun', amount: 50, duration: 5, capacity: 2, style: 'bounce', quality: 1.5, breakable: true, wear: 2, outdoor: true,
  aud: { kid: 1.6, gezin: 0.2, stel: 0, jongeren: 0.8, senioren: 0 },
  desc: 'Springkussen op veren. Favoriet bij de jeugd.' });
addItem({ seasonal: true, id: 'midgetgolf', cat: 'recreatie', name: 'Midgetgolf', kind: 'facility', w: 2, h: 2, cost: 7500, upkeep: 4, sh: 48,
  service: 'fun', amount: 70, duration: 10, capacity: 6, style: 'inside', quality: 2, feeKey: 'midgetgolf', breakable: true, wear: 0.7, outdoor: true,
  aud: { kid: 1, gezin: 1.2, stel: 1.1, jongeren: 0.9, senioren: 1.3 },
  desc: 'Een baan met molentje en loopings. Leuk voor jong en oud.' });
addItem({ id: 'volleybalveld', cat: 'recreatie', name: 'Volleybalveld', kind: 'facility', w: 2, h: 2, cost: 3000, upkeep: 2, sh: 48,
  service: 'fun', amount: 70, duration: 8, capacity: 8, style: 'inside', quality: 1.8, outdoor: true,
  aud: { kid: 0.6, gezin: 0.8, stel: 0.5, jongeren: 1.8, senioren: 0.1 },
  desc: 'Zandveld met net. Jongeren komen er massaal op af.' });
addItem({ seasonal: true, id: 'jeudeboules', cat: 'recreatie', name: 'Jeu-de-boulesbaan', kind: 'facility', w: 2, h: 1, cost: 1200, upkeep: 1, sh: 24,
  service: 'fun', amount: 60, duration: 8, capacity: 4, style: 'inside', quality: 1.5, outdoor: true,
  aud: { kid: 0.3, gezin: 0.5, stel: 0.8, jongeren: 0.2, senioren: 1.8 },
  desc: 'Grindbaan voor een partijtje boules. Senioren zijn dol op het geklik.' });
addItem({ id: 'kampvuurplaats', cat: 'recreatie', name: 'Kampvuurplaats', kind: 'facility', w: 1, h: 1, cost: 500, upkeep: 1, sh: 32,
  service: 'fun', amount: 65, duration: 9, capacity: 8, style: 'around', quality: 2, evening: true, outdoor: true,
  aud: { kid: 1.2, gezin: 1.2, stel: 1.3, jongeren: 1.5, senioren: 0.8 },
  desc: 'Stenen vuurplaats. Alleen \'s avonds in gebruik, maar dan ook gezellig.' });
addItem({ id: 'recreatiezaal', cat: 'recreatie', name: 'Recreatiezaal', kind: 'facility', w: 2, h: 2, cost: 14000, upkeep: 10, sh: 72,
  service: 'fun', amount: 70, duration: 8, capacity: 20, indoor: true, quality: 2, rainBonus: true, breakable: true, wear: 0.5,
  aud: { kid: 1.2, gezin: 1, stel: 0.8, jongeren: 1.1, senioren: 1.2 },
  desc: 'Bingo, disco en tafelvoetbal. Een uitkomst bij slecht weer.' });
addItem({ seasonal: true, id: 'dierenweide', cat: 'recreatie', name: 'Dierenweide', kind: 'facility', w: 3, h: 2, cost: 5000, upkeep: 4, sh: 48,
  service: 'fun', amount: 50, duration: 6, capacity: 6, style: 'around', quality: 1.5, outdoor: true, nature: 2,
  aud: { kid: 1.6, gezin: 1, stel: 0.6, jongeren: 0.3, senioren: 0.9 },
  desc: 'Omheind weitje met geiten, schapen en kippen. Kinderen vinden het geweldig.' });
addItem({ id: 'skelterverhuur', cat: 'recreatie', name: 'Skelterverhuur', kind: 'facility', w: 2, h: 1, cost: 4500, upkeep: 3, sh: 48,
  service: 'fun', amount: 70, duration: 8, capacity: 4, indoor: true, hideText: 'op de skelter', quality: 2, feeKey: 'skelter', breakable: true, wear: 1.5,
  aud: { kid: 1.8, gezin: 0.6, stel: 0.1, jongeren: 1, senioren: 0 },
  desc: 'Trapauto\'s om mee over het terrein te scheuren.' });
addItem({ id: 'tafeltennis', cat: 'recreatie', name: 'Tafeltennistafel', kind: 'facility', w: 1, h: 1, cost: 600, upkeep: 1, sh: 24,
  service: 'fun', amount: 50, duration: 6, capacity: 2, style: 'around', quality: 1.3, outdoor: true,
  aud: { kid: 1, gezin: 1, stel: 0.6, jongeren: 1.4, senioren: 0.5 },
  desc: 'Betonnen pingpongtafel. Onverwoestbaar.' });

addItem({ id: 'binnenzwembad', cat: 'recreatie', name: 'Binnenzwembad', kind: 'facility', w: 3, h: 3, cost: 45000, upkeep: 32, sh: 72,
  service: 'fun', amount: 95, duration: 10, capacity: 16, indoor: true, hideText: 'in het binnenbad', quality: 3, feeKey: 'zwembad', rainBonus: true, breakable: true, wear: 0.6,
  aud: { kid: 1.5, gezin: 1.2, stel: 1, jongeren: 1.3, senioren: 0.9 },
  desc: 'Overdekt zwemparadijs. Het hele jaar open, ook bij regen.' });
addItem({ id: 'binnenspeeltuin', cat: 'recreatie', name: 'Binnenspeeltuin', kind: 'facility', w: 2, h: 2, cost: 12000, upkeep: 8, sh: 64,
  service: 'fun', amount: 75, duration: 8, capacity: 12, indoor: true, hideText: 'in de binnenspeeltuin', quality: 2.2, feeKey: 'binnenspeeltuin', rainBonus: true, breakable: true, wear: 0.8,
  aud: { kid: 1.8, gezin: 0.6, stel: 0, jongeren: 0.1, senioren: 0 },
  desc: 'Ballenbak, klimtoren en glijbanen onder dak. Redding bij slecht weer.' });
addItem({ id: 'bowlingbaan', cat: 'recreatie', name: 'Bowlingbaan', kind: 'facility', w: 3, h: 2, cost: 20000, upkeep: 14, sh: 64,
  service: 'fun', amount: 80, duration: 9, capacity: 12, indoor: true, hideText: 'aan het bowlen', quality: 2.5, feeKey: 'bowling', rainBonus: true, breakable: true, wear: 0.5,
  aud: { kid: 0.9, gezin: 1.2, stel: 1.1, jongeren: 1.5, senioren: 0.8 },
  desc: 'Vier banen met discoverlichting. Jongeren en gezinnen zijn er dol op.' });
addItem({ id: 'fitness', cat: 'recreatie', name: 'Fitnessruimte', kind: 'facility', w: 2, h: 2, cost: 10000, upkeep: 7, sh: 64,
  service: 'fun', amount: 60, duration: 8, capacity: 8, indoor: true, hideText: 'in de sportschool', quality: 1.8, feeKey: 'fitness', rainBonus: true, breakable: true, wear: 0.7,
  aud: { kid: 0, gezin: 0.6, stel: 1.3, jongeren: 1.2, senioren: 0.7 },
  desc: 'Loopbanden en gewichten voor wie ook op vakantie wil sporten.' });
addItem({ id: 'bioscoop', cat: 'recreatie', name: 'Bioscoop', kind: 'facility', w: 2, h: 2, cost: 18000, upkeep: 12, sh: 72,
  service: 'fun', amount: 80, duration: 10, capacity: 20, indoor: true, hideText: 'in de bioscoop', quality: 2.4, feeKey: 'bioscoop', rainBonus: true, eveningBonus: true, breakable: true, wear: 0.4,
  aud: { kid: 1.2, gezin: 1.1, stel: 1.2, jongeren: 1.1, senioren: 1 },
  desc: 'Kleine filmzaal. Vooral \'s avonds en bij regen populair.' });

// ---- NATUUR --------------------------------------------------------------
addItem({ id: 'eik', care: 1.5, cat: 'natuur', name: 'Eik', kind: 'deco', w: 1, h: 1, cost: 90, sh: 72, nature: 1, seasonal: true, desc: 'Grote loofboom. Geeft schaduw en sfeer.' });
addItem({ id: 'den', care: 1.5, cat: 'natuur', name: 'Dennenboom', kind: 'deco', w: 1, h: 1, cost: 80, sh: 72, nature: 1, desc: 'Altijd groen. Ruikt naar vakantie.' });
addItem({ id: 'berk', care: 1.5, cat: 'natuur', name: 'Berk', kind: 'deco', w: 1, h: 1, cost: 85, sh: 66, nature: 1, seasonal: true, desc: 'Slanke boom met witte stam.' });
addItem({ id: 'wilg', care: 1.5, cat: 'natuur', name: 'Treurwilg', kind: 'deco', w: 1, h: 1, cost: 110, sh: 64, nature: 1.2, seasonal: true, desc: 'Staat prachtig aan het water.' });
addItem({ id: 'fruitboom', care: 2, cat: 'natuur', name: 'Appelboom', kind: 'deco', w: 1, h: 1, cost: 120, sh: 56, nature: 1.2, seasonal: true, desc: 'Kleine boom vol appels.' });
addItem({ id: 'struik', care: 3, cat: 'natuur', name: 'Struik', kind: 'deco', w: 1, h: 1, cost: 40, sh: 30, nature: 0.5, desc: 'Lage struik, handig als afscheiding.' });
addItem({ id: 'heg', care: 4, cat: 'natuur', name: 'Heg', kind: 'deco', w: 1, h: 1, cost: 35, sh: 26, nature: 0.4, desc: 'Strak geknipte haag. Geeft privacy tussen plekken.' });
addItem({ id: 'bloemperk', care: 7, cat: 'natuur', name: 'Bloemperk', kind: 'deco', w: 1, h: 1, cost: 60, sh: 18, nature: 0.8, desc: 'Kleurrijk perk. Gasten worden er vrolijk van.' });
addItem({ id: 'bloemen', care: 6, cat: 'natuur', name: 'Wilde bloemen', kind: 'deco', w: 1, h: 1, cost: 25, sh: 18, nature: 0.5, desc: 'Veldbloemen voor bijen en vlinders.' });
addItem({ id: 'rotsblok', cat: 'natuur', name: 'Rotsblok', kind: 'deco', w: 1, h: 1, cost: 70, sh: 30, nature: 0.3, desc: 'Decoratieve zwerfkei.' });

// ---- DIEREN (entiteiten, geen tegelobjecten) --------------------------------
DATA.animals = {
  geit: { id: 'geit', name: 'Geit', cost: 150, upkeep: 2, desc: 'Nieuwsgierig en eet alles. Kinderen zijn er dol op.' },
  schaap: { id: 'schaap', name: 'Schaap', cost: 200, upkeep: 2, desc: 'Wollig en rustig. Houdt het gras kort.' },
  kip: { id: 'kip', name: 'Kip', cost: 40, upkeep: 1, desc: 'Scharrelt vrolijk rond. Verse eitjes!' },
  koe: { id: 'koe', name: 'Koe', cost: 600, upkeep: 5, desc: 'Een echte Hollandse koe. Groot en gemoedelijk.' },
  pony: { id: 'pony', name: 'Pony', cost: 800, upkeep: 5, desc: 'Lieve pony. Kinderen willen er altijd op.' },
  konijn: { id: 'konijn', name: 'Konijn', cost: 50, upkeep: 1, desc: 'Hupt tussen de tenten door.' },
  eend: { id: 'eend', name: 'Eend', cost: 40, upkeep: 1, water: true, desc: 'Zwemt rond in de vijver. Alleen op water te plaatsen.' },
};
for (const a of Object.values(DATA.animals)) DATA.items[a.id] = Object.assign({ cat: 'dieren', kind: 'animal', w: 1, h: 1, sh: 24 }, a);

// ---- PERSONEEL -----------------------------------------------------------
DATA.staff = {
  schoonmaker: { id: 'schoonmaker', name: 'Schoonmaker', wage: 60, color: '#3f7fd6', desc: 'Raapt zwerfafval op en maakt het sanitair schoon. Je kunt een focus instellen.' },
  monteur: { id: 'monteur', name: 'Onderhoudsmonteur', wage: 80, color: '#f08c1e', desc: 'Repareert kapotte voorzieningen en doet preventief onderhoud.' },
  tuinman: { id: 'tuinman', name: 'Tuinman', wage: 65, color: '#5aa84a', desc: 'Maait het gras op de staplekken en verzorgt bloemen, heggen en struiken. Zonder tuinman verwildert je camping langzaam.' },
  animator: { id: 'animator', name: 'Animatiemedewerker', wage: 70, color: '#e8d21d', desc: 'Zorgt voor vermaak: spelletjes, dansjes en \'s avonds het kampvuur.' },
};
for (const s of Object.values(DATA.staff)) DATA.items[s.id] = Object.assign({ cat: 'personeel', kind: 'staff', cost: 0, w: 1, h: 1 }, s);

DATA.staffFocus = { alles: 'Alles', afval: 'Alleen zwerfafval', sanitair: 'Alleen sanitair' };

// ---- TERREIN -------------------------------------------------------------
addItem({ id: 'gras', cat: 'terrein', name: 'Gras', kind: 'terrain', terrain: 0, cost: 10, w: 1, h: 1, desc: 'Maak van zand of water weer gras.' });
addItem({ id: 'zand', cat: 'terrein', name: 'Zand', kind: 'terrain', terrain: 1, cost: 20, w: 1, h: 1, desc: 'Strandje bij de vijver of een zandbak.' });
addItem({ id: 'water', cat: 'terrein', name: 'Water', kind: 'terrain', terrain: 2, cost: 40, w: 1, h: 1, desc: 'Graaf een vijver. Gasten vinden water bij hun plek heerlijk.' });
addItem({ id: 'land_n', cat: 'terrein', name: 'Grond kopen: noord', kind: 'land', dir: 'n', cost: 0, w: 1, h: 1, desc: 'Koop een strook van 8 tegels aan de noordkant (bovenaan) van je terrein.' });
addItem({ id: 'land_w', cat: 'terrein', name: 'Grond kopen: west', kind: 'land', dir: 'w', cost: 0, w: 1, h: 1, desc: 'Koop een strook van 8 tegels aan de westkant (links) van je terrein.' });
addItem({ id: 'land_e', cat: 'terrein', name: 'Grond kopen: oost', kind: 'land', dir: 'e', cost: 0, w: 1, h: 1, desc: 'Koop een strook van 8 tegels aan de oostkant (rechts) van je terrein.' });
addItem({ id: 'sloop', cat: 'slopen', name: 'Slopen', kind: 'demolish', cost: 0, w: 1, h: 1, desc: 'Verwijder objecten, paden of dieren. Je krijgt de helft van de bouwkosten terug.' });

DATA.itemsByCat = {};
for (const c of DATA.categories) DATA.itemsByCat[c.id] = Object.values(DATA.items).filter(i => i.cat === c.id);

// ---- PRIJZEN (instelbaar) ------------------------------------------------
DATA.defaultPrices = {
  tentplek: 30, caravanplek: 40, comfortplek: 52, trekkershut: 80, glampingtent: 120, stacaravan: 105, chalet: 200, pipowagen: 95,
};
DATA.defaultFees = { restaurant: 18, snackbar: 7, pizzeria: 14, bakker: 5, ijs: 4, winkel: 9, wasserette: 4, fiets: 8, zwembad: 3, midgetgolf: 4, skelter: 5, binnenspeeltuin: 3, bowling: 6, fitness: 5, bioscoop: 7 };
DATA.feeNames = { restaurant: 'Restaurant (per maaltijd)', snackbar: 'Snackbar (per snack)', pizzeria: 'Pizzeria (per pizza)', bakker: 'Bakker (per broodje)', ijs: 'IJssalon (per ijsje)', winkel: 'Winkel (per boodschap)',
  wasserette: 'Wasserette (per wasje)', fiets: 'Fietsverhuur (per rit)', zwembad: 'Zwembad / binnenbad (entree)', midgetgolf: 'Midgetgolf (per rondje)', skelter: 'Skelter (per rit)',
  binnenspeeltuin: 'Binnenspeeltuin (entree)', bowling: 'Bowlingbaan (per spel)', fitness: 'Fitness (per bezoek)', bioscoop: 'Bioscoop (per film)' };
// wat gasten redelijk vinden per nacht (basis), per gewenst type
DATA.baseWillingness = { tent: 38, caravan: 50, camper: 54, hut: 100, glamping: 150, stacaravan: 130, chalet: 250, pipowagen: 120 };
DATA.wantNames = { tent: 'tentplek', caravan: 'caravanplek', camper: 'camperplek', hut: 'trekkershut', glamping: 'glampingtent',
  stacaravan: 'stacaravan', chalet: 'chalet', pipowagen: 'pipowagen' };

// ---- GEZELSCHAPPEN -------------------------------------------------------
DATA.partyTypes = {
  gezin: { name: 'Gezin', weight: 40, needMul: { hunger: 1.15, hygiene: 1, fun: 1.15, energy: 1 }, budget: 1,
    wants: { tent: 30, caravan: 30, camper: 8, hut: 12, glamping: 7, stacaravan: 10, chalet: 10, pipowagen: 6 }, nights: [3, 7] },
  stel: { name: 'Stel', weight: 25, needMul: { hunger: 1, hygiene: 1.1, fun: 0.9, energy: 0.9 }, budget: 1.2,
    wants: { tent: 25, caravan: 15, camper: 15, hut: 12, glamping: 20, stacaravan: 6, chalet: 10, pipowagen: 8 }, nights: [2, 5] },
  jongeren: { name: 'Vriendengroep', weight: 15, needMul: { hunger: 1.2, hygiene: 0.7, fun: 1.5, energy: 0.8 }, budget: 0.75,
    wants: { tent: 70, caravan: 5, camper: 10, hut: 10, glamping: 2, stacaravan: 3, chalet: 2, pipowagen: 2 }, nights: [2, 4] },
  senioren: { name: 'Senioren', weight: 20, needMul: { hunger: 1, hygiene: 1.2, fun: 0.7, energy: 1.4 }, budget: 1.3,
    wants: { tent: 5, caravan: 35, camper: 20, hut: 8, glamping: 4, stacaravan: 22, chalet: 12, pipowagen: 2 }, nights: [4, 9] },
};

// ---- GEDACHTEN -----------------------------------------------------------
DATA.thoughts = {
  hungry: ['Ik heb honger.', 'Waar kun je hier iets eten?', 'Mijn maag knort.'],
  dirty: ['Ik wil graag douchen.', 'Ik moet nodig naar het toilet!', 'Een frisse douche zou fijn zijn.'],
  bored: ['Ik verveel me.', 'Is hier niks te doen?', 'Wat saai hier...'],
  tired: ['Ik ben moe.', 'Even zitten zou fijn zijn.'],
  nofood: ['Er is hier nergens eten te krijgen!', 'Geen restaurant, geen winkel... wat nu?'],
  nohygiene: ['Er is helemaal geen sanitair!', 'Waar zijn de douches?!'],
  nofun: ['Er is hier echt niets te beleven.', 'Volgend jaar ergens anders heen.'],
  full: ['Wat een rij hier...', 'Het is veel te druk bij {x}.'],
  broken: ['{x} is kapot. Wat een afknapper.', 'Hè, {x} doet het niet.'],
  litter: ['Wat een rommel ligt hier.', 'Zwerfafval overal, bah.'],
  dirtyfac: ['Het sanitair is smerig!', 'Hier heeft lang niemand schoongemaakt.'],
  pricey: ['Best prijzig hier.', 'Dat is niet goedkoop...'],
  cheap: ['Dit is een koopje!'],
  goodfood: ['Lekker gegeten!', 'Dat smaakte goed.', 'Heerlijk patatje.'],
  goodhyg: ['Lekker fris weer.', 'Fijne douche.'],
  goodfun: ['Dat was leuk!', 'Nog een keer!', 'Wat een plezier!'],
  swim: ['Heerlijk gezwommen!', 'Het water is zalig.'],
  animals: ['Wat een schattige dieren!', 'Mag ik de geit aaien?'],
  nature: ['Wat een mooie natuur hier.', 'Heerlijk rustig tussen de bomen.'],
  entertain: ['Wat een leuke animatie!', 'Die animatie is top.'],
  rain: ['Regen... bah.', 'Ik word nat.'],
  sun: ['Heerlijk weer vandaag!'],
  dark: ['Het is wel donker op het pad.'],
  sleep: ['Lekker geslapen.'],
  arrive: ['We zijn er! Vakantie!', 'Eindelijk vakantie.', 'Wat een leuke camping.'],
  leave: ['Tijd om naar huis te gaan.', 'Het was fijn hier.'],
  leavebad: ['Nooit meer hierheen.', 'Wat een teleurstelling.'],
  campfire: ['Gezellig bij het vuur.', 'Marshmallows!'],
  wait: ['Wachten, wachten...'],
  bin: ['Afval netjes weggegooid.', 'Even naar de prullenbak.'],
  overgrown: ['Het gras staat hier wel hoog.', 'Deze plek kan wel wat onderhoud gebruiken.', 'Wat een verwilderde boel.'],
  service: ['Fijn, grijswater geloosd en water getankt.'],
  noservice: ['Waar kan ik mijn grijswater kwijt?', 'Geen servicepunt voor de camper...'],
};

DATA.complaintNames = { nofood: 'nergens eten te krijgen', nohygiene: 'geen sanitair', nofun: 'niets te doen', full: 'te druk bij voorzieningen',
  broken: 'kapotte voorzieningen', litter: 'zwerfafval', dirtyfac: 'vies sanitair', dark: 'donkere paden', rain: 'regen', pricey: 'te duur',
  wait: 'lang wachten', hungry: 'honger', dirty: 'wilde douchen', bored: 'verveling', tired: 'vermoeidheid', noservice: 'geen camperservicepunt', overgrown: 'verwilderde staplek' };

// ---- DOELEN --------------------------------------------------------------
DATA.milestones = [
  { id: 'eerste', text: 'Ontvang je eerste gasten', check: s => s.totalParties >= 1 },
  { id: 'drie', text: 'Behaal een 3-sterrenbeoordeling', check: s => s.ratingStars >= 3 },
  { id: 'vier', text: 'Behaal een 4-sterrenbeoordeling', check: s => s.ratingStars >= 4 },
  { id: 'vijf', text: 'Behaal een 5-sterrenbeoordeling', check: s => s.ratingStars >= 5 },
  { id: 'g40', text: '40 gasten tegelijk op de camping', check: s => s.guestsNow >= 40 },
  { id: 'g100', text: '100 gasten tegelijk op de camping', check: s => s.guestsNow >= 100 },
  { id: 't500', text: 'In totaal 500 gasten ontvangen', check: s => s.totalGuests >= 500 },
  { id: 't2000', text: 'In totaal 2000 gasten ontvangen', check: s => s.totalGuests >= 2000 },
  { id: 'k250', text: '€ 250.000 in kas', check: s => s.money >= 250000 },
  { id: 'k1000', text: '€ 1.000.000 in kas', check: s => s.money >= 1000000 },
  { id: 'zwembad', text: 'Bouw een zwembad', check: s => s.has.zwembad },
  { id: 'dieren', text: 'Houd 8 dieren op de camping', check: s => s.animals >= 8 },
  { id: 'natuur', text: 'Plant zelf 50 bomen of struiken', check: s => s.nature >= 50 },
  { id: 'staff', text: 'Heb 6 personeelsleden in dienst', check: s => s.staff >= 6 },
  { id: 'jaar', text: 'Draai een vol jaar', check: s => s.day >= 12 * DATA.DAYS_PER_MONTH },
  { id: 'grond', text: 'Koop een strook grond bij', check: s => s.landBought >= 1 },
  { id: 'binnen', text: 'Bouw een overdekte attractie', check: s => s.has.binnenzwembad || s.has.binnenspeeltuin || s.has.bowlingbaan || s.has.bioscoop || s.has.fitness },
];

DATA.tips = [
  'Bouw een pad vanaf de ingang en zet daar een receptie langs. Zonder bereikbare receptie kan niemand inchecken.',
  'Staplekken en voorzieningen moeten met één zijde aan een pad grenzen, anders kunnen gasten er niet komen.',
  'Zonder sanitair vertrekken gasten snel en ontevreden. Bouw minstens één sanitairgebouw.',
  'Huur een schoonmaker in: viezig sanitair en zwerfafval kosten je sterren.',
  'Kinderen willen spelen: een speeltuin en trampoline maken gezinnen blij.',
  'Bomen en bloemen rond staplekken verhogen de sfeer. Gasten betalen graag meer voor een mooie plek.',
  'In het hoogseizoen (juni-augustus) komen de meeste gasten. Zorg dan voor genoeg plekken.',
  'In de winter komen alleen gasten voor trekkershutten en chalets. Gebruik die tijd om te bouwen.',
  'Pas de prijzen aan in het prijzenpaneel. Een hoge beoordeling laat je meer vragen.',
  'Een animatiemedewerker maakt gasten in de buurt vrolijk. \'s Avonds gaat hij naar het kampvuur.',
  'Te weinig ruimte? Koop in de categorie Terrein een strook grond bij.',
  'Druk op R (of de knop Draaien) om een gebouw te draaien voordat je het plaatst. Via het infopaneel kun je gebouwen ook verplaatsen.',
  'Geef schoonmakers een focus (afval of sanitair) via het infopaneel of het personeelsoverzicht.',
  'Gras groeit en bloemen verwelken. Een tuinman houdt staplekken en groen verzorgd; verwilderde plekken kosten sfeer en sterren.',
];
