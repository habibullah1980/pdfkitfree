import { Metadata } from 'next';

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
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://freepdfkit.com/sitemap.xml',
  };
}
