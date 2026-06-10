# Core Public Pages UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the six core public pages into a content-first, editorial layout with controlled liquid-glass elements while keeping existing page logic intact.

**Architecture:** Consolidate the design system in `css/style.css`, then update each page’s HTML structure in small batches that preserve existing IDs and JS hooks. Verify structure with DOM-based Vitest checks and keep visual polish focused on navigation, toolbars, summary cards, and overlays instead of正文阅读区.

**Tech Stack:** Static HTML pages, shared CSS, minimal JS (`js/main.js`), Vitest + JSDOM style/markup verification

---

## File Map

### Shared style and behavior
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
  - Add editorial spacing utilities, floating shell navigation refinements, shared section heading styles, glass summary cards, page-specific core layout helpers, and reduced-motion rules.
- Modify: `d:\Projects\shadowsky-blog\js\main.js`
  - Only if needed to preserve mobile menu, active nav, or scroll shell behavior after class updates.

### Core pages
- Modify: `d:\Projects\shadowsky-blog\index.html`
  - Add content gateway section under the hero and align hero chrome with the new shell.
- Modify: `d:\Projects\shadowsky-blog\blog.html`
  - Add editorial summary band before the post list and upgrade the search/view toolbar.
- Modify: `d:\Projects\shadowsky-blog\post.html`
  - Stabilize reading layout, refine side rail, and keep正文区域 clean.
- Modify: `d:\Projects\shadowsky-blog\moments.html`
  - Move media grid higher in hierarchy and demote stats/heatmap to secondary sections.
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
  - Add curated entry strip and tighten search/category relationship.
- Modify: `d:\Projects\shadowsky-blog\rss.html`
  - Clarify three-column roles and improve empty/read states.

### Tests and docs
- Create: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - DOM and stylesheet assertions for shared shell classes and per-page editorial sections.
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - Update front-end structure/index notes for the new page sections and shared UI layer.

---

### Task 1: Add Failing UI Structure Tests

**Files:**
- Create: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const ROOT = 'd:/Projects/shadowsky-blog';

function readHtml(relativePath) {
  return readFileSync(`${ROOT}/${relativePath}`, 'utf8');
}

function getDocument(relativePath) {
  return new JSDOM(readHtml(relativePath)).window.document;
}

function readStyleSheet() {
  return readFileSync(`${ROOT}/css/style.css`, 'utf8');
}

describe('core public pages UI shell', () => {
  it('defines the new editorial shell selectors in the shared stylesheet', () => {
    const css = readStyleSheet();
    expect(css).toContain('.public-shell');
    expect(css).toContain('.section-shell');
    expect(css).toContain('.editorial-kicker');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('adds the homepage gateway section', () => {
    const document = getDocument('index.html');
    expect(document.querySelector('[data-ui-section="home-gateway"]')).not.toBeNull();
    expect(document.querySelector('[data-ui-card="home-feature"]')).not.toBeNull();
  });

  it('adds the blog summary band ahead of the posts container', () => {
    const document = getDocument('blog.html');
    expect(document.querySelector('[data-ui-section="blog-highlights"]')).not.toBeNull();
    expect(document.querySelector('[data-ui-toolbar="blog-discovery"]')).not.toBeNull();
  });

  it('adds the refined post reading shell markers', () => {
    const document = getDocument('post.html');
    expect(document.querySelector('[data-ui-shell="post-reading"]')).not.toBeNull();
    expect(document.querySelector('[data-ui-panel="post-sidebar"]')).not.toBeNull();
  });

  it('adds curated or editorial markers to the remaining core pages', () => {
    const moments = getDocument('moments.html');
    const bookmarks = getDocument('bookmarks.html');
    const rss = getDocument('rss.html');

    expect(moments.querySelector('[data-ui-section="moments-gallery"]')).not.toBeNull();
    expect(bookmarks.querySelector('[data-ui-section="bookmarks-curated"]')).not.toBeNull();
    expect(rss.querySelector('[data-ui-shell="rss-workbench"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because `core-pages-ui.test.js` does not exist yet or the new selectors/sections are missing.

- [ ] **Step 3: Write minimal implementation**

Create the file exactly as in Step 1.

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL on missing selectors like `.public-shell` and missing `data-ui-*` sections in the target HTML files.

- [ ] **Step 5: Commit**

```bash
git add js/core-pages-ui.test.js
git commit -m "test: add failing checks for core pages ui polish"
```

### Task 2: Build Shared Editorial + Glass Style Layer

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test with specific selector expectations**

Add these assertions inside `defines the new editorial shell selectors in the shared stylesheet`:

```js
expect(css).toContain('.public-shell--floating-nav');
expect(css).toContain('.glass-summary-grid');
expect(css).toContain('.editorial-heading');
expect(css).toContain('.reading-surface');
expect(css).toContain('.utility-glass-bar');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because the new shared selectors are not yet defined in `css/style.css`.

- [ ] **Step 3: Write minimal implementation**

Append a focused shared layer near the existing `Liquid Glass UI System For Public Pages` block in `css/style.css`:

```css
/* Editorial + Controlled Glass Enhancements For Core Public Pages */
body.public-page.liquid-glass-ui .public-shell {
  width: min(1280px, calc(100% - 1.5rem));
  margin-inline: auto;
}

body.public-page.liquid-glass-ui .public-shell--floating-nav {
  padding-top: 5.75rem;
}

body.public-page.liquid-glass-ui .section-shell {
  margin-top: clamp(2.5rem, 5vw, 4.5rem);
}

body.public-page.liquid-glass-ui .editorial-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border-soft);
  background: linear-gradient(135deg, var(--glass-bg-strong), var(--glass-bg));
  box-shadow: var(--glass-shadow-soft);
  color: var(--glass-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

body.public-page.liquid-glass-ui .editorial-heading {
  max-width: 44rem;
  text-wrap: balance;
}

body.public-page.liquid-glass-ui .glass-summary-grid {
  display: grid;
  gap: 1rem;
}

body.public-page.liquid-glass-ui .utility-glass-bar {
  border: 1px solid var(--glass-border-soft);
  background: linear-gradient(135deg, var(--glass-bg-strong), var(--glass-bg));
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-backdrop);
  -webkit-backdrop-filter: var(--glass-backdrop);
}

body.public-page.liquid-glass-ui .reading-surface {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.78);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.08);
}

.dark body.public-page.liquid-glass-ui .reading-surface {
  background: rgba(15, 23, 42, 0.86);
  border-color: rgba(71, 85, 105, 0.75);
  box-shadow: 0 30px 70px rgba(2, 8, 23, 0.34);
}

@media (prefers-reduced-motion: reduce) {
  body.public-page.liquid-glass-ui .nav-link,
  body.public-page.liquid-glass-ui .glass-card,
  body.public-page.liquid-glass-ui .view-btn {
    transition-duration: 0.01ms !important;
    transform: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: The stylesheet selector assertions pass, while page-section assertions still fail.

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/core-pages-ui.test.js
git commit -m "feat: add shared editorial glass style layer"
```

### Task 3: Rework `index.html` and `blog.html`

**Files:**
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test for concrete markup hooks**

Add these expectations:

```js
expect(document.querySelector('[data-ui-section="home-gateway"] .editorial-kicker')).not.toBeNull();
expect(document.querySelectorAll('[data-ui-card="home-feature"]').length).toBeGreaterThanOrEqual(4);
```

And inside the blog test:

```js
expect(document.querySelector('[data-ui-section="blog-highlights"] .editorial-kicker')).not.toBeNull();
expect(document.querySelector('[data-ui-toolbar="blog-discovery"]')).not.toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because `index.html` and `blog.html` do not yet contain the new editorial sections.

- [ ] **Step 3: Write minimal implementation**

In `index.html`, add a new section after the hero footer:

```html
<section class="public-shell section-shell" data-ui-section="home-gateway">
  <div class="text-center mb-8">
    <span class="editorial-kicker">Content Gateway</span>
    <h2 class="editorial-heading mx-auto mt-4 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
      从这里进入我的内容宇宙
    </h2>
  </div>
  <div class="glass-summary-grid md:grid-cols-2 xl:grid-cols-4">
    <a class="glass-card p-6" data-ui-card="home-feature" href="blog.html">...</a>
    <a class="glass-card p-6" data-ui-card="home-feature" href="moments.html">...</a>
    <a class="glass-card p-6" data-ui-card="home-feature" href="bookmarks.html">...</a>
    <a class="glass-card p-6" data-ui-card="home-feature" href="acg.html">...</a>
  </div>
</section>
```

In `blog.html`, insert a summary strip before `#posts-container`:

```html
<section class="section-shell" data-ui-section="blog-highlights">
  <div class="utility-glass-bar rounded-[28px] p-4 sm:p-6" data-ui-toolbar="blog-discovery">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <span class="editorial-kicker">Editorial Picks</span>
        <h2 class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">先从这些内容开始阅读</h2>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="glass-card p-4">精选专题</div>
        <div class="glass-card p-4">热门标签</div>
        <div class="glass-card p-4">最近更新</div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: Homepage and blog assertions pass; post/moments/bookmarks/rss assertions still fail.

- [ ] **Step 5: Commit**

```bash
git add index.html blog.html js/core-pages-ui.test.js
git commit -m "feat: add editorial gateway and blog discovery sections"
```

### Task 4: Rework `post.html`

**Files:**
- Modify: `d:\Projects\shadowsky-blog\post.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test for post layout hooks**

Add:

```js
expect(document.querySelector('[data-ui-shell="post-reading"] .reading-surface')).not.toBeNull();
expect(document.querySelector('[data-ui-panel="post-sidebar"]')).not.toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because `post.html` lacks the new reading shell and sidebar marker.

- [ ] **Step 3: Write minimal implementation**

Wrap the main article grid and side rail with the new hooks while preserving current IDs:

```html
<div class="public-shell public-shell--floating-nav" data-ui-shell="post-reading">
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
    <div class="lg:col-span-3">
      <div id="post-content" class="reading-surface rounded-[32px] px-6 py-8 md:px-10 md:py-10 prose md:prose-lg dark:prose-invert max-w-none">
        ...
      </div>
    </div>
    <aside class="hidden lg:block lg:col-span-1" data-ui-panel="post-sidebar">
      ...
    </aside>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: Post assertions pass; moments/bookmarks/rss assertions still fail.

- [ ] **Step 5: Commit**

```bash
git add post.html js/core-pages-ui.test.js
git commit -m "feat: refine post reading shell and sidebar"
```

### Task 5: Rework `moments.html`, `bookmarks.html`, and `rss.html`

**Files:**
- Modify: `d:\Projects\shadowsky-blog\moments.html`
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
- Modify: `d:\Projects\shadowsky-blog\rss.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test with final page hooks**

Replace the generic last test body with:

```js
expect(moments.querySelector('[data-ui-section="moments-gallery"]')).not.toBeNull();
expect(moments.querySelector('[data-ui-toolbar="moments-filter"]')).not.toBeNull();

expect(bookmarks.querySelector('[data-ui-section="bookmarks-curated"]')).not.toBeNull();
expect(bookmarks.querySelector('[data-ui-toolbar="bookmarks-discovery"]')).not.toBeNull();

expect(rss.querySelector('[data-ui-shell="rss-workbench"]')).not.toBeNull();
expect(rss.querySelector('[data-ui-panel="rss-empty-state"]')).not.toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because these hooks do not yet exist.

- [ ] **Step 3: Write minimal implementation**

In `moments.html`, mark the filter bar and gallery as first-class editorial sections:

```html
<div class="glass-toolbar utility-glass-bar ..." id="filter-bar" data-ui-toolbar="moments-filter">
  ...
</div>

<section class="section-shell" data-ui-section="moments-gallery">
  <div id="moments-grid" class="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
    ...
  </div>
</section>
```

In `bookmarks.html`, add a curated section between the search block and category nav:

```html
<section class="section-shell" data-ui-section="bookmarks-curated">
  <div class="utility-glass-bar rounded-[28px] p-4 sm:p-6" data-ui-toolbar="bookmarks-discovery">
    <span class="editorial-kicker">Curated Directory</span>
    <div class="glass-summary-grid lg:grid-cols-3 mt-4">
      <div class="glass-card p-4">高频工具</div>
      <div class="glass-card p-4">知识入口</div>
      <div class="glass-card p-4">最近新增</div>
    </div>
  </div>
</section>
```

In `rss.html`, mark the main frame and empty state:

```html
<div class="flex-1 flex pt-16 overflow-hidden relative animate-fade-in-up public-shell public-shell--floating-nav" data-ui-shell="rss-workbench">
  ...
  <div class="h-full flex flex-col items-center justify-center ..." data-ui-panel="rss-empty-state">
    ...
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: PASS for `core-pages-ui.test.js`.

- [ ] **Step 5: Commit**

```bash
git add moments.html bookmarks.html rss.html js/core-pages-ui.test.js
git commit -m "feat: polish moments bookmarks and rss layouts"
```

### Task 6: Update Shared Behavior, Copy Details, and Diagnostics

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\main.js`
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Modify: `d:\Projects\shadowsky-blog\post.html`
- Modify: `d:\Projects\shadowsky-blog\moments.html`
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
- Modify: `d:\Projects\shadowsky-blog\rss.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one failing test for consistent loading copy**

Add:

```js
it('uses localized loading copy on upgraded core pages', () => {
  const pages = ['index.html', 'blog.html', 'post.html', 'moments.html', 'bookmarks.html', 'rss.html'];
  for (const page of pages) {
    const html = readHtml(page);
    expect(html.includes('Loading...')).toBe(false);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL because multiple pages still contain `Loading...`.

- [ ] **Step 3: Write minimal implementation**

Replace visible loading copy in the six target pages with localized text:

```html
<span id="visit-count">加载中…</span>
```

And if `js/main.js` depends on exact text checks, update it to rely on element IDs/classes instead of literal English strings:

```js
// Keep behavior tied to DOM hooks rather than placeholder copy.
const visitCountEl = document.getElementById('visit-count');
if (visitCountEl) {
  visitCountEl.textContent = formattedText;
}
```

- [ ] **Step 4: Run tests and diagnostics**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js d:/Projects/shadowsky-blog/js/blog.test.js d:/Projects/shadowsky-blog/js/main.test.js
```

Then inspect recently edited files with diagnostics.

Expected: All targeted tests PASS and edited files have no new straightforward diagnostics.

- [ ] **Step 5: Commit**

```bash
git add js/main.js index.html blog.html post.html moments.html bookmarks.html rss.html js/core-pages-ui.test.js
git commit -m "feat: finalize core pages ui polish behavior and copy"
```

### Task 7: Sync Docs and Code Index

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Test: manual doc review against edited files

- [ ] **Step 1: Write the failing documentation check**

Write down the expected doc updates before editing:

```md
- `index.html`: 新增首页内容入口摘要区
- `blog.html`: 新增编辑式发现工具条/摘要区
- `post.html`: 新增阅读壳层与信息侧栏说明
- `moments.html`: 图片流前置、统计区下沉
- `bookmarks.html`: 新增策展摘要区
- `rss.html`: 三栏角色与阅读工作台说明更新
```

- [ ] **Step 2: Verify the current wiki does not yet include these updates**

Run:

```bash
rg "内容入口摘要区|发现工具条|阅读壳层|策展摘要区|阅读工作台" d:/Projects/shadowsky-blog/docs/CODE_WIKI.md
```

Expected: no matches.

- [ ] **Step 3: Write minimal implementation**

Update the front-end structure and shared UI sections in `docs/CODE_WIKI.md` with concise notes such as:

```md
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 作者门户、频道入口摘要、主题与导航壳 |
| 博客列表 | `blog.html` | `js/blog.js` | 编辑式内容入口、搜索、分页、多视图切换 |
| 文章详情 | `post.html` | `js/post-viewer.js` | 稳定阅读面板、目录侧栏、相关推荐 |
| 随手拍 | `moments.html` | `js/moments.js`、`js/activity_chart.js` | 画册式图片流、热力图与筛选工具条 |
| 收藏页 | `bookmarks.html` | `js/bookmarks.js`、`js/bookmarks-admin.js` | 策展型资源目录、搜索与分类导航 |
| RSS | `rss.html` | `js/rss.js` | 三栏阅读工作台、订阅源与文章阅读区 |
```

- [ ] **Step 4: Re-read docs to verify accuracy**

Run:

```bash
rg "作者门户|编辑式内容入口|稳定阅读面板|画册式图片流|策展型资源目录|三栏阅读工作台" d:/Projects/shadowsky-blog/docs/CODE_WIKI.md
```

Expected: matches for all six updated descriptions.

- [ ] **Step 5: Commit**

```bash
git add docs/CODE_WIKI.md
git commit -m "docs: update wiki for core pages ui polish"
```

---

## Self-Review

### Spec coverage
- 全站骨架与公共组件：Task 2
- `index / blog / post / moments / bookmarks / rss` 逐页改造：Task 3, 4, 5
- 交互、文案、可访问性与 reduced motion：Task 2, 6
- 文档同步：Task 7

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each test and command names exact files and expected outcomes.

### Type and interface consistency
- Shared DOM hook naming uses a single family: `data-ui-section`, `data-ui-toolbar`, `data-ui-shell`, `data-ui-panel`, `data-ui-card`.
- Shared class names remain consistent across tasks: `.public-shell`, `.public-shell--floating-nav`, `.section-shell`, `.editorial-kicker`, `.glass-summary-grid`, `.utility-glass-bar`, `.reading-surface`.
