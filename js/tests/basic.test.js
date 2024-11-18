import test from 'ava';

import {getJson, distanceBetweenCoords, fixStartLng,getRandInt, getNeighbors} from "../utils_helper.js";

const codesFromGeoJson = [
	"ZWE",
	"ZMB",
	"YEM",
	"VNM",
	"VEN",
	"VUT",
	"UZB",
	"URY",
	"PRI",
	"SGS",
	"FLK",
	"GBR",
	"ARE",
	"UKR",
	"UGA",
	"TKM",
	"TUR",
	"TUN",
	"TGO",
	"TLS",
	"THA",
	"TZA",
	"TJK",
	"TWN",
	"SYR",
	"CHE",
	"SWE",
	"SUR",
	"SSD",
	"SDN",
	"LKA",
	"ESP",
	"KOR",
	"ZAF",
	"SOM",
	"RSL",
	"SLB",
	"SVK",
	"SVN",
	"SLE",
	"SRB",
	"SEN",
	"SAU",
	"RWA",
	"ROU",
	"PRT",
	"POL",
	"PHL",
	"PER",
	"PRY",
	"PNG",
	"PAN",
	"PAK",
	"OMN",
	"NOR",
	"PRK",
	"NGA",
	"NER",
	"NIC",
	"NZL",
	"NLD",
	"NPL",
	"NAM",
	"MOZ",
	"MAR",
	"ESH",
	"MNE",
	"MNG",
	"MDA",
	"MEX",
	"MRT",
	"MLI",
	"MYS",
	"MWI",
	"MDG",
	"MKD",
	"LTU",
	"LBY",
	"LBR",
	"LSO",
	"LBN",
	"LVA",
	"LAO",
	"KGZ",
	"KWT",
	"XKX",
	"KIR",
	"KEN",
	"KAZ",
	"JOR",
	"JPN",
	"ITA",
	"ISR",
	"PSE",
	"IRL",
	"IRQ",
	"IRN",
	"IDN",
	"IND",
	"ISL",
	"HUN",
	"HND",
	"HTI",
	"GUY",
	"GNB",
	"GIN",
	"GTM",
	"GRC",
	"GHA",
	"DEU",
	"GEO",
	"GMB",
	"GAB",
	"FRA",
	"PYF",
	"NCL",
	"ATF",
	"ALA",
	"FIN",
	"FJI",
	"ETH",
	"EST",
	"ERI",
	"GNQ",
	"SLV",
	"EGY",
	"ECU",
	"DOM",
	"DJI",
	"FRO",
	"DNK",
	"CZE",
	"CYP",
	"CUB",
	"HRV",
	"CIV",
	"CRI",
	"COD",
	"COG",
	"COL",
	"CHN",
	"CHL",
	"TCD",
	"CAF",
	"CPV",
	"CMR",
	"KHM",
	"MMR",
	"BDI",
	"BFA",
	"BGR",
	"BRN",
	"BRA",
	"BWA",
	"BIH",
	"BOL",
	"BTN",
	"BEN",
	"BLZ",
	"BEL",
	"BLR",
	"BGD",
	"BHS",
	"AZE",
	"AUT",
	"AUS",
	"ARM",
	"ARG",
	"AGO",
	"DZA",
	"ALB",
	"AFG",
	"ATA",
	"CAN",
	"GRL",
	"RUS",
	"USA",
	"MAF",
	"SXM",
	"LUX",
	"LIE",
	"QAT",
	"SMR",
	"MCO",
	"SWZ",
	"AND",
	"HKG",
	"VAT",
	"CUW",
	"ABW",
	"TCA",
	"SPM",
	"PCN",
	"SYC",
	"MHL",
	"TTO",
	"GRD",
	"VCT",
	"BRB",
	"LCA",
	"DMA",
	"MSR",
	"ATG",
	"KNA",
	"VIR",
	"BLM",
	"AIA",
	"VGB",
	"JAM",
	"CYM",
	"BMU",
	"HMD",
	"SHN",
	"MUS",
	"COM",
	"STP",
	"MLT",
	"JEY",
	"GGY",
	"IMN",
	"IOT",
	"SGP",
	"NFK",
	"COK",
	"TON",
	"WLF",
	"WSM",
	"TUV",
	"MDV",
	"NRU",
	"FSM",
	"NIU",
	"ASM",
	"PLW",
	"GUM",
	"MNP",
	"BHR",
	"MAC",

	"SJM","TKL"
   ];
   
/*
test('getNeighbors', async t => {
	// check each code is a legal 3 letter iso3166-3 code
	// check symmetry
	// check for countries with no neighbors
    const arrayLength = codesFromGeoJson.length;
	const codesSet = new Set(codesFromGeoJson);
	const setSize = codesSet.size;
	t.is (arrayLength, setSize);

	codesFromGeoJson.forEach(code => {
		console.log("Code ", code);
		const nabes = getNeighbors(code);
		if (nabes == undefined) {
			console.log( "No neighbors for code ", code);
		}
		console.log ("code ", code, " has neighbors ", nabes);
		// check symmetry 
		nabes.forEach(v => {

			// make sure the neighbor is a valid code
			t.true(codesSet.has( v),"Invalid neighbor code " + v);
			console.log( " trying symmetry for neighbor ", v);
			const b = getNeighbors(v);

			t.truthy(b, " no neighbors for ", v);
			// make sure b contains code
			const failmsg = " neighbor symmetery " + v + " " + b;
		    if ( b.indexOf( code) == -1) {
				console.log( failmsg);
			} 
		});
	});
  });
*/
/*
test('foo', t => {
  t.pass();  
});

test('bar', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});
*/
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

test('getRandInt', async t => {

	let count = new Map();
	let M = 237;
	for (let i=0;i<M;i++) {
		count.set(i,0);
	}
	let N=1000000;
	for (let i=0; i < N; i++) {
		let r = getRandInt(M);
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



  

