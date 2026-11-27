/**
 * pdf-lib's built-in fonts (Helvetica etc.) can only draw the WinAnsi character set.
 * Any other character (an emoji like 📍, a check mark, Arabic or Chinese text) makes
 * drawText/widthOfTextAtSize throw "WinAnsi cannot encode". This turns text into what
 * the font can draw: close look-alikes where they exist, emoji and invisible marks removed,
 * anything else replaced with "?".
 */
interface CharsetFont {
  getCharacterSet(): number[];
}

const LOOKALIKE: Record<string, string> = {
  '‐': '-', '‑': '-', '‒': '-', '―': '-', '−': '-',
  '′': "'", '″': '"', '‵': "'",
  '•': '•', '●': '•', '◦': '•', '‣': '•', '⁃': '-', '▪': '•', '■': '•', '▸': '>', '►': '>', '➢': '>', '→': '->', '←': '<-', '↔': '<->', '⇒': '=>',
  '✓': 'v', '✔': 'v', '✅': 'v', '✗': 'x', '✘': 'x', '❌': 'x',
  '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~',
  '\u00A0': ' ', '\u2002': ' ', '\u2003': ' ', '\u2009': ' ', '\u202F': ' ', '\u2007': ' ',
  '№': 'No.', '™': '™', '…': '…',
};

// Emoji, pictographs, variation selectors, joiners, skin tones and other invisible marks
const DROP = new RegExp(String.raw`[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFE00-\uFE0F\uFEFF\u{E0020}-\u{E007F}\u{1F1E6}-\u{1F1FF}]`, 'u');

const MARKS = new RegExp(String.raw`\p{M}`, 'gu');

export function makeSafeText(font: CharsetFont): (s: string) => string {
  const allowed = new Set(font.getCharacterSet());
  const cache = new Map<string, string>();
  const fix = (ch: string): string => {
    const hit = cache.get(ch);
    if (hit !== undefined) return hit;
    let out: string;
    const cp = ch.codePointAt(0)!;
    if (allowed.has(cp) || ch === '\n') out = ch;
    else if (ch in LOOKALIKE && Array.from(LOOKALIKE[ch]).every((c) => allowed.has(c.codePointAt(0)!))) out = LOOKALIKE[ch];
    else if (ch === '\t') out = '    ';
    else if (DROP.test(ch) || cp < 32) out = '';
    else {
      // Accented letters outside the font: keep the base letter (e.g. "ő" -> "o")
      const base = ch.normalize('NFKD').replace(MARKS, '');
      out = base && Array.from(base).every((c) => allowed.has(c.codePointAt(0)!)) ? base : '?';
    }
    cache.set(ch, out);
    return out;
  };
  return (s: string) => {
    let out = '';
    let dropped = false;
    for (const ch of (s ?? '').normalize('NFC')) {
      const r = fix(ch);
      // "📍 Lahore" becomes "Lahore", not " Lahore"
      if (ch === ' ' && dropped && (out === '' || out.endsWith(' ') || out.endsWith('\n'))) continue;
      dropped = r === '' && ch !== '';
      if (!dropped || r !== '') out += r;
    }
    return out.replace(/ {2,}/g, ' ');
  };
}
