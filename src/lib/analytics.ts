// Google Analytics 4 Utility & Safe Event Tracking
// GA4 Measurement ID: G-42VHC5N8R9
// Strict Privacy: Never track filenames, document text, PDF byte data, signatures, passwords, or PII.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-42VHC5N8R9';

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set' | 'consent',
      targetIdOrAction: string | Date | object,
      configOrParams?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Sends a page_view event to GA4.
 * Triggered on client-side router navigation in Next.js App Router.
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  // Strip query parameters that might contain tokens or sensitive values
  const cleanUrl = url.split('?')[0];

  window.gtag('event', 'page_view', {
    page_location: `${window.location.origin}${cleanUrl}`,
    page_path: cleanUrl,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID,
  });
}

/**
 * Safe custom event tracking.
 * Strictly filters out any potential sensitive fields or personal information.
 */
export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean | undefined> = {}
) {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  // Sanitize params - explicitly prevent document text, filenames, emails, passwords
  const sanitizedParams: Record<string, string | number | boolean> = {};

  const forbiddenKeys = [
    'filename',
    'file_name',
    'text',
    'content',
    'document',
    'document_text',
    'password',
    'token',
    'email',
    'name',
    'phone',
    'signature',
  ];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const lowerKey = key.toLowerCase();
    const isForbidden = forbiddenKeys.some((f) => lowerKey.includes(f));
    if (!isForbidden) {
      sanitizedParams[key] = value;
    }
  }

  window.gtag('event', eventName, {
    ...sanitizedParams,
    send_to: GA_MEASUREMENT_ID,
  });
}
