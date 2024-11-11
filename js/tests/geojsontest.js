import test from 'ava';
import * as fs from 'fs';
const data = fs.readFileSync('./data/final.geojson', 'utf8');
test('not null', t => {
  if (data == null) {
	t.fail();
  }
  t.pass();

});

test('isjson', t => {

	var obj = JSON.parse(data);

	if (obj == null) {
	  t.fail();
	}
	t.pass();

	t.is( obj.type , "FeatureCollection","type if FeatureCollection");

	t.is( obj.features.length , 238	, "expected 238 countries");

	const countries = obj;
	// make sure each country has required props
	// bbox, ADMIN, ISO_A3_EH
	const setIso = new Set();
	const setAdmin = new Set();

    for (const element of countries.features) {
		
		// Console.log(element.properties.NAME, ' ', element.properties.ISO_A3_EH);
		// add it to the iso-select options
		
		t.not(element.properties.ISO_A3_EH, '-99', "real ISO_A3");
		t.not(element.properties.ADMIN, undefined, "ADMIN Defined");
		t.not(element.bbox, undefined, "bbox Defined");
		
		// uniqueness check
		const iso = element.properties.ISO_A3_EH;

		t.false( setIso.has(iso), "Duplicate iso code ", iso);
		setIso.add(iso);

		const name  = element.properties.ADMIN;
		t.false( setAdmin.has(name), "Duplicate ADMIN ");
		setAdmin.add(name);

		
    }

	t.is( setIso.size, 238, "expected 238 unique iso 3 codes")
	t.is( setAdmin.size, 238, "expected 238 names")

  
  });

test('bar', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});
