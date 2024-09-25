import test from 'ava';

import {countries} from "../util.js";

test('foo', t => {
  t.pass();  
});

test('bar', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});
