'use client';

import { useEffect, useState } from 'react';

const FB_URL = 'https://www.facebook.com/share/16w8aQX2dy/';

const navItems = [
  { href: '#about',       label: '關於協會' },
  { href: '#mission',     label: '協會宗旨' },
  { href: '#association', label: '協會介紹' },
  { href: '#events',      label: '賽事活動' },
  { href: '#contact',     label: '聯絡我們' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('section[id]');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { threshold: 0.4 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
      <a href="#hero" className="nav-brand">
        <img src="/images/3v3.jpg" alt="協會Logo" width={46} height={46} />
        <div>
          <span className="nav-brand-en">CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION</span>
          <span className="nav-brand-zh">中華台北羽球3對3發展協會</span>
        </div>
      </a>

      <div className={`nav-links${open ? ' open' : ''}`} id="navLinks">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={active === item.href.slice(1) ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}
        <a
          href={FB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fb-link"
          onClick={() => setOpen(false)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </a>
      </div>

      <button className="hamburger" aria-label="選單" onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
    </nav>
  );
}
