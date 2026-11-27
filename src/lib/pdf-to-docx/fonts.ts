import type { FontInfo } from './types';

/** Fonts that Word, Google Docs or LibreOffice users are likely to have, keyed by a squashed lower-case name. */
const KNOWN: Record<string, string> = {
  arial: 'Arial',
  arialmt: 'Arial',
  arialnarrow: 'Arial Narrow',
  helvetica: 'Arial',
  helveticaneue: 'Arial',
  calibri: 'Calibri',
  calibrilight: 'Calibri Light',
  cambria: 'Cambria',
  candara: 'Candara',
  consolas: 'Consolas',
  constantia: 'Constantia',
  corbel: 'Corbel',
  couriernew: 'Courier New',
  couriernewpsmt: 'Courier New',
  courier: 'Courier New',
  georgia: 'Georgia',
  garamond: 'Garamond',
  ebgaramond: 'Garamond',
  segoeui: 'Segoe UI',
  tahoma: 'Tahoma',
  timesnewroman: 'Times New Roman',
  timesnewromanpsmt: 'Times New Roman',
  times: 'Times New Roman',
  timesroman: 'Times New Roman',
  trebuchetms: 'Trebuchet MS',
  verdana: 'Verdana',
  bookantiqua: 'Book Antiqua',
  palatino: 'Palatino Linotype',
  palatinolinotype: 'Palatino Linotype',
  centurygothic: 'Century Gothic',
  gillsans: 'Gill Sans MT',
  gillsansmt: 'Gill Sans MT',
  lucidaconsole: 'Lucida Console',
  lucidasans: 'Lucida Sans',
  aptos: 'Aptos',
  // Common Google / open fonts (available in Google Docs, often installed elsewhere)
  roboto: 'Roboto',
  robotomono: 'Roboto Mono',
  opensans: 'Open Sans',
  lato: 'Lato',
  montserrat: 'Montserrat',
  poppins: 'Poppins',
  inter: 'Inter',
  sourcesanspro: 'Source Sans Pro',
  sourcesans3: 'Source Sans Pro',
  sourceserifpro: 'Source Serif Pro',
  merriweather: 'Merriweather',
  nunito: 'Nunito',
  raleway: 'Raleway',
  ptsans: 'PT Sans',
  ptserif: 'PT Serif',
  notosans: 'Noto Sans',
  notoserif: 'Noto Serif',
  liberationsans: 'Arial',
  liberationserif: 'Times New Roman',
  liberationmono: 'Courier New',
  dejavusans: 'DejaVu Sans',
  dejavuserif: 'DejaVu Serif',
  dejavusansmono: 'DejaVu Sans Mono',
  carlito: 'Calibri',
  caladea: 'Cambria',
  symbol: 'Symbol',
  zapfdingbats: 'Wingdings',
  wingdings: 'Wingdings',
};

const STYLE_WORDS =
  /(bold|black|heavy|semibold|demibold|extrabold|ultrabold|medium|light|thin|extralight|ultralight|book|regular|roman|italic|oblique|condensed|narrow|cond|mt|ps|std|pro)$/i;

function squash(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** "ABCDEF+Calibri-BoldItalic" -> "Calibri-BoldItalic" */
export function stripSubset(name: string) {
  return name.replace(/^[A-Z]{6}\+/, '');
}

/** Splits a PostScript font name into family and style hints. */
export function parseFontName(raw: string): { family: string; bold: boolean; italic: boolean } {
  const name = stripSubset(raw || '').trim();
  const lower = name.toLowerCase();
  const bold = /(bold|black|heavy|semibold|demibold|extrabold|ultrabold|,bold)/.test(lower) && !/semilight/.test(lower);
  const italic = /(italic|oblique|,italic|-it$|-ital)/.test(lower);
  // Family part: before the first '-' or ',' that introduces the style.
  let family = name.split(/[-,]/)[0] || name;
  // "ArialBold" style names without separators
  for (let i = 0; i < 3; i++) {
    const m = family.match(STYLE_WORDS);
    if (!m || m.index === 0) break;
    family = family.slice(0, m.index);
  }
  // CamelCase -> spaced: "TimesNewRoman" -> "Times New Roman"
  family = family.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return { family: family || name, bold, italic };
}

export function resolveFont(
  pdfName: string,
  hints: { bold?: boolean; italic?: boolean; black?: boolean; serif?: boolean; mono?: boolean; fallbackName?: string }
): FontInfo {
  const parsed = parseFontName(pdfName);
  const bold = parsed.bold || !!hints.bold || !!hints.black;
  const italic = parsed.italic || !!hints.italic;
  const key = squash(parsed.family);
  let mono = !!hints.mono || /mono|courier|consol|code/.test(key);
  let serif = !!hints.serif || /times|serif|georgia|garamond|cambria|roman|book|palatino|minion|caslon|baskerville/.test(key);
  if (/sans/.test(key)) serif = false;
  if (mono) serif = false;
  let family = KNOWN[key];
  if (!family) {
    // Try without trailing digits / style words, e.g. "Roboto Condensed", "OpenSans"
    const short = Object.keys(KNOWN).find((k) => key.startsWith(k) && k.length >= 4);
    family = short ? KNOWN[short] : '';
  }
  if (!family) family = mono ? 'Courier New' : serif ? 'Times New Roman' : 'Arial';
  if (family === 'Courier New') mono = true;
  return { family, originalFamily: parsed.family, bold, italic, serif, mono };
}
