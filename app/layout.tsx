import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
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
    '羽球, 3對3, 三對三, 中華台北, 羽球協會, badminton, 3v3, 3v3羽球, 台灣羽球, 羽球比賽, 羽球錦標賽',
  icons: { icon: '/images/3v3.jpg' },
  openGraph: {
    title: '中華台北羽球3對3發展協會 | 台灣唯一3V3羽球全國性協會',
    description: '宣導羽球3對3理念，促進3對3羽球項目在台灣的發展。',
    url: 'https://3v3.ek21.com',
    siteName: '中華台北羽球3對3發展協會',
    locale: 'zh_TW',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsOrganization',
  name: '中華台北羽球3對3發展協會',
  alternateName: 'CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION',
  url: 'https://3v3.ek21.com',
  foundingDate: '2026-01-16',
  sport: '羽球 (Badminton)',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '光輝路80號',
    addressLocality: '文山區',
    addressRegion: '台北市',
    addressCountry: 'TW',
  },
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
      <body className={notoSansTC.className}>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
