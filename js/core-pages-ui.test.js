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
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the homepage as a single premium hero shell', () => {
    const html = readProjectFile('index.html');

    expect(html).toContain('data-ui-shell="home-hero"');
    expect(html).toContain('data-ui-group="hero-identity"');
    expect(html).toContain('data-ui-copy="hero-subtitle"');
    expect(html).toContain('class="public-footer');
    expect(html).toContain('id="typing-text"');
    expect(html).toContain('id="visit-count"');
    expect(html).toContain('layout-safe-top');

    expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
    expect(html.includes('data-ui-card="home-feature"')).toBe(false);
    expect(html.includes('data-ui-panel="home-overview"')).toBe(false);
    expect(html.includes('data-ui-stat="home-signal"')).toBe(false);
    expect(html.includes('Content Gateway')).toBe(false);
    expect(html.includes('从这里进入我的内容宇宙')).toBe(false);
    expect(html.includes('#00后')).toBe(false);
    expect(html.includes('#UP主')).toBe(false);
  });

  it('adds the blog discovery toolbar and summary section', () => {
    const html = readProjectFile('blog.html');

    expect(html).toContain('data-ui-section="blog-highlights"');
    expect(html).toContain('data-ui-toolbar="blog-discovery"');
    expect(html).toContain('data-ui-toolbar="blog-controls"');
    expect(html).toContain('data-ui-panel="blog-summary-grid"');
    expect(html).toContain('editorial-kicker');
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
});
