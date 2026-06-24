# Blog UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the blog page so its navigation matches the homepage, the search/pagination controls feel restrained, the cards survive weak cover images, and the footer ends the page without oversized blank space.

**Architecture:** Keep the blog data flow and page purpose intact, but refresh the visual contract in a test-first sequence. Use homepage-aligned navigation markup in `blog.html`, page-scoped CSS in `css/style.css`, and minimal `js/blog.js` tweaks only where pagination or cover rendering needs explicit support.

**Tech Stack:** Static HTML, shared CSS, vanilla JavaScript renderer, Vitest string-based UI regression tests

---

## File Map

- **Modify:** `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - Lock the new contract for homepage-style blog navigation, search de-framing, calmer pagination, image-safe cards, and compressed footer spacing.
- **Modify:** `d:\Projects\shadowsky-blog\blog.html`
  - Replace the current blog nav with the homepage-style text nav and simplify the toolbar structure so the search box is the main control.
- **Modify:** `d:\Projects\shadowsky-blog\css\style.css`
  - Implement all blog-scoped visual changes: top continuity, homepage-style nav shell, search cleanup, view-switch and pagination restyle, card image handling, and tighter footer ending.
- **Modify:** `d:\Projects\shadowsky-blog\js\blog.js`
  - Add minimal pagination or cover helper classes only if the card and pager contract cannot be expressed from existing markup.
- **Modify:** `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - Record the updated blog-page visual contract after verification.

### Task 1: Lock the new blog-page contract in tests

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add the failing blog-page contract test**

```js
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
```

- [ ] **Step 2: Run the focused suite to confirm red**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: FAIL because at least one of the new navigation, control, pagination, cover, or footer selectors is missing.

- [ ] **Step 3: Keep the test next to the existing blog-page assertions**

```js
// Place the new test directly after the current blog-page selector checks so all
// public blog UI contracts stay grouped in one describe block.
```

- [ ] **Step 4: Re-run with compact reporter and keep the failure explicit**

Run:

```bash
npx vitest run js/core-pages-ui.test.js --reporter=dot
```

Expected: FAIL with selector mismatch output.

### Task 2: Replace the blog nav and simplify toolbar markup

**Files:**
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Replace the current desktop nav actions with homepage-style text links**

```html
<div class="hidden lg:flex items-center space-x-1">
    <a href="index.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="首页" aria-label="回到首页">首页</a>
    <a href="blog.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-blue-50/80 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" title="笔记" aria-label="查看文章与记录" aria-current="page">笔记</a>
    <a href="moments.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="片刻" aria-label="查看日常瞬间">片刻</a>
    <a href="bookmarks.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="收藏" aria-label="查看收藏内容">收藏</a>
    <a href="rss.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="订阅" aria-label="查看 RSS 与订阅源">订阅</a>
    <a href="acg.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="ACG" aria-label="查看追番、漫画与剪辑">ACG</a>
    <a href="about.html" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-white/10 dark:hover:text-white" title="关于" aria-label="了解站点与作者">关于</a>
</div>
```

- [ ] **Step 2: Remove the toolbar’s heavy wrapper so the search input becomes the primary element**

```html
<div class="mb-8 animate-fade-in blog-toolbar-shell" style="animation-delay: 0.3s" data-ui-toolbar="blog-controls">
    <div class="max-w-2xl mx-auto relative group">
        ...
    </div>
    <div class="layout-toolbar-wrap justify-center mt-4">
        <div class="glass-pill inline-flex flex-wrap justify-center gap-1 p-1">
            ...
        </div>
    </div>
</div>
```

- [ ] **Step 3: Keep the mobile menu labels unchanged and consistent**

```html
<!-- Keep mobile links as text labels matching the homepage/public-page contract:
首页 / 笔记 / 片刻 / 收藏 / 订阅 / ACG / 关于 -->
```

- [ ] **Step 4: Run the contract suite after markup changes**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: still FAIL until CSS selectors land, but HTML/title assertions should pass.

### Task 3: Rebuild the blog-page CSS contract

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Apply homepage-style nav shell rules to the blog page**

```css
body.public-page.liquid-glass-ui[data-page="blog"] #navbar {
  top: 0.75rem;
  width: calc(100% - 1rem);
  max-width: min(1280px, calc(100% - 1rem));
  margin: 0 auto;
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"] .public-shell > div {
  min-height: 4rem;
  padding: 0.2rem 0.35rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.62));
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(20px) saturate(155%);
  -webkit-backdrop-filter: blur(20px) saturate(155%);
}
```

- [ ] **Step 2: Remove the ugly toolbar panel feel and make the search box primary**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell {
  margin: 0 auto 2rem;
  max-width: 48rem;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell .group > .absolute.-inset-1 {
  opacity: 0.08;
  filter: blur(18px);
}

body.public-page.liquid-glass-ui[data-page="blog"] #search-input {
  min-height: 3.75rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}
```

- [ ] **Step 3: Restyle the view switcher and pagination into calmer pills**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .glass-pill {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

body.public-page.liquid-glass-ui[data-page="blog"] .view-btn,
body.public-page.liquid-glass-ui[data-page="blog"] .pagination-btn {
  border-radius: 999px;
  color: rgb(71 85 105);
  background: transparent;
  border: 1px solid transparent;
}

body.public-page.liquid-glass-ui[data-page="blog"] .view-btn.active,
body.public-page.liquid-glass-ui[data-page="blog"] .pagination-btn.active {
  color: rgb(30 41 59);
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(148, 163, 184, 0.26);
}
```

- [ ] **Step 4: Make cards calmer and cover images more resilient**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 20px 36px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card .aspect-video {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.18)),
    linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(226, 232, 240, 0.36));
}

body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 5: Tighten the footer so the page ends sooner**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .public-footer {
  margin-top: 1.5rem;
  padding: 1.25rem 0 1.5rem;
  background: transparent !important;
  border-top: 1px solid rgba(148, 163, 184, 0.16) !important;
}

body.public-page.liquid-glass-ui[data-page="blog"] .public-footer__inner {
  gap: 0.6rem;
}
```

- [ ] **Step 6: Run the suite and make it green**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS.

### Task 4: Add minimal JS support only if needed

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\blog.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Only if the current markup lacks stable hooks, add a cover wrapper or pager class in the renderer**

```js
const coverHtml = post.cover
    ? `
        <div class="aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img src="${post.cover}" alt="${post.title}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]">
        </div>
      `
    : '';
```

- [ ] **Step 2: Only if pagination buttons need a stable class, keep the emitted class explicit**

```js
button.className = `pagination-btn px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? 'active' : ''}`;
```

- [ ] **Step 3: Run the suite after JS changes**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS.

### Task 5: Verify visuals and update docs

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Capture the updated blog page in the integrated browser**

Run:

```bash
# Use the integrated browser to capture:
# 1. viewport screenshot of nav + hero + search
# 2. viewport screenshot of cards
# 3. footer screenshot showing reduced blank space
```

- [ ] **Step 2: Record the new blog-page contract in CODE_WIKI**

```md
- `blog.html`: 博客页导航改为首页同款文字胶囊，搜索区去掉大外框，分页/视图切换统一成克制胶囊，底栏压低并贴近分页。
- `css/style.css`: 新增博客页专属导航、搜索、分页、卡片封面和底栏收尾规则，不污染其他公开页。
- `js/blog.js`: 仅在需要时补充分页按钮或卡片封面稳定钩子，不改博客数据流。
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS.

- [ ] **Step 4: Check diagnostics on touched files**

Run:

```bash
# Check diagnostics for:
# - d:/Projects/shadowsky-blog/blog.html
# - d:/Projects/shadowsky-blog/css/style.css
# - d:/Projects/shadowsky-blog/js/blog.js
# - d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
# - d:/Projects/shadowsky-blog/docs/CODE_WIKI.md
```
- Modify: `d:\Projects\shadowsky-blog\blog.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Keep the existing blog page hooks and remove any hook that only served the rejected patch look**

```html
<body class="public-page liquid-glass-ui bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans pt-16 transition-colors duration-500" data-force-scrolled-nav data-page="blog">

<nav id="navbar" class="fixed w-full z-50 top-0 transition-all duration-300" data-ui-shell="blog-nav">

<div class="relative min-h-[28vh] w-full flex items-center justify-center bg-gray-50 dark:bg-black" data-ui-shell="blog-hero">

<div class="mb-10 space-y-6 animate-fade-in utility-glass-bar rounded-[28px] p-5 sm:p-6 blog-toolbar-shell" data-ui-toolbar="blog-controls">

<footer class="public-footer bg-white dark:bg-black text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 py-8 relative z-10" data-ui-shell="blog-footer">
```

- [ ] **Step 2: Do not add any extra wrapper just for decorative shell layers**

```html
<!-- Keep the nav, hero, toolbar, list, and footer readable as the main structure.
     Do not introduce a blog-only decorative wrapper div around nav or footer. -->
```

- [ ] **Step 3: Run the regression suite to confirm markup remains compatible**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: either PASS for existing markup tests or FAIL only on the CSS selector contract from Task 1.

- [ ] **Step 4: Re-open `blog.html` and verify the hooks match the plan exactly**

```html
<!-- Verify the final file still contains:
data-page="blog"
data-ui-shell="blog-nav"
data-ui-shell="blog-hero"
data-ui-toolbar="blog-controls"
data-ui-shell="blog-footer"
-->
```

- [ ] **Step 5: Commit the hook cleanup if markup changed**

```bash
git add d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "refactor: stabilize blog page ui hooks"
```

### Task 3: Rework the blog page CSS into one restrained system

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Make the top area continuous**

```css
body.public-page.liquid-glass-ui[data-page="blog"] #navbar {
  top: 0.5rem;
  left: 0;
  right: 0;
  width: calc(100% - 1rem);
  max-width: min(1280px, calc(100% - 1rem));
  margin: 0 auto;
  overflow: visible;
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"] {
  background: transparent !important;
  background-image: none !important;
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-hero"] + div {
  background: transparent !important;
  background-image: none !important;
}
```

- [ ] **Step 2: Keep only the real nav pill and remove decorative outer-shell patches**

```css
body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"] .public-shell > div {
  margin-top: 0;
  min-height: 4rem;
  align-items: center;
  padding-inline: clamp(0.85rem, 2vw, 1.1rem);
  gap: clamp(0.75rem, 2vw, 1.25rem);
  border-radius: 999px;
  border: 1px solid rgba(191, 219, 254, 0.42);
  background: linear-gradient(135deg, rgba(244, 248, 255, 0.9), rgba(239, 246, 255, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 20px 44px rgba(148, 163, 184, 0.16);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

/* Delete any blog-only rule shaped like:
body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"]::before { ... }
*/
```

- [ ] **Step 3: Turn the search area into a quieter tool panel**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell {
  position: relative;
  border: 1px solid rgba(226, 232, 240, 0.85);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.82));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 24px 56px rgba(148, 163, 184, 0.12);
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-toolbar="blog-controls"] .group > .absolute.-inset-1 {
  background: linear-gradient(135deg, rgba(191, 219, 254, 0.36), rgba(255, 255, 255, 0.18));
  opacity: 0.08;
  filter: blur(14px);
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-toolbar="blog-controls"] .group:hover > .absolute.-inset-1 {
  opacity: 0.12;
}

body.public-page.liquid-glass-ui[data-page="blog"] #search-input {
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 16px 34px rgba(148, 163, 184, 0.12);
}
```

- [ ] **Step 4: Reduce card noise and keep content hierarchy primary**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card {
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.88)) !important;
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
```

- [ ] **Step 5: Demote the footer into a page ending**

```css
body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-footer"] {
  position: relative;
  overflow: visible;
  background: transparent !important;
  background-image: none !important;
  border-top: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-footer"]::before {
  content: none;
}
```

- [ ] **Step 6: Mirror the same restraint in dark mode**

```css
.dark body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-nav"] .public-shell > div {
  border-color: rgba(71, 85, 105, 0.65);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.68));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 20px 44px rgba(2, 8, 23, 0.34);
}

.dark body.public-page.liquid-glass-ui[data-page="blog"] .blog-toolbar-shell {
  border-color: rgba(51, 65, 85, 0.9);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.72));
}

.dark body.public-page.liquid-glass-ui[data-page="blog"] [data-ui-shell="blog-footer"] {
  background: transparent !important;
  background-image: none !important;
  border-top: none !important;
  box-shadow: none !important;
}
```

- [ ] **Step 7: Run tests to confirm the selector contract is green**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

- [ ] **Step 8: Commit the CSS rework**

```bash
git add d:/Projects/shadowsky-blog/css/style.css d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "feat: unify blog page visual system"
```

### Task 4: Sync docs and verify in the browser

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Record the new blog-page contract in the code wiki**

```md
- 博客页克制一体化收口：`css/style.css` 将 `data-page="blog"` 下的顶部背景、搜索工具条、内容卡片与底栏改为同一套克制内容页语言，用于消除顶部断层、搜索区拼装感与底栏贴片感。
```

- [ ] **Step 2: Run tests and diagnostics**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

Check diagnostics for:

```text
blog.html
css/style.css
docs/CODE_WIKI.md
js/core-pages-ui.test.js
```

Expected: no new diagnostics

- [ ] **Step 3: Re-check the blog page in the integrated browser**

Check:

```text
1. 顶部不再出现额外透明方框或割裂式假壳。
2. hero 与正文开头背景连续。
3. 搜索区更安静，不再像一组拼接组件。
4. 卡片更稳，悬浮感降低。
5. 底栏回到页面结尾，而不是独立贴片。
```

- [ ] **Step 4: Capture the final browser screenshots**

Save:

```text
c:\Users\27426\AppData\Local\Temp\trae\screenshots\trae-browser-blog-viewport.png
c:\Users\27426\AppData\Local\Temp\trae\screenshots\trae-browser-blog-fullpage.png
```

Expected: the viewport screenshot clearly shows the calmer top area, and the full-page screenshot shows a quieter ending.

- [ ] **Step 5: Commit docs and verification**

```bash
git add d:/Projects/shadowsky-blog/docs/CODE_WIKI.md d:/Projects/shadowsky-blog/css/style.css d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "docs: record blog ui unification pass"
```

## Self-Review

- **Spec coverage:** The plan covers top continuity, quieter search controls, steadier cards, footer demotion, blog-only scoping, tests, docs, and browser verification.
- **Placeholder scan:** There are no TBD/TODO placeholders; each task includes exact files, code snippets, commands, and expected results.
- **Type consistency:** The plan consistently uses `data-page="blog"`, `data-ui-shell="blog-nav"`, `data-ui-shell="blog-hero"`, `data-ui-toolbar="blog-controls"`, `data-ui-shell="blog-footer"`, and `.blog-toolbar-shell`.
