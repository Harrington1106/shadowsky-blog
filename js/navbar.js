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
  // 全站统一：用 onclick 属性（非 addEventListener），允许各页面覆盖
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    // Read saved preference (init)
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      html.classList.remove('dark');
    } else if (saved === 'dark') {
      html.classList.add('dark');
    } // else: respect OS preference (default)

    // 用 onclick 属性 — 单处理器，可被页面脚本覆盖（如 moments.html）
    themeToggle.onclick = function(e) {
      e && e.preventDefault && e.preventDefault();
      const isDark = !html.classList.contains('dark');
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('themechange'));
      window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark } }));
      if (window.lucide) window.lucide.createIcons();
    };
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

  // ── 滑动激活指示 pill（液态玻璃透镜，跟随 hover/激活项）──
  const navLinks = navbar.querySelector('.nav-links');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (navLinks) {
    const pill = document.createElement('span');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    pill.style.opacity = '0';
    navLinks.insertBefore(pill, navLinks.firstChild);

    /** 将 pill 移动到指定链接位置（instant=true 时无动画，用于初始化/resize） */
    function movePillTo(link, instant) {
      if (!link) { pill.style.opacity = '0'; return; }
      const x = link.offsetLeft;
      const w = link.offsetWidth;
      if (instant) {
        pill.style.transition = 'none';
        // 强制 reflow 后再恢复过渡，保证下一次移动仍有弹簧动画
        pill.style.transform = `translate(${x}px, -50%)`;
        pill.style.width = w + 'px';
        pill.getBoundingClientRect();
        pill.style.transition = '';
      } else {
        pill.style.transform = `translate(${x}px, -50%)`;
        pill.style.width = w + 'px';
      }
      pill.style.opacity = '1';
    }

    function activeLink() {
      return navLinks.querySelector('.nav-link.active') || null;
    }

    // 初始化：等图标字体/lucide 布局稳定后定位（静止于当前页项，不跟随 hover）
    requestAnimationFrame(() => movePillTo(activeLink(), true));

    window.addEventListener('resize', () => movePillTo(activeLink(), true));
  }

  // ── 光标跟随镜面高光（--mx/--my 驱动 ::after 径向渐变）──
  if (!prefersReducedMotion.matches && window.matchMedia('(pointer: fine)').matches) {
    let rafId = null;
    navbar.addEventListener('pointermove', (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const rect = navbar.getBoundingClientRect();
        navbar.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
        navbar.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
        rafId = null;
      });
    });
    navbar.addEventListener('pointerleave', () => {
      navbar.style.setProperty('--mx', '50%');
      navbar.style.setProperty('--my', '-30%');
    });
  }

})();
