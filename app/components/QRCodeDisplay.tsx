'use client';

import { QRCodeSVG } from 'qrcode.react';

const REGISTER_URL = 'https://3v3.ek21.com/events/chinese-cup';

export default function QRCodeDisplay() {
  return (
    <div className="qr-wrap">
      <QRCodeSVG
        value={REGISTER_URL}
        size={148}
        bgColor="#ffffff"
        fgColor="#1a1a2e"
        level="M"
        imageSettings={{
          src: '/images/3v3.jpg',
          height: 32,
          width: 32,
          excavate: true,
        }}
      />
      <p className="qr-label">掃描 QR Code 立即報名</p>
    </div>
  );
}
