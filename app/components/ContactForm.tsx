'use client';

import { FormEvent, useState } from 'react';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formId = process.env.NEXT_PUBLIC_FORMSPREE_ID;

    if (!formId) {
      setStatus('error');
      return;
    }

    setStatus('sending');

    try {
      const res = await fetch(`https://formspree.io/f/${formId}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
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

        <button type="submit" className="btn-send" disabled={status === 'sending'}>
          {status === 'sending' ? '傳送中…' : '送出訊息'}
        </button>

        {status === 'success' && (
          <p className="form-success">感謝您的來信！我們將盡快與您聯繫。</p>
        )}
        {status === 'error' && (
          <p className="form-error">傳送失敗，請稍後再試或直接聯繫 Facebook。</p>
        )}
      </form>
    </div>
  );
}
