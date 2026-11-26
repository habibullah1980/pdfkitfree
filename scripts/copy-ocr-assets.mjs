// Copies the OCR engine (tesseract.js worker, WebAssembly core, English model) into
// public/tesseract so the OCR tool is served from this site and never from a third-party CDN.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const out = path.join(process.cwd(), 'public', 'tesseract');
mkdirSync(out, { recursive: true });

const files = [
  [path.join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), 'worker.min.js'],
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'].map((f) => [
    path.join(pkgDir('tesseract.js-core'), f),
    f,
  ]),
  [path.join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

for (const [from, name] of files) {
  if (!existsSync(from)) throw new Error(`OCR asset missing: ${from}`);
  copyFileSync(from, path.join(out, name));
}
console.log(`Copied ${files.length} OCR assets to public/tesseract`);
