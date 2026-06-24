import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';
const UPGRADED_PUBLIC_PAGES = [
  'index.html',
  'blog.html',
  'post.html',
  'moments.html',
  'bookmarks.html',
  'rss.html',
  'acg.html',
  'anime.html',
  'manga.html',
  'edits.html',
  'about.html',
  '404.html'
];

function readProjectFile(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('core public pages ui shell', () => {
  it('defines the shared shell selectors in the stylesheet', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('.public-shell');
    expect(css).toContain('.public-shell--floating-nav');
    expect(css).toContain('.section-shell');
    expect(css).toContain('.editorial-kicker');
    expect(css).toContain('.editorial-heading');
    expect(css).toContain('.glass-summary-grid');
    expect(css).toContain('.utility-glass-bar');
    expect(css).toContain('.reading-surface');
    expect(css).toContain('.editorial-stack');
    expect(css).toContain('.insight-grid');
    expect(css).toContain('.sidebar-stack');
    expect(css).toContain('.workbench-pane');
    expect(css).toContain('.layout-safe-top');
    expect(css).toContain('.layout-flow-section');
    expect(css).toContain('.layout-toolbar-wrap');
    expect(css).toContain('.layout-grid-stable');
    expect(css).toContain('.layout-overflow-guard');
    expect(css).toContain('.homepage-hero-title');
    expect(css).toContain('.homepage-hero-subtitle');
    expect(css).toContain('.homepage-hero-mark');
    expect(css).toContain('.homepage-hero-glow');
    expect(css).toContain('.homepage-hero-accent');
    expect(css).toContain('.homepage-cover-stage');
    expect(css).toContain('.homepage-cover-content');
    expect(css).toContain('.homepage-cover-footer');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the homepage as a strict single-screen cover', () => {
    const html = readProjectFile('index.html');

    expect(html).toContain('data-ui-shell="home-cover"');
    expect(html).toContain('data-ui-shell="home-hero"');
    expect(html).toContain('data-ui-region="home-stage"');
    expect(html).toContain('data-ui-region="home-footer"');
    expect(html).toContain('data-ui-region="home-nav-shell"');
    expect(html).toContain('min-h-screen');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('homepage-cover-stage');
    expect(html).toContain('homepage-cover-nav-shell');
    expect(html).toContain('homepage-cover-nav-actions');
    expect(html).toContain('homepage-mobile-menu-link');
    expect(html).toContain('margin: 0;');
    expect(html).toContain('overflow: hidden;');
    expect(html.includes('homepage-cover-footer absolute')).toBe(false);
    expect(html).toContain('w-28 h-28 sm:w-32 sm:h-32');

    expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
    expect(html.includes('Content Gateway')).toBe(false);
  });

  it('adds the post reading shell and sidebar markers', () => {
    const html = readProjectFile('post.html');

    expect(html).toContain('data-ui-shell="post-reading"');
    expect(html).toContain('data-ui-panel="post-sidebar"');
    expect(html).toContain('data-ui-group="post-outline"');
    expect(html).toContain('data-ui-group="post-related"');
    expect(html).toContain('reading-surface');
  });

  it('adds shared hooks to moments, bookmarks, and rss pages', () => {
    const moments = readProjectFile('moments.html');
    const bookmarks = readProjectFile('bookmarks.html');
    const rss = readProjectFile('rss.html');

    expect(moments).toContain('data-ui-toolbar="moments-filter"');
    expect(moments).toContain('data-ui-section="moments-gallery"');
    expect(moments).toContain('data-ui-section="moments-insights"');
    expect(moments).toContain('data-ui-panel="moments-heatmap"');

    expect(bookmarks).toContain('data-ui-section="bookmarks-curated"');
    expect(bookmarks).toContain('data-ui-toolbar="bookmarks-discovery"');
    expect(bookmarks).toContain('data-ui-toolbar="bookmarks-search"');
    expect(bookmarks).toContain('data-ui-panel="bookmarks-categories"');

    expect(rss).toContain('data-ui-shell="rss-workbench"');
    expect(rss).toContain('data-ui-panel="rss-empty-state"');
    expect(rss).toContain('data-ui-panel="rss-sources"');
    expect(rss).toContain('data-ui-panel="rss-inbox"');
    expect(rss).toContain('data-ui-panel="rss-reader"');
  });

  it('adds shared hooks to acg, anime, manga, edits, about, and 404 pages', () => {
    const acg = readProjectFile('acg.html');
    const anime = readProjectFile('anime.html');
    const manga = readProjectFile('manga.html');
    const edits = readProjectFile('edits.html');
    const about = readProjectFile('about.html');
    const notFound = readProjectFile('404.html');

    // Each page only needs one lightweight structural shell plus one focused UI marker.
    expect(acg).toContain('data-ui-shell="acg-hub"');
    expect(acg).toContain('data-ui-toolbar="acg-overview"');
    expect(acg).toContain('data-ui-section="acg-video-spotlight"');

    expect(anime).toContain('data-ui-shell="anime-library"');
    expect(anime).toContain('data-ui-toolbar="anime-filters"');
    expect(anime).toContain('data-ui-section="anime-library-grid"');

    expect(manga).toContain('data-ui-shell="manga-library"');
    expect(manga).toContain('data-ui-toolbar="manga-filters"');
    expect(manga).toContain('data-ui-section="manga-library-grid"');

    expect(edits).toContain('data-ui-shell="edits-gallery"');
    expect(edits).toContain('data-ui-toolbar="edits-categories"');
    expect(edits).toContain('data-ui-section="edits-grid"');

    expect(about).toContain('data-ui-shell="about-story"');
    expect(about).toContain('data-ui-section="about-intro"');
    expect(about).toContain('data-ui-panel="about-signals"');

    expect(notFound).toContain('data-ui-shell="error-playground"');
    expect(notFound).toContain('data-ui-panel="error-game"');
    expect(notFound).toContain('data-ui-panel="error-actions"');
  });

  it('uses localized loading copy on the upgraded core pages', () => {
    for (const page of UPGRADED_PUBLIC_PAGES) {
      const html = readProjectFile(page);
      expect(html.includes('Loading...')).toBe(false);
    }
  });

  it('uses shared layout shells on all public pages that were upgraded', () => {
    const index = readProjectFile('index.html');
    const blog = readProjectFile('blog.html');
    const moments = readProjectFile('moments.html');
    const bookmarks = readProjectFile('bookmarks.html');
    const rss = readProjectFile('rss.html');
    const post = readProjectFile('post.html');
    const acg = readProjectFile('acg.html');
    const anime = readProjectFile('anime.html');
    const manga = readProjectFile('manga.html');
    const edits = readProjectFile('edits.html');
    const about = readProjectFile('about.html');
    const notFound = readProjectFile('404.html');

    expect(acg).toContain('class="public-footer');
    expect(anime).toContain('class="public-footer');
    expect(manga).toContain('class="public-footer');
    expect(edits).toContain('class="public-footer');
    expect(about).toContain('class="public-footer');
    expect(notFound).toContain('class="public-footer');
    expect(acg).toContain('public-footer__inner');
    expect(anime).toContain('public-footer__inner');
    expect(manga).toContain('public-footer__inner');
    expect(edits).toContain('public-footer__inner');
    expect(notFound).toContain('public-footer__inner');
    expect(acg).toContain('layout-safe-top');
    expect(anime).toContain('layout-safe-top');
    expect(manga).toContain('layout-safe-top');
    expect(edits).toContain('layout-safe-top');
    expect(anime).toContain('layout-toolbar-wrap');
    expect(manga).toContain('layout-toolbar-wrap');
    expect(edits).toContain('layout-overflow-guard');
    expect(edits).toContain('layout-grid-stable');
    expect(notFound).toContain('layout-safe-top');
    expect(about).toContain('layout-safe-top');
    expect(about).toContain('layout-flow-section');

    expect(acg).toContain('data-ui-shell="acg-hub"');
    expect(anime).toContain('data-ui-toolbar="anime-filters"');
    expect(manga).toContain('data-ui-toolbar="manga-filters"');
    expect(edits).toContain('data-ui-toolbar="edits-categories"');
    expect(about).toContain('data-ui-shell="about-story"');
    expect(notFound).toContain('data-ui-shell="error-playground"');
    expect(index).toContain('layout-safe-top');
    expect(blog).toContain('layout-toolbar-wrap');
    expect(moments).toContain('layout-safe-top');
    expect(moments).toContain('layout-overflow-guard');
    expect(bookmarks).toContain('layout-safe-top');
    expect(bookmarks).toContain('layout-flow-section');
    expect(rss).toContain('layout-overflow-guard');
    expect(rss).toContain('layout-safe-top');
    expect(post).toContain('layout-safe-top');
    expect(post).toContain('layout-overflow-guard');
  });

  it('keeps English loading placeholders out of all public pages', () => {
    const pages = [
      'index.html',
      'blog.html',
      'post.html',
      'moments.html',
      'bookmarks.html',
      'rss.html',
      'acg.html',
      'anime.html',
      'manga.html',
      'edits.html',
      'about.html',
      '404.html'
    ];

    for (const page of pages) {
      const html = readProjectFile(page);
      expect(html.includes('Loading...')).toBe(false);
    }
  });

  it('keeps the homepage background unified and free from gateway copy', () => {
    const html = readProjectFile('index.html');
    const css = readProjectFile('css/style.css');

    expect(html.includes('Content Gateway')).toBe(false);
    expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
    expect(css).toContain('.homepage-cover-stage');
    expect(css).toContain('.homepage-cover-content');
    expect(css).toContain('.homepage-cover-footer');
    expect(css).toContain('.homepage-cover-nav-shell');
    expect(css).toContain('.homepage-cover-nav-actions');
    expect(css).toContain('.homepage-mobile-menu-link');
    expect(css).toContain('.homepage-mobile-menu-link > [data-lucide]');
    expect(css).toContain('.homepage-hero-mark > img');
    expect(css).toContain('.homepage-cover-stage-overlay');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui .homepage-cover-nav-shell');
    expect(css).toContain('rgba(244, 248, 255, 0.9)');
    expect(css).toContain('rgba(239, 246, 255, 0.9)');
    expect(css).toContain('0 20px 44px rgba(2, 8, 23, 0.34)');
    expect(css).toContain('.dark body.public-page.liquid-glass-ui #mobile-menu');
    expect(css).toContain('.dark body.public-page.liquid-glass-ui .homepage-mobile-menu-link');
    expect(css).toContain('.dark body.public-page.liquid-glass-ui .homepage-cover-footer');
    expect(html).toContain('homepage-cover-stage-overlay');
  });

  it('preserves navbar and mobile menu positioning in the shared shell', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toMatch(/body\.public-page\.liquid-glass-ui #navbar \{[\s\S]*?position: fixed;[\s\S]*?overflow: visible;/);
    expect(css).toMatch(/body\.public-page\.liquid-glass-ui #mobile-menu \{[\s\S]*?position: absolute;/);
    expect(css).toMatch(/body\.public-page\.liquid-glass-ui\.homepage-cover-page #navbar::before,[\s\S]*?content: none;/);
    expect(css).toMatch(/body\.public-page\.liquid-glass-ui\.homepage-cover-page #navbar::after \{[\s\S]*?content: none;/);
  });

  it('uses the approved public navigation names and removes the old video label', () => {
    const pages = [
      'index.html',
      'blog.html',
      'post.html',
      'moments.html',
      'bookmarks.html',
      'rss.html',
      'acg.html',
      'anime.html',
      'manga.html',
      'edits.html',
      'about.html',
      '404.html'
    ];

    for (const page of pages) {
      const html = readProjectFile(page);

      expect(html).toContain('title="首页"');
      expect(html).toContain('title="笔记"');
      expect(html).toContain('title="片刻"');
      expect(html).toContain('title="收藏"');
      expect(html).toContain('title="订阅"');
      expect(html).toContain('title="ACG"');
      expect(html).toContain('title="关于"');
      expect(html.includes('title="视频"')).toBe(false);
      expect(html.includes('>视频<')).toBe(false);
    }
  });

  it('defines stronger shared liquid-glass navigation selectors', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('.public-page.liquid-glass-ui #navbar .nav-link');
    expect(css).toContain('.public-page.liquid-glass-ui #navbar .nav-link::before');
    expect(css).toContain('.public-page.liquid-glass-ui #navbar .nav-link[aria-current="page"]');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui #navbar .nav-link');
    expect(css).toContain('.dark body.public-page.liquid-glass-ui #navbar .nav-link');
  });

  it('removes the redundant blog discovery panel and keeps a focused blog toolbar', () => {
    const html = readProjectFile('blog.html');

    expect(html.includes('data-ui-toolbar="blog-discovery"')).toBe(false);
    expect(html.includes('data-ui-section="blog-highlights"')).toBe(false);
    expect(html).toContain('data-ui-toolbar="blog-controls"');
    expect(html).toContain('data-ui-shell="blog-nav"');
    expect(html).toContain('data-ui-shell="blog-hero"');
    expect(html).toContain('data-ui-shell="blog-footer"');
  });

  it('defines blog-scoped navigation, card, and footer refinement selectors', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] #navbar');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell .glass-pill');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"]');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"] + div');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell .view-btn.active');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-footer"]');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell');
  });

  // Lock the next blog unification step as a red contract before implementation lands.
  it('defines homepage-style navigation and restrained blog controls', () => {
    const html = readProjectFile('blog.html');
    const css = readProjectFile('css/style.css');

    expect(html).toContain('title="首页"');
    expect(html).toContain('title="笔记"');
    expect(html).toContain('aria-label="查看文章与记录"');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] #navbar');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .glass-pill');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .pagination-btn');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card .aspect-video');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .public-footer');
  });

  it('matches the homepage icon nav and tightens the blog ending spacing', () => {
    const html = readProjectFile('blog.html');
    const css = readProjectFile('css/style.css');

    expect(html).toContain('title="笔记" aria-label="查看文章与记录" aria-current="page">\n                        <i data-lucide="file-text" class="w-5 h-5"></i>');
    expect(html).not.toContain('id="pagination-container" class="mt-12 flex justify-center"');
    expect(html).not.toContain('public-footer text-gray-600 dark:text-gray-400 py-8 relative z-10');
    expect(html).not.toContain('public-footer__inner px-4 flex flex-col md:flex-row justify-center items-center gap-4');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] #pagination-container {');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .public-footer__inner,');
  });

  it('stops stretching the blog page with hero, post grid, and body min-height fallbacks', () => {
    const html = readProjectFile('blog.html');
    const css = readProjectFile('css/style.css');

    expect(html).not.toContain('min-h-[24vh]');
    expect(html).not.toContain('min-h-[50vh]');
    expect(css).not.toContain('min-height: 100dvh;');
  });

  // Lock the restrained blog-page continuity contract before CSS cleanup.
  it('defines restrained blog-page continuity selectors instead of extra shell patches', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"]');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"] + div');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-toolbar="blog-controls"] .group > .absolute.-inset-1');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-footer"]');
    expect(css).not.toContain('body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"]::before');
  });

  it('removes noisy blog-specific utility classes that fight the restrained layout', () => {
    const html = readProjectFile('blog.html');
    const css = readProjectFile('css/style.css');

    expect(html).not.toContain('utility-glass-bar rounded-[24px] p-4 sm:p-5 blog-toolbar-shell');
    expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell {');
    expect(css).toContain('max-width: min(32rem, 100%);');
    expect(css).toContain('background: transparent;');
    expect(css).not.toContain('margin-top: auto;');
  });

  it('keeps custom context menus fixed so hidden overlays do not stretch page height', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('body.public-page.liquid-glass-ui #custom-context-menu,');
    expect(css).toContain('body.public-page.liquid-glass-ui #context-menu {');
    expect(css).toContain('position: fixed !important;');
    expect(css).toContain('inset: auto auto auto auto;');
  });

  it('defines light-mode blog overrides so the page does not stay visually dark outside dark theme', () => {
    const css = readProjectFile('css/style.css');

    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] {');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"] .public-shell > div {');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] #search-input {');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell .glass-pill {');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card {');
    expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui[data-page="blog"] #pagination-container button {');
  });
});
