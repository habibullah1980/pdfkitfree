/** Built-in PDF fonts can't draw emoji or non-Latin text; makeSafeText must stop the "WinAnsi cannot encode" crash. */
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { makeSafeText } from '../src/lib/pdf-safe-text';

(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const safe = makeSafeText(font);
  assert.equal(safe('📍 Lahore, Pakistan'), 'Lahore, Pakistan');
  assert.equal(safe('✉️ a@b.com | 📞 +92 300'), 'a@b.com | +92 300');
  assert.equal(safe('React → Next ✓'), 'React -> Next v');
  assert.equal(safe('Café “quotes” – • …'), 'Café “quotes” – • …');
  assert.equal(safe('Zoë ő'), 'Zoë o');
  assert.equal(safe('محمد'), '????');
  const page = doc.addPage();
  for (const t of ['👨‍💻 Developer 🇵🇰', 'Tab\there', 'Łódź ✅ done', '中文 text']) {
    const s = safe(t);
    font.widthOfTextAtSize(s, 10);
    page.drawText(s, { x: 10, y: 10, size: 10, font });
  }
  await doc.save();
  console.log('pdf-safe-text: all checks passed');
})().catch((e) => {
  console.error('[FAIL]', e);
  process.exit(1);
});
