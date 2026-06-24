# Blog UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant blog discovery block and refine the blog page so its hero, cards, navigation, and footer feel cohesive with the homepage liquid-glass language.

**Architecture:** Keep the blog page on the existing multi-page public shell and `js/blog.js` data flow, then tighten the contract with regression tests before changing markup and CSS. Limit all visual overrides to `blog.html` and blog-scoped selectors in `css/style.css` so the rest of the public pages keep their current behavior.

**Tech Stack:** Static HTML, shared CSS, existing `js/blog.js` renderer, Vitest string-based regression tests

---

## File Map

- **Modify:** `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - Add regression coverage for removing `blog-discovery`, introducing blog-scoped nav/footer selectors, and keeping the refined toolbar structure.
- **Modify:** `d:\Projects\shadowsky-blog\blog.html`
  - Remove the discovery block, tighten hero spacing, and add blog-scoped hooks for toolbar, navigation shell, and footer treatment.
- **Modify:** `d:\Projects\shadowsky-blog\css\style.css`
  - Add blog-page-only liquid-glass refinements for nav, toolbar, cards, and footer.
- **Modify:** `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - Record the blog-page refinement contract and the removal of the discovery panel.

### Task 1: Lock the blog-page regression tests

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing tests**

```js
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
  expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card');
  expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell');
  expect(css).toContain('body.public-page.liquid-glass-ui[data-page="blog"] .public-footer');
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: FAIL because `blog.html` still contains `blog-discovery`, and the blog-specific selectors do not yet exist in `css/style.css`.

- [ ] **Step 3: Save the red baseline**

```js
// Append the two new tests near the other public-page UI assertions so the
// blog-page contract is visible alongside the homepage and nav-shell tests.
```

- [ ] **Step 4: Re-run the focused suite to keep the red state explicit**

Run:

```bash
npx vitest run js/core-pages-ui.test.js --reporter=dot
```

Expected: FAIL with the same missing `blog-discovery` and selector assertions.

- [ ] **Step 5: Commit the test baseline**

```bash
git add d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "test: lock blog page refinement contract"
```

### Task 2: Refine the blog page structure

**Files:**
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add blog-page scope hooks to the body, nav, hero, toolbar, and footer**

```html
<body class="public-page liquid-glass-ui bg-gray-50 dark:bg-black ..." data-force-scrolled-nav data-page="blog">

<nav id="navbar" class="fixed w-full z-50 top-0 transition-all duration-300" data-ui-shell="blog-nav">

<div class="relative min-h-[28vh] w-full flex items-center justify-center bg-gray-50 dark:bg-black" data-ui-shell="blog-hero">

<div class="mb-10 animate-fade-in utility-glass-bar rounded-[28px] p-5 sm:p-6 blog-toolbar-shell" data-ui-toolbar="blog-controls">

<footer class="public-footer ... py-8 relative z-10" data-ui-shell="blog-footer">
```

- [ ] **Step 2: Remove the entire discovery block**

```html
<!-- Delete this whole section -->
<section class="section-shell" data-ui-section="blog-highlights">
  <div class="utility-glass-bar rounded-[28px] p-4 sm:p-6" data-ui-toolbar="blog-discovery">
    ...
  </div>
</section>
```

- [ ] **Step 3: Tighten the hero and toolbar spacing**

```html
<div class="public-shell public-shell--floating-nav relative z-10 px-4 sm:px-6 lg:px-8 text-center w-full pt-20 pb-8">
...
<div class="bg-gray-50 dark:bg-black min-h-screen py-8 transition-colors duration-500 relative">
```

- [ ] **Step 4: Run the tests to confirm the structure contract passes**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: the blog structure test passes, while the selector test may still fail until CSS is added.

- [ ] **Step 5: Commit the markup change**

```bash
git add d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "feat: remove redundant blog discovery panel"
```

### Task 3: Add blog-scoped liquid-glass refinements

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add blog-scoped navigation shell refinement**

```css
body.public-page.liquid-glass-ui[data-page="blog"] #navbar {
  top: 0.75rem;
  width: calc(100% - 1rem);
  max-width: min(1280px, calc(100% - 1rem));
  margin: 0 auto;
  border-radius: 999px;
  border: 1px solid rgba(191, 219, 254, 0.42);
  background: linear-gradient(135deg, rgba(244, 248, 255, 0.9), rgba(239, 246, 255, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 20px 44px rgba(148, 163, 184, 0.16);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.dark body.public-page.liquid-glass-ui[data-page="blog"] #navbar {
  border-color: rgba(71, 85, 105, 0.65);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.68));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 20px 44px rgba(2, 8, 23, 0.34);
}
```

- [ ] **Step 2: Add blog-scoped toolbar and footer treatment**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell {
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 24px 56px rgba(148, 163, 184, 0.12);
}

body.public-page.liquid-glass-ui[data-page="blog"] .public-footer {
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.62), rgba(248, 250, 252, 0.3)) !important;
  border-top: 1px solid rgba(226, 232, 240, 0.62) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

- [ ] **Step 3: Add blog-card refinement and reduce the search glow**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card {
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.88)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 18px 38px rgba(15, 23, 42, 0.08) !important;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card:hover {
  transform: translateY(-4px);
  border-color: rgba(147, 197, 253, 0.72) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 24px 46px rgba(59, 130, 246, 0.12) !important;
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-toolbar="blog-controls"] .group > .absolute.-inset-1 {
  opacity: 0.12;
  filter: blur(18px);
}
```

- [ ] **Step 4: Run the test suite to confirm the selectors are green**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

- [ ] **Step 5: Commit the style refinement**

```bash
git add d:/Projects/shadowsky-blog/css/style.css d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "feat: refine blog page liquid glass layout"
```

### Task 4: Sync docs and run final verification

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Record the blog-page refinement in the code wiki**

```md
- 博客页收口：`blog.html` 删除 `blog-discovery` 发现面板，收紧标题区与工具区节奏，并为博客页补充专属导航壳、卡片和底栏样式，用于降低首屏割裂感。
```

- [ ] **Step 2: Run tests and diagnostics**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

Use workspace diagnostics for:

```text
blog.html
css/style.css
docs/CODE_WIKI.md
js/core-pages-ui.test.js
```

Expected: no new diagnostics

- [ ] **Step 3: Re-check the real blog page in the browser**

Check:

```text
1. 博客页首屏不再出现“先从这些内容开始阅读”面板。
2. 标题区和工具区之间的空白明显收紧。
3. 搜索框 glow 更轻，工具区成为一个整体。
4. 文章卡片更像统一内容卡，而不是泛光玻璃块。
5. 底栏和背景之间不再像硬切一条。
6. 导航更接近首页的一体化胶囊感。
```

- [ ] **Step 4: Commit docs and verification**

```bash
git add d:/Projects/shadowsky-blog/docs/CODE_WIKI.md d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/css/style.css d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "docs: record blog page refinement contract"
```

## Self-Review

- **Spec coverage:** The plan covers deleting `blog-discovery`, tightening the hero and toolbar, refining blog cards, making the blog nav closer to the homepage shell, fixing the footer/background seam, testing, and code-wiki sync.
- **Placeholder scan:** There are no TBD/TODO placeholders. Diagnostics are explicitly delegated to workspace diagnostics rather than an invented shell command.
- **Type consistency:** The plan uses one stable page scope (`data-page="blog"`) and one stable set of hooks (`data-ui-shell="blog-nav"`, `data-ui-shell="blog-hero"`, `data-ui-shell="blog-footer"`, `.blog-toolbar-shell`), and reuses the existing `.blog-post-card` structure from `js/blog.js`.

