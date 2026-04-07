import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://3v3badminton.tw'),
  title: '中華台北羽球3對3發展協會 | CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION',
  description:
    '中華台北羽球3對3發展協會 — 推動羽球3對3項目發展，辦理比賽、培訓裁判與教練，讓更多人享受3對3羽球的樂趣。',
  keywords: '羽球, 3對3, 三對三, 中華台北, 羽球協會, badminton, 3v3',
  icons: { icon: '/images/3v3.jpg' },
  openGraph: {
    title: '中華台北羽球3對3發展協會',
    description: '宣導羽球3對3理念，促進3對3羽球項目在台灣的發展。',
    images: ['/images/3v3.jpg'],
    locale: 'zh_TW',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={notoSansTC.className}>{children}</body>
    </html>
  );
}
