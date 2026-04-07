import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://3v3.ek21.com'),
  title: '中華台北羽球3對3發展協會 | CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION',
  description:
    '中華台北羽球3對3發展協會 — 推動羽球3對3項目發展，辦理比賽、培訓裁判與教練，讓更多人享受3對3羽球的樂趣。內政部核准立案，台灣唯一專注3對3羽球的全國性協會。',
  keywords:
    '羽球, 3對3, 三對三, 中華台北, 羽球協會, badminton, 3v3, 3v3羽球, 台灣羽球, 羽球比賽, 羽球錦標賽, 迪飛盃, 羽球三對三, 3對3羽球協會',
  icons: { icon: '/images/3v3.jpg' },
  alternates: {
    canonical: 'https://3v3.ek21.com',
  },
  openGraph: {
    title: '中華台北羽球3對3發展協會 | 台灣唯一3V3羽球全國性協會',
    description:
      '宣導羽球3對3理念，促進3對3羽球項目在台灣的發展。辦理賽事、培訓裁判與教練，讓更多人享受3對3羽球樂趣。',
    url: 'https://3v3.ek21.com',
    siteName: '中華台北羽球3對3發展協會',
    images: [
      {
        url: '/images/3v3.jpg',
        width: 1200,
        height: 630,
        alt: '中華台北羽球3對3發展協會',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '中華台北羽球3對3發展協會',
    description: '台灣唯一專注3對3羽球的全國性協會，內政部核准立案。',
    images: ['/images/3v3.jpg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'SportsOrganization'],
      '@id': 'https://3v3.ek21.com/#organization',
      name: '中華台北羽球3對3發展協會',
      alternateName: 'CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION',
      url: 'https://3v3.ek21.com',
      logo: 'https://3v3.ek21.com/images/3v3.jpg',
      image: 'https://3v3.ek21.com/images/3v3.jpg',
      description:
        '中華台北羽球3對3發展協會，內政部核准立案，推動羽球3對3項目發展，辦理比賽、培訓裁判與教練。',
      foundingDate: '2026-01-16',
      sport: '羽球 (Badminton)',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '光輝路80號',
        addressLocality: '文山區',
        addressRegion: '台北市',
        addressCountry: 'TW',
      },
      sameAs: ['https://www.facebook.com/3v3badminton'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://3v3.ek21.com/#website',
      url: 'https://3v3.ek21.com',
      name: '中華台北羽球3對3發展協會',
      publisher: { '@id': 'https://3v3.ek21.com/#organization' },
      inLanguage: 'zh-TW',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={notoSansTC.className}>{children}</body>
    </html>
  );
}
