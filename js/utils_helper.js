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

export {getJson};
