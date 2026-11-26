'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Link2, Mail, Phone, Type, Wifi } from 'lucide-react';

type Kind = 'url' | 'text' | 'wifi' | 'email' | 'phone';
type Level = 'L' | 'M' | 'Q' | 'H';

const KINDS: { id: Kind; label: string; icon: typeof Link2 }[] = [
  { id: 'url', label: 'Website', icon: Link2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
];

/** Wi-Fi QR payloads need \ ; , : and " escaped. */
const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

function normaliseUrl(u: string) {
  const t = u.trim();
  if (!t) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}

const field =
  'w-full rounded-xl border-[1.5px] border-[#D9D7F2] bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-600';
const label = 'mb-1.5 block text-sm font-bold text-ink';

/** Makes static QR codes in the browser. They never expire and do not track scans. */
export function QrCodeTool() {
  const [kind, setKind] = useState<Kind>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');
  const [sec, setSec] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [hidden, setHidden] = useState(false);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [phone, setPhone] = useState('');
  const [fg, setFg] = useState('#1B1A3A');
  const [bg, setBg] = useState('#FFFFFF');
  const [size, setSize] = useState(1024);
  const [level, setLevel] = useState<Level>('M');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const payload = useMemo(() => {
    switch (kind) {
      case 'url':
        return normaliseUrl(url);
      case 'text':
        return text;
      case 'wifi':
        if (!ssid.trim()) return '';
        return `WIFI:T:${sec};S:${esc(ssid)};${sec === 'nopass' ? '' : `P:${esc(pass)};`}${hidden ? 'H:true;' : ''};`;
      case 'email': {
        if (!email.trim()) return '';
        const q = new URLSearchParams();
        if (subject) q.set('subject', subject);
        if (body) q.set('body', body);
        const qs = q.toString().replace(/\+/g, '%20');
        return `mailto:${email.trim()}${qs ? `?${qs}` : ''}`;
      }
      case 'phone':
        return phone.trim() ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
    }
  }, [kind, url, text, ssid, pass, sec, hidden, email, subject, body, phone]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (!payload) {
      setError(null);
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      return;
    }
    QRCode.toCanvas(c, payload, { errorCorrectionLevel: level, margin: 4, width: 512, color: { dark: fg, light: bg } })
      .then(() => setError(null))
      .catch(() => setError('That is too much text for one QR code. Please shorten it.'));
  }, [payload, fg, bg, level]);

  const name = `qr-${kind}`;
  const download = async (type: 'png' | 'svg') => {
    if (!payload) return;
    const opts = { errorCorrectionLevel: level, margin: 4, color: { dark: fg, light: bg } } as const;
    let href: string;
    if (type === 'png') {
      href = await QRCode.toDataURL(payload, { ...opts, width: size, type: 'image/png' });
    } else {
      const svg = await QRCode.toString(payload, { ...opts, type: 'svg' });
      href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = `${name}.${type}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const lowContrast = useMemo(() => {
    const lum = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const a = lum(fg);
    const b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3 || a > b;
  }, [fg, bg]);

  return (
    <div className="grid gap-6 rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div role="tablist" aria-label="What should the QR code open?" className="flex flex-wrap gap-2">
          {KINDS.map(({ id, label: l, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => setKind(id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
                kind === id ? 'bg-brand-600 text-white' : 'border-[1.5px] border-[#D9D7F2] text-ink-soft hover:border-brand-600'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {l}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {kind === 'url' && (
            <div>
              <label htmlFor="qr-url" className={label}>Website address</label>
              <input id="qr-url" className={field} inputMode="url" placeholder="example.com/menu" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          )}
          {kind === 'text' && (
            <div>
              <label htmlFor="qr-text" className={label}>Text</label>
              <textarea id="qr-text" rows={4} className={field} placeholder="Any message, up to about 2,000 characters" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}
          {kind === 'wifi' && (
            <>
              <div>
                <label htmlFor="qr-ssid" className={label}>Network name (SSID)</label>
                <input id="qr-ssid" className={field} value={ssid} onChange={(e) => setSsid(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="qr-sec" className={label}>Security</label>
                  <select id="qr-sec" className={field} value={sec} onChange={(e) => setSec(e.target.value as typeof sec)}>
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No password</option>
                  </select>
                </div>
                {sec !== 'nopass' && (
                  <div>
                    <label htmlFor="qr-pass" className={label}>Password</label>
                    <input id="qr-pass" className={field} autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4" /> Hidden network
              </label>
            </>
          )}
          {kind === 'email' && (
            <>
              <div>
                <label htmlFor="qr-email" className={label}>Email address</label>
                <input id="qr-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="qr-subject" className={label}>Subject (optional)</label>
                <input id="qr-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label htmlFor="qr-body" className={label}>Message (optional)</label>
                <textarea id="qr-body" rows={3} className={field} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
            </>
          )}
          {kind === 'phone' && (
            <div>
              <label htmlFor="qr-phone" className={label}>Phone number with country code</label>
              <input id="qr-phone" type="tel" className={field} placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}
        </div>

        <details className="mt-6 rounded-2xl bg-slate-50 p-4">
          <summary className="cursor-pointer font-bold text-ink">Colours and size</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="qr-fg" className={label}>Code colour</label>
              <input id="qr-fg" type="color" value={fg} onChange={(e) => setFg(e.target.value.toUpperCase())} className="h-11 w-full cursor-pointer rounded-xl border-[1.5px] border-[#D9D7F2] bg-white p-1" />
            </div>
            <div>
              <label htmlFor="qr-bg" className={label}>Background</label>
              <input id="qr-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value.toUpperCase())} className="h-11 w-full cursor-pointer rounded-xl border-[1.5px] border-[#D9D7F2] bg-white p-1" />
            </div>
            <div>
              <label htmlFor="qr-size" className={label}>PNG size</label>
              <select id="qr-size" className={field} value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {[512, 1024, 2048, 4096].map((s) => (
                  <option key={s} value={s}>{s} × {s} px</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qr-level" className={label}>Damage tolerance</label>
              <select id="qr-level" className={field} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                <option value="L">Low (smallest code)</option>
                <option value="M">Medium (recommended)</option>
                <option value="Q">High</option>
                <option value="H">Highest (for print)</option>
              </select>
            </div>
          </div>
          {lowContrast && (
            <p className="mt-3 text-sm font-semibold text-amber-800">
              Some phones may not scan this. Use a dark code on a light background with strong contrast.
            </p>
          )}
        </details>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex aspect-square w-full max-w-[340px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-[#ECEBF8] bg-white">
          <canvas ref={canvasRef} className={`h-full w-full ${payload && !error ? '' : 'hidden'}`} aria-label="QR code preview" role="img" />
          {(!payload || error) && (
            <p className="px-6 text-center text-sm text-ink-muted" role={error ? 'alert' : undefined}>
              {error ?? 'Your QR code appears here as you type.'}
            </p>
          )}
        </div>
        <div className="flex w-full flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={!payload || !!error}
            onClick={() => void download('png')}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-5 w-5" aria-hidden="true" /> Download PNG
          </button>
          <button
            type="button"
            disabled={!payload || !!error}
            onClick={() => void download('svg')}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            SVG for print
          </button>
        </div>
        <p className="text-center text-xs text-ink-muted">Static code: it never expires and scans are not tracked.</p>
      </div>
    </div>
  );
}
