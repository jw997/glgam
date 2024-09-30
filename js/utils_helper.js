

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

//import {turf} from  "https://unpkg.com/turf@3.0.14/turf.min.js";

// takes a polygon, and makes a feature which is a ring around it
//
function enlargePolygon(poly) {
	const polygon = turf.polygon([poly]); // array of linear rings
	const centroid = turf.centroid(polygon);

	let newPoly = [];

	for (let i =0; i < poly.length; i++ ) {
		const pt = turf.point(poly[i]);
		const bearing = turf.bearing(centroid, pt);
		const newPoint = turf.transformTranslate(pt, 5, bearing); // 10km
		newPoly.push(newPoint.geometry.coordinates);
	}
	const geometry = {
		type: "Polygon",
		//coordinates: [ newPoly, poly] donut
		coordinates: [ newPoly]
	  };

	var feature = turf.feature(geometry);
	// steal the bbox, even though it is a bit small
	feature.bbox = polygon.bbox;
  
	return feature;
}

export {getJson, enlargePolygon};
