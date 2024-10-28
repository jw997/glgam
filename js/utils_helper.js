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

export {getJson,distanceBetweenCoords,fixStartLng,nextRand,seed,getHistory,	addHistory,throwConfetti,findIndexOfCountry,logPolygonInfo,
		getBoxForFeature,getBboxSize, getBboxCenter, getZoomForSize, getLabelForSize, getLabelOffsetForSize};
