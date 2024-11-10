async function getJson(url) {
	try {
		const response = await fetch(url); // {cache: 'no-cache'} https://hacks.mozilla.org/2016/03/referrer-and-cache-control-apis-for-fetch/
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const json = await response.json();
		return json;
	} catch (error) {
		console.error(error.message);
	}
}

// compute a deghree dist between lat lng coords where lng is in -180 to 180
function distanceBetweenCoords(start, end) {
	const latDist = Math.abs(end.lat - start.lat);
	let lngDist = Math.abs( end.lng - start.lng );
	if (lngDist > 180) {
		lngDist = 360 - lngDist;  // go the other way around
	}
	return latDist+lngDist;
}
// tween does linear interpolation, which might take you the long way around the world
// if neeeded, change start.lng by +/- 360 for force the tween to take the short way
function fixStartLng(start, end) {
  	const delta = end.lng - start.lng;
  	if (Math.abs(delta) <= 180)  // already going the short way
		return;
	console.log("Fixing start lng original: ", start.lng);
	console.log("End lng is: ", end.lng);

	if (delta > 180) {
		start.lng += 360;
		
	} else 	if (delta < -180) {
		start.lng -= 360;
	}
	console.log("New start lng is: ", start.lng);
}

class RNG {
	static m = 0x80000000; // 2**31;
	static a = 1103515245;
	static c = 12345;

	static state;
}
function seed(seed) {
	if (seed == undefined) {
		const d = new Date();
		let year = d.getFullYear()
		let month = d.getMonth();
		let day = d.getDate();

		seed = year*365+12*month+day;		
	}
	RNG.state = seed * (RNG.m-1);
	//console.log("Seeding random number generator to ", RNG.seed);
}

function nextRand(limit) {
	if (RNG.state == undefined) {
		seed();
	}
	RNG.state = (RNG.a * RNG.state + RNG.c) % RNG.m;

	const retval =  RNG.state % limit;
	//console.log("Random value " , retval);
	return retval;
}

const itemHistory = 'History';

function getHistory() {
	let histString = localStorage.getItem(itemHistory);
	histString ??= '';
	return histString;
}
function addHistory(code) {
	// Save the new History, but only the last X entries
	const histLimit = 10;
	let histString = getHistory();
	if (histString.length > (4 * histLimit)) {
		histString = histString.slice(-4*histLimit);
	}

	histString += ' ';
	histString += code;
	localStorage.setItem(itemHistory, histString);
}

function throwConfetti() {
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { y: 0.6 },
	  });
}

function findIndexOfCountry(c, iso) {
	for (let i = 0; i < c.features.length; i++) {
		if (c.features[i].properties.ISO_A3_EH === iso) {
			return i;
		}
	}
	return undefined;
}

function logPolygonInfo( e) {
	const g = e.geometry;
	const t = e.geometry.type;
//	console.log(e.properties.ISO_A3_EH, e.properties.NAME_LONG, e.geometry.type);
	const areas = [];

	if ("Polygon" == t) {
		const a = turf.area( turf.polygon([g.coordinates[0]]));

		areas.push(Math.round(a/1000000));
	}
	if ("MultiPolygon" == t) {
	//	console.log("polygon count: ", g.coordinates.length);
		for (let i=0; i< g.coordinates.length; i++) {
			let p= g.coordinates[i][0];
		    let a = turf.area( turf.polygon([p]));
			areas.push(Math.round(a/1000000));
		}
	}
	const msg = "" + e.properties.ISO_A3_EH + " " + e.properties.NAME_LONG + " " + e.geometry.type + " " + areas;
	console.log(msg);
}

// Override bboxes for some countries, like widely disperesed islands
const boxes = new Map();
boxes.set("ASM",  [	-171,	-14.7,	-168,	-13.75  ]); // American Samo
boxes.set("IOT",  [	72.2, -7.6,	72.6, -7.07  ]); // British Indian Ocean Territory
boxes.set("KIR",  [	-160.41, 0.44,	-159.44, 4.35  ]); // Kiribati
boxes.set("SYC",  [	54.75, -5.3,	56.8, -3.4  ]); // Seychelles, capital Victoria
boxes.set("TUV",  [	179.14, -8.6,	179.3, -8.43  ]); // Tuvalu, capital Funafuti
boxes.set("COK",  [	-160, -22.1, -157.2, -18.8  ]); // Cook Islands, capital Avarua
boxes.set("FJI",  [	177.2, -19, 179.9, -16  ]); // Fiji, capital Suva
boxes.set("FSM",  [	157.7, 6.3, 159, 7.3  ]); // Fed Sts of Micronesia, capital Palikir
boxes.set("PYF",  [	-151.7, -18, -150, -16  ]); // French Polynesia, capital Papeete
boxes.set("MDV",  [	73.4, 4.1, 73.7, 4.4  ]); // Maldives, capital Male
boxes.set("MHL",  [	170.9, 6.8, 172.2, 7.3  ]); // Marshall Islands, capital Majuro
boxes.set("MUS",  [	57, -20.9, 63.6, -19  ]); // Mauritius, capital Port Louis, maybe just left island?
boxes.set("PLW",  [	133.9, 6.6, 134.7, 8.1  ]); // Palau, capital 	Ngerulmud
boxes.set("SHN",  [	-6.3, -16.2, -5.3, -15.3  ]); // Saint Helena, capital 	Jamestown
boxes.set("SGS",  [	 -38.4, -55.3, -36 , -53.5 ]); // South Georgia, capital 
boxes.set("TON",  [	 -175.53, -21.6, -174.8, -21 ]); // Tonga, capital Nukuʻalofa
boxes.set("TUV",  [	 179, -8.6, 179.2, -8.4 ]); // Tuvalu, capital Funafuti


function getBoxForFeature( feat ) {
	const code = feat.properties.ISO_A3_EH;
	const box = boxes.get(code);
	if (box) {
		console.log("Overriding bbox for " + code + " with " + box +  " instead of " + feat.bbox);
	}
	const retval = box ?? feat.bbox;
	return retval;
}

function getBboxSize(feat) {
	const box = getBoxForFeature(feat);
	let area = Math.abs(box[2] - box[0]) * (box[3] - box[1]);  // use turf?

	if (box[0] > 0 && box[2] < 0) { // cross the date line 
	    area = Math.abs(360 + box[2] - box[0]) * (box[3] - box[1]);  // use turf?
	} 

	console.log("Box area for " + feat.properties.ISO_A3_EH + " " + area);
	return area;
}

function getBboxCenter(feat) {
	const box = getBoxForFeature(feat);
	const center = [(box[2] + box[0]) / 2, (box[3] + box[1]) / 2];

	if (box[0] > 0 && box[2] < 0) {
		center[0] += 180;
	}

	return center;
}

// Give a bbox size, pick a height above earth surface in earth radius units
function getZoomForSize(s) {
	if (s < 0.001) {
		return 0.01;
	}
	if (s < 1) {
		return 0.05;
	}
	if (s < 10) {
		return 0.1;
	}
	if (s < 100) {
		return 0.5;
	}
	return 1.25;
}

function getLabelForSize(s) {
	if (s < 0.001) {
		return 0.005;
	}
	if (s < 1) {
		return 0.05;
	}
	if (s < 10) {
		return 0.1;
	}
	if (s < 100) {
		return 0.5;
	}
	return 1.25;
}
function getLabelOffsetForSize(s) {
	if (s < 0.001) {
		return 0.01;
	}
	return 0.4;
}

const iso3166_3_neighbors = new Map([
    ["AFG", ["PAK", "IRN", "TKM", "UZB", "TJK"]],
	["AGO", ["NAM", "ZAF", "ZMB"]],
	['ALA', ['FIN']],  // Åland Islands neighbors: Finland
    ["ALB", ["MNE", "GRC", "MKD", 'SRB']],
   
	
    ["AND", ["ESP", "FRA"]],
  
    ["ATG", ["VCT", "GRD", "LCA"]],
    ["ARG", ["CHL", "BOL", "PAR", "BRA", "URY"]],
    ["ARM", ["GEO", "AZE", "TUR", "IRN"]],
    ["AUS", ["NZL"]],
    ["AUT", ["DEU", "CHE", "SVK", "HUN", "ITA"]],
    ["AZE", ["RUS", "GEO", "ARM", "IRN"]],


	["BGD", ["IND", "MMR"]],
    ["BGR", ["ROU", "SRB", "MKD", "GRC", "TUR"]],
	
    ["BHS", ["USA", "CUB"]],
    ["BHR", ["SAU"]],
	['BIH', ['MNE', 'HRV', 'SRB']], // Bosnia and Herzegovina neighbors: Montenegro, Croatia, Serbia
   
    ["BLA", []],
    ["BLR", ["LTU", "LVA", "POL", "UKR", "RUS"]],
    ["BOL", ["BRA", "PER", "ARG", "PAR"]],
    ["BIH", ["HRV", "MNE", "SRB"]],
    ["BRB", ["VCT", "ATG"]],
    ["BRA", ["VEN", "GUY", "SUR", "URU", "PAR", "BOL"]],
    ["BRN", ["MYS"]],
    ["BTN", ["IND", "CHN"]],
    ["BWA", ["NAM", "ZAF", "ZWE"]],
    ["CAF", ["TCD", "CMR", "COG", "GAB", "SSD"]],
    ["CAN", ["USA"]],
    ["CHE", ["DEU", "AUT", "ITA", "FRA", "LIE"]],
    ["CHL", ["PER", "ARG"]],
    ["CHN", ["RUS", "MNG", "KAZ", "KGZ", "TJK", "AFG", "NPL", "IND", "BGD", "MMR", "LAO", "VNM", "KHM", "THA", "BRN"]],
    ["CIV", ["GHA", "LBY", "MLI", "BFA", "TGO"]],
    ["CMR", ["NER", "NGA", "TCD", "CAF", "GAB"]],
    ["COD", ["CAF", "CGO", "GAB", "ANG"]],
    ["COG", ["GAB", "CAF", "COD"]],
    ["COL", ["VEN", "BRA", "PER", "PAN"]],
    ["COM", ["MAY"]],
    ["CUB", ["USA", "BHS"]],
    ["CYP", ["TUR", "GRC"]],
    ["CZE", ["DEU", "AUT", "SVK", "POL"]],
    ["DEU", ["FRA", "NLD", "BEL", "LUX", "CHE", "AUT", "CZE", "POL", "DNK"]],
    ["DNK", ["DEU", "SWE"]],
    ["DOM", ["HTI"]],
    ["DZA", ["TUN", "LBY", "NER", "MLI", "MRT", "MAR"]],
	
    ["ECU", ["COL", "PER"]],
    ["EGY", ["LBY", "SDN", "ISR", "PSE"]],
    ["ERI", ["SDN", "ETH", "DJI"]],
    ["ESH", ["MAR"]],
    ["ESP", ["AND", "FRA", "PRT"]],
    ["EST", ["LVA", "RUS"]],
    ["ETH", ["SDN", "DJI", "KEN", "ERI"]],
    ["FRA", ["AND", "BEL", "DEU", "ITA", "LUX", "MCO", "NLD", "ESP", "CHE", "GBR"]],
    ["GAB", ["CMR", "CGO"]],
    ["GBR", ["IRL"]],
    ["GEO", ["RUS", "TUR", "ARM", "AZE"]],
    ["GHA", ["TGO", "BEN", "BFA"]],
	['GIN', ['SLE', 'LBR']], // Guinea neighbors: Sierra Leone, Liberia
    ["GMB", ["SEN"]],
    ["GNB", ["SEN", "MLI"]],
    ["GNQ", ["CMR", "GAB"]],
    ["GRC", ["ALB", "MKD", "BGR", "TUR"]],
	
    ["GRD", ["VCT", "ATG"]],
    ["GTM", ["MEX", "BLZ"]],
    ["GUY", ["VEN", "BRA", "SUR"]],
	['HKG', ['CHN']],
    ["HND", ["GTM", "SLV"]],
    ["HRV", ["SLV", "ITA", "MNE", "BOS",'BIH', 'SRB']],
	
    ["HTI", ["DOM"]],
    ["HUN", ["AUT", "SVK", "ROU", "UKR", "HRV"]],
    ["IDN", ["MYS", "TLS"]],
    ["IND", ["PAK", "CHN", "NEP", "BTN", "BGD", "MMR"]],
    ["IRL", ["GBR"]],
    ["IRN", ["TUR", "ARM", "AZE", "AFG", "PAK"]],
    ["IRQ", ["TUR", "IRN", "SYR", "KWT", "SAU"]],
    ["ISL", ["GBR"]],
    ["ISR", ["EGY", "JOR", "PSE", "LBY"]],
    ["ITA", ["FRA", "SVN", "AUT", "CHE"]],
    ["JAM", ["CUB"]],
    ["JOR", ["IRQ", "SYR", "ISR", "SAU"]],
    ["JPN", ["KOR", "RUS"]],
    ["KAZ", ["RUS", "KYG", "UZB", "TJK", "MNG"]],
    ["KEN", ["UGA", "TZA", "ETH", "SOM"]],
    ["KGZ", ["KAZ", "UZB", "TJK"]],
    ["KHM", ["THA", "LAO", "VNM"]],
    ["KIR", []],
    ["KOR", ["PRK"]],
    ["KWT", ["IRQ", "SAU"]],
    ["LAO", ["CHN", "VNM", "THA"]],
    ["LBN", ["SYR", "ISR"]],
    ["LBR", ["SLE", "GIN"]],
    ["LBY", ["TUN", "DZA", "NER", "CHD"]],
    ["LIE", ["CHE", "AUT"]],
    ["LIT", ["POL", "BLR"]],
    ["LTU", ["POL", "BLR"]],
    ["LUX", ["BEL", "DEU", "FRA"]],
    ["LVA", ["EST", "BLR", "RUS"]],
    ["MAR", ["DZA", "ESH"]],
    ["MDA", ["ROU", "UKR"]],
    ["MDG", ["MUS"]],
    ["MEX", ["USA", "BLZ"]],

    ['MKD', ['SRB', 'ALB', 'GRC', 'BGR']], // North Macedonia neighbors: Serbia, Albania, Greece, Bulgaria
  
    ["MLI", ["DZA", "NER", "BFA", "CIV", "SGS", "GBS"]],
    ["MLT", []],
	['MNE', ['HRV', 'BIH', 'SRB', 'ALB', 'XKX']], // Montenegro neighbors: Croatia, Bosnia and Herzegovina, Serbia, Albania, Kosovo
    ["MNG", ["RUS", "CHN"]],
    ["MRT", ["DZA", "MLI", "SEN"]],
    ["MUS", ["MDG"]],
    ["MWI", ["TZA", "MOZ"]],
    ["MYS", ["THA", "SGP", "IDN", "BRN"]],
    ["NAM", ["AGO", "ZAF", "BWA", "ZMB"]],
    ["NCL", ["AUS"]],
    ["NER", ["DZA", "MLI", "BFA", "NGA"]],
    ["NGA", ["BEN", "TGO", "GHA", "CMR", "NER"]],
    ["NIC", ["HND", "CRI"]],
    ["NLD", ["BEL", "DEU"]],
    ["NOR", ["SWE", "FIN"]],
    ["NZL", ["AUS"]],
    ["OMN", ["SAU", "ARE"]],
    ["PAK", ["IND", "AFG", "IRN"]],
    ["PAN", ["COL", "CRI"]],
    ["PER", ["ECU", "COL", "BRA", "BOL", "CHL"]],
    ["PHL", []],
    ["PNG", ["AUS", "SLB"]],
    ["POL", ["DEU", "CZE", "SVK", "LVA", "LTU", "BLR"]],
    ["PRK", ["KOR", "CHN", "RUS"]],
    ["PRT", ["ESP"]],
    ["PSE", ["ISR", "EGY", "JOR"]],
    ["QAT", ["SAU"]],
	['ROM', ['SRB', 'BGR']] ,
    ["ROU", ["HUN", "MDA", "UKR", "BGR"]],
    ["RUS", ["NOR", "FIN", "EST", "LVA", "LTU", "BLR", "UKR", "KAZ", "MNG", "PRK", "JPN"]],
    ["RWA", ["UGA", "TZA", "BDI"]],
    ["SEN", ["GMB", "MRT", "GHA"]],
    ["SGP", ["MYS"]],
    ["SLE", ["GIN", "LBR"]],
    ["SLB", ["PNG", "AUS"]],
    ["SMR", ["ITA"]],
    ["SOM", ["KEN", "ETH"]],
    ["SRB", ["HUN", "ROU", "BGR", "MKD", "HRV", "BOS",'MNE',, 'BIH', 'ALB', 'XKX']],
	
    ["SSD", ["ETH", "KEN", "UGA", "CDG"]],
    ["STP", []],
    ["SWE", ["NOR", "DNK"]],
    ["SWZ", ["ZAF", "MOZ"]],
    ["SYR", ["TUR", "IRQ", "JOR", "ISR"]],
	['TCD', ['LBY', 'SDN', 'CAF', 'CMR', 'NGA',"NER"]], // Chad neighbors: Libya, Sudan, Central African Republic, Cameroon, Nigeria

    ["TGO", ["BEN", "GHA"]],
    ["THA", ["MYS", "LAO", "KHM", "MYN"]],
    ["TJK", ["KAZ", "KGZ", "UZB", "AFG"]],
    ["TKM", ["KAZ", "UZB", "AFG"]],
    ["TLS", ["IDN"]],
    ["TUN", ["ALG", "LIB"]],
    ["TZA", ["KEN", "UGA", "MWI", "MOZ", "COM"]],
    ["UGA", ["KEN", "TZA", "RWA"]],
    ["UKR", ["POL", "SVK", "HU", "ROU", "MD", "BY", "RUS"]],
    ["URY", ["BRA", "ARG"]],
    ["USA", ["CAN", "MEX"]],
    ["UZB", ["KAZ", "KYG", "TJK", "AFG"]],
    ["VEN", ["COL", "BRA", "GUY"]],
    ["VNM", ["CHN", "LAO", "KHM"]],
    ["VUT", ["NZL"]],
    ["WLF", []],
    ["WSM", []],
    ["YEM", ["SAU", "OMN"]],
    ["ZAF", ["NAM", "BWA", "ZWE", "MOZ"]],
    ["ZMB", ["TZA", "NAM", "ZWE"]],
    ["ZWE", ["ZAF", "BWA", "ZMB"]],
    ["LCA", ["VCT", "ATG"]],
    ["VCT", ["GRD", "ATG", "LCA"]],
    ["XKK", ["ALB", "MNE", "SRB"]], // Kosovo
    ["PSE", ["ISR", "EGY", "JOR"]], // Palestine
    // Add Caribbean and additional countries...
]);

const balkanNeighbors = new Map([
	['MNE', ['HRV', 'BIH', 'SRB', 'ALB', 'XKX']], // Montenegro neighbors: Croatia, Bosnia and Herzegovina, Serbia, Albania, Kosovo
	['HRV', ['MNE', 'BIH', 'SRB']], // Croatia neighbors: Montenegro, Bosnia and Herzegovina, Serbia
	

	['ALB', ['MNE', 'SRB']], // Albania neighbors: Montenegro, Serbia
	['XKX', ['MNE', 'SRB']], // Kosovo neighbors: Montenegro, Serbia
	['MKD', ['SRB', 'ALB', 'GRC', 'BGR']], // North Macedonia neighbors: Serbia, Albania, Greece, Bulgaria
	['GRC', ['MKD', 'BGR', 'ALB']], // Greece neighbors: North Macedonia, Bulgaria, Albania
	['BGR', ['MKD', 'GRC', 'SRB']], // Bulgaria neighbors: North Macedonia, Greece, Serbia
	['ROM', ['SRB', 'BGR']] // Romania neighbors: Serbia, Bulgaria
	// More Balkan countries can be added here as needed
  ]);

// Add the Caribbean countries
iso3166_3_neighbors.set("ATG", ["VCT", "GRD", "JAM", "DOM"]);
iso3166_3_neighbors.set("BHS", ["USA", "CUB"]);
iso3166_3_neighbors.set("BRB", ["VCT", "ATG", "GRD"]);
iso3166_3_neighbors.set("CUB", ["USA", "BHS"]);
iso3166_3_neighbors.set("DMA", ["ATG", "VCT"]);
iso3166_3_neighbors.set("DOM", ["HTI", "ATG"]);
iso3166_3_neighbors.set("GRD", ["ATG", "VCT"]);
iso3166_3_neighbors.set("HTI", ["DOM", "BHS"]);
iso3166_3_neighbors.set("JAM", ["CUB"]);
iso3166_3_neighbors.set("LCA", ["VCT", "ATG"]);
iso3166_3_neighbors.set("MUS", ["MDG", "REU"]);
iso3166_3_neighbors.set("STP", []); // São Tomé and Príncipe
iso3166_3_neighbors.set("TTO", ["VEN"]);
iso3166_3_neighbors.set("VCT", ["ATG", "GRD", "LCA"]);

iso3166_3_neighbors.set(["PHL", ["VNM", "TWN", "MYS"]]);

console.log(iso3166_3_neighbors.size); // Should still return 237, but really 165

const wikipediaMap =  new Map();

wikipediaMap.set("ATF", ["AUS"]);
wikipediaMap.set("AFG", ["CHN","IRN","PAK","TJK","TKM","UZB"]);
wikipediaMap.set("GBR", ["CYP","UN"]);
wikipediaMap.set("ALB", ["GRC","ITA","MNE","MKD","XKX"]);
wikipediaMap.set("DZA", ["ITA","LBY","MLI","MRT","MAR","NER","ESP","TUN"]);
wikipediaMap.set("ASM", ["WSM","TON","COK","NIU","TKL"]);
wikipediaMap.set("AND", ["FRA","ESP"]);
wikipediaMap.set("AGO", ["COD","COG","NAM","ZMB"]);
wikipediaMap.set("AIA", ["ATG","VGB","NLD","BLM","FRA","VIR"]);
wikipediaMap.set("ATG", ["FRA","KNA","AIA","MSR","FRA"]);
wikipediaMap.set("ARG", ["BOL","BRA","CHL","PRY","URY","FLK"]);
wikipediaMap.set("ARM", ["AZE","GEO","IRN","TUR"]);
wikipediaMap.set("ABW", ["CUW","DOM","VEN"]);
wikipediaMap.set("NFK", ["TLS","IDN","NZL","PNG","SLB","ATF","NCL"]);
wikipediaMap.set("AUS", ["TLS","IDN","NZL","PNG"]);
wikipediaMap.set("AUS", ["ATF","NOR","NZL"]);
wikipediaMap.set("AUT", ["CZE","DEU","HUN","ITA","LIE","SVK","SVN","CHE"]);
wikipediaMap.set("AZE", ["ARM","GEO","IRN","KAZ","RUS","TUR","TKM"]);
wikipediaMap.set("BHS", ["CUB","HTI","USA","TCA"]);
wikipediaMap.set("BHR", ["IRN","QAT","SAU"]);
wikipediaMap.set("USA", ["USA","KIR"]);
wikipediaMap.set("BGD", ["MMR","IND"]);
wikipediaMap.set("BRB", ["FRA","GUY","LCA","VCT","TTO","VEN"]);
wikipediaMap.set("BLR", ["LVA","LTU","POL","RUS","UKR"]);
wikipediaMap.set("BEL", ["FRA","DEU","LUX","NLD","GBR"]);
wikipediaMap.set("BLZ", ["GTM","HND","MEX"]);
wikipediaMap.set("BEN", ["BFA","NER","NGA","TGO"]);
wikipediaMap.set("BMU", []);
wikipediaMap.set("BTN", ["CHN","IND"]);
wikipediaMap.set("BOL", ["ARG","BRA","CHL","PRY","PER"]);
wikipediaMap.set("BIH", ["HRV","MNE","SRB"]);
wikipediaMap.set("BWA", ["NAM","ZAF","ZMB","ZWE"]);
wikipediaMap.set("BRA", ["ARG","BOL","COL","FRA","GUY","PRY","PER","SUR","URY","VEN"]);
wikipediaMap.set("IOT", ["MDV"]);
wikipediaMap.set("VGB", ["AIA","PRI","VIR"]);
wikipediaMap.set("BRN", ["CHN","MYS","PHL","TWN","VNM"]);
wikipediaMap.set("BGR", ["GRC","MKD","ROU","SRB","TUR","RUS","UKR"]);
wikipediaMap.set("BFA", ["BEN","CIV","GHA","MLI","NER","TGO"]);
wikipediaMap.set("BDI", ["COD","RWA","TZA"]);
wikipediaMap.set("KHM", ["LAO","THA","VNM"]);
wikipediaMap.set("CMR", ["CAF","TCD","COG","GNQ","GAB","NGA"]);
wikipediaMap.set("CAN", ["USA","GRL","SPM"]);
wikipediaMap.set("CPV", ["GMB","MRT","SEN"]);
wikipediaMap.set("CYM", ["CUB","HND","JAM"]);
wikipediaMap.set("CAF", ["CMR","TCD","COD","COG","SSD","SDN"]);
wikipediaMap.set("TCD", ["CMR","CAF","LBY","NER","NGA","SDN"]);
wikipediaMap.set("CHL", ["ARG","BOL","PER"]);
wikipediaMap.set("TWN", ["AFG","BTN","BRN","IND","IDN","JPN","KAZ","PRK","KOR","KGZ","LAO","MYS","MNG","MMR","NPL","PAK","PHL","RUS","TJK","VNM","HKG","MAC","TWN"]);
wikipediaMap.set("COL", ["BRA","CRI","DOM","ECU","HTI","JAM","NIC","PAN","PER","VEN"]);
wikipediaMap.set("COM", ["FRA","MDG","MOZ","SYC","TZA","ATF"]);
wikipediaMap.set("COD", ["AGO","BDI","CAF","COG","RWA","SSD","TZA","UGA","ZMB"]);
wikipediaMap.set("COG", ["AGO","CMR","CAF","COD","GAB"]);
wikipediaMap.set("COK", ["KIR","ASM","PYF","NIU","TKL"]);
wikipediaMap.set("CRI", ["COL","ECU","NIC","PAN"]);
wikipediaMap.set("CIV", ["BFA","GHA","GIN","LBR","MLI"]);
wikipediaMap.set("HRV", ["BIH","HUN","ITA","MNE","SRB","SVN"]);
wikipediaMap.set("CUB", ["BHS","HTI","HND","JAM","MEX","USA","CYM"]);
wikipediaMap.set("CUW", ["DOM","NLD","VEN","ABW"]);
wikipediaMap.set("CYP", ["EGY","GRC","ISR","LBN","SYR","TUR","GBR","UN"]);
wikipediaMap.set("CZE", ["AUT","DEU","POL","SVK"]);
wikipediaMap.set("DNK", ["DEU","NOR","POL","SWE","GBR","DNK","DNK","FRO"]);
wikipediaMap.set("GRL", ["CAN","DEU","ISL","NOR","POL","SWE","GBR","SJM","SJM"]);
wikipediaMap.set("DJI", ["ERI","ETH","SOM","YEM"]);
wikipediaMap.set("DMA", ["FRA","VEN"]);
wikipediaMap.set("DOM", ["COL","HTI","VEN","ABW","CUW","PRI","TCA"]);
wikipediaMap.set("TLS", ["AUS","IDN"]);
wikipediaMap.set("ECU", ["COL","CRI","PER"]);
wikipediaMap.set("EGY", ["CYP","GRC","ISR","JOR","LBY","SAU","SDN","TUR","PSE"]);
wikipediaMap.set("SLV", ["GTM","HND","NIC"]);
wikipediaMap.set("GNQ", ["CMR","GAB","NGA","STP"]);
wikipediaMap.set("ERI", ["DJI","SAU","SDN","ETH","YEM"]);
wikipediaMap.set("EST", ["FIN","LVA","RUS","SWE"]);
wikipediaMap.set("SWZ", ["MOZ","ZAF"]);
wikipediaMap.set("ETH", ["DJI","ERI","KEN","SOM","SSD","SDN"]);
wikipediaMap.set("FLK", ["ARG"]);
wikipediaMap.set("FRO", ["ISL","NOR","GBR"]);
wikipediaMap.set("FJI", ["NZL","SLB","TON","TUV","VUT","NCL","WLF"]);
wikipediaMap.set("FIN", ["EST","NOR","RUS","SWE"]);
wikipediaMap.set("FRA", ["AND","ATG","BRB","BEL","BRA","COM","DMA","DEU","ITA","LUX","MDG","MUS","LCA","ESP","CHE","SUR","GBR","VEN","ATF","GGY","JEY","MSR","FRA","PYF","ATF","NCL","BLM","FRA","SPM"]);
wikipediaMap.set("WLF", ["AND","ATG","BRB","BEL","BRA","CAN","COM","DMA","FJI","DEU","ITA","KIR","LUX","MDG","MUS","MOZ","NLD","KNA","LCA","SYC","SLB","ESP","SUR","CHE","TON","TUV","GBR","VUT","VEN","AIA","COK","GGY","AUS","JEY","MSR","SXM","NFK","PCN","TKL"]);
wikipediaMap.set("PYF", ["KIR","COK","PCN"]);
wikipediaMap.set("ATF", ["COM","FRA","MDG","MUS","SYC","HMD"]);
wikipediaMap.set("GAB", ["CMR","COG","GNQ","STP"]);
wikipediaMap.set("GMB", ["CPV","SEN"]);
wikipediaMap.set("GEO", ["ARM","AZE","RUS","TUR"]);
wikipediaMap.set("DEU", ["AUT","BEL","CZE","DNK","FRA","LUX","NLD","POL","SWE","CHE","GBR"]);
wikipediaMap.set("GHA", ["BFA","CIV","TGO"]);
wikipediaMap.set("GRC", ["ALB","BGR","CYP","EGY","ITA","LBY","MKD","TUR"]);
wikipediaMap.set("GRL", ["CAN","ISL","SJM","SJM"]);
wikipediaMap.set("GRD", ["VCT","TTO","VEN"]);
wikipediaMap.set("GUM", ["FSM","MNP"]);
wikipediaMap.set("GTM", ["BLZ","SLV","HND","MEX"]);
wikipediaMap.set("GGY", ["FRA","GBR","JEY"]);
wikipediaMap.set("GIN", ["CIV","GNB","LBR","MLI","SEN","SLE"]);
wikipediaMap.set("GNB", ["GIN","SEN"]);
wikipediaMap.set("GUY", ["BRB","BRA","SUR","TTO","VEN"]);
wikipediaMap.set("HTI", ["BHS","COL","CUB","DOM","TCA"]);
wikipediaMap.set("HMD", ["ATF"]);
wikipediaMap.set("HND", ["BLZ","CUB","GTM","JAM","MEX","NIC","CYM"]);
wikipediaMap.set("HKG", ["CHN","MAC"]);
wikipediaMap.set("USA", ["USA"]);
wikipediaMap.set("HUN", ["AUT","HRV","ROU","SRB","SVK","SVN","UKR"]);
wikipediaMap.set("ISL", ["FRO","GRL","SJM"]);
wikipediaMap.set("IND", ["BGD","BTN","MMR","CHN","IDN","MDV","NPL","PAK","LKA","THA"]);
wikipediaMap.set("IDN", ["AUS","CHN","TLS","IND","MYS","PLW","PNG","PHL","SGP","TWN","THA","VNM"]);
wikipediaMap.set("IRN", ["AFG","ARM","AZE","BHR","IRQ","KWT","OMN","PAK","QAT","SAU","TUR","TKM","ARE"]);
wikipediaMap.set("IRQ", ["IRN","JOR","KWT","SAU","SYR","TUR"]);
wikipediaMap.set("IRL", ["GBR"]);
wikipediaMap.set("IMN", ["GBR"]);
wikipediaMap.set("ISR", ["CYP","EGY","JOR","LBN","SYR","PSE"]);
wikipediaMap.set("ITA", ["ALB","DZA","AUT","HRV","FRA","GRC","LBY","MLT","MNE","SMR","SVN","ESP","CHE","TUN","VAT"]);
wikipediaMap.set("JAM", ["COL","CUB","HTI","HND","NIC","CYM"]);
wikipediaMap.set("SJM", ["ISL","GRL"]);
wikipediaMap.set("JPN", ["CHN","KOR","RUS","MNP","TWN"]);
wikipediaMap.set("JEY", ["FRA","GGY"]);
wikipediaMap.set("JOR", ["EGY","IRQ","ISR","SYR","PSE"]);
wikipediaMap.set("KAZ", ["AZE","CHN","KGZ","RUS","UZB"]);
wikipediaMap.set("KEN", ["ETH","SOM","SSD","UGA"]);
wikipediaMap.set("KIR", ["MHL","NRU","TUV","COK","PYF","USA","TKL"]);
wikipediaMap.set("PRK", ["CHN","KOR"]);
wikipediaMap.set("KOR", ["CHN","JPN","PRK"]);
wikipediaMap.set("XKX", ["ALB","MNE","MKD","SRB"]);
wikipediaMap.set("KWT", ["IRN","IRQ","SAU"]);
wikipediaMap.set("KGZ", ["CHN","KAZ","TJK","UZB"]);
wikipediaMap.set("LAO", ["KHM","CHN","THA","VNM"]);
wikipediaMap.set("LVA", ["EST","LTU","RUS"]);
wikipediaMap.set("LBN", ["CYP","ISR","SYR"]);
wikipediaMap.set("LSO", ["ZAF"]);
wikipediaMap.set("LBR", ["CIV","GIN","SLE"]);
wikipediaMap.set("LBY", ["DZA","TCD","EGY","GRC","ITA","MLT","NER","TUN","TUR"]);
wikipediaMap.set("LIE", ["AUT","CHE"]);
wikipediaMap.set("LTU", ["LVA","POL","RUS"]);
wikipediaMap.set("LUX", ["BEL","FRA","DEU"]);
wikipediaMap.set("MAC", ["CHN","HKG"]);
wikipediaMap.set("MDG", ["COM","FRA","MUS","MOZ","SYC","ATF"]);
wikipediaMap.set("MWI", ["MOZ","TZA","ZMB"]);
wikipediaMap.set("MYS", ["CHN","IDN","PHL","SGP","VNM","TWN"]);
wikipediaMap.set("MDV", ["IND","LKA","IOT","MUS"]);
wikipediaMap.set("MLI", ["DZA","BFA","CIV","GIN","MRT","NER","SEN"]);
wikipediaMap.set("MLT", ["ITA","LBY"]);
wikipediaMap.set("MHL", ["KIR","FSM","NRU"]);
wikipediaMap.set("MRT", ["CPV","MLI","SEN"]);
wikipediaMap.set("MUS", ["FRA","MDG","SYC","ATF","MDV"]);
wikipediaMap.set("MEX", ["CUB","GTM","HND","USA"]);
wikipediaMap.set("FSM", ["MHL","PLW","PNG","GUM"]);
wikipediaMap.set("MDA", ["UKR"]);
wikipediaMap.set("MCO", []);
wikipediaMap.set("MNG", ["RUS"]);
wikipediaMap.set("MNE", ["BIH","HRV","ITA","SRB"]);
wikipediaMap.set("MSR", ["ATG","FRA","KNA","VEN"]);
wikipediaMap.set("MAR", ["PRT","ESP"]);
wikipediaMap.set("MOZ", ["SWZ","MDG","MWI","TZA","ZMB","ZWE","ATF"]);
wikipediaMap.set("MMR", ["BGD","CHN","IND","LAO","THA"]);
wikipediaMap.set("NAM", ["BWA","ZMB"]);
wikipediaMap.set("NRU", ["KIR"]);
wikipediaMap.set("MHL", ["CUB","HTI","JAM"]);
wikipediaMap.set("NPL", ["IND"]);
wikipediaMap.set("NLD", ["BEL","DEU","KNA","GBR","VEN","AIA","CUW","BLM","MAF","SXM","VIR","ABW","CUW","NLD"]);
wikipediaMap.set("SXM", ["BEL","DOM","DEU","KNA","GBR","VEN","AIA","FRA","FRA","VIR"]);
wikipediaMap.set("NCL", ["FJI","SLB","VUT","NFK"]);
wikipediaMap.set("NZL", ["AUS","FJI","NFK","NZL","COK","NZL","NIU"]);
wikipediaMap.set("TKL", ["AUS","FJI","KIR","WSM","TON","ASM","PYF","NFK","WLF"]);
wikipediaMap.set("NIC", ["CRI","SLV","JAM","PAN"]);
wikipediaMap.set("NER", ["DZA","BEN","BFA","TCD","LBY","MLI","NGA"]);
wikipediaMap.set("NGA", ["CMR","TCD","NER","STP"]);
wikipediaMap.set("NIU", ["TON","ASM","COK"]);
wikipediaMap.set("NFK", ["NZL","NCL"]);
wikipediaMap.set("MKD", ["ALB","BGR","GRC","SRB","XKX"]);
wikipediaMap.set("MNP", ["GUM"]);
wikipediaMap.set("NOR", ["DNK","FIN","RUS","SWE","SJM","NOR","SJM","NOR"]);
wikipediaMap.set("SJM", ["DNK","FIN","ISL","RUS","SWE","GRL"]);
wikipediaMap.set("OMN", ["IRN","PAK","SAU","ARE","YEM"]);
wikipediaMap.set("PAK", ["AFG","CHN","IND","IRN","OMN"]);
wikipediaMap.set("PLW", ["IDN","PHL"]);
wikipediaMap.set("PSE", ["EGY","JOR"]);
wikipediaMap.set("PAN", ["COL","CRI","NIC"]);
wikipediaMap.set("PNG", ["AUS","IDN","SLB"]);
wikipediaMap.set("PRY", ["ARG","BOL","BRA"]);
wikipediaMap.set("PER", ["BOL","BRA","CHL","COL","ECU"]);
wikipediaMap.set("NOR", []);
wikipediaMap.set("PHL", ["BRN","CHN","IDN","MYS","PLW","VNM","TWN"]);
wikipediaMap.set("PCN", ["PYF"]);
wikipediaMap.set("POL", ["BLR","CZE","DNK","DEU","LTU","RUS","SVK","SWE","UKR"]);
wikipediaMap.set("PRT", ["MAR","ESP"]);
wikipediaMap.set("PRI", ["DOM","VEN","VGB","VIR"]);
wikipediaMap.set("QAT", ["BHR","IRN","SAU","ARE"]);
wikipediaMap.set("NOR", ["AUS"]);
wikipediaMap.set("ROU", ["BGR","HUN","MDA","RUS","SRB","UKR"]);
wikipediaMap.set("NZL", ["AUS"]);
wikipediaMap.set("RUS", ["AZE","BLR","BGR","CHN","EST","FIN","GEO","JPN","KAZ","PRK","LVA","LTU","MNG","NOR","POL","ROU","SWE","TUR","UKR","USA","SJM"]);
wikipediaMap.set("RWA", ["BDI","COD","TZA","UGA"]);
wikipediaMap.set("BLM", ["ATG","NLD","KNA","AIA","FRA","SXM"]);
wikipediaMap.set("SHN", []);
wikipediaMap.set("KNA", ["ATG","NLD","VEN","MSR","BLM"]);
wikipediaMap.set("LCA", ["BRB","FRA","VCT","VEN"]);
wikipediaMap.set("FRA", ["NLD","AIA","BLM","SXM"]);
wikipediaMap.set("SPM", ["CAN"]);
wikipediaMap.set("VCT", ["BRB","LCA","TTO","VEN"]);
wikipediaMap.set("WSM", ["TON","ASM","WLF"]);
wikipediaMap.set("SMR", ["ITA"]);
wikipediaMap.set("STP", ["GNQ","GAB","NGA"]);
wikipediaMap.set("SAU", ["BHR","EGY","ERI","IRN","IRQ","JOR","KWT","OMN","QAT","SDN","ARE","YEM"]);
wikipediaMap.set("SEN", ["CPV","GMB","GIN","GNB","MLI","MRT"]);
wikipediaMap.set("SRB", ["BIH","BGR","HRV","HUN","MNE","MKD","ROU","XKX"]);
wikipediaMap.set("SYC", ["COM","MDG","MUS","TZA"]);
wikipediaMap.set("SLE", ["GIN","LBR"]);
wikipediaMap.set("SGP", ["IDN","MYS"]);
wikipediaMap.set("SXM", ["NLD","FRA","FRA"]);
wikipediaMap.set("SVK", ["AUT","CZE","HUN","POL","UKR"]);
wikipediaMap.set("SVN", ["AUT","HRV","ITA","HUN"]);
wikipediaMap.set("SLB", ["FJI","PNG","VUT","NCL"]);
wikipediaMap.set("SOM", ["DJI","ETH","KEN","YEM"]);
wikipediaMap.set("ZAF", ["BWA","SWZ","LSO","MOZ","NAM","ZWE"]);
wikipediaMap.set("SSD", ["CAF","COD","ETH","KEN","SDN","UGA"]);
wikipediaMap.set("ESP", ["DZA","AND","FRA","ITA","MAR","PRT"]);
wikipediaMap.set("LKA", ["IND"]);
wikipediaMap.set("SDN", ["CAF","TCD","EGY","ERI","ETH","LBY","SAU","SSD"]);
wikipediaMap.set("SUR", ["BRA","FRA","GUY"]);
wikipediaMap.set("SJM", ["NOR","RUS","GRL"]);
wikipediaMap.set("SWE", ["DNK","EST","FIN","DEU","LVA","LTU","NOR","POL","RUS"]);
wikipediaMap.set("CHE", ["AUT","FRA","ITA","LIE","DEU"]);
wikipediaMap.set("SYR", ["CYP","IRQ","ISR","JOR","LBN","TUR"]);
wikipediaMap.set("TWN", ["BRN","CHN","IDN","JPN","MYS","PHL","VNM"]);
wikipediaMap.set("TJK", ["AFG","CHN","KGZ","UZB"]);
wikipediaMap.set("TZA", ["BDI","COM","COD","KEN","MWI","MOZ","RWA","SYC","UGA","ZMB"]);
wikipediaMap.set("THA", ["MMR","KHM","IND","IDN","LAO","MYS","VNM"]);
wikipediaMap.set("TGO", ["BEN","BFA","GHA"]);
wikipediaMap.set("TKL", ["KIR","WSM","ASM","COK","WLF"]);
wikipediaMap.set("TON", ["FJI","WSM","ASM","NIU","WLF"]);
wikipediaMap.set("TTO", ["BRB","GRD","GUY","VCT","VEN"]);
wikipediaMap.set("TUN", ["DZA","ITA","LBY"]);
wikipediaMap.set("TUR", ["ARM","AZE","BGR","CYP","EGY","GEO","GRC","IRN","IRQ","RUS","SYR","UKR"]);
wikipediaMap.set("TKM", ["AFG","AZE","IRN","KAZ","UZB"]);
wikipediaMap.set("TCA", ["BHS","DOM","HTI"]);
wikipediaMap.set("TUV", ["FJI","KIR","WLF"]);
wikipediaMap.set("UGA", ["COD","KEN","RWA","SSD","TZA"]);
wikipediaMap.set("UKR", ["BLR","BGR","HUN","MDA","POL","ROU","RUS","SVK","TUR"]);
wikipediaMap.set("ARE", ["IRN","OMN","QAT","SAU"]);
wikipediaMap.set("GBR", ["BEL","DNK","FRA","DEU","IRL","NLD","NOR","ESP","FRO","GGY","IMN","GBR","GBR","AIA","BMU","IOT","VGB","CYM","FLK","GGY","IMN","JEY","MSR","PCN","SHN"]);
wikipediaMap.set("TCA", ["ATG","ARG","BHS","BEL","CUB","CYP","DNK","DOM","FRA","DEU","HTI","HND","IRL","JAM","MDV","NLD","NOR","KNA","ESP","VEN","FRO","PYF","PRI","BLM","FRA","VIR","USA","BHS","CAN","CUB","MEX","RUS","USA","ASM","GUM","MNP","PRI","VIR"]);
wikipediaMap.set("VIR", ["NLD","VEN","AIA","VGB","PRI","URY","ARG","BRA"]);
wikipediaMap.set("UZB", ["AFG","KAZ","KGZ","TJK","TKM"]);
wikipediaMap.set("VUT", ["FJI","SLB","NCL"]);
wikipediaMap.set("VAT", ["ITA"]);
wikipediaMap.set("VEN", ["BRB","BRA","COL","DMA","DOM","FRA","GRD","GUY","NLD","KNA","LCA","VCT","TTO","ABW","CUW","MSR","PRI","VIR"]);
wikipediaMap.set("VNM", ["BRN","KHM","CHN","IDN","LAO","MYS","PHL","TWN","THA"]);
wikipediaMap.set("WLF", ["FJI","WSM","TON","TUV"]);
wikipediaMap.set("TKL", ["DZA","MRT","MAR","ESP"]);
wikipediaMap.set("YEM", ["DJI","ERI","OMN","SAU","SOM"]);
wikipediaMap.set("ZMB", ["AGO","BWA","COD","MWI","MOZ","NAM","TZA","ZWE"]);
wikipediaMap.set("ZWE", ["BWA","MOZ","ZAF","ZMB"]);

function getNeighbors( code) {
	//const n = iso3166_3_neighbors.get(code);

	const n = wikipediaMap.get(code);
	if (n == undefined) {
		console.log("no neighbor entry for ", code);
	}
	return n;
}

export {getJson,distanceBetweenCoords,fixStartLng,nextRand,seed,getHistory,	addHistory,throwConfetti,findIndexOfCountry,logPolygonInfo,
		getBoxForFeature,getBboxSize, getBboxCenter, getZoomForSize, getLabelForSize, getLabelOffsetForSize, getNeighbors};
