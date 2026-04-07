import Navbar from './components/Navbar';
import ContactForm from './components/ContactForm';

const FB_URL = 'https://www.facebook.com/share/16w8aQX2dy/';

const missions = [
  {
    num: '01',
    title: '理念宣導',
    desc: '宣導羽球3對3項目之理念與內涵，讓更多人認識並了解這項創新競賽形式的精神與價值。',
  },
  {
    num: '02',
    title: '促進發展',
    desc: '積極促進羽球3對3項目在全台灣的普及與發展，建立健全的運動生態。',
  },
  {
    num: '03',
    title: '制度規範',
    desc: '建立各種羽球3對3項目研習規劃，訂定比賽制度與規範，確保賽事公平公正進行。',
  },
  {
    num: '04',
    title: '課程與賽事',
    desc: '辦理各項羽球3對3課程、相關活動及比賽，培訓中老年人參與各類羽球3對3項目。',
  },
  {
    num: '05',
    title: '出版與培訓',
    desc: '出版羽球3對3書籍與相關教材，培訓專業的羽球3對3裁判與教練人才。',
  },
  {
    num: '06',
    title: '會務推動',
    desc: '其他有關本會宗旨之發揚與會務推動事項，持續精進協會各項服務與發展目標。',
  },
];

const assocInfo = [
  { icon: '🏛️', label: '協會全名', value: '中華台北羽球3對3發展協會' },
  { icon: '🌐', label: '英文名稱', value: 'CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION' },
  { icon: '📅', label: '成立日期', value: '中華民國115年1月16日（2026年）' },
  { icon: '📍', label: '會址',     value: '台北市文山區光輝路80號' },
  { icon: '📜', label: '主管機關', value: '內政部（全國性人民團體）' },
  {
    icon: '📘',
    label: '官方 Facebook',
    value: (
      <a href={FB_URL} target="_blank" rel="noopener noreferrer">
        facebook.com — 中華台北羽球3對3發展協會
      </a>
    ),
  },
];

const FbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ===== HERO ===== */}
      <section id="hero">
        <div className="hero-content">
          <img src="/images/3v3.jpg" alt="協會Logo" className="hero-logo" width={180} height={180} />
          <p className="hero-en-title">CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION</p>
          <h1 className="hero-zh-title">
            中華台北羽球<br />3對3發展協會
          </h1>
          <span className="hero-badge">TAIWAN ★ 3V3 BADMINTON</span>
          <p className="hero-desc">
            推動羽球3對3項目的發展與普及，致力於辦理比賽、培訓人才，
            讓更多中老年人享受羽球3對3的樂趣與健康。
          </p>
          <div className="hero-btns">
            <a href="#mission" className="btn-primary">了解協會宗旨</a>
            <a href="#contact" className="btn-outline">聯絡我們</a>
          </div>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span>SCROLL</span>
          <div className="hero-scroll-arrow" />
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about">
        <div className="about-grid">
          <div className="about-text">
            <span className="section-label">About Us</span>
            <h2 className="section-title">關於協會</h2>
            <div className="section-divider" />
            <p className="section-desc">
              中華台北羽球3對3發展協會於中華民國115年（2026年）1月16日正式立案，
              是國內首個專注推廣羽球3對3項目的全國性社會團體，總部設於台北市文山區。
            </p>
            <p className="section-desc" style={{ marginTop: 14 }}>
              協會依法立案，受內政部監督，致力於透過賽事推廣、教練培訓、
              教材出版等多元方式，建立完善的羽球3對3競賽體系，
              讓這項充滿活力的運動在台灣生根發展。
            </p>
            <div className="about-stats">
              <div className="stat-card">
                <div className="stat-num">3V3</div>
                <div className="stat-label">創新賽制</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">115</div>
                <div className="stat-label">立案年份</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">6</div>
                <div className="stat-label">核心任務</div>
              </div>
            </div>
          </div>

          <div className="about-image-wrap">
            <img src="/images/fb.jpg" alt="2025迪飛盃 三對三羽球錦標賽" width={560} height={420} />
            <div className="cert-badge">
              <img src="/images/33.jpg" alt="立案證書" width={56} height={70} />
              <div>
                <div className="cert-badge-t1">內政部立案認可</div>
                <div className="cert-badge-t2">全國性人民團體</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MISSION ===== */}
      <section id="mission">
        <div className="mission-inner">
          <div className="mission-header">
            <span className="section-label">Our Mission</span>
            <h2 className="section-title">協會宗旨</h2>
            <div className="section-divider" />
            <p className="section-desc">本會之任務如下，並依相關法令規定推動及執行</p>
          </div>
          <div className="mission-grid">
            {missions.map((m) => (
              <div key={m.num} className="mission-card">
                <div className="mission-num">{m.num}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ASSOCIATION ===== */}
      <section id="association">
        <div className="assoc-inner">
          <div className="assoc-layout">
            <div>
              <span className="section-label">Association Info</span>
              <h2 className="section-title">協會介紹</h2>
              <div className="section-divider" />
              <p className="section-desc">
                中華台北羽球3對3發展協會是由一群熱愛羽球運動的人士共同創立，
                以推廣「3對3」這個充滿活力與團隊合作精神的新興羽球賽制為核心使命。
              </p>
              <div className="assoc-info-list">
                {assocInfo.map((item) => (
                  <div key={item.label} className="info-row">
                    <div className="info-icon">{item.icon}</div>
                    <div>
                      <div className="info-label">{item.label}</div>
                      <div className="info-value">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="assoc-cert">
              <img src="/images/33.jpg" alt="內政部立案證書" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== EVENTS ===== */}
      <section id="events">
        <div className="events-inner">
          <div className="events-header">
            <div>
              <span className="section-label">Events &amp; Activities</span>
              <h2 className="section-title">賽事活動</h2>
              <div className="section-divider" />
            </div>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
              查看更多活動
            </a>
          </div>

          <div className="event-card">
            <div className="event-img">
              <img src="/images/fb.jpg" alt="2025迪飛盃 三對三羽球錦標賽" width={240} height={200} />
            </div>
            <div className="event-body">
              <span className="event-tag">錦標賽</span>
              <h3>2025迪飛盃 三對三羽球錦標賽 四季聯賽</h3>
              <p>
                本次四季聯賽涵蓋春、夏、秋、冬四季共四場賽事，分別於
                114年3月29日、6月21日、9月、12月舉行。賽事旨在推廣3對3羽球競賽，
                提供各年齡層選手切磋技藝的平台，培養中老年人參與羽球運動的興趣。
              </p>
              <div className="event-meta">
                <span>📅 114年（2025年）全年</span>
                <span>📍 台中市</span>
                <span>🏸 3對3 羽球錦標賽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact">
        <div className="contact-inner">
          <div>
            <span className="section-label">Contact Us</span>
            <h2 className="section-title">聯絡我們</h2>
            <div className="section-divider" />
            <p className="section-desc">
              有任何疑問、加入協會、賽事報名或合作洽詢，
              歡迎透過以下方式與我們聯繫。
            </p>
            <div className="contact-items">
              <div className="contact-item">
                <div className="contact-icon">📍</div>
                <div>
                  <div className="contact-label">會址</div>
                  <div className="contact-value">台北市文山區光輝路80號</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">📘</div>
                <div>
                  <div className="contact-label">Facebook 粉絲專頁</div>
                  <div className="contact-value">
                    <a href={FB_URL} target="_blank" rel="noopener noreferrer">
                      中華台北羽球3對3發展協會
                    </a>
                  </div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">📅</div>
                <div>
                  <div className="contact-label">辦公時間</div>
                  <div className="contact-value">週一至週五 09:00 – 17:00</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">🏛️</div>
                <div>
                  <div className="contact-label">主管機關</div>
                  <div className="contact-value">內政部 — 全國性人民團體立案</div>
                </div>
              </div>
            </div>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="social-btn">
              <FbIcon />
              追蹤我們的 Facebook
            </a>
          </div>

          <ContactForm />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="footer-social">
          <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="footer-fb">
            <FbIcon />
            Facebook
          </a>
        </div>
        <div className="footer-links">
          <a href="#about">關於協會</a>
          <a href="#mission">協會宗旨</a>
          <a href="#association">協會介紹</a>
          <a href="#events">賽事活動</a>
          <a href="#contact">聯絡我們</a>
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
