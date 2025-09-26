import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  // Force new deployment
  metadataBase: new URL('https://www.getjobping.com'),
  alternates: {
    canonical: '/',
  },
  title: 'JobPing - Weekly job matches for early-career roles',
        description: 'Weekly job matches for early-career roles across Europe—delivered to your inbox.',
  keywords: ['jobs', 'students', 'graduates', 'AI', 'career', 'recruitment', 'internships', 'job matching'],
  authors: [{ name: 'JobPing Team' }],
  creator: 'JobPing',
  publisher: 'JobPing',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'JobPing - Weekly job matches for early-career roles',
    description: 'Weekly job matches for early-career roles across Europe—delivered to your inbox.',
    url: 'https://www.getjobping.com',
    siteName: 'JobPing',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JobPing - Smart Job Discovery Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobPing - Weekly job matches for early-career roles',
    description: 'Weekly job matches for early-career roles across Europe—delivered to your inbox.',
    images: ['/og-image.png'],
    site: '@jobping'
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "JobPing",
              "description": "AI-powered job matching for students and graduates",
              "url": "https://www.getjobping.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              }
            })
          }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} bg-black text-white antialiased`}>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}