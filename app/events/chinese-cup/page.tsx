import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';

export const metadata: Metadata = {
  title: '第一屆中華盃全國羽球3對3錦標賽 — 線上報名 | 中華台北羽球3對3發展協會',
  description:
    '第一屆中華盃全國羽球3對3錦標賽，民國115年12月20日（星期日）於臺北體育館7樓羽球館舉行。設 A、B、C、D 四組，會員半價，人人有獎。立即線上報名！',
};

const FB_URL = 'https://www.facebook.com/share/16w8aQX2dy/';

const benefits = [
  {
    icon: '💰',
    title: '優惠報名費',
    desc: '協會會員享半價報名優惠，歡迎加入協會成為會員以享受更多賽事福利。',
  },
  {
    icon: '🛡️',
    title: '賽事保障',
    desc: '賽事提供完整保險保障，讓每位選手安心競技、全力發揮。',
  },
  {
    icon: '🎁',
    title: '人人有獎',
    desc: '所有參賽選手均可獲得精美紀念品，感謝每位選手的熱情參與。',
  },
  {
    icon: '🏆',
    title: '豐富獎品',
    desc: '各組冠、亞、季軍均有獨特獎項頒發，獎品豐厚，敬請期待！',
  },
];

const divisions = [
  { name: 'A 組', badge: '160+', score: '三人積分加總 ≥ 160', age: '每人年齡 ≥ 50 歲' },
  { name: 'B 組', badge: '200+', score: '三人積分加總 ≥ 200', age: '每人年齡 ≥ 55 歲' },
  { name: 'C 組', badge: '200+', score: '三人積分加總 ≥ 200', age: '每人年齡 ≥ 60 歲' },
  { name: 'D 組', badge: '210+', score: '三人積分加總 ≥ 210', age: '每人年齡 ≥ 60 歲' },
];

const FbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function ChineseCupPage() {
  return (
    <>
      <Navbar base="/" />

      {/* BREADCRUMB */}
      <div className="ev-breadcrumb">
        <a href="/">首頁</a>
        <span>›</span>
        <a href="/#events">賽事活動</a>
        <span>›</span>
        <span>第一屆中華盃全國錦標賽</span>
      </div>

      {/* HERO */}
      <section id="ev-hero">
        <div className="ev-hero-inner">
          <div className="ev-hero-text">
            <span className="section-label">全國錦標賽</span>
            <h1 className="ev-hero-title">第一屆中華盃<br />全國羽球3對3錦標賽</h1>
            <div className="section-divider" />
            <div className="ev-info-grid">
              <div className="ev-info-item">
                <span>📅</span>
                <div>
                  <div className="ev-info-label">比賽日期</div>
                  <div className="ev-info-val">民國115年12月20日（星期日）</div>
                </div>
              </div>
              <div className="ev-info-item">
                <span>📍</span>
                <div>
                  <div className="ev-info-label">比賽地點</div>
                  <div className="ev-info-val">臺北體育館 7樓羽球館</div>
                </div>
              </div>
              <div className="ev-info-item">
                <span>🏢</span>
                <div>
                  <div className="ev-info-label">主辦單位</div>
                  <div className="ev-info-val">中華台北羽球3對3發展協會</div>
                </div>
              </div>
              <div className="ev-info-item">
                <span>🏸</span>
                <div>
                  <div className="ev-info-label">賽制</div>
                  <div className="ev-info-val">3對3 羽球錦標賽（A / B / C / D 組）</div>
                </div>
              </div>
            </div>
            <a href="/login?callbackUrl=/events" className="btn-primary ev-register-btn">立即線上報名 →</a>
          </div>
          <div className="ev-hero-img">
            <img
              src="/images/33比賽.jpg"
              alt="第一屆中華盃全國羽球3對3錦標賽"
            />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="ev-benefits">
        <div className="ev-section-inner">
          <span className="section-label">參加優勢</span>
          <h2 className="section-title">參加本協會賽事優勢</h2>
          <div className="section-divider" />
          <div className="ev-benefits-grid">
            {benefits.map((b) => (
              <div key={b.title} className="ev-benefit-card">
                <div className="ev-benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVISIONS */}
      <section id="ev-divisions">
        <div className="ev-section-inner">
          <span className="section-label">組別規則</span>
          <h2 className="section-title">參賽分組規則</h2>
          <div className="section-divider" />
          <p className="section-desc" style={{ marginBottom: 28 }}>
            各組依三人隊齡積分加總及個人年齡分組競賽
          </p>
          <div className="ev-div-wrap">
            <table className="ev-div-table">
              <thead>
                <tr>
                  <th>組別</th>
                  <th>積分條件（隊齡計算）</th>
                  <th>年齡條件</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((d) => (
                  <tr key={d.name}>
                    <td>
                      <span className="ev-div-tag">{d.name}</span>
                      <span className="ev-div-badge">{d.badge}</span>
                    </td>
                    <td>{d.score}</td>
                    <td>{d.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ev-note">※ 分組資格以報名當日為基準，主辦單位保留最終解釋權。</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-social">
          <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="footer-fb">
            <FbIcon />
            Facebook
          </a>
        </div>
        <div className="footer-links">
          <a href="/">回首頁</a>
          <a href="/#events">賽事活動</a>
          <a href="/#contact">聯絡我們</a>
        </div>
        <p>
          <strong>中華台北羽球3對3發展協會</strong><br />
          CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION<br />
          台北市文山區光輝路80號 ｜ 立案日期：中華民國115年1月16日<br />
          &copy; 2026 中華台北羽球3對3發展協會 版權所有
        </p>
      </footer>
    </>
  );
}
