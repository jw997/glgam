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

export {getJson,distanceBetweenCoords,fixStartLng};
