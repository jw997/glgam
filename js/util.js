import {Tween, Easing} from 'tween';
// Just used for zooming
import {TrackballControls} from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';

import {OrbitControls} from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';

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

import {getJson} from "./utils_helper.js";

const geojsonfile = './data/final.geojson';
const countries = await getJson(geojsonfile);

// Make the labels appear above the country, but under the camera
const countryAltitude = 0.006; // 0.006 is the min height to avoid holes in Greenland
const labelAltitude = countryAltitude + 0.001;

const Globe = new ThreeGlobe()
	// .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
	//  .onGlobeClick(emitArc)
	.polygonCapColor(() => 'rgba(200, 0, 0, 0.7)')
	.polygonSideColor(() => 'rgba(0, 0, 0, 0.1)')
	.polygonStrokeColor(() => '#111')
	.polygonAltitude(() => countryAltitude); // 0.3 if zoom is less than altitude, the camera is inside the country
//  Globe.showGraticules(true);

//const selectElement = document.querySelector('#iso-select');
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
		// Xconsole.info('sed s/', element.properties.NAME_LONG, '/', element.properties.ISO_A3_EH, '/');
	}
}

// Sort country list and populate select
const s = new Map([...map.entries()].sort(Intl.Collator(undefined).compare));

// put countries in the select2
/*
for (const [key, value] of s.entries()) {
	//  Console.log(key, ' ', value);
	const opt = document.createElement('option');
	opt.value = value;
	opt.innerHTML = key;
	// Opt.backgound = rgba(100, 100, 100, 0.3);
	selectElement.append(opt);
}*/

// put countries in the flex box 
const countriesFlexbox = document.querySelector('#countries');
for (const [key, value] of s.entries()) {
	//  Console.log(key, ' ', value);
	const b = document.createElement('button');
	b.value = value;
	b.innerHTML = key;
	// Opt.backgound = rgba(100, 100, 100, 0.3);
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

let tweenOne;
let tweenTwo;

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

/*	if (clist.length > 1) {
		addGuessToTable(thisc.properties.NAME_LONG, bear, distribution);
	} else {
		addGuessToTable('?', 0, 0);
	}
*/
	const geo = thisc.geometry;
	// Compute bbox size for zoom
	const bboxsize = getBboxSize(thisc);
	const rad = getZoomForSize(bboxsize);

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
	 tweenOne = new Tween(tweenCoords)
		.easing(Easing.Quadratic.InOut)
		.to(midTween)
		.onUpdate(() => {
			const coords = Globe.getCoords(tweenCoords.lat, tweenCoords.lng, tweenCoords.altitude);
			camera.position.set(coords.x, coords.y, coords.z);
		    //console.log(' tween updated  new camera poistion is ', camera.position);
		},
		);

	 tweenTwo = new Tween(tweenCoords)
	.easing(Easing.Quadratic.InOut)
	//.to(midTween)
	//.chain(midTween)
	.easing(Easing.Quadratic.InOut)
	.delay(200)
	.to(endTween)
	.onUpdate(() => {
		const coords = Globe.getCoords(tweenCoords.lat, tweenCoords.lng, tweenCoords.altitude);
		camera.position.set(coords.x, coords.y, coords.z);
		//console.log(' tween updated  new camera poistion is ', camera.position);
	})
	.onComplete(() => {
		console.log("Move animating done");
		animatingMove = false;
		enableRotate(true); 
	}
	);

	tweenOne.chain(tweenTwo);

    animatingMove = true;
	enableRotate(false);  // disable user globe rotation while we animate the move
	tweenOne.start();

	console.log(thisc.properties.NAME_LONG, ' ', coords);

	// All countries on list, we'll set the globe polygon data with these
	const c = countries.features.filter(d => ( clist.includes(d.properties.ISO_A3_EH) || d.fake));

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

	Globe.polygonsData(c).polygonAltitude('altitude');

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
let 
countryList = [answer];

let tourTweens = [];  // needed by animate
let animatingTour = false;

let animatingMove = false;  // used by plot country tweens
function tour() {

	// 1 animation at a time
	// once you arrive, not more waiting
	// if you hit start over, cancel the tour 
    // pause over each country
	// make time proportional to distance
	// maybe fly up between each country?

	// get coords for all the countries in the list, and go visit all of them
	// coordArray entries have  lat, lng, altitude
    animatingTour = true;

	let coordArray = []
	

	console.log(countryList);
	for(let i =0; i < countryList.length; i++) {
		const country = countries.features.find(d => countryList[i] === d.properties.ISO_A3_EH);
        const cameraCoords = country.cameraCoords;
		console.log ("tour " ,country.properties.NAME_LONG, country.cameraCoords);
		const geocoords = Globe.toGeoCoords({x: cameraCoords.x, y: cameraCoords.y, z: cameraCoords.z});
		console.log(geocoords);
		coordArray.push( geocoords);
		// country.cameraCoords is xyz
	}
	// visit the target at the end, too
	if (coordArray.length >= 2) {
		coordArray.push( coordArray[0]);
	}

	let coords; 

	let startTween = Globe.toGeoCoords({x: camera.position.x, y: camera.position.y, z: camera.position.z});
	const tweenCoords = startTween;

	tourTweens = [] // empty out tweeens from last time!
  
	// last tween om chain should set animatingTour to false

	for(let i =0; i < coordArray.length; i++) {
		//const dest = coordArray[i];
		const endTween = coordArray[i];
		const midTween = {lng: (startTween.lng+ endTween.lng)/2, lat:(endTween.lat + startTween.lat)/2, altitude: 4};

		// not working for fiji to kiribati??
		if (startTween.lng * endTween.lng < 0 && Math.abs(endTween.lng - startTween.lng) > 180) {
			if (endTween.lng < 0) {
				endTween.lng += 360;
			} else {
				startTween.lng += 360;
			}
		}

		const dist = Math.abs( endTween.lng - startTween.lng) + Math.abs( endTween.lat - startTween.lat);
		console.log ("tween dist ", dist);
        // max is 180 + 90 = 270
		const tweenTime = Math.max(1500, dist * 18);  // at least 1.5 second
		

		const tween= new Tween(tweenCoords)
		
		.easing(Easing.Quadratic.InOut)
		.delay(200)
		.to(endTween,tweenTime)
		.onUpdate(() => {
			const coords = Globe.getCoords(tweenCoords.lat, tweenCoords.lng, tweenCoords.altitude);

			//console.debug(' tween ', i , ' updated  new position is ', tweenCoords);

			camera.position.set(coords.x, coords.y, coords.z);
			//console.debug(' tween ', i , ' updated  new camera position is ', camera.position);
		}
		);
		if ((coordArray.length-1)==i) {
			tween.onComplete(() => {
				animatingTour = false;
				enableRotate(true); 
				console.log("Animating tour completed")
			})
		}

		if (startTween != endTween) {

        	tourTweens.push(tween);
		}
		console.log( "created a tween from ", startTween, " to ", endTween);

		startTween = endTween;  // set it for next loop

	}

	// now chain the tweens in the array
	for(let i =0; i < tourTweens.length-1; i++) {
		tourTweens[i].chain( tourTweens[i+1]);
	}

	tourTweens[0].start();
	

}

function resetGameState() {

	answerIndex = Math.floor(Math.random() * s.size);
	answer = Array.from(s.values())[answerIndex];
	// Xanswer_name = Array.from(s.keys())[answer_index];
	countryList = [answer];
	lastColor = 0;

	// renable country buttons
	for (const b  of disabledCountryButtons ) {
		b.disabled = false;
	}
	disabledCountryButtons.length=0;

	const sp = document.querySelector("#pickedCountryList");
	sp.innerHTML = "";


	

	// Clear guess table
	/*const table = document.querySelector('#guessTable');
	while (table.rows[0]) {
		table.deleteRow(0);
	}*/

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
		throwConfetti();
	}
	/*
	  If (countryList.length > 6) {
	   // Globe.showGraticules(true);
	const msg = 'you lose it was '.concat(answer_name);
	//   alert(msg);

	  } */
	stopTweens();
	plotCountryGeometry(countryList);
	
}


const disabledCountryButtons = []

function handleCountryButtonClick(event) {
	console.log("handle country button click", event.target.innerHTML, event.target.value);

	const id = event.target.value;

	const sp = document.querySelector("#pickedCountryList");
	sp.innerHTML = event.target.innerHTML + " " + sp.innerHTML;


	const oldText = event.target.innerHTML;
	event.target.disabled = true;
	disabledCountryButtons.push(event.target);
	console.log("button clicked ", event.target);

	countryList.push(id);

	if (id === countryList[0]) {
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
	plotCountryGeometry(countryList);

}
document.querySelector('#countries').addEventListener('click', (event) => {
	document.querySelector('#openclose').click();
	handleCountryButtonClick(event);
});


function handleOpenClose(event) { 
console.log("handle open close ", event.target.innerHTML);

const oldText = event.target.innerHTML;
const countryList = document.querySelector('#countrylist');
const countries = document.querySelector('#countries');
if (oldText == "▸") {
	event.target.innerHTML = "&blacktriangledown;"
	countryList.style.height="75%";
	countries.style.visibility="visible";

} else {
	event.target.innerHTML = "&blacktriangleright;"
	countryList.style.height="5%";
	countries.style.visibility="collapse";

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

function _getTrackBallControls( cam, dom) {
	const control = new TrackballControls(camera, renderer.domElement);
	// Const tbControls = new OrbitControls(camera, renderer.domElement);
	
	control.minDistance = 101;
	control.rotateSpeed = 5;
	control.zoomSpeed = 0.8;
	control.noPan = true;
	control.noRotate = false;
	return control;

}

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

// call at beginning and end of animations
function enableRotate(b) {
	console.log("controls enabledRotate at ", tbControls.enableRotate);
	tbControls.enableRotate = b;
	console.log("controls enabledRotate set to ", tbControls.enableRotate);
}

/*
const tbControls = new TrackballControls(camera, renderer.domElement);
// Const tbControls = new OrbitControls(camera, renderer.domElement);

tbControls.minDistance = 101;
tbControls.rotateSpeed = 5;
tbControls.zoomSpeed = 0.8;
tbControls.noPan = true;
tbControls.noRotate = false;
// TbControls.minDistance =1
// tbControls.maxDistance = 5000;
*/


document.querySelector('#tourButton').addEventListener('click', () => {
	stopTweens();
	enableRotate(false);
	tour();
});

document.querySelector('#resetbutton').addEventListener('click', () => {
	stopTweens();
	resetGameState();
});

document.querySelector('#showanswerbutton').addEventListener('click', () => {
	stopTweens();
	countryList.push(answer);

	const audio = new Audio('success.mp3');
	audio.play();

	plotCountryGeometry(countryList);
});

plotCountryGeometry(countryList);

function stopTweens() {
	animatingMove=false;
	animatingTour=false;
	//tourTweens.forEach( t => t.stop());
	tourTweens.forEach( t => t.pause());
	if (tweenOne != undefined) {
		//tweenOne.stop();
		tweenOne.pause();
	}
	if (tweenTwo != undefined)	 {
		//tweenTwo.stop();
		tweenTwo.pause();
	}
}
function _checkTourAnimating() {
	let retval=false;

	if (tourTweens.length ==0 ) {
		retval = false;
	}


	tourTweens.forEach( t => {
		if (t.isPlaying()) {
			retval = true;
		}
	});

	return retval;
}
function animate(time) {// IIFE
	// Frame cycle
	if (animatingTour) {
		tourTweens.forEach( t => t.update(time));
		//console.log("animate look check tour tweens " , checkTourAnimating());

	}
	if (animatingMove) {
		tweenOne.update(time);
		tweenTwo.update(time);
	}

	tbControls.update();
	//  ResizeCanvasToDisplaySize(canvas);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
	// TWEEN.update(time);
}

// Remove fetch });
export {animate, countries};
