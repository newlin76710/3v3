import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://3v3badminton.tw'),
  title: '中華台北羽球3對3發展協會 | CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION',
  description:
    '中華台北羽球3對3發展協會 — 推動羽球3對3項目發展，辦理比賽、培訓裁判與教練，讓更多人享受3對3羽球的樂趣。',
  keywords: '羽球, 3對3, 三對三, 中華台北, 羽球協會, badminton, 3v3',
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
    <html lang="zh-TW">
      <head>
        <link rel="icon" href="/images/3v3.jpg" type="image/jpeg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
