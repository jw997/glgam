import {Tween, Easing} from 'tween';
// Just used for zooming
import {OrbitControls} from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';

//  Initialize - one time
//  reset game state
//  Game Loop


class State {
    // data
	static answerIndex;
    static answer;
	static countryList;

	// GUI stuff
	static lastColor = 0;
	static disabledCountryButtons=[];
	static rememberCountriesScrollPos=0;

	// animations
	static tourTweens = [];
	static tweenOne;
	static tweenTwo;

	static animatingTour = false;
	static animatingMove = false; 

}


import {getJson,distanceBetweenCoords,fixStartLng} from "./utils_helper.js";

const geojsonfile = './data/final.geojson';
const countries = await getJson(geojsonfile);

// Make the labels appear above the country, but under the camera
const countryAltitude = 0.008; // 0.006 is the min height to avoid holes in Greenland
const labelAltitude = countryAltitude + 0.0008;

const Globe = new ThreeGlobe()
	// .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
	//  .onGlobeClick(emitArc)
	.polygonCapColor(() => 'rgba(200, 0, 0, 0.7)')
	.polygonSideColor(() => 'rgba(0, 0, 0, 0.1)')
	.polygonStrokeColor(() => '#111')
	.polygonAltitude(() => countryAltitude); // 0.3 if zoom is less than altitude, the camera is inside the country
//  Globe.showGraticules(true);

// loop through features
const map = new Map();
for (const element of countries.features) {
	// Console.log(element.properties.NAME, ' ', element.properties.ISO_A3_EH);
	// add it to the iso-select options
	if (element.properties.ISO_A3_EH !== '-99') {
		// Name is a bit brief, NAME_CIAWF can be null, NAME_SORT is ascii, NAME_LONG
		map.set(element.properties.NAME_LONG, element.properties.ISO_A3_EH);
	}
	// log country polygon info
	logPolygonInfo(element);
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

// Sort country list and populate select
const s = new Map([...map.entries()].sort(Intl.Collator(undefined).compare));

// put countries in the flex box 
const countriesFlexbox = document.querySelector('#countries');
for (const [key, value] of s.entries()) {
	//  Console.log(key, ' ', value);
	const b = document.createElement('button');
	b.value = value;
	b.innerHTML = key;
	countriesFlexbox.append(b);
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

/* https://www.w3schools.com/colors/colors_fs595.asp
	  (10055)	w3-highway-brown	#633517
	(11086)	w3-highway-red	#a6001a
	(12243)	w3-highway-orange	#e06000
	(13415)	w3-highway-schoolbus	#ee9600
	(13507)	w3-highway-yellow	#ffab00
	(14066)	w3-highway-green	#004d33
	(15065)	w3-highway-blue	#00477e
*/
/*
	(11120)	w3-safety-red 	#bd1e24
	(12300)	w3-safety-orange 	#e97600
	(13591)	w3-safety-yellow 	#f6c700
	(14120)	w3-safety-green 	#007256
	(15092)	w3-safety-blue 	#0067a7
	(17155)	w3-safety-purple 	#964f8e
*/

const colorsHighway = ['#a6001a', '#633517', '#e06000', '#ee9600', '#004d33', '#00477e'];

//let State.tweenOne;
//let State.tweenTwo;

function plotCountryGeometry(clist) {
	// Const won = clist.clist.length > 1 && (clist[0] === clist[clist.length -1]);
	const won = clist.lastIndexOf(clist[0]) > 0;
	console.log('clist', clist);

	// Last county on list, we'll point the camera at it
	const thisCountryIso = clist.at(-1);

	// X const index = findIndexOfCountry(countries, thisCountryIso);

	const targetCountry = findIndexOfCountry(countries, clist[0]);
	const targetLoc = getBboxCenter(countries.features[targetCountry]);

	// Const index_small = findIndexOfCountry(countries_small, thisCountryIso);

	const thisc = countries.features.find(d => thisCountryIso === d.properties.ISO_A3_EH);

	thisc.altitude = countryAltitude;

	const loc = getBboxCenter(thisc);

	const point1 = turf.point(targetLoc);
	const point2 = turf.point(loc);

	const bear = turf.bearing(point2, point1);
	const distribution = turf.distance(point1, point2);

	const geo = thisc.geometry;
	// Compute bbox size for zoom
	const bboxsize = getBboxSize(thisc);
	const rad = getZoomForSize(bboxsize);
	setRotateSpeedFromRadius(rad);

	console.log('bbox area is', thisc.properties.NAME_LONG, bboxsize, rad);
	// Try bbox for center instead

	const center = getBboxCenter(thisc);

	const coords = Globe.getCoords(center[1], center[0], rad);  // lat, lng, altitude
	// stash the camera coords 
	thisc.cameraCoords = coords;

	console.log('move camera to', center, rad);
	console.log('move camera to coords', coords);

	// geo coords have altitude lat lng
	const startTween = Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z});
	
	const endTween = {lng: center[0], lat: center[1], altitude: rad};

	fixStartLng(startTween, endTween);

	const midTween = {lng: (startTween.lng+ endTween.lng)/2, lat:(endTween.lat + startTween.lat)/2, altitude: 4 + rad};
	// If longitutdes have opposite signs are are more than 180 degrees apart, add 360 to the negative one
	if (startTween.lng * endTween.lng < 0 && Math.abs(endTween.lng - startTween.lng) > 180) {
		if (endTween.lng < 0) {
			endTween.lng += 360;
		} else {
			startTween.lng += 360;
		}
	}

	console.log('end+tween', endTween);
	const tweenCoords = startTween;

	// Fly higher in the middle with chain?
	// global tween
	 State.tweenOne = new Tween(tweenCoords)
		.easing(Easing.Quadratic.InOut)
		.to(midTween)
		.onUpdate((e) => {
			const coords = Globe.getCoords(e.lat, e.lng, e.altitude);
			camera.position.set(coords.x, coords.y, coords.z);
		    //console.log(' tween updated  new camera poistion is ', camera.position);
		},
		);

	 State.tweenTwo = new Tween(tweenCoords)
	.easing(Easing.Quadratic.InOut)
	//.to(midTween)
	//.chain(midTween)
	.easing(Easing.Quadratic.InOut)
	.delay(200)
	.to(endTween)
	.onUpdate(() => {
		const coords = Globe.getCoords(tweenCoords.lat, tweenCoords.lng, tweenCoords.altitude);
		console.log("tween lng ", tweenCoords.lng);

		camera.position.set(coords.x, coords.y, coords.z);
		//console.log(' tween updated  new camera poistion is ', camera.position);
	})
	.onComplete(() => {
		console.log("Move animating done");
		State.animatingMove = false;
		enableRotate(true); 
	}
	);

	State.tweenOne.chain(State.tweenTwo);

    State.animatingMove = true;
	enableRotate(false);  // disable user globe rotation while we animate the move
	State.tweenOne.start();

	console.log(thisc.properties.NAME_LONG, ' ', coords);

	// All countries on list, we'll set the globe polygon data with these
	const c = countries.features.filter(d => ( clist.includes(d.properties.ISO_A3_EH) || d.fake));

	// Give each country a color
	for (const element of c) {
		if (undefined === element.color) {
			// C[i].color = colors[Math.round(Math.random() * colors.length)];
			element.color = colorsHighway[State.lastColor];
			State.lastColor = 1 + ((State.lastColor + 1) % (colorsHighway.length - 1)); // Save red for target

			console.log(element.properties.NAME_LONG, ' ', element.color);
		}
	}

	Globe.polygonsData(c).polygonCapColor('color');

	Globe.polygonsData(c).polygonAltitude('altitude');

	// label each country
	const labelData = [];
	console.log('c', c);
	for (const [i, element] of c.entries()) {
		const loc = getBboxCenter(element);

		// Compute bbox size for zoom
		const bboxsize = getBboxSize(element);
		const labelSize = getLabelForSize(bboxsize);
		const labelOffset = getLabelOffsetForSize(bboxsize);

		const asciiName = element.properties.NAME_LONG.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '');

		labelData.push({
			lat: loc[1], lng: loc[0] + labelOffset, size: labelSize, color: 'white', name: asciiName,
		});

		if (!won && element.properties.ISO_A3_EH === clist[0]) {
			// Erase the name
			labelData[i].name = '?';
		}
	}

	Globe.labelsData(labelData)
		.labelText('name')
		.labelSize('size')
		.labelDotRadius(0)
		.labelAltitude(labelAltitude)
		.labelColor('color');

}

// Game State
// pick target country
// retrieve array of old guesses
// history is a string of comma separated ISO A3 3 letter codes

const itemHistory = 'History';

let histString = localStorage.getItem(itemHistory);
histString ??= '';

do {
	State.answerIndex = Math.floor(Math.random() * s.size);
	State.answer = Array.from(s.values())[State.answerIndex];
} while (histString.includes(State.answer));

// Save the new History, but only the last X entries
const histLimit = 100;
if (histString.length > (4 * histLimit)) {
	histString = histString.slice(4);
}

histString += ' ';
histString += State.answer;
localStorage.setItem(itemHistory, histString);

// Let answer_name = Array.from(s.keys())[answer_index];
State.countryList = [State.answer];

//let State.tourTweens = [];  // needed by animate
//State.animatingTour = false;
//let State.animatingMove = false;  // used by plot country tweens

function tour() {

	console.log(" tour button disabled ", document.querySelector('#tourButton').disabled );

	// 1 animation at a time
	// once you arrive, not more waiting
	// if you hit start over, cancel the tour 
    // pause over each country
	// make time proportional to distance
	// maybe fly up between each country?

	// get coords for all the countries in the list, and go visit all of them
	// coordArray entries have  lat, lng, altitude
    State.animatingTour = true;

	let coordArray = []; // country camera coords

	//let startCoords = [];
	let endCoords = [];
	let tweenCoords = [];

	console.log(State.countryList);

	for(let i =0; i < State.countryList.length; i++) {
		const country = countries.features.find(d => State.countryList[i] === d.properties.ISO_A3_EH);
        const cameraCoords = country.cameraCoords;
		//console.log ("tour " ,country.properties.NAME_LONG, country.cameraCoords);
		const geocoords = Globe.toGeoCoords({x: cameraCoords.x, y: cameraCoords.y, z: cameraCoords.z});
		//console.log(geocoords);
		coordArray.push( geocoords);
		// country.cameraCoords is xyz
	}
	// visit the target at the end, too
	if (coordArray.length >= 2) {
		coordArray.push( coordArray[0]);
	}

	// make the coordinates for the tweens
	for(let i =0; i < coordArray.length; i++) {
		endCoords.push( structuredClone(coordArray[i]));
	}
	tweenCoords.push(Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z}))
	for(let i =1; i < coordArray.length; i++) {
		tweenCoords.push( structuredClone(endCoords[i-1]));
	}

	//let coords; 

	let startTween = Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z});

//	let tweenCoords = structuredClone(startTween); // tweenCoords is used by each tween in turn
	
	State.tourTweens = [] // empty out tweeens from last time!
	
  
	// last tween on chain should set animatingTour to false
	for(let i =0; i < coordArray.length; i++) {
		
		const endTween = coordArray[i];
		
		const dist = distanceBetweenCoords(startTween,endTween);  // needed just to compute the time
		console.log ("tween dist ", dist);
        // max is 180 + 90 = 270
		let tweenTime = Math.max(1500, dist * 18);  // at least 1.5 second
		if (0==i) {
			tweenTime = Math.max(500, dist * 18); // at least 0.5 second
		}
		//console.log("Tween time is ", tweenTime);
		//tweenCoords.lng = startTween.lng;
		console.log( "created a tween from lng ", startTween.lng, " to ", endTween.lng);
		console.log("Tween coords  lng is ", tweenCoords.lng);
		fixStartLng(tweenCoords,endTween);
		const tween= new Tween(tweenCoords)
		
		.easing(Easing.Quadratic.InOut)
		.delay(200)
		.to(endTween,tweenTime)
		.onStart((e) => {
			// update tweenCoords lng to work with endTween
			fixStartLng(e,endTween);
			console.log("starting tween at", tweenCoords);
			console.log("Going to ", endTween);
		})
		.onUpdate((e) => {
			const coords = Globe.getCoords(e.lat, e.lng, e.altitude);

			console.debug(' tween ', i , ' updated  new position lng is ', tweenCoords.lng);

			camera.position.set(coords.x, coords.y, coords.z);
			console.debug(' tween ', i , ' updated  new camera position is ', camera.position);
		}
		);
		if ((coordArray.length-1)==i) {
			tween.onComplete(() => {
				State.animatingTour = false;
				enableRotate(true); 
				disableTourButton(false);
				console.log("Animating tour completed")
			})
		}

		if ((coordArray.length-1)>i) {
			// make tweenCoords ready for next endTween
			fixStartLng(tweenCoords,coordArray[i+1]);
		}

		if (startTween != endTween) {

        	State.tourTweens.push(tween);
		}
		console.log( "created a tween from ", startTween.lng, " to ", endTween.lng);
		//startTween = endTween;  // set it for next loop

		Object.assign( startTween, endTween);

	}

	// now chain the tweens in the array
	for(let i =0; i < State.tourTweens.length-1; i++) {
		State.tourTweens[i].chain( State.tourTweens[i+1]);
	}

	Object.assign( tweenCoords,  Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z}));
	

	State.tourTweens[0].start();
	

}



function resetGameState() {

	State.answerIndex = Math.floor(Math.random() * s.size);
	State.answer = Array.from(s.values())[State.answerIndex];
	State.answer = "COK"; // repro
	State.countryList = [State.answer];
	State.lastColor = 0;

	// re-enable country buttons
	for (const b  of State.disabledCountryButtons ) {
		b.disabled = false;
	}
	State.disabledCountryButtons.length=0;

	const sp = document.querySelector("#pickedCountryList");
	sp.innerHTML = "";

	// Clear color assignments
	for (const element of countries.features) {
		delete element.color;
	}

	plotCountryGeometry(State.countryList);
}

// Loop to handle user input
// get the ISO_A3 code from the input
// check if it is the country we are looking for -- WIN
// check if too many guesses -- LOSE
//
// call plot to draw countries

State.disabledCountryButtons = []

function handleCountryButtonClick(event) {
	console.log("handle country button click", event.target.innerHTML, event.target.value);

	if (event.target.tagName != "BUTTON") {
		console.log("clicked, but not on a button!");
		return;
	}
	const id = event.target.value;

	//const sp = document.querySelector("#pickedCountryList");
	//sp.innerHTML = event.target.innerHTML + " " + sp.innerHTML;


	const oldText = event.target.innerHTML;
	event.target.disabled = true;
	State.disabledCountryButtons.push(event.target);
	console.log("button clicked ", event.target);

	State.countryList.push(id);

	if (id === State.countryList[0]) {
		//   Alert('You win!');
		const audio = new Audio('success.mp3');
		audio.play();
		throwConfetti();
	}
	/*
	If (countryList.length > 6) {
	// Globe.showGraticules(true);
	const msg = 'you lose it was '.concat(answer_name);
	//   alert(msg);
	
	} */
	stopTweens();
	plotCountryGeometry(State.countryList);

}
document.querySelector('#countries').addEventListener('click', (event) => {

	document.querySelector('#openclose').click();
	handleCountryButtonClick(event);
});

State.rememberCountriesScrollPos=0;

function handleOpenClose(event) {
	console.log("handle open close ", event.target.innerHTML);

	const oldText = event.target.innerHTML;
	const countryList = document.querySelector('#countrylist');
	const countries = document.querySelector('#countries');

	if (oldText == "▸") {  // opening
		event.target.innerHTML = "&blacktriangledown;"
		console.log("Scrolling to ", State.rememberCountriesScrollPos);
		countryList.style.height = "75%";
		countries.style.visibility = "visible";
		countries.scrollLeft = State.rememberCountriesScrollPos;

	} else { // closing
		State.rememberCountriesScrollPos = countries.scrollLeft;
		event.target.innerHTML = "&blacktriangleright;"
		countryList.style.height = "5%";
		countries.style.visibility = "collapse";
	}
}
document.querySelector('#openclose').addEventListener('click', (event) => {
	handleOpenClose(event);
});

// Setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

document.querySelector('#globeViz').append(renderer.domElement);

// Save the canvas
const canvas = document.querySelector('#globeViz').childNodes[0];

// Setup scene
const scene = new THREE.Scene();
scene.add(Globe);
scene.add(new THREE.AmbientLight(0xCC_CC_CC, Math.PI));
scene.add(new THREE.DirectionalLight(0xFF_FF_FF, 0.6 * Math.PI));

// X const axesHelper = new THREE.AxesHelper(200);
//  Scene.add(axesHelper);

// Setup camera
const camera = new THREE.PerspectiveCamera();
camera.aspect = window.innerWidth / (window.innerHeight);
camera.updateProjectionMatrix();
camera.position.z = 300;
camera.position.x = 300;
camera.position.y = 300;

// Add camera controls
function getOrbitControls( cam, dom) {

	const control = new OrbitControls(camera, renderer.domElement);
	// change rotate speed according to zoom factor?
	control.minDistance = 101;
	control.rotateSpeed = 0.5;
	control.zoomSpeed = 0.3;
	control.enablePan = false;
	control.enabledRotate = true;
	control.enableDamping = true;
	return control;

}

//const tbControls = getTrackBallControls(camera, renderer.domElement);

const tbControls = getOrbitControls(camera, renderer.domElement);

function setRotateSpeedFromRadius( z ) {
	//console.log("Setting rotate speed to ", z/4);
	tbControls.rotateSpeed = z/4;
}

// call at beginning and end of animations
function enableRotate(b) {
	console.log("controls enabledRotate at ", tbControls.enableRotate);
	tbControls.enableRotate = b;
	console.log("controls enabledRotate set to ", tbControls.enableRotate);
}

function disableTourButton( dFlag ) {
	document.querySelector('#tourButton').disabled=dFlag;
}
document.querySelector('#tourButton').addEventListener('click', () => {
	if (State.animatingTour) {
		return;
	}
	
	stopTweens();
	enableRotate(false);
	disableTourButton(true);
	tour();
});

document.querySelector('#resetbutton').addEventListener('click', () => {
	stopTweens();
	resetGameState();
});

document.querySelector('#showanswerbutton').addEventListener('click', () => {
	stopTweens();
	State.countryList.push(State.answer);

	const audio = new Audio('success.mp3');
	audio.play();

	plotCountryGeometry(State.countryList);
});

plotCountryGeometry(State.countryList);

function stopTweens() {
	State.animatingMove=false;
	State.animatingTour=false;
	
	State.tourTweens.forEach( t => t.pause());
	if (State.tweenOne != undefined) {
		State.tweenOne.pause();
	}
	if (State.tweenTwo != undefined)	 {
		State.tweenTwo.pause();
	}
	disableTourButton(false);
}

var lastCanvasHeight, lastCanvasWidth;

function resizeCanvasToDisplaySize(canvas) {
	if (lastCanvasHeight == canvas.clientHeight &&
		lastCanvasWidth == canvas.clientWidth &&
		lastWindowWidth == window.innerWidth &&
		lastWindowHeight == window.innerHeight) {
		// nothing to do
		return;
	}
	//nResize++;

	// Lookup the size the browser is displaying the canvas in CSS pixels.
	//  console.log("Window wxh ", window.innerWidth, " ", window.innerHeight);
	//  console.log("canvas client dims ", canvas.clientWidth, canvas.clientHeight);

	//  console.log("dpi ", window.devicePixelRatio);
	//  console.log("camera aspect ", camera.aspect);

	// https://stackoverflow.com/questions/45041158/resizing-canvas-webgl-to-fit-screen-width-and-heigh
	// TODO use canvas.clientWidth and height instead of window?
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	return;

}

let lastCameraDistance = -1; // used for setting rotate speed

function animate(time) {// IIFE
	
	let dist = Math.sqrt( camera.position.x * camera.position.x + camera.position.y*camera.position.y + camera.position.z * camera.position.z);

	if (lastCameraDistance != dist) {
		lastCameraDistance = dist;
		//console.log("camera distance ", dist);
		const radius = (dist-100)/100; // why 100?
		setRotateSpeedFromRadius(radius);
	}
	
	
	// Frame cycle
	if (State.animatingTour) {
		State.tourTweens.forEach( t => t.update(time));
		//console.log("animate look check tour tweens " , checkTourAnimating());

	}
	if (State.animatingMove) {
		State.tweenOne.update(time);
		State.tweenTwo.update(time);
	}

	tbControls.update();
	resizeCanvasToDisplaySize(canvas);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
	
}

// Remove fetch });
export {animate, countries};
