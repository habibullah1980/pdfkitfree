import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WebsiteChatbot } from '@/components/WebsiteChatbot';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { CookieConsent } from '@/components/CookieConsent';
import { SITE_CONFIG } from '@/lib/site-config';
import { AuthProvider } from '@/contexts/AuthContext';
import { THEME_INIT_SCRIPT } from '@/components/ThemeToggle';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['500', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  applicationName: 'PDFKitFree',
  title: {
    default: 'Free PDF Tools Online: Merge, Compress, Sign & Convert | PDFKitFree',
    template: '%s | PDFKitFree',
  },
  description: SITE_CONFIG.description,
  keywords: [
    'PDF tools',
    'merge PDF online',
    'sign PDF',
    'free PDF combiner',
    'split PDF',
    'compress PDF',
    'electronic signature SaaS',
    'NDA generator',
    'video compressor',
    'private PDF tools',
    'PDFKitFree',
  ],
  authors: [{ name: 'PDFKitFree Team' }],
  creator: 'PDFKitFree',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_CONFIG.url,
    title: 'Free PDF Tools Online: Merge, Compress, Sign & Convert | PDFKitFree',
    description: SITE_CONFIG.description,
    siteName: 'PDFKitFree',
  },
  twitter: {
    // No title/description here: X falls back to each page's own og:title and
    // og:description. Setting them here made every page share the home page text.
    card: 'summary_large_image',
    creator: SITE_CONFIG.creator,
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4B3FE4' },
    { media: '(prefers-color-scheme: dark)', color: '#100F24' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Verification meta tag for Bing Webmaster Tools */}
        <meta name="msvalidate.01" content="DAFB040EA71026356781552808195EAC" />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-ink antialiased font-sans">
        <GoogleAnalytics />
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WebsiteChatbot />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
