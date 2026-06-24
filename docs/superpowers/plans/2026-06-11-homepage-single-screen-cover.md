# Homepage Single-Screen Cover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页改成真正的单屏封面页，让导航、hero、底栏在一屏内完整显示，并修复顶部背景断层。

**Architecture:** 先扩展 `js/core-pages-ui.test.js`，把“首页严格单屏”和“背景从顶部到底部连续覆盖”变成可验证目标。随后只修改 `index.html` 与 `css/style.css`：前者收紧容器高度分配并让导航、hero、底栏归属于同一封面壳层，后者统一首页背景承载、消除顶部断层并压缩单屏垂直节奏，最后同步 `docs/CODE_WIKI.md` 并执行诊断与回归测试。

**Tech Stack:** 原生 HTML、多页面静态站点、共享 CSS、少量页内 JavaScript、Vitest + Node 文件断言、VS Code diagnostics

---

## File Map

### Core implementation
- Modify: `d:\Projects\shadowsky-blog\index.html`
  - 把首页根容器调整为严格单屏封面，重分配导航、hero、底栏的视口高度关系。
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
  - 追加首页单屏封面与背景统一样式，解决顶部背景断层与过高内容堆叠问题。

### Validation
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - 增加首页单屏封面和背景连续性的结构回归测试。

### Documentation
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - 更新首页职责说明，补充“单屏封面 + 背景统一”的约束。

---

### Task 1: 重写首页单屏封面回归测试

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing test**

把首页测试从“单一 hero 封面”扩展到“严格单屏封面”：

```js
it('keeps the homepage as a strict single-screen cover', () => {
  const html = readProjectFile('index.html');

  expect(html).toContain('data-ui-shell="home-cover"');
  expect(html).toContain('data-ui-shell="home-hero"');
  expect(html).toContain('data-ui-region="home-footer"');
  expect(html).toContain('min-h-screen');
  expect(html).toContain('overflow-hidden');
  expect(html).toContain('homepage-cover-stage');

  expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
  expect(html.includes('Content Gateway')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为当前 `index.html` 仍然只有 `data-ui-shell="home-hero"`，还没有单屏封面壳层和底栏语义区。

- [ ] **Step 3: Write minimal implementation**

把现有首页测试块改成：

```js
it('keeps the homepage as a strict single-screen cover', () => {
  const html = readProjectFile('index.html');

  expect(html).toContain('data-ui-shell="home-cover"');
  expect(html).toContain('data-ui-shell="home-hero"');
  expect(html).toContain('data-ui-region="home-footer"');
  expect(html).toContain('min-h-screen');
  expect(html).toContain('overflow-hidden');
  expect(html).toContain('homepage-cover-stage');
  expect(html).toContain('w-20 h-20 sm:w-24 sm:h-24');

  expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
  expect(html.includes('Content Gateway')).toBe(false);
});
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL only on homepage single-screen structure assertions.

- [ ] **Step 5: Commit**

```bash
git add js/core-pages-ui.test.js
git commit -m "test: add homepage single-screen cover coverage"
```

### Task 2: 收口首页 DOM 为严格单屏封面

**Files:**
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one more failing structural assertion**

在 Task 1 的测试里补充首页根容器与底栏位置断言：

```js
expect(html).toContain('data-ui-region="home-stage"');
expect(html).toContain('homepage-cover-footer');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为当前首页还没有单屏 stage / footer 结构。

- [ ] **Step 3: Write minimal implementation**

把首页 hero 外层改成严格单屏壳层：

```html
<main class="homepage-cover-stage relative min-h-screen h-[100dvh] w-full overflow-hidden transition-colors duration-500" data-ui-shell="home-cover">
```

把背景层与内容层放进统一 stage：

```html
<div class="absolute inset-0 z-0" data-ui-region="home-stage">
```

把内容容器改为按可视高度分配：

```html
<div class="public-shell public-shell--floating-nav layout-safe-top homepage-cover-content relative z-10 px-4 sm:px-6 lg:px-8 text-center w-full flex flex-col items-center justify-center" data-ui-shell="home-hero">
```

把底栏改成单屏封面下缘区：

```html
<div class="public-footer homepage-cover-footer absolute inset-x-0 bottom-4 text-center z-20 pointer-events-none" data-ui-region="home-footer">
```

并删除 hero 容器上原本会继续撑高页面的 `pt-20 sm:pt-16 pb-16`。

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 首页单屏结构断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add index.html js/core-pages-ui.test.js
git commit -m "feat: convert homepage into a single-screen cover"
```

### Task 3: 统一首页背景承载并消除顶部断层

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing stylesheet test**

在样式断言里追加首页单屏类：

```js
expect(css).toContain('.homepage-cover-stage');
expect(css).toContain('.homepage-cover-content');
expect(css).toContain('.homepage-cover-footer');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为 `style.css` 还没有单屏封面与背景统一样式。

- [ ] **Step 3: Write minimal implementation**

在 `css/style.css` 的首页样式区追加：

```css
body.public-page.liquid-glass-ui .homepage-cover-stage {
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

body.public-page.liquid-glass-ui .homepage-cover-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.16), transparent 32%),
    radial-gradient(circle at top right, rgba(167, 139, 250, 0.14), transparent 28%),
    radial-gradient(circle at bottom center, rgba(34, 197, 94, 0.1), transparent 28%);
  pointer-events: none;
  z-index: 0;
}

body.public-page.liquid-glass-ui .homepage-cover-content {
  min-height: 100%;
  padding-top: clamp(5.25rem, 7vh, 6rem);
  padding-bottom: clamp(4.5rem, 8vh, 5.5rem);
}

body.public-page.liquid-glass-ui .homepage-cover-footer {
  padding-inline: 1rem;
}
```

这段样式的作用是：
- 单屏容器自己承载完整背景
- 顶部到尾部使用同一张背景语义
- 内容与底栏在同一个视口壳层里分配高度

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 单屏样式选择器断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/core-pages-ui.test.js
git commit -m "feat: unify homepage cover background layer"
```

### Task 4: 压缩首页垂直节奏，确保桌面端严格一屏

**Files:**
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one final homepage layout assertion**

在首页测试块里补充 tighter spacing 约束：

```js
expect(html).toContain('homepage-cover-content');
expect(html).toContain('homepage-cover-footer');
```

并在样式断言里补充：

```js
expect(css).toContain('.homepage-cover-content');
expect(css).toContain('.homepage-cover-footer');
```

- [ ] **Step 2: Run test to verify it fails or stays red on missing classes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 如果 Task 3 尚未加入这些类则 FAIL；完成后继续用于守卫结构。

- [ ] **Step 3: Write minimal implementation**

把 hero 内部间距和标题节奏进一步收紧：

```html
<div class="homepage-hero-mark mb-4 sm:mb-5 relative inline-block group tilt-card transition-transform duration-100 ease-out" style="transform-style: preserve-3d;">
```

```html
<h1 class="homepage-hero-title text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-3 sm:mb-4">
```

```html
<p id="typing-text" class="homepage-hero-subtitle mt-3 max-w-xl mx-auto px-4 text-sm sm:text-base md:text-lg leading-relaxed font-medium min-h-[2.5rem]" data-ui-copy="hero-subtitle">
```

在 `style.css` 中继续补：

```css
body.public-page.liquid-glass-ui .homepage-cover-content > [data-ui-group="hero-identity"] {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: clamp(0.75rem, 2vh, 1rem);
}

body.public-page.liquid-glass-ui .homepage-cover-footer {
  bottom: clamp(0.75rem, 2vh, 1.25rem);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 首页单屏守卫测试继续 PASS。

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/core-pages-ui.test.js
git commit -m "feat: tighten homepage cover vertical rhythm"
```

### Task 5: 更新首页文档说明并执行最终回归

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one final regression check**

在 `js/core-pages-ui.test.js` 末尾追加：

```js
it('keeps the homepage background unified and free from gateway copy', () => {
  const html = readProjectFile('index.html');
  const css = readProjectFile('css/style.css');

  expect(html.includes('Content Gateway')).toBe(false);
  expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
  expect(css).toContain('.homepage-cover-stage');
  expect(css).toContain('.homepage-cover-content');
  expect(css).toContain('.homepage-cover-footer');
});
```

- [ ] **Step 2: Run test to verify it passes or fails only on remaining old structure**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 如果首页仍残留旧入口结构或缺少单屏类，测试会精确报出对应项；否则 PASS。

- [ ] **Step 3: Write minimal implementation**

将 `docs/CODE_WIKI.md` 首页职责描述从：

```md
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 氛围化封面首页、主题与导航壳、访问记录 |
```

改为：

```md
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 单屏封面首页、统一背景承载、主题与导航壳、访问记录 |
```

并在“前台液态玻璃 UI 系统”小节追加：

```md
- 首页单屏封面：`index.html` 进一步改为严格单屏封面布局，导航、hero 与底栏位于同一背景容器中，用于解决首页滚动感和顶部背景断层问题。
```

- [ ] **Step 4: Run tests and diagnostics**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Then inspect diagnostics for:

```text
d:\Projects\shadowsky-blog\index.html
d:\Projects\shadowsky-blog\css\style.css
d:\Projects\shadowsky-blog\js\core-pages-ui.test.js
d:\Projects\shadowsky-blog\docs\CODE_WIKI.md
```

Expected: `core-pages-ui.test.js` PASS，且上述文件没有新增明显诊断问题。

- [ ] **Step 5: Commit**

```bash
git add docs/CODE_WIKI.md js/core-pages-ui.test.js index.html css/style.css
git commit -m "docs: record homepage single-screen cover"
```

---

## Self-Review

### Spec coverage
- 首页全部内容一屏显示完：Task 2, Task 4
- 导航、hero、底栏归于同一封面：Task 2, Task 3
- 顶部背景断层修复：Task 3, Task 5
- 首页范围控制在单页内：Task 2, Task 3, Task 5
- 文档同步与最终回归：Task 5

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task includes exact files, commands, expected outcomes, and concrete code snippets.

### Type consistency
- Homepage hooks stay consistent: `data-ui-shell="home-cover"`, `data-ui-shell="home-hero"`, `data-ui-region="home-stage"`, `data-ui-region="home-footer"`.
- Homepage class names stay consistent: `.homepage-cover-stage`, `.homepage-cover-content`, `.homepage-cover-footer`.
