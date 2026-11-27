/** Turns technical PDF/browser errors into short, plain messages with a next step. */
export interface FriendlyError {
  message: string;
  action?: { label: string; href: string };
}

export function friendlyPdfError(err: unknown, fallback = 'Something went wrong while processing your file.'): FriendlyError {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name || '';
  const msg = (e?.message || '').toLowerCase();
  if (name === 'PasswordException' || msg.includes('password')) {
    return {
      message: 'This PDF is password-protected. Unlock it first, then try again.',
      action: { label: 'Unlock PDF', href: '/tools/unlock-pdf' },
    };
  }
  if (name === 'InvalidPDFException' || msg.includes('invalid pdf') || msg.includes('invalid or corrupted')) {
    return {
      message: 'This file looks damaged or is not a real PDF. Try saving it again from the app that created it.',
      action: { label: 'Try Repair PDF', href: '/tools/repair-pdf' },
    };
  }
  if (name === 'QuotaExceededError' || msg.includes('out of memory') || msg.includes('allocation failed') || msg.includes('array buffer allocation')) {
    return {
      message: 'Your browser ran out of memory on this file. Close other tabs, or split the PDF into smaller parts and convert them one by one.',
      action: { label: 'Split PDF', href: '/tools/split-pdf' },
    };
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return { message: 'A part of the converter could not be loaded. Check your internet connection and try again.' };
  }
  return { message: e?.message ? `${fallback} (${e.message})` : fallback };
}
