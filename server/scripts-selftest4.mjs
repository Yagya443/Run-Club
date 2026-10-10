import assert from 'node:assert';
import { trimEnds, sample, pathLengthM, destination } from './src/services/geo.js';
const o = [19.45, 72.79]; const pts = Array.from({ length: 101 }, (_, i) => destination(o, 90, i * 20)); // 2 km line
const t = trimEnds(pts, 300); const first = pathLengthM([pts[0], t[0]]), last = pathLengthM([t.at(-1), pts.at(-1)]);
assert(first >= 300 && first < 330 && last >= 300 && last < 330, `trim ${first} ${last}`);
assert.equal(sample(pts, 60).length, 60); assert.equal(sample(pts.slice(0, 10), 60).length, 10);
console.log('part 4 selftest passed: public previews hide the first/last 300 m');
