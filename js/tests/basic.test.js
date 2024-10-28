import test from 'ava';

import {getJson, distanceBetweenCoords, fixStartLng,nextRand} from "../utils_helper.js";

test('foo', t => {
  t.pass();  
});

test('bar', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});

test('fixStartLng', async t => {

	let start={lat:1,lng:178}
	fixStartLng( start, {lat:3,lng:-160})
	t.is(start.lng, -182, "lng 0168 => 200");

	fixStartLng( start, {lat:3,lng:0})
	t.is(start.lng, 178, "lng -182 => 178");

	let COK={lat:1, lng:-158};
	let IND={ lat: 1, lng: 82 };

	fixStartLng(COK,IND);
	t.is(COK.lng, 202);
});

test('nextRand', async t => {

	let count = new Map();
	let M = 237;
	for (let i=0;i<M;i++) {
		count.set(i,0);
	}
	let N=1000000;
	for (let i=0; i < N; i++) {
		let r = nextRand(M);
		t.assert( r>=0, "rand >= 0");
		t.assert( r< M, "rand < M");
		count.set(r, 1+count.get(r)); // up the count for the result
	}
	for (let i=0;i<M;i++) {
		let c = count.get(i);
		let failmsg = "random did not hit " + i;
		t.assert( c > 1, failmsg);
	}


	// call nextRand 1 lot and make sure all the numbers are hit


	let d = distanceBetweenCoords({lat:1,lng:10},{lat:3,lng:170})
	t.is(d, 162, "162");

	d = distanceBetweenCoords({lat:1,lng:-170},{lat:3,lng:170})
	t.is(d, 22, "22");

	

	let COK={lat:1, lng:-158};
	let IND={ lat: 1, lng: 82 };

	d = distanceBetweenCoords(IND, COK);
	t.is(d, 120, "120");

	d = distanceBetweenCoords(COK, IND);
	t.is(d, 120, "120");

	d = distanceBetweenCoords(COK, COK);
	t.is(d, 0, "0");
});


test('distanceBetweenCoords', async t => {

	let d = distanceBetweenCoords({lat:1,lng:10},{lat:3,lng:170})
	t.is(d, 162, "162");

	d = distanceBetweenCoords({lat:1,lng:-170},{lat:3,lng:170})
	t.is(d, 22, "22");

	

	let COK={lat:1, lng:-158};
	let IND={ lat: 1, lng: 82 };

	d = distanceBetweenCoords(IND, COK);
	t.is(d, 120, "120");

	d = distanceBetweenCoords(COK, IND);
	t.is(d, 120, "120");

	d = distanceBetweenCoords(COK, COK);
	t.is(d, 0, "0");
});



  

