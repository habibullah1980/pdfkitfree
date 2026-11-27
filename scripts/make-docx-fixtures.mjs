/**
 * Builds the PDF-to-Word test documents in tests/fixtures/pdf-to-docx/ with headless Chromium,
 * so they contain real embedded fonts, tables, images and vector graphics like everyday PDFs.
 * Run: node scripts/make-docx-fixtures.mjs
 */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('tests/fixtures/pdf-to-docx');
fs.mkdirSync(OUT, { recursive: true });

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; font-size: 11pt; line-height: 1.35; }
  h1 { font-size: 22pt; color: #1e3a8a; margin: 0 0 8pt; }
  h2 { font-size: 14pt; color: #4b3fe4; margin: 14pt 0 6pt; }
  p { margin: 0 0 8pt; }
`;

// Draws a small "photo" on a canvas and returns it as a data URL (embedded as a real raster image).
const PHOTO_JS = `
function photo(w, h, hue, type) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'hsl(' + hue + ',70%,60%)'); g.addColorStop(1, 'hsl(' + (hue + 60) + ',70%,35%)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.1 + i / 40) + ')'; x.beginPath(); x.arc((i * 97) % w, (i * 53) % h, 10 + i * 4, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.arc(w / 2, h * 0.42, h * 0.18, 0, 7); x.fill();
  x.fillRect(w * 0.3, h * 0.65, w * 0.4, h * 0.35);
  return c.toDataURL(type || 'image/jpeg', 0.9);
}
function logo(w, h, color, text) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = color; x.beginPath(); x.roundRect(0, 0, h, h, h * 0.25); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold ' + (h * 0.6) + 'px Arial'; x.textAlign = 'center'; x.fillText(text[0], h / 2, h * 0.72);
  x.fillStyle = color; x.font = 'bold ' + (h * 0.5) + 'px Arial'; x.textAlign = 'left'; x.fillText(text, h * 1.2, h * 0.68);
  return c.toDataURL('image/png');
}
document.querySelectorAll('img[data-photo]').forEach((im) => { const [w, h, hue] = im.dataset.photo.split(',').map(Number); im.src = photo(w, h, hue, im.dataset.type); });
document.querySelectorAll('img[data-logo]').forEach((im) => { const [w, h, color, text] = im.dataset.logo.split(','); im.src = logo(+w, +h, color, text); });
`;

const LOREM = [
  'Our third quarter showed steady growth across every region. Revenue rose by 12 percent compared with the same period last year, driven mainly by new subscription customers and a lower churn rate.',
  'Operating costs stayed within budget. We invested in customer support and opened two new regional offices, which will help us serve clients in their own time zones and languages.',
  'Looking ahead, the leadership team will focus on product quality, faster onboarding and a simpler pricing model. We expect these changes to lift customer satisfaction in the coming quarters.',
  'The board approved a modest increase in research spending. Most of it will go towards automation, accessibility improvements and security reviews of the core platform.',
];

const docs = {
  '01-business-report': {
    html: `<div style="padding:54pt 60pt">
      <h1>Quarterly Business Report</h1>
      <p style="color:#6b7280;font-size:10pt">Prepared by the Finance Team &middot; October 2026</p>
      <h2>1. Executive summary</h2>
      <p style="text-align:justify">${LOREM[0]} ${LOREM[1]}</p>
      <p style="text-align:justify">${LOREM[2]}</p>
      <h2>2. Key results</h2>
      <ul style="margin:0 0 8pt 18pt;padding:0">
        <li>Revenue: <b>$4.2 million</b>, up 12%</li>
        <li>New customers: <b>1,240</b></li>
        <li>Customer satisfaction: <span style="color:#059669"><b>94%</b></span></li>
      </ul>
      <h2>3. Outlook</h2>
      <p style="text-align:justify">${LOREM[3]} <i>All figures are unaudited.</i></p>
      <p style="text-align:center;font-size:9pt;color:#9ca3af;margin-top:24pt">Confidential &ndash; for internal use only</p>
    </div>`,
  },
  '02-multi-column': {
    html: `<div style="padding:40pt 44pt">
      <div style="background:#4b3fe4;color:#fff;padding:14pt 18pt;border-radius:6pt"><div style="font-size:24pt;font-weight:bold">The Weekly Ledger</div><div style="font-size:10pt">Issue 42 &middot; News for small business owners</div></div>
      <div style="column-count:2;column-gap:24pt;margin-top:16pt;text-align:justify">
        <h2 style="margin-top:0">Markets steady</h2><p>${LOREM[0]}</p><p>${LOREM[1]}</p>
        <h2>New tax rules</h2><p>${LOREM[2]}</p><p>${LOREM[3]}</p>
        <h2>Tips of the week</h2><p>${LOREM[1]}</p><p>${LOREM[0]}</p>
      </div>
    </div>`,
  },
  '03-invoice': {
    html: `<div style="padding:44pt 50pt">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="vertical-align:top"><img data-logo="360,60,#4B3FE4,Acme Ltd" style="height:30pt"><div style="margin-top:8pt;font-size:10pt">12 Market Street<br>London EC1A 1BB<br>billing@acme.example</div></td>
        <td style="vertical-align:top;text-align:right"><div style="font-size:26pt;font-weight:bold;color:#111827">INVOICE</div><div style="font-size:10pt">Invoice no: <b>INV-2026-0117</b><br>Date: 14 Nov 2026<br>Due: 28 Nov 2026</div></td>
      </tr></table>
      <div style="margin-top:18pt;font-size:10pt"><b>Bill to</b><br>Globex Corporation<br>500 Harbour Road, Sydney NSW 2000</div>
      <table style="width:100%;border-collapse:collapse;margin-top:18pt;font-size:10pt">
        <tr style="background:#4b3fe4;color:#fff"><th style="border:1px solid #4b3fe4;padding:6pt;text-align:left">Description</th><th style="border:1px solid #4b3fe4;padding:6pt">Qty</th><th style="border:1px solid #4b3fe4;padding:6pt;text-align:right">Unit price</th><th style="border:1px solid #4b3fe4;padding:6pt;text-align:right">Amount</th></tr>
        ${[['Website redesign', 1, 2400], ['Hosting (12 months)', 12, 25], ['Logo design', 1, 450], ['Support hours', 8, 60]]
          .map(([d, q, u], i) => `<tr style="background:${i % 2 ? '#f3f4f6' : '#fff'}"><td style="border:1px solid #d1d5db;padding:6pt">${d}</td><td style="border:1px solid #d1d5db;padding:6pt;text-align:center">${q}</td><td style="border:1px solid #d1d5db;padding:6pt;text-align:right">$${u.toFixed(2)}</td><td style="border:1px solid #d1d5db;padding:6pt;text-align:right">$${(q * u).toFixed(2)}</td></tr>`)
          .join('')}
        <tr><td colspan="3" style="border:1px solid #d1d5db;padding:6pt;text-align:right"><b>Subtotal</b></td><td style="border:1px solid #d1d5db;padding:6pt;text-align:right">$3,630.00</td></tr>
        <tr><td colspan="3" style="border:1px solid #d1d5db;padding:6pt;text-align:right"><b>VAT 20%</b></td><td style="border:1px solid #d1d5db;padding:6pt;text-align:right">$726.00</td></tr>
        <tr style="background:#fef3c7"><td colspan="3" style="border:1px solid #d1d5db;padding:6pt;text-align:right"><b>Total due</b></td><td style="border:1px solid #d1d5db;padding:6pt;text-align:right"><b>$4,356.00</b></td></tr>
      </table>
      <p style="margin-top:20pt;font-size:9pt;color:#6b7280">Please pay by bank transfer within 14 days. Thank you for your business.</p>
    </div>`,
  },
  '04-resume': {
    html: `<div style="display:flex;min-height:100vh">
      <div style="width:190pt;background:#1e293b;color:#e2e8f0;padding:36pt 20pt">
        <img data-photo="300,300,200" style="width:120pt;height:120pt;border-radius:60pt;display:block;margin:0 auto 14pt">
        <div style="font-size:12pt;font-weight:bold;color:#fff;margin-bottom:6pt">Contact</div>
        <div style="font-size:9.5pt">+44 20 7946 0000<br>jane.doe@example.com<br>Manchester, UK</div>
        <div style="font-size:12pt;font-weight:bold;color:#fff;margin:16pt 0 6pt">Skills</div>
        <div style="font-size:9.5pt">Project management<br>Data analysis<br>Team leadership<br>Spanish (fluent)</div>
      </div>
      <div style="flex:1;padding:36pt 30pt">
        <div style="font-size:28pt;font-weight:bold;color:#111827">Jane Doe</div>
        <div style="font-size:13pt;color:#4b3fe4;margin-bottom:14pt">Senior Operations Manager</div>
        <h2>Profile</h2><p style="text-align:justify">${LOREM[1]}</p>
        <h2>Experience</h2>
        <p><b>Operations Manager</b>, Northwind Traders <span style="color:#6b7280">2021 &ndash; present</span><br>${LOREM[2]}</p>
        <p><b>Team Lead</b>, Contoso Ltd <span style="color:#6b7280">2017 &ndash; 2021</span><br>${LOREM[3]}</p>
        <h2>Education</h2><p><b>BSc Business Management</b>, University of Leeds, 2016</p>
      </div></div>`,
    pdf: { margin: { top: '0', bottom: '0', left: '0', right: '0' } },
  },
  '05-logos': {
    html: `<div style="padding:50pt 56pt">
      <div style="display:flex;align-items:center;gap:14pt;border-bottom:2px solid #e5e7eb;padding-bottom:12pt">
        <svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="25" fill="#f59e0b"/><path d="M14 30 L24 40 L42 16" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></svg>
        <div><div style="font-size:20pt;font-weight:bold">Partner Programme 2027</div><div style="font-size:10pt;color:#6b7280">Brands we work with</div></div>
      </div>
      <p style="margin-top:14pt">${LOREM[0]}</p>
      <div style="display:flex;gap:20pt;margin:14pt 0">
        <img data-logo="300,60,#DC2626,Redline" style="height:26pt"><img data-logo="300,60,#059669,Greenfield" style="height:26pt"><img data-logo="300,60,#2563EB,Bluewave" style="height:26pt">
      </div>
      <p>${LOREM[2]}</p>
      <svg width="420" height="150" viewBox="0 0 420 150"><rect x="0" y="0" width="420" height="150" fill="#f9fafb"/>${[40, 90, 65, 120, 100]
        .map((v, i) => `<rect x="${30 + i * 75}" y="${140 - v}" width="40" height="${v}" fill="#4b3fe4"/><text x="${50 + i * 75}" y="${135 - v}" font-size="11" text-anchor="middle" fill="#111">${v}</text>`)
        .join('')}<path d="M10 140 L410 140" stroke="#9ca3af"/></svg>
      <p style="font-size:9pt;color:#6b7280">Figure 1: Partner sign-ups per quarter.</p>
    </div>`,
  },
  '06-headers-footers': {
    html: `<div style="padding:0 6pt">${Array.from({ length: 3 }, (_, k) => `
      <h1 style="${k ? 'page-break-before:always' : ''}">Chapter ${k + 1}: ${['Getting started', 'Daily operations', 'Reporting'][k]}</h1>
      ${LOREM.map((t) => `<p style="text-align:justify">${t} ${t}</p>`).join('')}
      <h2>Section ${k + 1}.1</h2>${LOREM.slice(0, 2).map((t) => `<p style="text-align:justify">${t}</p>`).join('')}`).join('')}
    </div>`,
    pdf: {
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:9px;width:100%;padding:0 50px;color:#555;display:flex;justify-content:space-between"><span>PDFKitFree Operations Handbook</span><span>Version 2.1</span></div>',
      footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;color:#555">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: '93px', bottom: '80px', left: '67px', right: '67px' },
    },
  },
  '08-mixed-image-text': {
    html: `<div style="padding:48pt 54pt">
      <h1>Visiting the Lake District</h1>
      <p style="color:#6b7280">A short travel guide</p>
      <img data-photo="800,420,150" style="width:100%;height:auto;display:block;margin:6pt 0">
      <p style="font-size:9pt;color:#6b7280;text-align:center">Photo: Morning light over the water</p>
      <p style="text-align:justify">${LOREM[0]} ${LOREM[2]}</p>
      <div style="display:flex;gap:14pt;align-items:flex-start"><img data-photo="300,300,20" style="width:140pt;height:140pt"><p style="text-align:justify;margin:0">${LOREM[1]} ${LOREM[3]}</p></div>
      <p style="margin-top:10pt;text-align:justify">${LOREM[3]}</p>
    </div>`,
  },
  '09-financial-statement': {
    html: `<div style="padding:50pt 56pt;font-size:10pt">
      <div style="text-align:center"><div style="font-size:15pt;font-weight:bold">Northwind Holdings plc</div><div>Consolidated income statement</div><div style="color:#6b7280">For the year ended 31 December 2026 (in thousands)</div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:16pt">
        <tr style="border-bottom:1.5px solid #111"><th style="text-align:left;padding:4pt 0">&nbsp;</th><th style="text-align:right;padding:4pt">Note</th><th style="text-align:right;padding:4pt">2026</th><th style="text-align:right;padding:4pt">2025</th></tr>
        ${[
          ['Revenue', '3', '48,210', '43,005', false],
          ['Cost of sales', '', '(29,114)', '(26,870)', false],
          ['Gross profit', '', '19,096', '16,135', true],
          ['Distribution costs', '', '(3,402)', '(3,118)', false],
          ['Administrative expenses', '4', '(7,955)', '(7,240)', false],
          ['Other operating income', '', '612', '488', false],
          ['Operating profit', '5', '8,351', '6,265', true],
          ['Finance income', '', '144', '96', false],
          ['Finance costs', '6', '(1,027)', '(1,204)', false],
          ['Profit before tax', '', '7,468', '5,157', true],
          ['Income tax expense', '7', '(1,867)', '(1,289)', false],
          ['Profit for the year', '', '5,601', '3,868', true],
        ]
          .map(([a, n, b, c, t]) => `<tr style="${t ? 'border-top:1px solid #111;font-weight:bold' : ''}"><td style="padding:3.5pt 0">${a}</td><td style="text-align:right;padding:3.5pt">${n}</td><td style="text-align:right;padding:3.5pt">${b}</td><td style="text-align:right;padding:3.5pt">${c}</td></tr>`)
          .join('')}
      </table>
      <p style="margin-top:18pt;font-size:8.5pt;color:#6b7280">The notes on pages 12 to 40 form part of these financial statements.</p>
    </div>`,
  },
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (html, pdfOpts = {}) => {
    await page.setContent(`<!doctype html><html><head><style>${BASE_CSS}</style></head><body>${html}<script>${PHOTO_JS}</script></body></html>`, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    return page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' }, ...pdfOpts });
  };

  for (const [name, d] of Object.entries(docs)) {
    const bytes = await render(d.html, d.pdf);
    fs.writeFileSync(path.join(OUT, `${name}.pdf`), bytes);
    console.log('wrote', name);
  }

  // 07: scanned page — screenshot of a letter, slightly rotated and noisy, embedded as a single image (no text layer)
  {
    await page.setViewportSize({ width: 1240, height: 1754 });
    await page.setContent(`<!doctype html><html><head><style>${BASE_CSS} body{font-family:'Times New Roman',serif;font-size:21pt;line-height:1.45}</style></head><body><div style="padding:120px 130px">
      <div style="text-align:right">14 November 2026</div><br>
      <div>Mr Ahmed Khan<br>Flat 4, 22 Garden Road<br>Bristol BS1 4DJ</div><br>
      <div><b>Re: Confirmation of your account</b></div><br>
      <p>Dear Mr Khan,</p>
      <p>Thank you for opening an account with us. This letter confirms that your account is now active and ready to use.</p>
      <p>Your monthly statement will be sent on the first working day of each month. If you have any questions, please call our customer team.</p>
      <p>Yours sincerely,</p><br><p>Sarah Mitchell<br>Customer Services Manager</p></div></body></html>`);
    let png = await page.screenshot({ type: 'png' });
    // add scanner-like grey tint and slight rotation by drawing it onto a canvas
    await page.setContent('<canvas id=c width=1240 height=1754></canvas>');
    const jpgB64 = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.getElementById('c');
      const x = c.getContext('2d');
      x.fillStyle = '#f4f2ec';
      x.fillRect(0, 0, c.width, c.height);
      x.translate(620, 877);
      x.rotate(0.006);
      x.translate(-620, -877);
      x.globalAlpha = 0.92;
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 22;
        d.data[i] += n;
        d.data[i + 1] += n;
        d.data[i + 2] += n;
      }
      x.putImageData(d, 0, 0);
      return c.toDataURL('image/jpeg', 0.82).split(',')[1];
    }, png.toString('base64'));
    const doc = await PDFDocument.create();
    const jpg = await doc.embedJpg(Buffer.from(jpgB64, 'base64'));
    const p = doc.addPage([595.28, 841.89]);
    p.drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 });
    fs.writeFileSync(path.join(OUT, '07-scanned.pdf'), await doc.save());
    console.log('wrote 07-scanned');
    await page.setViewportSize({ width: 1280, height: 720 });
  }

  // 10: different page sizes and orientations (A4 portrait, Letter landscape, A5 portrait, and a page with /Rotate 90)
  {
    const parts = [
      await render(`<div style="padding:50pt"><h1>A4 portrait page</h1><p>${LOREM[0]}</p><p>${LOREM[1]}</p></div>`, { format: 'A4' }),
      await render(`<div style="padding:40pt"><h1>US Letter landscape page</h1><p>${LOREM[2]}</p><table style="border-collapse:collapse;width:100%">${[['Region', 'Q1', 'Q2', 'Q3', 'Q4'], ['North', '120', '135', '150', '160'], ['South', '90', '96', '101', '118']].map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #333;padding:5pt">${c}</td>`).join('')}</tr>`).join('')}</table></div>`, { format: 'Letter', landscape: true }),
      await render(`<div style="padding:36pt"><h1 style="font-size:16pt">A5 booklet page</h1><p>${LOREM[3]}</p></div>`, { format: 'A5' }),
      await render(`<div style="padding:50pt"><h1>Rotated page</h1><p>This page is stored sideways and rotated by the PDF viewer.</p><p>${LOREM[1]}</p></div>`, { format: 'A4', landscape: true }),
    ];
    const out = await PDFDocument.create();
    for (const [i, bytes] of parts.entries()) {
      const src = await PDFDocument.load(bytes);
      const [pg] = await out.copyPages(src, [0]);
      if (i === 3) pg.setRotation(degrees(90));
      out.addPage(pg);
    }
    fs.writeFileSync(path.join(OUT, '10-page-sizes.pdf'), await out.save());
    console.log('wrote 10-page-sizes');
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
