# 全站公开页布局恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复全部公开页的 UI 布局错乱问题，统一公共壳层、响应式节奏和页脚/工具条结构，并验证桌面端与移动端布局稳定性。

**Architecture:** 先扩展 `js/core-pages-ui.test.js` 让全站公开页布局结构和共享样式成为可验证目标，再把共享布局恢复规则集中收敛到 `css/style.css`。随后按页面族分批收口 HTML 结构，优先处理页脚、主容器、固定导航偏移、工具条和高复杂度页面的滚动上下文，最后更新文档并做诊断与回归验证。

**Tech Stack:** 原生 HTML、多页面静态站点、共享 CSS、最少量 JS、Vitest + Node 文件断言、VS Code diagnostics

---

## File Map

### Shared style and validation
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
  - 追加全站布局恢复层，统一主容器、顶部安全间距、页脚、工具条、栅格和小屏溢出防护。
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - 把 ACG、about、404 的结构钩子和页脚/公共壳层断言纳入测试。
- Modify: `d:\Projects\shadowsky-blog\js\main.js`
  - 仅在需要时修正移动菜单、访问量占位文案或公共壳层相关行为。

### Public pages
- Modify: `d:\Projects\shadowsky-blog\acg.html`
- Modify: `d:\Projects\shadowsky-blog\anime.html`
- Modify: `d:\Projects\shadowsky-blog\manga.html`
- Modify: `d:\Projects\shadowsky-blog\edits.html`
- Modify: `d:\Projects\shadowsky-blog\about.html`
- Modify: `d:\Projects\shadowsky-blog\404.html`
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Modify: `d:\Projects\shadowsky-blog\post.html`
- Modify: `d:\Projects\shadowsky-blog\moments.html`
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
- Modify: `d:\Projects\shadowsky-blog\rss.html`

### Docs
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - 更新公开页职责说明和全站布局恢复层说明。

---

### Task 1: 扩展全站布局回归测试

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing test**

在 `uses localized loading copy on the upgraded core pages` 后追加一个新用例：

```js
it('uses shared layout shells on all public pages that were upgraded', () => {
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

  expect(acg).toContain('data-ui-shell="acg-hub"');
  expect(anime).toContain('data-ui-toolbar="anime-filters"');
  expect(manga).toContain('data-ui-toolbar="manga-filters"');
  expect(edits).toContain('data-ui-toolbar="edits-categories"');
  expect(about).toContain('data-ui-shell="about-story"');
  expect(notFound).toContain('data-ui-shell="error-playground"');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为 `acg.html`、`anime.html`、`manga.html`、`edits.html`、`404.html` 仍未统一接入 `public-footer`。

- [ ] **Step 3: Write minimal implementation**

把新测试追加到 `js/core-pages-ui.test.js` 末尾，保留现有测试结构：

```js
it('uses shared layout shells on all public pages that were upgraded', () => {
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

  expect(acg).toContain('data-ui-shell="acg-hub"');
  expect(anime).toContain('data-ui-toolbar="anime-filters"');
  expect(manga).toContain('data-ui-toolbar="manga-filters"');
  expect(edits).toContain('data-ui-toolbar="edits-categories"');
  expect(about).toContain('data-ui-shell="about-story"');
  expect(notFound).toContain('data-ui-shell="error-playground"');
});
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL on missing `public-footer` markup in ACG 系列页和 404 页，而不是因为语法错误。

- [ ] **Step 5: Commit**

```bash
git add js/core-pages-ui.test.js
git commit -m "test: add full site layout recovery coverage"
```

### Task 2: 构建共享布局恢复层

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test**

在 `defines the shared shell selectors in the stylesheet` 中补充以下断言：

```js
expect(css).toContain('.layout-safe-top');
expect(css).toContain('.layout-flow-section');
expect(css).toContain('.layout-toolbar-wrap');
expect(css).toContain('.layout-grid-stable');
expect(css).toContain('.layout-overflow-guard');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为 `style.css` 还没有这些恢复性选择器。

- [ ] **Step 3: Write minimal implementation**

在 `css/style.css` 现有公共布局区块后追加：

```css
/* Full site layout recovery layer for public pages. */
body.public-page.liquid-glass-ui .layout-safe-top {
  padding-top: clamp(5.5rem, 7vw, 6.75rem);
}

body.public-page.liquid-glass-ui .layout-flow-section {
  margin-top: clamp(2rem, 4vw, 3.5rem);
}

body.public-page.liquid-glass-ui .layout-toolbar-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

body.public-page.liquid-glass-ui .layout-grid-stable {
  display: grid;
  gap: clamp(1rem, 2vw, 1.5rem);
}

body.public-page.liquid-glass-ui .layout-overflow-guard {
  min-width: 0;
  max-width: 100%;
}

body.public-page.liquid-glass-ui .public-footer {
  margin-top: clamp(3rem, 5vw, 4rem);
}

body.public-page.liquid-glass-ui .public-footer__inner {
  width: min(1280px, calc(100% - 1.5rem));
  margin-inline: auto;
}

@media (max-width: 767px) {
  body.public-page.liquid-glass-ui .public-shell,
  body.public-page.liquid-glass-ui .public-footer__inner {
    width: min(100%, calc(100% - 1rem));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 共享样式选择器断言 PASS，页脚类相关断言仍 FAIL。

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/core-pages-ui.test.js
git commit -m "feat: add shared layout recovery css layer"
```

### Task 3: 统一 ACG 系列与错误页的公共壳层和页脚

**Files:**
- Modify: `d:\Projects\shadowsky-blog\acg.html`
- Modify: `d:\Projects\shadowsky-blog\anime.html`
- Modify: `d:\Projects\shadowsky-blog\manga.html`
- Modify: `d:\Projects\shadowsky-blog\edits.html`
- Modify: `d:\Projects\shadowsky-blog\404.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test with page-specific hooks**

把下面断言并入 Task 1 的新用例或单独新用例：

```js
expect(acg).toContain('public-footer__inner');
expect(anime).toContain('public-footer__inner');
expect(manga).toContain('public-footer__inner');
expect(edits).toContain('public-footer__inner');
expect(notFound).toContain('public-footer__inner');

expect(acg).toContain('layout-safe-top');
expect(anime).toContain('layout-safe-top');
expect(manga).toContain('layout-safe-top');
expect(edits).toContain('layout-safe-top');
expect(notFound).toContain('layout-safe-top');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为这些页面还没有统一的 `layout-safe-top` 和 `public-footer__inner`。

- [ ] **Step 3: Write minimal implementation**

在 `acg.html`、`anime.html`、`manga.html`、`edits.html` 的主内容容器上补上 `layout-safe-top`，并把旧页脚改成公共页脚结构。以 `acg.html` 为例：

```html
<div class="min-h-screen py-20 transition-colors duration-300">
  <div class="public-shell public-shell--floating-nav layout-safe-top max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-ui-shell="acg-hub">
```

把页脚替换为：

```html
<footer class="public-footer bg-gray-50/80 dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 py-8 relative z-10 transition-colors duration-300">
  <div class="public-footer__inner px-4 flex flex-col md:flex-row justify-center items-center gap-4 text-center">
    <p class="text-xs tracking-widest uppercase text-gray-500 dark:text-gray-400 opacity-80 flex items-center">
      &copy; 2025 Thoi <span class="mx-2 text-blue-500">|</span> Designed with <span class="text-red-500 animate-pulse mx-1">❤️</span>
    </p>
    <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      <span id="visit-count">加载中…</span>
    </div>
  </div>
</footer>
```

`404.html` 也同样替换旧页脚：

```html
<footer class="public-footer py-8 text-center z-20 transition-all duration-500 relative">
  <div class="public-footer__inner px-4 flex flex-col md:flex-row justify-center items-center gap-4 text-center">
    <p class="text-xs tracking-widest uppercase text-gray-500 dark:text-gray-400 opacity-80 flex items-center">
      &copy; <span id="year"></span> ShadowQuake <span class="mx-2 text-blue-500">|</span> Designed with <span class="text-red-500 animate-pulse mx-1">❤️</span>
    </p>
  </div>
</footer>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: ACG 系列页和 404 页的结构壳层断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add acg.html anime.html manga.html edits.html 404.html js/core-pages-ui.test.js
git commit -m "feat: normalize acg and error page layout shells"
```

### Task 4: 修复 about 页面与公共壳层分叉

**Files:**
- Modify: `d:\Projects\shadowsky-blog\about.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test**

新增断言：

```js
expect(about).toContain('class="public-footer');
expect(about).toContain('public-footer__inner');
expect(about).toContain('layout-safe-top');
expect(about).toContain('layout-flow-section');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为 `about.html` 还没有接入 `layout-safe-top`、`layout-flow-section`，页脚仍是旧版结构。

- [ ] **Step 3: Write minimal implementation**

把 `about.html` 主内容容器改为：

```html
<main class="public-shell public-shell--floating-nav layout-safe-top max-w-3xl mx-auto px-6 pt-24 pb-24" data-ui-shell="about-story">
```

把关键区块改为：

```html
<div class="section-shell layout-flow-section relative mb-20 animate-fade-in-up" data-ui-section="about-intro">
```

把旧页脚替换为：

```html
<footer class="public-footer bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 py-8 relative z-10 transition-colors duration-300 mt-12">
  <div class="public-footer__inner px-4 flex flex-col md:flex-row justify-center items-center gap-4 text-center">
    <p class="text-xs tracking-widest uppercase text-gray-500 dark:text-gray-400 opacity-80 flex items-center">
      &copy; 2025 Thoi <span class="mx-2 text-blue-500">|</span> Designed with <span class="text-red-500 animate-pulse mx-1">❤️</span>
    </p>
    <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      <span id="visit-count">加载中…</span>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: `about.html` 公共壳层断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add about.html js/core-pages-ui.test.js
git commit -m "feat: align about page with shared layout shell"
```

### Task 5: 修复首页、博客和文章页的顶部安全间距与工具层节奏

**Files:**
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Modify: `d:\Projects\shadowsky-blog\post.html`
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test**

新增断言：

```js
const index = readProjectFile('index.html');
const blog = readProjectFile('blog.html');
const post = readProjectFile('post.html');

expect(index).toContain('layout-safe-top');
expect(blog).toContain('layout-toolbar-wrap');
expect(post).toContain('layout-safe-top');
expect(post).toContain('layout-overflow-guard');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为这些恢复类还未接入目标页面。

- [ ] **Step 3: Write minimal implementation**

`index.html` 的 hero 内容容器改为：

```html
<div class="public-shell public-shell--floating-nav layout-safe-top relative z-10 px-4 sm:px-6 lg:px-8 text-center w-full flex flex-col items-center justify-center pt-20 sm:pt-16 pb-16">
```

`blog.html` 的搜索与视图切换工具条内层改为：

```html
<div class="mb-12 space-y-8 animate-fade-in utility-glass-bar rounded-[28px] p-6" style="animation-delay: 0.3s" data-ui-toolbar="blog-controls">
  <div class="layout-toolbar-wrap justify-center">
```

`post.html` 的主阅读容器改为：

```html
<div class="public-shell public-shell--floating-nav layout-safe-top px-4 sm:px-6 lg:px-8" data-ui-shell="post-reading">
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-12 layout-overflow-guard">
```

如需配合样式，再在 `style.css` 追加：

```css
body.public-page.liquid-glass-ui .layout-toolbar-wrap.justify-center {
  justify-content: center;
}

body.public-page.liquid-glass-ui .layout-overflow-guard > * {
  min-width: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 首页、博客页和文章页的布局恢复类断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add index.html blog.html post.html css/style.css js/core-pages-ui.test.js
git commit -m "feat: stabilize top spacing on core content pages"
```

### Task 6: 修复 moments、bookmarks、rss 的高复杂度布局

**Files:**
- Modify: `d:\Projects\shadowsky-blog\moments.html`
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
- Modify: `d:\Projects\shadowsky-blog\rss.html`
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test**

新增断言：

```js
expect(moments).toContain('layout-safe-top');
expect(moments).toContain('layout-overflow-guard');
expect(bookmarks).toContain('layout-safe-top');
expect(bookmarks).toContain('layout-flow-section');
expect(rss).toContain('layout-overflow-guard');
expect(rss).toContain('layout-safe-top');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为这三个页面还没有统一引入这些保护类。

- [ ] **Step 3: Write minimal implementation**

`moments.html` 主容器改为：

```html
<div class="public-shell public-shell--floating-nav layout-safe-top px-4 sm:px-6 lg:px-8 relative z-10">
```

热力图外层改为：

```html
<div class="heatmap-scroll-area layout-overflow-guard w-full overflow-x-auto pb-2">
```

`bookmarks.html` 主内容改为：

```html
<div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
  <div id="bookmarks-container" class="public-shell public-shell--floating-nav layout-safe-top animate-fade-in-up">
```

精选区与分类导航之间加入：

```html
<section class="section-shell layout-flow-section mb-12" data-ui-section="bookmarks-curated">
```

`rss.html` 主工作台改为：

```html
<div class="flex-1 flex pt-16 overflow-hidden relative animate-fade-in-up public-shell public-shell--floating-nav layout-safe-top layout-overflow-guard" data-ui-shell="rss-workbench">
```

并在 `style.css` 加入：

```css
body.public-page.liquid-glass-ui [data-ui-shell="rss-workbench"] {
  width: min(1440px, calc(100% - 1rem));
}

body.public-page.liquid-glass-ui [data-ui-panel="rss-sources"],
body.public-page.liquid-glass-ui [data-ui-panel="rss-inbox"],
body.public-page.liquid-glass-ui [data-ui-panel="rss-reader"] {
  min-width: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 高复杂度页面的布局保护类断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add moments.html bookmarks.html rss.html css/style.css js/core-pages-ui.test.js
git commit -m "feat: harden gallery and workbench layouts"
```

### Task 7: 修复 anime、manga、edits 的工具条与栅格稳定性

**Files:**
- Modify: `d:\Projects\shadowsky-blog\anime.html`
- Modify: `d:\Projects\shadowsky-blog\manga.html`
- Modify: `d:\Projects\shadowsky-blog\edits.html`
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing test**

新增断言：

```js
expect(anime).toContain('layout-toolbar-wrap');
expect(manga).toContain('layout-toolbar-wrap');
expect(edits).toContain('layout-overflow-guard');
expect(edits).toContain('layout-grid-stable');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为这些页面尚未接入工具条包裹和栅格恢复类。

- [ ] **Step 3: Write minimal implementation**

`anime.html` 的筛选器改为：

```html
<div id="anime-filters" class="utility-glass-bar rounded-[24px] p-4 sm:p-5 layout-toolbar-wrap mb-8 animate-fade-in-up" data-ui-toolbar="anime-filters">
```

`manga.html` 的筛选器改为：

```html
<div id="manga-filters" class="utility-glass-bar rounded-[24px] p-4 sm:p-5 layout-toolbar-wrap mb-8 animate-fade-in-up" data-ui-toolbar="manga-filters">
```

`edits.html` 的分类栏和视频栅格改为：

```html
<div class="filter-container utility-glass-bar rounded-[24px] px-4 py-3 overflow-x-auto layout-overflow-guard flex items-center gap-6 no-scrollbar mask-gradient-r" data-ui-toolbar="edits-categories">
```

```html
<div id="video-grid" class="layout-grid-stable grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
```

并在 `style.css` 中为小屏筛选器追加：

```css
body.public-page.liquid-glass-ui #anime-filters,
body.public-page.liquid-glass-ui #manga-filters {
  justify-content: flex-start;
}

@media (max-width: 767px) {
  body.public-page.liquid-glass-ui #anime-filters button,
  body.public-page.liquid-glass-ui #manga-filters button {
    flex: 0 0 auto;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: ACG 子页工具条与栅格结构断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add anime.html manga.html edits.html css/style.css js/core-pages-ui.test.js
git commit -m "feat: stabilize acg detail page toolbars"
```

### Task 8: 校正文案、诊断与回归测试

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\main.js`
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Modify: `d:\Projects\shadowsky-blog\post.html`
- Modify: `d:\Projects\shadowsky-blog\moments.html`
- Modify: `d:\Projects\shadowsky-blog\bookmarks.html`
- Modify: `d:\Projects\shadowsky-blog\rss.html`
- Modify: `d:\Projects\shadowsky-blog\acg.html`
- Modify: `d:\Projects\shadowsky-blog\anime.html`
- Modify: `d:\Projects\shadowsky-blog\manga.html`
- Modify: `d:\Projects\shadowsky-blog\edits.html`
- Modify: `d:\Projects\shadowsky-blog\about.html`
- Modify: `d:\Projects\shadowsky-blog\404.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one final regression check**

在 `js/core-pages-ui.test.js` 追加：

```js
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
```

- [ ] **Step 2: Run test to verify it passes or fails only on remaining placeholders**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 如果仍有英文占位，精确指出页面；否则直接 PASS。

- [ ] **Step 3: Write minimal implementation**

若发现英文占位，统一替换为：

```html
<span id="visit-count">加载中…</span>
```

并确认 `js/main.js` 继续使用现有常量：

```js
const VISIT_COUNT_LOADING_TEXT = '加载中…';
const VISIT_COUNT_EMPTY_TEXT = '访问 --';
```

- [ ] **Step 4: Run tests and diagnostics**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Then inspect diagnostics for recently edited files.

Expected: `core-pages-ui.test.js` PASS，且编辑文件无新增明显诊断问题。

- [ ] **Step 5: Commit**

```bash
git add js/core-pages-ui.test.js js/main.js index.html blog.html post.html moments.html bookmarks.html rss.html acg.html anime.html manga.html edits.html about.html 404.html
git commit -m "feat: finalize full site layout recovery"
```

### Task 9: 更新代码索引文档

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`

- [ ] **Step 1: Write the failing documentation check**

先记录本次需要新增的文档关键词：

```md
- 全站布局恢复层
- 公开页统一主容器与页脚
- ACG 系列页布局收口
- 复杂滚动页面布局保护
```

- [ ] **Step 2: Verify the current wiki is missing at least part of these phrases**

Run:

```bash
rg "全站布局恢复层|统一主容器|ACG 系列页布局收口|复杂滚动页面布局保护" d:/Projects/shadowsky-blog/docs/CODE_WIKI.md
```

Expected: no matches

- [ ] **Step 3: Write minimal implementation**

在 `docs/CODE_WIKI.md` 的前端结构与液态玻璃 UI 系统部分追加类似内容：

```md
- 全站布局恢复层：在 `css/style.css` 中为全部公开页追加统一的顶部安全间距、主容器宽度、页脚容器、工具条换行和溢出防护规则。
- 公开页统一主容器与页脚：`index.html` 到 `404.html` 统一通过 `public-shell`、`public-footer`、`public-footer__inner` 接入共享布局骨架。
- ACG 系列页布局收口：`acg.html`、`anime.html`、`manga.html`、`edits.html` 收敛独立页脚和局部工具条规则，统一断点行为。
- 复杂滚动页面布局保护：`rss.html`、`moments.html`、`post.html` 通过溢出防护和滚动上下文收口降低 sticky/fixed 错位风险。
```

- [ ] **Step 4: Re-read docs to verify accuracy**

Run:

```bash
rg "全站布局恢复层|统一主容器与页脚|ACG 系列页布局收口|复杂滚动页面布局保护" d:/Projects/shadowsky-blog/docs/CODE_WIKI.md
```

Expected: matches for all four phrases

- [ ] **Step 5: Commit**

```bash
git add docs/CODE_WIKI.md
git commit -m "docs: update wiki for full site layout recovery"
```

---

## Self-Review

### Spec coverage
- 全站公开页范围：Task 3, 4, 5, 6, 7
- 共享布局恢复层：Task 2
- 响应式收口与工具条/页脚统一：Task 3, 4, 5, 6, 7
- 验证矩阵与回归：Task 1, 8
- 文档同步：Task 9
- QA 关注的性能与结构稳定性：Task 2, 6, 7, 8

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task names exact files, code snippets, commands, and expected outcomes.

### Type consistency
- Shared hook names stay consistent: `data-ui-shell`, `data-ui-toolbar`, `data-ui-section`, `data-ui-panel`.
- Shared recovery classes stay consistent: `.layout-safe-top`, `.layout-flow-section`, `.layout-toolbar-wrap`, `.layout-grid-stable`, `.layout-overflow-guard`.

