import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SITE_CONFIG } from '@/lib/site-config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: 'FreePDFKit - Fast, Secure & Private PDF Tools SaaS',
    template: '%s | FreePDFKit',
  },
  description: SITE_CONFIG.description,
  keywords: [
    'PDF tools',
    'merge PDF online',
    'sign PDF',
    'free PDF combiner',
    'split PDF',
    'electronic signature SaaS',
    'NDA generator',
    'private PDF tools',
  ],
  authors: [{ name: 'FreePDFKit Team' }],
  creator: 'FreePDFKit',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_CONFIG.url,
    title: 'FreePDFKit - All-In-One PDF Utilities & Electronic Document SaaS',
    description: SITE_CONFIG.description,
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FreePDFKit Tools & Signatures',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreePDFKit - All-In-One PDF Utilities & Electronic Document SaaS',
    description: SITE_CONFIG.description,
    creator: SITE_CONFIG.creator,
    images: ['/og-image.png'],
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Verification meta tag placeholder for Google Search Console */}
        <meta
          name="google-site-verification"
          content="google-search-console-verification-token"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-slate-900 antialiased font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
