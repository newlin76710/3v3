'use client';

import { FormEvent, useState } from 'react';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function RegisterForm() {
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

  if (status === 'success') {
    return (
      <div className="reg-success">
        <div className="reg-success-icon">✅</div>
        <h3>報名成功！</h3>
        <p>感謝您的報名！我們將於 3 個工作天內與您聯繫確認報名詳情。</p>
        <button onClick={() => setStatus('idle')} className="btn-primary">再次報名</button>
      </div>
    );
  }

  return (
    <div className="reg-form-wrap">
      <form onSubmit={handleSubmit} className="reg-form">
        <input type="hidden" name="subject" value="【第一屆中華盃】全國羽球3對3錦標賽 — 線上報名" />

        <div className="reg-form-row">
          <div className="form-group">
            <label htmlFor="captain-name">隊長姓名 *</label>
            <input id="captain-name" name="隊長姓名" type="text" placeholder="請輸入隊長姓名" required />
          </div>
          <div className="form-group">
            <label htmlFor="team-name">隊伍名稱 *</label>
            <input id="team-name" name="隊伍名稱" type="text" placeholder="請輸入隊伍名稱" required />
          </div>
        </div>

        <div className="reg-form-row">
          <div className="form-group">
            <label htmlFor="member2">隊員 2 姓名 *</label>
            <input id="member2" name="隊員2姓名" type="text" placeholder="請輸入隊員 2 姓名" required />
          </div>
          <div className="form-group">
            <label htmlFor="member3">隊員 3 姓名 *</label>
            <input id="member3" name="隊員3姓名" type="text" placeholder="請輸入隊員 3 姓名" required />
          </div>
        </div>

        <div className="reg-form-row">
          <div className="form-group">
            <label htmlFor="phone">聯絡電話 *</label>
            <input id="phone" name="聯絡電話" type="tel" placeholder="請輸入手機號碼" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input id="email" name="email" type="email" placeholder="請輸入電子信箱" required />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="division">參賽組別 *</label>
          <select id="division" name="參賽組別" required>
            <option value="">請選擇組別</option>
            <option value="A組（積分≥160，每人≥50歲）">A 組（三人積分加總 ≥ 160，每人年齡 ≥ 50 歲）</option>
            <option value="B組（積分≥200，每人≥55歲）">B 組（三人積分加總 ≥ 200，每人年齡 ≥ 55 歲）</option>
            <option value="C組（積分≥200，每人≥60歲）">C 組（三人積分加總 ≥ 200，每人年齡 ≥ 60 歲）</option>
            <option value="D組（積分≥210，每人≥60歲）">D 組（三人積分加總 ≥ 210，每人年齡 ≥ 60 歲）</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">備註（選填）</label>
          <textarea id="notes" name="備註" placeholder="如有特殊需求或問題，請在此填寫…" />
        </div>

        <button type="submit" className="btn-send reg-submit" disabled={status === 'sending'}>
          {status === 'sending' ? '提交中…' : '確認報名 →'}
        </button>

        {status === 'error' && (
          <p className="form-error">提交失敗，請稍後再試或透過 Facebook 聯繫我們。</p>
        )}
      </form>
    </div>
  );
}
