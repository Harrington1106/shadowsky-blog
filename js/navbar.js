/* ============================================================
   navbar.js — Unified Navbar Interactions
   Handles: scroll effects, mobile menu, theme toggle, active link
   ============================================================ */
(function() {
  'use strict';

  const navbar = document.getElementById('navbar');
  const mobileMenu = document.getElementById('mobile-menu');
  const hamburger = document.getElementById('nav-hamburger');
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  if (!navbar) return;

  // ── Scroll effect ──
  let lastScroll = 0;
  function onScroll() {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 10);
    lastScroll = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // init

  // ── Mobile menu ──
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.focus();
      }
    });
  }

  // ── Theme toggle ──
  if (themeToggle) {
    // Read saved preference
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      html.classList.remove('dark');
    } else if (saved === 'dark') {
      html.classList.add('dark');
    } // else: respect OS preference (default)

    themeToggle.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('themechange'));   // 通知流体引擎
    });
  }

  // ── Active link detection ──
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar .nav-link, #mobile-menu .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.split('/').pop();
    if (linkPath === currentPath || 
        (currentPath === '' && linkPath === 'index.html') ||
        (currentPath === '/' && linkPath === 'index.html')) {
      link.classList.add('active');
    }
  });

})();
