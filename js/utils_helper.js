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

function getIndexFromDate(limit) {
	const d = new Date();
	const year = d.getFullYear()
	const month = d.getMonth();
	const day = d.getDate();

	const retval = ((year*366+31*month+day)*year) %limit;
	return retval;

}

function getRandInt(limit) {
	return Math.floor(Math.random() * limit);
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

	//console.log("Box area for " + feat.properties.ISO_A3_EH + " " + area);
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

const wikipediaMap= new Map();

wikipediaMap.set("ABW", ["CUW","DOM","VEN"]);
wikipediaMap.set("AFG", ["CHN","IRN","PAK","TJK","TKM","UZB"]);
wikipediaMap.set("AGO", ["COD","COG","NAM","ZMB"]);
wikipediaMap.set("AIA", ["ATG","VGB","NLD","BLM","FRA","VIR"]);
wikipediaMap.set("ALA", ["SWE","FIN"]);

wikipediaMap.set("ALB", ["GRC","ITA","MNE","MKD","XKX"]);
wikipediaMap.set("AND", ["FRA","ESP"]);
wikipediaMap.set("ARE", ["IRN","OMN","QAT","SAU"]);
wikipediaMap.set("ARG", ["BOL","BRA","CHL","PRY","URY","FLK"]);
wikipediaMap.set("ARM", ["AZE","GEO","IRN","TUR"]);
wikipediaMap.set("ASM", ["WSM","TON","COK","NIU"/*,"TKL"*/]);

wikipediaMap.set("ATA", ["FLK","HMD","SGS"]);

wikipediaMap.set("ATF", ["AUS"]);
//wikipediaMap.set("ATF", ["COM","FRA","MDG","MUS","SYC","HMD"]);
wikipediaMap.set("ATG", ["FRA","KNA","AIA","MSR","FRA"]);
wikipediaMap.set("AUS", ["TLS","IDN","NZL","PNG","SLB","ATF","NCL"]);
wikipediaMap.set("AUT", ["CZE","DEU","HUN","ITA","LIE","SVK","SVN","CHE"]);
wikipediaMap.set("AZE", ["ARM","GEO","IRN","KAZ","RUS","TUR","TKM"]);
wikipediaMap.set("BDI", ["COD","RWA","TZA"]);
wikipediaMap.set("BEL", ["FRA","DEU","LUX","NLD","GBR"]);
wikipediaMap.set("BEN", ["BFA","NER","NGA","TGO"]);
wikipediaMap.set("BFA", ["BEN","CIV","GHA","MLI","NER","TGO"]);
wikipediaMap.set("BGD", ["MMR","IND"]);
wikipediaMap.set("BGR", ["GRC","MKD","ROU","SRB","TUR","RUS","UKR"]);
wikipediaMap.set("BHR", ["IRN","QAT","SAU"]);
wikipediaMap.set("BHS", ["CUB","HTI","USA","TCA"]);
wikipediaMap.set("BIH", ["HRV","MNE","SRB"]);
wikipediaMap.set("BLM", ["ATG","NLD","KNA","AIA","FRA","SXM"]);
wikipediaMap.set("BLR", ["LVA","LTU","POL","RUS","UKR"]);
wikipediaMap.set("BLZ", ["GTM","HND","MEX"]);
wikipediaMap.set("BMU", []);
wikipediaMap.set("BOL", ["ARG","BRA","CHL","PRY","PER"]);
wikipediaMap.set("BRA", ["ARG","BOL","COL","FRA","GUY","PRY","PER","SUR","URY","VEN"]);
wikipediaMap.set("BRB", ["FRA","GUY","LCA","VCT","TTO","VEN"]);
wikipediaMap.set("BRN", ["CHN","MYS","PHL","TWN","VNM"]);
wikipediaMap.set("BTN", ["CHN","IND"]);
wikipediaMap.set("BWA", ["NAM","ZAF","ZMB","ZWE"]);
wikipediaMap.set("CAF", ["CMR","TCD","COD","COG","SSD","SDN"]);
wikipediaMap.set("CAN", ["USA","GRL","SPM"]);
wikipediaMap.set("CHE", ["AUT","FRA","ITA","LIE","DEU"]);
wikipediaMap.set("CHL", ["ARG","BOL","PER"]);
wikipediaMap.set("CHN", ["AFG","BTN","BRN","IND","IDN","JPN","KAZ","PRK","KOR","KGZ","LAO","MYS","MNG","MMR","NPL","PAK","PHL","RUS","TJK","VNM","HKG","MAC","TWN"]);
wikipediaMap.set("CIV", ["BFA","GHA","GIN","LBR","MLI"]);
wikipediaMap.set("CMR", ["CAF","TCD","COG","GNQ","GAB","NGA"]);
wikipediaMap.set("COD", ["AGO","BDI","CAF","COG","RWA","SSD","TZA","UGA","ZMB"]);
wikipediaMap.set("COG", ["AGO","CMR","CAF","COD","GAB"]);
wikipediaMap.set("COK", ["KIR","ASM","PYF","NIU"/*,"TKL"*/]);
wikipediaMap.set("COL", ["BRA","CRI","DOM","ECU","HTI","JAM","NIC","PAN","PER","VEN"]);
wikipediaMap.set("COM", ["FRA","MDG","MOZ","SYC","TZA","ATF"]);
wikipediaMap.set("CPV", ["GMB","MRT","SEN"]);
wikipediaMap.set("CRI", ["COL","ECU","NIC","PAN"]);
wikipediaMap.set("CUB", ["BHS","HTI","HND","JAM","MEX","USA","CYM"]);
wikipediaMap.set("CUW", ["DOM","NLD","VEN","ABW"]);
wikipediaMap.set("CYM", ["CUB","HND","JAM"]);
wikipediaMap.set("CYP", ["EGY","GRC","PSE","ISR","LBN","SYR","TUR","GBR"]);
wikipediaMap.set("CZE", ["AUT","DEU","POL","SVK"]);
wikipediaMap.set("DEU", ["AUT","BEL","CZE","DNK","FRA","LUX","NLD","POL","SWE","CHE","GBR"]);
wikipediaMap.set("DJI", ["ERI","ETH","RSL","SOM","YEM"]);
wikipediaMap.set("DMA", ["FRA","VEN"]);
wikipediaMap.set("DNK", ["DEU","NOR","POL","SWE","GBR"]);
wikipediaMap.set("DOM", ["COL","HTI","VEN","ABW","CUW","PRI","TCA"]);
wikipediaMap.set("DZA", ["ITA","LBY","MLI","MRT","MAR","ESH","NER","ESP","TUN"]);
wikipediaMap.set("ECU", ["COL","CRI","PER"]);
wikipediaMap.set("EGY", ["CYP","GRC","ISR","JOR","LBY","SAU","SDN","TUR","PSE"]);
wikipediaMap.set("ERI", ["DJI","SAU","SDN","ETH","YEM"]);
wikipediaMap.set("ESP", ["DZA","AND","FRA","ITA","MAR","PRT"]);
wikipediaMap.set("EST", ["FIN","LVA","RUS","SWE"]);

wikipediaMap.set("ESH", ["DZA","MAR","MRT"]);

wikipediaMap.set("ETH", ["DJI","ERI","RSL","KEN","SOM","SSD","SDN"]);
wikipediaMap.set("FIN", ["EST","NOR","RUS","ALA","SWE"]);
wikipediaMap.set("FJI", ["NZL","SLB","TON","TUV","VUT","NCL","WLF"]);
wikipediaMap.set("FLK", ["ARG","SGS"]);

wikipediaMap.set("FRA", ["AND","ATG","BRB","BEL","BRA","COM","DMA","DEU","ITA","LUX","MCO","MDG","MUS","LCA","ESP","CHE","SUR","GBR","VEN","ATF","GGY","JEY","MSR"]);
wikipediaMap.set("FRO", ["ISL","NOR","GBR"]);
wikipediaMap.set("FSM", ["MHL","PLW","PNG","GUM"]);
wikipediaMap.set("GAB", ["CMR","COG","GNQ","STP"]);
wikipediaMap.set("GBR", ["BEL","DNK","FRA","DEU","IRL","NLD","NOR","ESP","FRO","GGY","IMN"]);
wikipediaMap.set("GEO", ["ARM","AZE","RUS","TUR"]);
wikipediaMap.set("GGY", ["FRA","GBR","JEY"]);
wikipediaMap.set("GHA", ["BFA","CIV","TGO"]);
wikipediaMap.set("GIN", ["CIV","GNB","LBR","MLI","SEN","SLE"]);
wikipediaMap.set("GMB", ["CPV","SEN"]);
wikipediaMap.set("GNB", ["GIN","SEN"]);
wikipediaMap.set("GNQ", ["CMR","GAB","NGA","STP"]);
wikipediaMap.set("GRC", ["ALB","BGR","CYP","EGY","ITA","LBY","MKD","TUR"]);
wikipediaMap.set("GRD", ["VCT","TTO","VEN"]);
wikipediaMap.set("GRL", ["CAN","ISL",/*"SJM"*/]);
wikipediaMap.set("GTM", ["BLZ","SLV","HND","MEX"]);
wikipediaMap.set("GUM", ["FSM","MNP"]);
wikipediaMap.set("GUY", ["BRB","BRA","SUR","TTO","VEN"]);
wikipediaMap.set("HKG", ["CHN","MAC"]);
wikipediaMap.set("HMD", ["ATF","ATA"]);
wikipediaMap.set("HND", ["BLZ","CUB","GTM","JAM","MEX","NIC","CYM"]);
wikipediaMap.set("HRV", ["BIH","HUN","ITA","MNE","SRB","SVN"]);
wikipediaMap.set("HTI", ["BHS","COL","CUB","DOM","TCA"]);
wikipediaMap.set("HUN", ["AUT","HRV","ROU","SRB","SVK","SVN","UKR"]);
wikipediaMap.set("IDN", ["AUS","CHN","TLS","IND","MYS","PLW","PNG","PHL","SGP","TWN","THA","VNM"]);
wikipediaMap.set("IMN", ["GBR"]);
wikipediaMap.set("IND", ["BGD","BTN","MMR","CHN","IDN","MDV","NPL","PAK","LKA","THA"]);
wikipediaMap.set("IOT", ["MDV"]);
wikipediaMap.set("IRL", ["GBR"]);
wikipediaMap.set("IRN", ["AFG","ARM","AZE","BHR","IRQ","KWT","OMN","PAK","QAT","SAU","TUR","TKM","ARE"]);
wikipediaMap.set("IRQ", ["IRN","JOR","KWT","SAU","SYR","TUR"]);
wikipediaMap.set("ISL", ["FRO","GRL",/*"SJM"*/]);
wikipediaMap.set("ISR", ["CYP","EGY","JOR","LBN","SYR","PSE"]);
wikipediaMap.set("ITA", ["ALB","DZA","AUT","HRV","FRA","GRC","LBY","MLT","MNE","SMR","SVN","ESP","CHE","TUN","VAT"]);
wikipediaMap.set("JAM", ["COL","CUB","HTI","HND","NIC","CYM"]);
wikipediaMap.set("JEY", ["FRA","GGY"]);
wikipediaMap.set("JOR", ["EGY","IRQ","ISR","SYR","PSE","SAU"]);
wikipediaMap.set("JPN", ["CHN","KOR","RUS","MNP","TWN"]);
wikipediaMap.set("KAZ", ["AZE","CHN","KGZ","RUS","UZB"]);
wikipediaMap.set("KEN", ["ETH","SOM","SSD","UGA"]);
wikipediaMap.set("KGZ", ["CHN","KAZ","TJK","UZB"]);
wikipediaMap.set("KHM", ["LAO","THA","VNM"]);
wikipediaMap.set("KIR", ["MHL","NRU","TUV","COK","PYF",/*"USA","TKL"*/]);
wikipediaMap.set("KNA", ["ATG","NLD","VEN","MSR","BLM"]);
wikipediaMap.set("KOR", ["CHN","JPN","PRK"]);
wikipediaMap.set("KWT", ["IRN","IRQ","SAU"]);
wikipediaMap.set("LAO", ["MMR", "KHM","CHN","THA","VNM"]);
wikipediaMap.set("LBN", ["CYP","ISR","SYR"]);
wikipediaMap.set("LBR", ["CIV","GIN","SLE"]);
wikipediaMap.set("LBY", ["DZA","TCD","EGY","GRC","ITA","MLT","NER","SDN","TUN","TUR"]);
wikipediaMap.set("LCA", ["BRB","FRA","VCT","VEN"]);
wikipediaMap.set("LIE", ["AUT","CHE"]);
wikipediaMap.set("LKA", ["IND"]);
wikipediaMap.set("LSO", ["ZAF"]);
wikipediaMap.set("LTU", ["LVA","POL","RUS"]);
wikipediaMap.set("LUX", ["BEL","FRA","DEU"]);
wikipediaMap.set("LVA", ["EST","LTU","BLR","RUS"]);
wikipediaMap.set("MAC", ["CHN","HKG"]);
wikipediaMap.set("MAF", ["AIA","BLM","SXM"]);
wikipediaMap.set("MAR", ["PRT","ESP","ESH","DZA"]);
wikipediaMap.set("MCO", ["FRA"]);
wikipediaMap.set("MDA", ["ROU","UKR"]);
wikipediaMap.set("MDG", ["COM","FRA","MUS","MOZ","SYC","ATF"]);
wikipediaMap.set("MDV", ["IND","LKA","IOT","MUS"]);
wikipediaMap.set("MEX", ["CUB","GTM","HND","USA"]);
wikipediaMap.set("MHL", ["CUB","HTI","JAM"]);
wikipediaMap.set("MHL", ["KIR","FSM","NRU"]);
wikipediaMap.set("MKD", ["ALB","BGR","GRC","SRB","XKX"]);
wikipediaMap.set("MLI", ["DZA","BFA","CIV","GIN","MRT","NER","SEN"]);
wikipediaMap.set("MLT", ["ITA","LBY"]);
wikipediaMap.set("MMR", ["BGD","CHN","IND","LAO","THA"]);
wikipediaMap.set("MNE", ["BIH","HRV","ITA","SRB"]);
wikipediaMap.set("MNG", ["CHN","RUS"]);
wikipediaMap.set("MNP", ["GUM"]);
wikipediaMap.set("MOZ", ["SWZ","MDG","MWI","TZA","ZMB","ZWE","ATF"]);
wikipediaMap.set("MRT", ["CPV","MLI","SEN","ESH","DZA"]);
wikipediaMap.set("MSR", ["ATG","FRA","KNA","VEN"]);
wikipediaMap.set("MUS", ["FRA","MDG","SYC","ATF","MDV"]);
wikipediaMap.set("MWI", ["MOZ","TZA","ZMB"]);
wikipediaMap.set("MYS", ["CHN","IDN","PHL","SGP","VNM","TWN"]);
wikipediaMap.set("NAM", ["BWA","ZMB","AGO","ZAF"]);
wikipediaMap.set("NCL", ["FJI","SLB","VUT","NFK"]);
wikipediaMap.set("NER", ["DZA","BEN","BFA","TCD","LBY","MLI","NGA"]);
wikipediaMap.set("NFK", ["NZL","NCL"]);
wikipediaMap.set("NGA", ["CMR","TCD","NER","STP"]);
wikipediaMap.set("NIC", ["CRI","SLV","JAM","PAN","HND"]);
wikipediaMap.set("NIU", ["TON","ASM","COK"]);
wikipediaMap.set("NLD", ["BEL","DEU","KNA","GBR","VEN","AIA","CUW","BLM","MAF","SXM","VIR","ABW","CUW","NLD"]);
//wikipediaMap.set("NOR", []);
//wikipediaMap.set("NOR", ["AUS"]);
wikipediaMap.set("NOR", ["DNK","FIN","RUS","SWE","GBR"/*"SJM"*/,"NOR",]);
wikipediaMap.set("NPL", ["IND","CHN"]);
wikipediaMap.set("NRU", ["KIR"]);

wikipediaMap.set("NZL", ["AUS","FJI","NFK","NZL","COK","NZL","NIU"]);
wikipediaMap.set("OMN", ["IRN","PAK","SAU","ARE","YEM"]);
wikipediaMap.set("PAK", ["AFG","CHN","IND","IRN","OMN"]);
wikipediaMap.set("PAN", ["COL","CRI","NIC"]);
wikipediaMap.set("PCN", ["PYF"]);
wikipediaMap.set("PER", ["BOL","BRA","CHL","COL","ECU"]);
wikipediaMap.set("PHL", ["BRN","CHN","IDN","MYS","PLW","VNM","TWN"]);
wikipediaMap.set("PLW", ["IDN","PHL"]);
wikipediaMap.set("PNG", ["AUS","IDN","SLB"]);
wikipediaMap.set("POL", ["BLR","CZE","DNK","DEU","LTU","RUS","SVK","SWE","UKR"]);
wikipediaMap.set("PRI", ["DOM","VEN","VGB","VIR"]);
wikipediaMap.set("PRK", ["CHN","KOR"]);
wikipediaMap.set("PRT", ["MAR","ESP"]);
wikipediaMap.set("PRY", ["ARG","BOL","BRA"]);
wikipediaMap.set("PSE", ["EGY","JOR","CYP","ISR"]);
wikipediaMap.set("PYF", ["KIR","COK","PCN"]);
wikipediaMap.set("QAT", ["BHR","IRN","SAU","ARE"]);
wikipediaMap.set("ROU", ["BGR","HUN","MDA","RUS","SRB","UKR"]);
wikipediaMap.set("RSL", ["DJI","ETH","SOM","YEM"]);

wikipediaMap.set("RUS", ["AZE","BLR","BGR","CHN","EST","FIN","GEO","JPN","KAZ","PRK","LVA","LTU","MNG","NOR","POL","ROU","SWE","TUR","UKR","USA"/*,"SJM"*/]);
wikipediaMap.set("RWA", ["BDI","COD","TZA","UGA"]);
wikipediaMap.set("SAU", ["BHR","EGY","ERI","IRN","IRQ","JOR","KWT","OMN","QAT","SDN","ARE","YEM"]);
wikipediaMap.set("SDN", ["CAF","TCD","EGY","ERI","ETH","LBY","SAU","SSD"]);
wikipediaMap.set("SEN", ["CPV","GMB","GIN","GNB","MLI","MRT"]);
wikipediaMap.set("SGP", ["IDN","MYS"]);

wikipediaMap.set("SGS", ["FLK"],"ATA");

wikipediaMap.set("SHN", []);
// SJM not in geojson wikipediaMap.set("SJM", ["DNK","FIN","ISL","RUS","SWE","GRL"]);
//wikipediaMap.set("SJM", ["ISL","GRL"]);
//wikipediaMap.set("SJM", ["NOR","RUS","GRL"]);
wikipediaMap.set("SLB", ["FJI","PNG","VUT","NCL"]);
wikipediaMap.set("SLE", ["GIN","LBR"]);
wikipediaMap.set("SLV", ["GTM","HND","NIC"]);
wikipediaMap.set("SMR", ["ITA"]);
wikipediaMap.set("SOM", ["DJI","ETH","KEN","RSL","YEM"]);
wikipediaMap.set("SPM", ["CAN"]);
wikipediaMap.set("SRB", ["BIH","BGR","HRV","HUN","MNE","MKD","ROU","XKX"]);
wikipediaMap.set("SSD", ["CAF","COD","ETH","KEN","SDN","UGA"]);
wikipediaMap.set("STP", ["GNQ","GAB","NGA"]);
wikipediaMap.set("SUR", ["BRA","FRA","GUY"]);
wikipediaMap.set("SVK", ["AUT","CZE","HUN","POL","UKR"]);
wikipediaMap.set("SVN", ["AUT","HRV","ITA","HUN"]);
wikipediaMap.set("SWE", ["DNK","EST","ALA","FIN","DEU","LVA","LTU","NOR","POL","RUS"]);
wikipediaMap.set("SWZ", ["MOZ","ZAF"]);
//wikipediaMap.set("SXM", ["BEL","DOM","DEU","KNA","GBR","VEN","AIA","MAF","FRA","VIR"]);
wikipediaMap.set("SXM", ["BLM","MAF"]);
wikipediaMap.set("SYC", ["COM","MDG","MUS","TZA"]);
wikipediaMap.set("SYR", ["CYP","IRQ","ISR","JOR","LBN","TUR"]);
wikipediaMap.set("TCA", ["BHS","DOM","HTI"]);
wikipediaMap.set("TCD", ["CMR","CAF","LBY","NER","NGA","SDN"]);
wikipediaMap.set("TGO", ["BEN","BFA","GHA"]);
wikipediaMap.set("THA", ["MMR","KHM","IND","IDN","LAO","MYS","VNM"]);
wikipediaMap.set("TJK", ["AFG","CHN","KGZ","UZB"]);
// Tokelau not in geojson wikipediaMap.set("TKL", ["AUS","FJI","KIR","WSM","TON","ASM","PYF","NFK","WLF"]);
//wikipediaMap.set("TKL", ["DZA","MRT","MAR","ESP"]);
//wikipediaMap.set("TKL", ["KIR","WSM","ASM","COK","WLF"]);
wikipediaMap.set("TKM", ["AFG","AZE","IRN","KAZ","UZB"]);
wikipediaMap.set("TLS", ["AUS","IDN"]);
wikipediaMap.set("TON", ["FJI","WSM","ASM","NIU","WLF"]);
wikipediaMap.set("TTO", ["BRB","GRD","GUY","VCT","VEN"]);
wikipediaMap.set("TUN", ["DZA","ITA","LBY"]);
wikipediaMap.set("TUR", ["ARM","AZE","BGR","CYP","EGY","GEO","GRC","IRN","IRQ","RUS","SYR","UKR"]);
wikipediaMap.set("TUV", ["FJI","KIR","WLF"]);
wikipediaMap.set("TWN", ["BRN","CHN","IDN","JPN","MYS","PHL","VNM"]);
wikipediaMap.set("TZA", ["BDI","COM","COD","KEN","MWI","MOZ","RWA","SYC","UGA","ZMB"]);
wikipediaMap.set("UGA", ["COD","KEN","RWA","SSD","TZA"]);
wikipediaMap.set("UKR", ["BLR","BGR","HUN","MDA","POL","ROU","RUS","SVK","TUR"]);
wikipediaMap.set("URY", ["ARG","BRA"]);
wikipediaMap.set("USA", ["BHS","CAN","CUB","MEX","RUS"]);
//wikipediaMap.set("USA", ["USA"]);
//wikipediaMap.set("USA", ["USA","KIR"]);
wikipediaMap.set("UZB", ["AFG","KAZ","KGZ","TJK","TKM"]);
wikipediaMap.set("VAT", ["ITA"]);
wikipediaMap.set("VCT", ["BRB","LCA","TTO","VEN"]);
wikipediaMap.set("VEN", ["BRB","BRA","COL","DMA","DOM","FRA","GRD","GUY","NLD","KNA","LCA","VCT","TTO","ABW","CUW","MSR","PRI","VIR"]);
wikipediaMap.set("VGB", ["AIA","PRI","VIR"]);
wikipediaMap.set("VIR", ["NLD","VEN","AIA","VGB","PRI"]);
wikipediaMap.set("VNM", ["BRN","KHM","CHN","IDN","LAO","MYS","PHL","TWN","THA"]);
wikipediaMap.set("VUT", ["FJI","SLB","NCL"]);
wikipediaMap.set("WLF", ["FJI","WSM","TON","TUV"]);
wikipediaMap.set("WSM", ["TON","ASM","WLF"]);
wikipediaMap.set("XKX", ["ALB","MNE","MKD","SRB"]);
wikipediaMap.set("YEM", ["DJI","ERI","OMN","SAU","RSL","SOM"]);
wikipediaMap.set("ZAF", ["BWA","SWZ","LSO","MOZ","NAM","ZWE"]);
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



export {getJson,distanceBetweenCoords,fixStartLng,getRandInt,getIndexFromDate,getHistory,	addHistory,throwConfetti,findIndexOfCountry,logPolygonInfo,
		getBoxForFeature,getBboxSize, getBboxCenter, getZoomForSize, getLabelForSize, getLabelOffsetForSize, getNeighbors};
