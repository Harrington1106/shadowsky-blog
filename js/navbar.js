/* ============================================================
   navbar.js — Unified Navbar Interactions
   Handles: scroll effects, mobile menu, theme toggle, active link
   ============================================================ */
(function() {
  'use strict';

  const navbar = document.getElementById('navbar');
  const mobileMenu = document.getElementById('mobile-menu');
  const hamburger = document.getElementById('nav-hamburger');
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
  const mobileCloseBtn = document.querySelector('.mobile-menu-close');

  function openMobileMenu() {
    mobileMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
    });

    // Close button
    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', closeMobileMenu);
    }

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
        hamburger.focus();
      }
    });
  }

  // ── Theme toggle ──
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    // Read saved preference
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      html.classList.remove('dark');
    } else if (saved === 'dark') {
      html.classList.add('dark');
    } // else: respect OS preference (default)

    themeToggle.addEventListener('click', () => {
      // 优先调用 main.js 的完整实现（含图标切换），回退到简单 toggle
      if (window.toggleTheme) {
        window.toggleTheme();
      } else {
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        window.dispatchEvent(new CustomEvent('themechange'));
      }
    });
  }

  // ── Active link detection ──
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar .nav-link, #mobile-menu .mobile-nav-link').forEach(link => {
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
