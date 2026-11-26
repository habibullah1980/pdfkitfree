import assert from 'node:assert/strict';
import { undoPngPredictor } from '../src/lib/pdf-image-compress';

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function encode(raw: Uint8Array, rowBytes: number, bpp: number, rows: number, types: number[]) {
  const out = new Uint8Array((rowBytes + 1) * rows);
  for (let r = 0; r < rows; r++) {
    const t = types[r % types.length];
    out[r * (rowBytes + 1)] = t;
    for (let i = 0; i < rowBytes; i++) {
      const x = raw[r * rowBytes + i];
      const a = i >= bpp ? raw[r * rowBytes + i - bpp] : 0;
      const b = r > 0 ? raw[(r - 1) * rowBytes + i] : 0;
      const c = r > 0 && i >= bpp ? raw[(r - 1) * rowBytes + i - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][t];
      out[r * (rowBytes + 1) + 1 + i] = (x - pred) & 0xff;
    }
  }
  return out;
}

const width = 37, rows = 23, bpp = 3, rowBytes = width * bpp;
const raw = new Uint8Array(rowBytes * rows);
for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + (i >> 3) * 31) & 0xff;

for (const types of [[0], [1], [2], [3], [4], [0, 1, 2, 3, 4]]) {
  const enc = encode(raw, rowBytes, bpp, rows, types);
  assert.deepEqual(undoPngPredictor(enc, rowBytes, bpp, rows), raw, `filters ${types.join(',')}`);
}
assert.equal(undoPngPredictor(new Uint8Array(10), rowBytes, bpp, rows), null, 'short data rejected');
const bad = encode(raw, rowBytes, bpp, rows, [0]);
bad[0] = 9;
assert.equal(undoPngPredictor(bad, rowBytes, bpp, rows), null, 'unknown filter rejected');
console.log('png-predictor: all checks passed');
