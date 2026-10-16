import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export default function robots(): Metadata['robots'] | {
  rules: {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }[];
  sitemap: string;
} {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/settings',
          '/settings/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
