import {Tween, Easing} from 'tween';
// Just used for zooming
import {TrackballControls} from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';

// DONE load both geojson and switch on geo length
// label country guesses
// restart without reloading
// DONE zoom based on country size
// add method to naviate to goal country
// DONE change color for each country
// fix layout for mobile so select is readable
// DONE support window resize
// DONE replace alert win /lose message with a non alert scheme
// switch to viewport coordinates vw vh and percentages
// try as a PWA
// try a bottom sheet

//  Initialize - one time
//  reset game state
//  Game Loop

$(document).ready(() => {
	$('.js-example-basic-single').select2();
});

async function getJson(url) {
	try {
		const response = await fetch(url, {cache: 'no-cache'}); // https://hacks.mozilla.org/2016/03/referrer-and-cache-control-apis-for-fetch/
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const json = await response.json();
		return json;
	} catch (error) {
		console.error(error.message);
	}
}
const geojsonfile = './data/final.geojson';
const countries = await getJson(geojsonfile);

// Make the labels appear above the country, but under the camera
const countryAltitude = 0.03;
const labelAltitude = countryAltitude + 0.001;

const Globe = new ThreeGlobe()
	// .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
	//  .onGlobeClick(emitArc)
	.polygonCapColor(() => 'rgba(200, 0, 0, 0.7)')
	.polygonSideColor(() => 'rgba(0, 200, 0, 0.1)')
	.polygonStrokeColor(() => '#111')
	.polygonAltitude(() => countryAltitude); // 0.3if zoom is less than altitude, the camera is inside the country
//  Globe.showGraticules(true);

const selectElement = document.querySelector('#iso-select');
// SelectElement.compare = Intl.Collator(undefined).compare ;
// loop through features
const map = new Map();
for (const element of countries.features) {
	// Console.log(element.properties.NAME, ' ', element.properties.ISO_A3_EH);
	// add it to the iso-select options
	if (element.properties.ISO_A3_EH !== '-99') {
		// SelectElement.appendChild(opt);
		// Name is a bit brief, NAME_CIAWF can be null, NAME_SORT is ascii, NAME_LONG
		map.set(element.properties.NAME_LONG, element.properties.ISO_A3_EH);
		console.info('sed s/', element.properties.NAME_LONG, '/', element.properties.ISO_A3_EH, '/');
	}
}

// Sort country list and populate select
const s = new Map([...map.entries()].sort(Intl.Collator(undefined).compare));

for (const [key, value] of s.entries()) {
	//  Console.log(key, ' ', value);
	const opt = document.createElement('option');
	opt.value = value;
	opt.innerHTML = key;
	// Opt.backgound = rgba(100, 100, 100, 0.3);
	selectElement.append(opt);
}

function findIndexOfCountry(c, iso) {
	for (let i = 0; i < c.features.length; i++) {
		if (c.features[i].properties.ISO_A3_EH === iso) {
			return i;
		}
	}

	return undefined;
}

function getBboxSize(feat) {
	const area = Math.abs(feat.bbox[2] - feat.bbox[0]) * (feat.bbox[3] - feat.bbox[1]);
	return area;
}

function getBboxCenter(feat) {
	const center = [(feat.bbox[2] + feat.bbox[0]) / 2, (feat.bbox[3] + feat.bbox[1]) / 2];

	if (feat.bbox[0] > 0 && feat.bbox[2] < 0) {
		center[0] += 180;
	}

	return center;
}

// Give a bbox size, pick a height above earth surface in earth radius units
function getZoomForSize(s) {
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
// '#e97600','#f6c700','#007256','#0067a7','#964f8e'];

// colors.push(safety_colors);

let lastColor = 0;

let tween;

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

	const loc = getBboxCenter(thisc);

	const point1 = turf.point(targetLoc);
	const point2 = turf.point(loc);

	const bear = turf.bearing(point2, point1);
	const distribution = turf.distance(point1, point2);

	if (clist.length > 1) {
		addGuessToTable(thisc.properties.NAME_LONG, bear, distribution);
	} else {
		addGuessToTable('?', 0, 0);
	}

	const geo = thisc.geometry;
	// Compute bbox size for zoom
	const bboxsize = getBboxSize(thisc);
	const rad = getZoomForSize(bboxsize);

	console.log('bbox area is', thisc.properties.NAME_LONG, bboxsize, rad);
	// Try bbox for center instead

	const center = getBboxCenter(thisc);

	const coords = Globe.getCoords(center[1], center[0], rad);

	console.log('move camera to', center, rad);
	console.log('move camera to coords', coords);

	// geo coords have altitude lat lng
	const startTween = Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z});
	const endTween = {lng: center[0], lat: center[1], altitude: rad};

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
	tween = new Tween(tweenCoords)
		.easing(Easing.Quadratic.InOut)
		.to(endTween)
		.onUpdate(() => {
			const coords = Globe.getCoords(tweenCoords.lat, tweenCoords.lng, tweenCoords.altitude);
			// What to check for?
			if (Number.isNaN(coords.x)) {
				console.log(tweenCoords, coords);
			}

			camera.position.set(coords.x, coords.y, coords.z);
			//  Console.log(' tween updated  new camera poistion is ', camera.position);
		},
		);

	tween.start();

	console.log(thisc.properties.NAME_LONG, ' ', coords);

	// All countries on list, we'll set the globe polygon data with these
	const c = countries.features.filter(d => clist.includes(d.properties.ISO_A3_EH));

	// Give each country a color
	for (const element of c) {
		if (undefined === element.color) {
			// C[i].color = colors[Math.round(Math.random() * colors.length)];
			element.color = colorsHighway[lastColor];
			lastColor = 1 + ((lastColor + 1) % (colorsHighway.length - 1)); // Save red for target

			console.log(element.properties.NAME_LONG, ' ', element.color);
		}
	}

	Globe.polygonsData(c).polygonCapColor('color');

	// label each country
	const labelData = [];

	console.log('c', c);

	for (const [i, element] of c.entries()) {
		const loc = getBboxCenter(element);

		// Compute bbox size for zoom
		const bboxsize = getBboxSize(element);
		const labelSize = getLabelForSize(bboxsize);

		const asciiName = element.properties.NAME_LONG.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '');

		labelData.push({
			lat: loc[1], lng: loc[0] + 0.4, size: labelSize, color: 'white', name: asciiName,
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

let answerIndex;
let answer;

do {
	answerIndex = Math.floor(Math.random() * s.size);
	answer = Array.from(s.values())[answerIndex];
} while (histString.includes(answer));

// Save the new History, but only the last X entries
//

const histLimit = 100;
if (histString.length > (4 * histLimit)) {
	histString = histString.slice(4);
}

histString += ' ';
histString += answer;
localStorage.setItem(itemHistory, histString);

// Let answer_name = Array.from(s.keys())[answer_index];
let countryList = [answer];

function resetGameState() {
	answerIndex = Math.floor(Math.random() * s.size);
	answer = Array.from(s.values())[answerIndex];
	// Xanswer_name = Array.from(s.keys())[answer_index];
	countryList = [answer];
	lastColor = 0;

	// Clear guess table
	const table = document.querySelector('#guessTable');
	while (table.rows[0]) {
		table.deleteRow(0);
	}

	// Clear color assignments
	for (const element of countries.features) {
		delete element.color;
	}

	plotCountryGeometry(countryList);
}

document.querySelector('#resetbutton').addEventListener('click', () => {
	resetGameState();
});

function directionSymbol(bear) {
	// North is 0
	// east is 90
	// west is -90
	// south is +-180

	// up U+2191
	// down U+2193
	// left U+2190
	// right U+2192
	// upright U+2197
	// downright  U+2198

	// downleft U+2199
	// upleft  U+2196

	const index = Math.round(bear / 45) + 4;
	const symbolArray = ['\u{2193}',
		'\u{2199}',
		'\u{2190}',
		'\u{2196}',
		'\u{2191}',
		'\u{2197}',
		'\u{2192}',
		'\u{2198}',
		'\u{2193}'];
	const returnValue = symbolArray[index];
	return returnValue;
}

function addGuessToTable(id, bear, distribution) {
	const table = document.querySelector('#guessTable');

	// Add row to end of table
	const newRow = table.insertRow();

	const nameCell = newRow.insertCell(0);
	const distributionCell = newRow.insertCell(1);
	const bearCell = newRow.insertCell(2);

	nameCell.innerHTML = id;
	bearCell.innerHTML = directionSymbol(Math.round(bear));
	distributionCell.innerHTML = Math.round(distribution);
}

const $eventSelect = $('.js-example-basic-single');
// Make it wide enough
$('#iso-select').select2({dropdownAutoWidth: true});

$eventSelect.on('change', _event => {
	handleChange('change');
});

// Loop to handle user input
// get the ISO_A3 code from the input
// check if it is the country we are looking for -- WIN
// check if too many guesses -- LOSE
//
// call plot to draw countries
function handleChange(_name, _event) {
	const v1 = $('#iso-select').select2('data');
	const id = v1[0].id;

	countryList.push(id);

	if (id === countryList[0]) {
		//   Alert('You win!');
		const audio = new Audio('success.mp3');
		audio.play();
	}
	/*
	  If (countryList.length > 6) {
	   // Globe.showGraticules(true);
	const msg = 'you lose it was '.concat(answer_name);
	//   alert(msg);

	  } */

	plotCountryGeometry(countryList);
}

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
const tbControls = new TrackballControls(camera, renderer.domElement);
// Const tbControls = new OrbitControls(camera, renderer.domElement);

tbControls.minDistance = 101;
tbControls.rotateSpeed = 5;
tbControls.zoomSpeed = 0.8;
tbControls.noPan = true;
tbControls.noRotate = true;
// TbControls.minDistance =1
// tbControls.maxDistance = 5000;

document.querySelector('#resetbutton').addEventListener('click', () => {
	resetGameState();
});

document.querySelector('#showanswerbutton').addEventListener('click', () => {
	countryList.push(answer);

	const audio = new Audio('success.mp3');
	audio.play();

	plotCountryGeometry(countryList);
});

plotCountryGeometry(countryList);

function animate(time) {// IIFE
	// Frame cycle
	tween.update(time);
	tbControls.update();
	//  ResizeCanvasToDisplaySize(canvas);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
	// TWEEN.update(time);
}

// Remove fetch });
export {animate};
