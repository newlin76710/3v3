'use client';

import { FormEvent, useState } from 'react';

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <div className="contact-form">
      <h3>發送訊息給我們</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">姓名 *</label>
          <input id="name" name="name" type="text" placeholder="請輸入您的姓名" required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input id="email" name="email" type="email" placeholder="請輸入您的 Email" required />
        </div>
        <div className="form-group">
          <label htmlFor="phone">聯絡電話</label>
          <input id="phone" name="phone" type="tel" placeholder="請輸入聯絡電話（選填）" />
        </div>
        <div className="form-group">
          <label htmlFor="subject">主旨 *</label>
          <input id="subject" name="subject" type="text" placeholder="請輸入訊息主旨" required />
        </div>
        <div className="form-group">
          <label htmlFor="message">訊息內容 *</label>
          <textarea id="message" name="message" placeholder="請輸入您的訊息內容…" required />
        </div>
        <button type="submit" className="btn-send">送出訊息</button>
        {sent && (
          <p className="form-success">感謝您的來信！我們將盡快與您聯繫。</p>
        )}
      </form>
    </div>
  );
}
