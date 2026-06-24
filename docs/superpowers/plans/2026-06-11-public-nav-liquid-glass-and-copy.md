# Public Nav Liquid Glass And Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the public-site navigation so it reads as liquid glass and unify all public-page navigation copy to `首页 / 笔记 / 片刻 / 收藏 / 订阅 / ACG / 关于`.

**Architecture:** Keep the existing multi-page HTML structure and shared `css/style.css`, then tighten behavior with regression tests before touching styling and page copy. Implement the liquid-glass upgrade in shared CSS, then update each public page's desktop titles, mobile menu text, and navigation `aria-label` copy without refactoring the navigation into a shared renderer.

**Tech Stack:** Static HTML, shared CSS, Lucide icons, Vitest string-based regression tests

---

## File Map

- **Modify:** `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - Add failing assertions for the new navigation names, removal of `视频`, and presence of stronger liquid-glass selectors.
- **Modify:** `d:\Projects\shadowsky-blog\css\style.css`
  - Upgrade shared public navigation and mobile menu visuals to the approved liquid-glass language.
- **Modify:** `d:\Projects\shadowsky-blog\index.html`
  - Update homepage desktop nav titles, mobile menu text, and menu/toggle `aria-label` copy.
- **Modify:** `d:\Projects\shadowsky-blog\blog.html`
  - Update nav copy and keep the blog page active state aligned with `笔记`.
- **Modify:** `d:\Projects\shadowsky-blog\post.html`
  - Update nav copy for post detail pages.
- **Modify:** `d:\Projects\shadowsky-blog\moments.html`
  - Update nav copy and keep the moments page active state aligned with `片刻`.
- **Modify:** `d:\Projects\shadowsky-blog\bookmarks.html`
  - Update nav copy and keep the bookmarks page active state aligned with `收藏`.
- **Modify:** `d:\Projects\shadowsky-blog\rss.html`
  - Update nav copy and keep the RSS page active state aligned with `订阅`.
- **Modify:** `d:\Projects\shadowsky-blog\acg.html`
  - Update nav copy and keep the ACG page active state aligned with `ACG`.
- **Modify:** `d:\Projects\shadowsky-blog\anime.html`
  - Update nav copy and keep ACG-related subpages pointing back to `ACG`.
- **Modify:** `d:\Projects\shadowsky-blog\manga.html`
  - Update nav copy and keep ACG-related subpages pointing back to `ACG`.
- **Modify:** `d:\Projects\shadowsky-blog\edits.html`
  - Update nav copy and keep ACG-related subpages pointing back to `ACG`.
- **Modify:** `d:\Projects\shadowsky-blog\about.html`
  - Update nav copy and keep the about page active state aligned with `关于`.
- **Modify:** `d:\Projects\shadowsky-blog\404.html`
  - Update nav copy on the not-found page.
- **Modify:** `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - Record the public navigation naming and liquid-glass responsibility change.

### Shared copy map

- `首页` -> tooltip/copy: `回到首页`
- `笔记` -> tooltip/copy: `查看文章与记录`
- `片刻` -> tooltip/copy: `查看日常瞬间`
- `收藏` -> tooltip/copy: `查看收藏内容`
- `订阅` -> tooltip/copy: `查看 RSS 与订阅源`
- `ACG` -> tooltip/copy: `查看追番、漫画与剪辑`
- `关于` -> tooltip/copy: `了解站点与作者`
- Theme toggle desktop/mobile -> `切换主题`
- Mobile menu button -> `打开导航菜单`

### Liquid-glass styling targets

- Shared public nav shell must gain:
  - stronger outer border and inner highlight
  - separate light/dark theme recipes
  - active-state “liquid island” treatment
  - hover-state highlight drift without heavy motion
- Shared mobile menu must gain:
  - the same light/dark glass language
  - active item island treatment
  - tighter relation to the navigation shell rather than a generic drawer

### Task 1: Lock the regression tests first

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
  expect(css).toContain('.public-page.liquid-glass-ui #mobile-menu');
  expect(css).toContain('html:not(.dark) body.public-page.liquid-glass-ui #navbar .nav-link');
  expect(css).toContain('.dark body.public-page.liquid-glass-ui #navbar .nav-link');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: FAIL because several pages still contain `title="星空笔记"`, `title="随手拍"`, `title="视频"`, and `css/style.css` does not yet contain the new shared liquid-glass selectors.

- [ ] **Step 3: Save the red test without implementation changes**

```js
// Keep the existing tests, append the two new regression cases near the other
// homepage/public-shell assertions so the navigation contract stays visible.
```

- [ ] **Step 4: Re-run the focused test to keep the red baseline**

Run:

```bash
npx vitest run js/core-pages-ui.test.js --reporter=dot
```

Expected: FAIL with the same missing navigation-name and selector assertions.

- [ ] **Step 5: Commit the red baseline**

```bash
git add d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "test: lock public nav naming and liquid glass expectations"
```

### Task 2: Implement the shared liquid-glass navigation styling

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add the minimal shared selectors needed by the failing CSS test**

```css
body.public-page.liquid-glass-ui #navbar .nav-link {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid transparent;
  isolation: isolate;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 220ms ease,
    transform 220ms ease;
}

body.public-page.liquid-glass-ui #navbar .nav-link::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 180ms ease, transform 220ms ease;
}

body.public-page.liquid-glass-ui #navbar .nav-link[aria-current="page"] {
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Add the approved day/night material split**

```css
html:not(.dark) body.public-page.liquid-glass-ui #navbar .nav-link {
  color: rgba(51, 65, 85, 0.92);
  border-color: rgba(191, 219, 254, 0.58);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.18));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -10px 18px rgba(191, 219, 254, 0.08);
}

html:not(.dark) body.public-page.liquid-glass-ui #navbar .nav-link::before {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(219, 234, 254, 0.22));
}

.dark body.public-page.liquid-glass-ui #navbar .nav-link {
  color: rgba(226, 232, 240, 0.92);
  border-color: rgba(71, 85, 105, 0.72);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.54), rgba(15, 23, 42, 0.24));
  box-shadow:
    inset 0 1px 0 rgba(148, 163, 184, 0.12),
    inset 0 -12px 20px rgba(15, 23, 42, 0.2);
}
```

- [ ] **Step 3: Add hover and active-state liquid-island treatment**

```css
body.public-page.liquid-glass-ui #navbar .nav-link:hover::before,
body.public-page.liquid-glass-ui #navbar .nav-link:focus-visible::before {
  opacity: 1;
}

html:not(.dark) body.public-page.liquid-glass-ui #navbar .nav-link[aria-current="page"] {
  color: rgb(30, 64, 175);
  border-color: rgba(147, 197, 253, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(219, 234, 254, 0.52));
  box-shadow:
    0 8px 22px rgba(59, 130, 246, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.dark body.public-page.liquid-glass-ui #navbar .nav-link[aria-current="page"] {
  color: rgb(191, 219, 254);
  border-color: rgba(96, 165, 250, 0.44);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.84), rgba(30, 64, 175, 0.18));
  box-shadow:
    0 12px 24px rgba(2, 6, 23, 0.24),
    inset 0 1px 0 rgba(191, 219, 254, 0.12);
}
```

- [ ] **Step 4: Apply the same material language to the shared mobile menu panel**

```css
body.public-page.liquid-glass-ui #mobile-menu {
  border-top: 0;
  border-radius: 0 0 1.75rem 1.75rem;
}

html:not(.dark) body.public-page.liquid-glass-ui #mobile-menu {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(239, 246, 255, 0.78));
  box-shadow:
    0 22px 48px rgba(148, 163, 184, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.dark body.public-page.liquid-glass-ui #mobile-menu {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.84));
  box-shadow:
    0 24px 56px rgba(2, 6, 23, 0.42),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}
```

- [ ] **Step 5: Run the shared UI test and make it pass for CSS expectations**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: the selector-based liquid-glass test passes, while the navigation-copy test may still fail until the HTML pages are updated.

- [ ] **Step 6: Commit the shared style layer**

```bash
git add d:/Projects/shadowsky-blog/css/style.css d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
git commit -m "feat: strengthen public nav liquid glass styling"
```

### Task 3: Update public-page navigation copy page by page

**Files:**
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

- [ ] **Step 1: Update the homepage navigation copy contract**

```html
<a href="blog.html" class="nav-link ..." title="笔记" aria-label="查看文章与记录">
  <i data-lucide="file-text" class="w-5 h-5"></i>
</a>
<a href="moments.html" class="nav-link ..." title="片刻" aria-label="查看日常瞬间">
  <i data-lucide="camera" class="w-5 h-5"></i>
</a>
<a href="acg.html" class="nav-link ..." title="ACG" aria-label="查看追番、漫画与剪辑">
  <i data-lucide="film" class="w-5 h-5"></i>
</a>

<button id="theme-toggle" ... aria-label="切换主题">
<button id="mobile-menu-btn" ... aria-label="打开导航菜单">

<a href="blog.html" class="homepage-mobile-menu-link ...">
  <i data-lucide="file-text" class="w-5 h-5 mr-3"></i>
  笔记
</a>
<a href="moments.html" class="homepage-mobile-menu-link ...">
  <i data-lucide="camera" class="w-5 h-5 mr-3"></i>
  片刻
</a>
<a href="acg.html" class="homepage-mobile-menu-link ...">
  <i data-lucide="film" class="w-5 h-5 mr-3"></i>
  ACG
</a>
```

- [ ] **Step 2: Apply the same literal replacement map to every remaining public page**

```text
title="星空笔记"  -> title="笔记"
title="随手拍"    -> title="片刻"
title="视频"      -> title="ACG"
>星空笔记<        -> >笔记<
>随手拍<          -> >片刻<
>视频<            -> >ACG<
aria-label="Toggle Theme" -> aria-label="切换主题"
aria-label="Toggle Menu"  -> aria-label="打开导航菜单"
```

- [ ] **Step 3: Preserve correct active-state semantics while updating copy**

```html
<!-- Example for blog.html -->
<a href="blog.html"
   class="nav-link ... bg-blue-50/80 text-blue-600 ..."
   title="笔记"
   aria-current="page"
   aria-label="查看文章与记录">
  <i data-lucide="file-text" class="w-5 h-5"></i>
</a>

<!-- Example for acg.html / anime.html / manga.html / edits.html -->
<a href="acg.html"
   class="nav-link ... bg-blue-50/80 text-blue-600 ..."
   title="ACG"
   aria-current="page"
   aria-label="查看追番、漫画与剪辑">
  <i data-lucide="film" class="w-5 h-5"></i>
</a>
```

- [ ] **Step 4: Run the public UI test to verify all page copy is aligned**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS. The new test should confirm `title="ACG"` exists across all public pages and `视频` no longer appears in desktop or mobile navigation text.

- [ ] **Step 5: Commit the page-copy sweep**

```bash
git add d:/Projects/shadowsky-blog/index.html d:/Projects/shadowsky-blog/blog.html d:/Projects/shadowsky-blog/post.html d:/Projects/shadowsky-blog/moments.html d:/Projects/shadowsky-blog/bookmarks.html d:/Projects/shadowsky-blog/rss.html d:/Projects/shadowsky-blog/acg.html d:/Projects/shadowsky-blog/anime.html d:/Projects/shadowsky-blog/manga.html d:/Projects/shadowsky-blog/edits.html d:/Projects/shadowsky-blog/about.html d:/Projects/shadowsky-blog/404.html
git commit -m "feat: unify public navigation copy"
```

### Task 4: Update docs and run the final verification sweep

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Update the code wiki entry for the public navigation contract**

```md
- 公开页导航：桌面导航、移动端菜单与按钮提示统一使用“首页 / 笔记 / 片刻 / 收藏 / 订阅 / ACG / 关于”口径；`ACG` 入口用于承载追番、漫画与剪辑聚合内容。
- 液态玻璃导航：`css/style.css` 中的公开页导航采用共享液态玻璃骨架，并拆分日间与夜间专属材质规则，避免主题互相污染。
```

- [ ] **Step 2: Run the regression suite and diagnostics**

Run:

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

Run:

```bash
# Use workspace diagnostics after the edits
```

Expected: no new diagnostics in `css/style.css`, updated HTML pages, or `docs/CODE_WIKI.md`.

- [ ] **Step 3: Do a quick manual browser pass**

Check:

```text
1. 日间模式首页：导航胶囊有更明显厚度和高光，桌面 tooltip 为“笔记 / 片刻 / ACG”。
2. 夜间模式首页：导航不再带日间冷白污染，active 态仍像液态高亮岛。
3. 移动端菜单：文本改为“笔记 / 片刻 / ACG”，面板材质与顶部导航一致。
4. blog.html 与 acg.html：各自栏目按钮保持正确高亮，并使用新文案。
```

- [ ] **Step 4: Commit docs and verification bookkeeping**

```bash
git add d:/Projects/shadowsky-blog/docs/CODE_WIKI.md d:/Projects/shadowsky-blog/js/core-pages-ui.test.js d:/Projects/shadowsky-blog/css/style.css
git commit -m "docs: record public navigation contract"
```

## Self-Review

- **Spec coverage:** The plan covers the approved naming map, stronger liquid-glass styling, strict light/dark separation, desktop/mobile navigation updates, tests, and code-wiki sync. No spec requirement is left without a task.
- **Placeholder scan:** The only deliberate non-command placeholder is the diagnostics note in Task 4 Step 2, because diagnostics are run through the editor tool rather than shell; the execution worker must use workspace diagnostics there instead of inventing a shell command.
- **Type consistency:** The plan uses one stable naming contract (`首页 / 笔记 / 片刻 / 收藏 / 订阅 / ACG / 关于`) and one stable selector family (`#navbar .nav-link`, `#mobile-menu`, `aria-current="page"`), matching the approved spec and existing markup.

