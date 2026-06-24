# Homepage Hero Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页首屏收口为更克制、更高级的氛围封面，只保留导航、头像、主标题、副句与底栏，并删除标签区和整块入口区。

**Architecture:** 先扩展 `js/core-pages-ui.test.js`，把首页不再包含 `home-gateway`、标签胶囊和旧的强解释性结构变成可验证目标。随后只修改 `index.html` 与 `css/style.css`：前者重组 hero DOM、移除入口区和标签区，后者降低导航与背景噪声、重设头像/标题/副句/底栏比例，最后同步 `docs/CODE_WIKI.md` 并执行诊断与回归测试。

**Tech Stack:** 原生 HTML、多页面静态站点、共享 CSS、少量页内 JavaScript、Vitest + Node 文件断言、VS Code diagnostics

---

## File Map

### Core implementation
- Modify: `d:\Projects\shadowsky-blog\index.html`
  - 删除首页标签区和 `home-gateway` 区块，重组首屏 hero 结构与副句文案。
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
  - 新增首页 hero 收口样式，弱化导航、背景光斑、头像发光与标题攻击性，保留底栏。

### Validation
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
  - 将首页新结构、删除项和保留项纳入回归测试。

### Documentation
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
  - 更新首页职责描述，移除“频道入口摘要”表述，增加首页封面化说明。

---

### Task 1: 重写首页结构回归测试

**Files:**
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing test**

把当前首页测试从“要求存在 `home-gateway`”改成“要求首页是单一 hero 封面”：

```js
it('keeps the homepage as a single premium hero shell', () => {
  const html = readProjectFile('index.html');

  expect(html).toContain('data-ui-shell="home-hero"');
  expect(html).toContain('data-ui-group="hero-identity"');
  expect(html).toContain('data-ui-copy="hero-subtitle"');
  expect(html).toContain('class="public-footer');
  expect(html).toContain('id="typing-text"');

  expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
  expect(html.includes('data-ui-card="home-feature"')).toBe(false);
  expect(html.includes('data-ui-panel="home-overview"')).toBe(false);
  expect(html.includes('data-ui-stat="home-signal"')).toBe(false);
  expect(html.includes('#00后')).toBe(false);
  expect(html.includes('#UP主')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为当前 `index.html` 仍包含 `home-gateway`、标签胶囊和旧首页摘要结构。

- [ ] **Step 3: Write minimal implementation**

将旧首页测试块替换为：

```js
it('keeps the homepage as a single premium hero shell', () => {
  const html = readProjectFile('index.html');

  expect(html).toContain('data-ui-shell="home-hero"');
  expect(html).toContain('data-ui-group="hero-identity"');
  expect(html).toContain('data-ui-copy="hero-subtitle"');
  expect(html).toContain('class="public-footer');
  expect(html).toContain('id="typing-text"');

  expect(html.includes('data-ui-section="home-gateway"')).toBe(false);
  expect(html.includes('data-ui-card="home-feature"')).toBe(false);
  expect(html.includes('data-ui-panel="home-overview"')).toBe(false);
  expect(html.includes('data-ui-stat="home-signal"')).toBe(false);
  expect(html.includes('#00后')).toBe(false);
  expect(html.includes('#UP主')).toBe(false);
});
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL only on homepage structure assertions, not on JavaScript syntax.

- [ ] **Step 5: Commit**

```bash
git add js/core-pages-ui.test.js
git commit -m "test: redefine homepage hero regression coverage"
```

### Task 2: 收口首页 DOM，只保留 hero 封面

**Files:**
- Modify: `d:\Projects\shadowsky-blog\index.html`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Write the failing structural test**

在 Task 1 的测试里再补一个保留项断言，确保首页底栏仍保留：

```js
expect(html).toContain('id="visit-count"');
expect(html).toContain('layout-safe-top');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为当前首页虽然保留底栏，但还没有 `data-ui-shell="home-hero"` 与新语义结构。

- [ ] **Step 3: Write minimal implementation**

将首页 hero 内容容器改成单一语义壳层：

```html
<div class="public-shell public-shell--floating-nav layout-safe-top relative z-10 px-4 sm:px-6 lg:px-8 text-center w-full flex flex-col items-center justify-center pt-20 sm:pt-16 pb-16" data-ui-shell="home-hero">
  <div class="pointer-events-auto transform transition-all duration-500" data-ui-group="hero-identity">
```

把头像、标题和副句区替换为：

```html
<div class="homepage-hero-mark mb-6 sm:mb-8 relative inline-block group tilt-card transition-transform duration-100 ease-out" style="transform-style: preserve-3d;">
  <div class="absolute -inset-4 rounded-full homepage-hero-glow"></div>
  <img src="public/img/avatar.jpg" alt="Avatar" class="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-black object-cover shadow-2xl transform translate-z-10 transition-all duration-500">
  <div class="absolute bottom-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-4 border-white dark:border-black rounded-full z-20 shadow-[0_0_12px_rgba(34,197,94,0.45)]" title="Online"></div>
</div>

<h1 class="homepage-hero-title text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-4 sm:mb-5">
  <span class="block text-slate-800 dark:text-white">探索未知</span>
  <span class="block text-transparent bg-clip-text homepage-hero-accent">记录美好</span>
</h1>

<p id="typing-text" class="homepage-hero-subtitle mt-4 max-w-xl mx-auto px-4 text-sm sm:text-lg md:text-xl leading-relaxed font-medium min-h-[3rem]" data-ui-copy="hero-subtitle">
  <!-- Typing effect will populate this -->
</p>
```

并把打字文案改短：

```js
const textToType = "在安静的光影与记录之间，继续向未知缓慢靠近。";
```

删除整个标签胶囊区：

```html
<!-- About Me Tags - Enhanced Layout -->
...
```

删除整个首页入口区：

```html
<section class="public-shell section-shell px-4 sm:px-6 lg:px-8 pb-20 editorial-stack" data-ui-section="home-gateway">
...
</section>
```

保留原有底栏，不删除。

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 首页结构测试 PASS，其他公开页测试继续保持 PASS。

- [ ] **Step 5: Commit**

```bash
git add index.html js/core-pages-ui.test.js
git commit -m "feat: simplify homepage into a single premium hero"
```

### Task 3: 收口首页视觉语言和比例

**Files:**
- Modify: `d:\Projects\shadowsky-blog\css\style.css`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Extend the failing stylesheet test**

在 `defines the shared shell selectors in the stylesheet` 里追加首页专项断言：

```js
expect(css).toContain('.homepage-hero-title');
expect(css).toContain('.homepage-hero-subtitle');
expect(css).toContain('.homepage-hero-mark');
expect(css).toContain('.homepage-hero-glow');
expect(css).toContain('.homepage-hero-accent');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: FAIL，因为 `style.css` 还没有首页 hero 收口样式。

- [ ] **Step 3: Write minimal implementation**

在 `css/style.css` 的公开页共享样式区追加：

```css
/* Homepage hero refinement */
body.public-page.liquid-glass-ui #navbar {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.66));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.dark body.public-page.liquid-glass-ui #navbar {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.62));
}

body.public-page.liquid-glass-ui .homepage-hero-mark {
  margin-inline: auto;
}

body.public-page.liquid-glass-ui .homepage-hero-glow {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.28), rgba(168, 85, 247, 0.16), transparent 70%);
  filter: blur(24px);
  opacity: 0.72;
}

body.public-page.liquid-glass-ui .homepage-hero-title {
  letter-spacing: -0.06em;
  line-height: 0.94;
  text-wrap: balance;
}

body.public-page.liquid-glass-ui .homepage-hero-accent {
  background-image: linear-gradient(120deg, rgba(59, 130, 246, 0.92), rgba(99, 102, 241, 0.84), rgba(139, 92, 246, 0.74));
}

body.public-page.liquid-glass-ui .homepage-hero-subtitle {
  color: rgba(71, 85, 105, 0.9);
  letter-spacing: 0.02em;
}

.dark body.public-page.liquid-glass-ui .homepage-hero-subtitle {
  color: rgba(203, 213, 225, 0.9);
}

body.public-page.liquid-glass-ui .public-footer {
  background: transparent !important;
  border-top: none !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

@media (max-width: 767px) {
  body.public-page.liquid-glass-ui .homepage-hero-title {
    line-height: 0.98;
  }

  body.public-page.liquid-glass-ui .homepage-hero-subtitle {
    max-width: 20rem;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 样式选择器断言 PASS。

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/core-pages-ui.test.js
git commit -m "feat: refine homepage hero visual hierarchy"
```

### Task 4: 更新首页文档说明并执行最终回归

**Files:**
- Modify: `d:\Projects\shadowsky-blog\docs\CODE_WIKI.md`
- Modify: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`
- Test: `d:\Projects\shadowsky-blog\js\core-pages-ui.test.js`

- [ ] **Step 1: Add one final regression check**

在 `js/core-pages-ui.test.js` 追加一个首页文案约束，防止旧文案回流：

```js
it('keeps the homepage free from self-descriptive tag chips and gateway copy', () => {
  const html = readProjectFile('index.html');

  expect(html.includes('Content Gateway')).toBe(false);
  expect(html.includes('从这里进入我的内容宇宙')).toBe(false);
  expect(html.includes('内容创作者与长期记录者')).toBe(false);
  expect(html.includes('#摄影')).toBe(false);
  expect(html.includes('#探索者')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it passes or fails only on remaining old copy**

Run:

```bash
npx vitest run d:/Projects/shadowsky-blog/js/core-pages-ui.test.js
```

Expected: 如果首页还有旧拷贝，测试会精确报出对应字符串；否则 PASS。

- [ ] **Step 3: Write minimal implementation**

将 `docs/CODE_WIKI.md` 首页职责描述从：

```md
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 作者门户、频道入口摘要、主题与导航壳、访问记录 |
```

改为：

```md
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 氛围化封面首页、主题与导航壳、访问记录 |
```

并在“前台液态玻璃 UI 系统”小节追加：

```md
- 首页首屏收口：`index.html` 删除标签区和 `home-gateway` 入口块，改为单一 hero 封面，只保留头像、主标题、副句与底栏，用于降低首页突兀感并统一视觉语言。
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
git commit -m "docs: record homepage hero refinement"
```

---

## Self-Review

### Spec coverage
- 删除“我是谁 / 我有什么内容”表达层：Task 2, Task 4
- 删除首页入口区与摘要带：Task 1, Task 2, Task 4
- 保留导航、头像、主标题、副句、底栏：Task 2
- 视觉目标改为更高级、更克制：Task 3
- 只改 `index.html` 与 `css/style.css`，并同步文档：Task 2, Task 3, Task 4

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task includes exact files, commands, expected outcomes, and concrete code snippets.

### Type consistency
- Homepage hooks stay consistent: `data-ui-shell="home-hero"`, `data-ui-group="hero-identity"`, `data-ui-copy="hero-subtitle"`.
- Homepage class names stay consistent: `.homepage-hero-title`, `.homepage-hero-subtitle`, `.homepage-hero-mark`, `.homepage-hero-glow`, `.homepage-hero-accent`.
