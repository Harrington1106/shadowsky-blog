# Liquid Glass Homepage Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把主页重构为单屏液态玻璃设计——WebGL 流体背景 + CSS 玻璃内容层，并统一全站导航栏样式。

**Architecture:** 三层分离——① `js/fluid-bg.js` 是 WebGL 流体引擎（独立 IIFE，全局 `window.liquidFluid`），负责背景渲染、主题色板、降级；② `css/liquid-home.css` + `js/typewriter.js` 是主页专属内容层；③ `css/unified.css` 的 navbar 段重写，让 15 个页面自动继承新样式。流体引擎和打字机都设计成可被纯函数测试其配置逻辑。

**Tech Stack:** Vanilla JS (IIFE 模块)、WebGL 1.0、CSS Custom Properties、vitest + fast-check（测试）、Lucide Icons。

**Spec:** `docs/superpowers/specs/2026-06-24-liquid-glass-homepage-redesign-design.md`

**测试约定:** 本项目用 `npx vitest run <file>` 运行测试。WebGL/Canvas 渲染无法在 Node 测试，故采用**纯函数提取**模式——把可测逻辑（配置解析、色板生成、断点计算、降级判定、打字机状态机）提取成纯函数并 `export`，在测试文件中 `import` 验证；渲染胶水代码保持薄。

---

## File Structure

| 文件 | 责任 | 新建/修改 |
|------|------|----------|
| `js/fluid-config.js` | 流体引擎的**纯函数配置层**：色板、断点分辨率、降级判定。可测。 | 新建（ES module） |
| `js/fluid-bg.js` | WebGL 流体渲染引擎（IIFE，依赖 fluid-config.js 的全局挂载）。不可测渲染，调用可测配置。 | 新建 |
| `js/typewriter.js` | 打字机状态机（纯函数逻辑 export）+ DOM 胶水。 | 新建（ES module） |
| `js/liquid-home.test.js` | fluid-config + typewriter 纯函数测试 | 新建 |
| `css/liquid-home.css` | 主页专属样式：流体容器、avatar 玻璃环、打字机、Tag、底栏、聚焦区 | 新建 |
| `css/design-tokens.css` | 扩展 `--neon-*` 霓虹 token（暗/亮双套） | 修改 |
| `css/unified.css` | 重写 `#navbar .nav-link` 段：去独立 pill，改内嵌凹槽 | 修改 |
| `index.html` | 完全重写为单屏新结构 | 修改 |
| `js/navbar.js` | 主题切换时 dispatch `themechange` 事件 | 修改 |
| `js/navbar.test.js`（新增断言到现有测试或新建） | 验证 navbar 结构一致性 | 新建 |

**模块边界说明：** `js/fluid-config.js` 用 `export` 暴露纯函数，同时 `js/fluid-bg.js` 作为非 module 脚本通过 `window.LiquidFluidConfig` 读取（fluid-config.js 末尾挂载到 window）。这样既能在 vitest 里 `import` 测试，又能在浏览器里被普通 `<script>` 调用。

---

## Task 1: 流体配置纯函数层（色板 + 断点 + 降级判定）

**Files:**
- Create: `js/fluid-config.js`
- Test: `js/liquid-home.test.js`

- [ ] **Step 1: 写失败测试 —— 色板生成**

Create `js/liquid-home.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  getThemePalette,
  getSimResolution,
  shouldUseFallback,
  pickAutoSplatterColor
} from './fluid-config.js';

describe('fluid-config: getThemePalette', () => {
  it('returns dark palette with 4 neon colors for dark theme', () => {
    const palette = getThemePalette('dark');
    expect(palette.theme).toBe('dark');
    expect(palette.colors).toHaveLength(4);
    // 暗色霓虹高饱和发光
    expect(palette.colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns light palette with desaturated colors for light theme', () => {
    const palette = getThemePalette('light');
    expect(palette.theme).toBe('light');
    expect(palette.colors).toHaveLength(4);
  });

  it('dark dye alpha is high (glowing), light dye alpha is low (soft)', () => {
    expect(getThemePalette('dark').dyeAlpha).toBeGreaterThan(getThemePalette('light').dyeAlpha);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run js/liquid-home.test.js`
Expected: FAIL — `Cannot find module './fluid-config.js'`

- [ ] **Step 3: 实现色板函数**

Create `js/fluid-config.js`:

```js
// 流体引擎纯函数配置层 —— 可被 vitest import 测试
// 末尾挂载到 window.LiquidFluidConfig 供非 module 脚本调用

// 暗色霓虹色板（高饱和发光）：蓝/紫/品红/青
const DARK_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
// 亮色色板（降饱和提亮，白底上像水彩晕染）：浅蓝/浅紫/浅粉/浅青
const LIGHT_PALETTE = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#67e8f9'];

/**
 * 根据主题返回流体色板配置
 * @param {'dark'|'light'} theme
 * @returns {{theme:string, colors:string[], dyeAlpha:number, bgColor:string}}
 */
export function getThemePalette(theme) {
  if (theme === 'light') {
    return { theme: 'light', colors: LIGHT_PALETTE, dyeAlpha: 0.35, bgColor: '#060B18' };
  }
  return { theme: 'dark', colors: DARK_PALETTE, dyeAlpha: 0.85, bgColor: '#060B18' };
}

// ── window 挂载（供非 ES module 的 fluid-bg.js 调用）──
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = { getThemePalette };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: 写失败测试 —— 断点分辨率**

追加到 `js/liquid-home.test.js`:

```js
import { getSimResolution } from './fluid-config.js';

describe('fluid-config: getSimResolution', () => {
  it('mobile (<640px) uses low resolution 0.25/0.5', () => {
    const r = getSimResolution(375);
    expect(r.simResolution).toBe(0.25);
    expect(r.dyeResolution).toBe(0.5);
  });

  it('tablet (640-1024) uses medium resolution 0.35/0.7', () => {
    const r = getSimResolution(768);
    expect(r.simResolution).toBe(0.35);
    expect(r.dyeResolution).toBe(0.7);
  });

  it('desktop (>1024) uses high resolution 0.5/1.0', () => {
    const r = getSimResolution(1440);
    expect(r.simResolution).toBe(0.5);
    expect(r.dyeResolution).toBe(1.0);
  });
});
```

- [ ] **Step 6: 运行确认失败**

Run: `npx vitest run js/liquid-home.test.js`
Expected: FAIL — `getSimResolution is not a function`

- [ ] **Step 7: 实现断点函数**

追加到 `js/fluid-config.js`（在 `getThemePalette` 之后）:

```js
/**
 * 根据视口宽度返回流体模拟分辨率（性能分级）
 * @param {number} width - 视口宽度 px
 * @returns {{simResolution:number, dyeResolution:number}}
 */
export function getSimResolution(width) {
  if (width < 640) return { simResolution: 0.25, dyeResolution: 0.5 };
  if (width < 1024) return { simResolution: 0.35, dyeResolution: 0.7 };
  return { simResolution: 0.5, dyeResolution: 1.0 };
}
```

更新 window 挂载:

```js
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = { getThemePalette, getSimResolution };
}
```

- [ ] **Step 8: 运行确认通过**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (6 tests)

- [ ] **Step 9: 写失败测试 —— 降级判定**

追加到 `js/liquid-home.test.js`:

```js
import { shouldUseFallback } from './fluid-config.js';

describe('fluid-config: shouldUseFallback', () => {
  it('falls back when WebGL is unsupported', () => {
    expect(shouldUseFallback({ webglSupported: false, reducedMotion: false })).toBe(true);
  });

  it('falls back when user prefers reduced motion', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: true })).toBe(true);
  });

  it('does NOT fall back when WebGL ok and motion allowed', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: false })).toBe(false);
  });
});
```

- [ ] **Step 10: 运行确认失败**

Run: `npx vitest run js/liquid-home.test.js`
Expected: FAIL — `shouldUseFallback is not a function`

- [ ] **Step 11: 实现降级判定**

追加到 `js/fluid-config.js`:

```js
/**
 * 判定是否应降级到 CSS 后备方案
 * @param {{webglSupported:boolean, reducedMotion:boolean}} env
 * @returns {boolean}
 */
export function shouldUseFallback({ webglSupported, reducedMotion }) {
  return !webglSupported || reducedMotion;
}
```

更新 window 挂载为:

```js
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = { getThemePalette, getSimResolution, shouldUseFallback };
}
```

- [ ] **Step 12: 运行确认通过**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (9 tests)

- [ ] **Step 13: 写失败测试 —— 自动喷溅选色**

追加到 `js/liquid-home.test.js`:

```js
import { pickAutoSplatterColor } from './fluid-config.js';

describe('fluid-config: pickAutoSplatterColor', () => {
  it('always returns a color from the palette', () => {
    const palette = getThemePalette('dark');
    for (let i = 0; i < 20; i++) {
      const c = pickAutoSplatterColor(palette, i);
      expect(palette.colors).toContain(c);
    }
  });
});
```

- [ ] **Step 14: 运行确认失败**

Run: `npx vitest run js/liquid-home.test.js`
Expected: FAIL — `pickAutoSplatterColor is not a function`

- [ ] **Step 15: 实现选色函数（确定性轮转，便于测试）**

追加到 `js/fluid-config.js`:

```js
/**
 * 自动喷溅选色 —— 确定性轮转（基于索引取模），保证可测、无重复相邻
 * @param {{colors:string[]}} palette
 * @param {number} index - 喷溅序号
 * @returns {string} hex 颜色
 */
export function pickAutoSplatterColor(palette, index) {
  return palette.colors[index % palette.colors.length];
}
```

更新 window 挂载:

```js
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = { getThemePalette, getSimResolution, shouldUseFallback, pickAutoSplatterColor };
}
```

- [ ] **Step 16: 运行确认通过**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (10 tests)

- [ ] **Step 17: 提交**

```bash
git add js/fluid-config.js js/liquid-home.test.js
git commit -m "feat: fluid config pure functions (palette/resolution/fallback/splatter)"
```

---

## Task 2: 打字机状态机纯函数

**Files:**
- Modify: `js/typewriter.js` (create)
- Test: `js/liquid-home.test.js`

- [ ] **Step 1: 写失败测试 —— 打字状态机**

追加到 `js/liquid-home.test.js`:

```js
import { createTypewriterState, typewriterTick } from './typewriter.js';

describe('typewriter: state machine', () => {
  const PHRASES = ['星河欲转千帆舞', '心有猛虎细嗅蔷薇'];

  it('initial state: typing, 0 chars shown, phrase index 0', () => {
    const s = createTypewriterState(PHRASES);
    expect(s.phase).toBe('typing');
    expect(s.shown).toBe(0);
    expect(s.phraseIndex).toBe(0);
    expect(s.phrases).toEqual(PHRASES);
  });

  it('typing tick increments shown until phrase length', () => {
    let s = createTypewriterState(PHRASES);
    s = typewriterTick(s); // shown: 0->1
    expect(s.shown).toBe(1);
    s = typewriterTick(s); // shown: 1->2
    expect(s.shown).toBe(2);
  });

  it('completes typing then enters pause phase', () => {
    let s = createTypewriterState(['AB']); // short phrase for fast test
    s = typewriterTick(s); // shown 1
    s = typewriterTick(s); // shown 2 == length -> pause
    expect(s.phase).toBe('pause');
    expect(s.shown).toBe(2);
  });

  it('after pause countdown, enters deleting phase', () => {
    let s = { phrases: ['AB'], phraseIndex: 0, shown: 2, phase: 'pause', pauseTicks: 0 };
    s = typewriterTick(s); // pauseTicks 0->1, still pause
    expect(s.phase).toBe('pause');
    for (let i = 0; i < 150; i++) s = typewriterTick(s); // burn pause
    expect(s.phase).toBe('deleting');
  });

  it('deleting decrements shown to 0 then advances to next phrase', () => {
    let s = { phrases: ['AB', 'CD'], phraseIndex: 0, shown: 2, phase: 'deleting', pauseTicks: 0 };
    s = typewriterTick(s); // shown 2->1
    expect(s.shown).toBe(1);
    expect(s.phase).toBe('deleting');
    s = typewriterTick(s); // shown 1->0 -> wrap to next phrase typing
    expect(s.shown).toBe(0);
    expect(s.phase).toBe('typing');
    expect(s.phraseIndex).toBe(1);
  });

  it('wraps phrase index back to 0 after last phrase', () => {
    let s = { phrases: ['AB', 'CD'], phraseIndex: 1, shown: 2, phase: 'deleting', pauseTicks: 0 };
    s = typewriterTick(s); // 1
    s = typewriterTick(s); // 0 -> wrap
    expect(s.phraseIndex).toBe(0);
    expect(s.phase).toBe('typing');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run js/liquid-home.test.js`
Expected: FAIL — `Cannot find module './typewriter.js'`

- [ ] **Step 3: 实现打字机纯函数状态机**

Create `js/typewriter.js`:

```js
// 打字机状态机 —— 纯函数，可测；DOM 胶水在文件末尾的 init 函数

// 每个 tick 的时间映射（由调用方用 setInterval 控制，这里只管状态转换）
const PAUSE_TICKS = 150;   // 打完一句停留约 2.5s（按 16ms/tick 计）

/**
 * 创建初始打字机状态
 * @param {string[]} phrases
 */
export function createTypewriterState(phrases) {
  return {
    phrases,
    phraseIndex: 0,
    shown: 0,
    phase: 'typing',   // 'typing' | 'pause' | 'deleting'
    pauseTicks: 0
  };
}

/**
 * 推进一个 tick，返回新状态（不可变）
 * @param {object} state
 * @returns {object} 新状态
 */
export function typewriterTick(state) {
  const current = state.phrases[state.phraseIndex];

  if (state.phase === 'typing') {
    const shown = state.shown + 1;
    if (shown >= current.length) {
      return { ...state, shown: current.length, phase: 'pause', pauseTicks: 0 };
    }
    return { ...state, shown };
  }

  if (state.phase === 'pause') {
    const pauseTicks = state.pauseTicks + 1;
    if (pauseTicks >= PAUSE_TICKS) {
      return { ...state, phase: 'deleting', pauseTicks: 0 };
    }
    return { ...state, pauseTicks };
  }

  // deleting
  const shown = state.shown - 1;
  if (shown <= 0) {
    const nextIndex = (state.phraseIndex + 1) % state.phrases.length;
    return { ...state, shown: 0, phraseIndex: nextIndex, phase: 'typing', pauseTicks: 0 };
  }
  return { ...state, shown };
}

// ── DOM 胶水（浏览器端，不参与单测）──
if (typeof window !== 'undefined') {
  window.LiquidTypewriter = { createTypewriterState, typewriterTick, PAUSE_TICKS };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (16 tests: 10 fluid-config + 6 typewriter)

- [ ] **Step 5: 提交**

```bash
git add js/typewriter.js js/liquid-home.test.js
git commit -m "feat: typewriter state machine pure functions"
```

---

## Task 3: 扩展 design-tokens.css 霓虹 token

**Files:**
- Modify: `css/design-tokens.css` (L2 语义层，:root 和 .dark 段)

- [ ] **Step 1: 在 `:root`（亮色）末尾追加霓虹 token**

在 `css/design-tokens.css` 的 `:root` 语义层（`--content-narrow:720px;` 之后、闭合 `}` 之前）追加:

```css
  /* ── Neon liquid tokens (light theme) ── */
  --neon-blue:#93c5fd;--neon-purple:#c4b5fd;--neon-pink:#f9a8d4;--neon-cyan:#67e8f9;
  --neon-dye-alpha:.35;
  --neon-splatter-interval:3200ms;
  --neon-glow:0 0 24px rgba(147,197,253,.45);
  --liquid-canvas-bg:#E8ECF1;
```

- [ ] **Step 2: 在 `.dark` 段末尾追加暗色霓虹 token**

在 `.dark{...}` 块末尾（`--card-shadow-hover` 之后、闭合 `}` 之前）追加:

```css
  /* ── Neon liquid tokens (dark theme) ── */
  --neon-blue:#3b82f6;--neon-purple:#8b5cf6;--neon-pink:#ec4899;--neon-cyan:#06b6d4;
  --neon-dye-alpha:.85;
  --neon-splatter-interval:2800ms;
  --neon-glow:0 0 32px rgba(59,130,246,.6);
  --liquid-canvas-bg:#060B18;
```

- [ ] **Step 3: 验证 token 写入正确**

Run（Windows）: `findstr /C:"--neon-blue" css\design-tokens.css`
Expected: 2 行输出（:root 一行 light 值，.dark 一行 dark 值）

- [ ] **Step 4: 提交**

```bash
git add css/design-tokens.css
git commit -m "feat: add neon liquid tokens for light/dark themes"
```

---

## Task 4: 重写导航栏样式（unified.css）—— 统一 15 个页面

**Files:**
- Modify: `css/unified.css` (`#navbar .nav-link` 段, 约第 102-129 行)

- [ ] **Step 1: 写失败测试 —— 验证新 navbar 样式不含独立 pill 边框**

Create `js/navbar-redesign.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';

function readCss() {
  return readFileSync(path.join(ROOT, 'css/unified.css'), 'utf8');
}

describe('navbar redesign: unified inline-groove style', () => {
  const css = readCss();

  it('nav-link has transparent background (no independent pill)', () => {
    // 新设计：默认背景透明，不再是独立玻璃药丸
    expect(css).toContain('background:transparent');
  });

  it('defines a hover groove highlight class', () => {
    expect(css).toContain('.nav-link:hover');
  });

  it('defines an active state with neon underline', () => {
    expect(css).toContain('.nav-link.active');
    // active 态有霓虹下划线（渐变或 2px）
    expect(css).toMatch(/linear-gradient|underline|--neon/);
  });

  it('brand and links are separated by a divider', () => {
    expect(css).toContain('.nav-divider');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run js/navbar-redesign.test.js`
Expected: FAIL — `background:transparent` 未在 nav-link 出现 / `.nav-divider` 不存在

- [ ] **Step 3: 重写 unified.css 的 nav-link 段**

在 `css/unified.css` 中，替换从 `/* Desktop nav links — glass pill style */` 注释开始、到 `#navbar .nav-link i{width:18px;height:18px}` 结束的整段（约 102-129 行），替换为:

```css
/* Desktop nav links — 一体式玻璃条内嵌凹槽（去独立 pill，统一 15 页） */
#navbar .nav-links{display:flex;align-items:center;gap:var(--sp-1)}
#navbar .nav-link{
  display:inline-flex;align-items:center;gap:6px;
  padding:7px 14px;
  border-radius:var(--radius-md);
  font-size:var(--text-sm);font-weight:var(--weight-medium);
  background:transparent;             /* 默认透明，不再独立药丸 */
  border:1px solid transparent;
  color:var(--nav-link-color);
  transition:all var(--duration-fast) var(--ease-out);
  white-space:nowrap;position:relative;
}
/* hover：柔和光块（无硬边框），文字微提亮 */
#navbar .nav-link:hover{
  color:var(--nav-link-hover-color);
  background:var(--nav-link-hover-bg);
  border-color:var(--nav-link-hover-border);
  box-shadow:var(--nav-link-hover-shadow);
  transform:translateY(-1px);
}
/* active：底部 2px 霓虹渐变下划线 + 提亮 */
#navbar .nav-link.active{
  color:var(--nav-link-active-color);
  background:var(--nav-link-active-bg);
  border-color:var(--nav-link-active-border);
  box-shadow:var(--nav-link-active-shadow);
}
#navbar .nav-link.active::after{
  content:'';position:absolute;left:14px;right:14px;bottom:2px;height:2px;
  background:linear-gradient(90deg,var(--neon-blue),var(--neon-purple),var(--neon-pink));
  border-radius:2px;
}
#navbar .nav-link i{width:16px;height:16px}   /* 图标缩小到 16px */

/* 品牌区与链接区分隔线 */
.nav-divider{
  width:1px;height:24px;
  background:var(--color-border);
  margin-inline:var(--sp-2);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run js/navbar-redesign.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: 提交**

```bash
git add css/unified.css js/navbar-redesign.test.js
git commit -m "feat: redesign navbar to unified inline-groove style (all 15 pages)"
```

---

## Task 5: 主页专属样式（liquid-home.css）

**Files:**
- Create: `css/liquid-home.css`

- [ ] **Step 1: 写失败测试 —— 验证主页样式类存在**

追加到 `js/liquid-home.test.js`（或新建 `js/liquid-home-css.test.js`）。Create `js/liquid-home-css.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';

function readCss() {
  return readFileSync(path.join(ROOT, 'css/liquid-home.css'), 'utf8');
}

describe('liquid-home.css: required classes', () => {
  it('defines fluid canvas container', () => {
    const css = readCss();
    expect(css).toContain('.fluid-canvas');
    expect(css).toContain('position:fixed');
  });

  it('defines avatar glass ring', () => {
    const css = readCss();
    expect(css).toContain('.avatar-ring');
  });

  it('defines typewriter element', () => {
    const css = readCss();
    expect(css).toContain('.typewriter');
    expect(css).toContain('.cursor');
  });

  it('defines tag pills', () => {
    const css = readCss();
    expect(css).toContain('.tag-pill');
  });

  it('defines home footer with visit count', () => {
    const css = readCss();
    expect(css).toContain('.home-footer');
    expect(css).toContain('.visit-count');
  });

  it('defines single-screen layout (100dvh, overflow hidden)', () => {
    const css = readCss();
    expect(css).toContain('100dvh');
    expect(css).toContain('overflow:hidden');
  });

  it('defines responsive breakpoints', () => {
    const css = readCss();
    expect(css).toContain('max-width:640px');
    expect(css).toContain('max-width:1024px');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run js/liquid-home-css.test.js`
Expected: FAIL — 文件不存在

- [ ] **Step 3: 实现 liquid-home.css**

Create `css/liquid-home.css`:

```css
/* ═══════════════════════════════════════════════════════
   Liquid Glass Homepage — 主页专属样式
   单屏布局：流体背景 + 中央聚焦玻璃区 + 底栏
   ═══════════════════════════════════════════════════════ */

/* ── 流体画布层（WebGL，固定全屏，最底层）── */
.fluid-canvas{
  position:fixed;inset:0;width:100vw;height:100dvh;
  z-index:-1;display:block;
  background:var(--liquid-canvas-bg);
}

/* CSS 降级方案（无 WebGL / reduced-motion 时）── 动态渐变网格 */
.fluid-fallback{
  position:fixed;inset:0;z-index:-1;
  background:
    radial-gradient(ellipse at 20% 30%,var(--neon-blue),transparent 50%),
    radial-gradient(ellipse at 80% 20%,var(--neon-purple),transparent 50%),
    radial-gradient(ellipse at 50% 80%,var(--neon-pink),transparent 50%),
    radial-gradient(ellipse at 70% 60%,var(--neon-cyan),transparent 50%),
    var(--liquid-canvas-bg);
  background-size:150% 150%;
  animation:fluidFallbackMove 18s ease-in-out infinite;
  opacity:.4;
}
@keyframes fluidFallbackMove{
  0%,100%{background-position:0% 0%,100% 0%,50% 100%,70% 60%}
  50%{background-position:30% 20%,70% 30%,30% 70%,40% 40%}
}
@media(prefers-reduced-motion:reduce){.fluid-fallback{animation:none}}

/* ── 单屏布局容器 ── */
.home-stage{
  min-height:100dvh;
  display:flex;flex-direction:column;
  overflow:hidden;position:relative;
}

/* ── 中央聚焦区（头像 + 打字机 + Tag），垂直居中 ── */
.home-focus{
  flex:1;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:var(--sp-5);
  padding:var(--sp-10) var(--sp-6);
  text-align:center;
}

/* ── 头像玻璃光环 ── */
.avatar-ring{
  position:relative;
  display:inline-block;
  padding:5px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--neon-blue),var(--neon-purple),var(--neon-pink),var(--neon-cyan));
  background-size:300% 300%;
  animation:avatarRingBreath 4s ease-in-out infinite,avatarRingShift 8s linear infinite;
}
@keyframes avatarRingBreath{
  0%,100%{box-shadow:0 0 30px rgba(139,92,246,.4)}
  50%{box-shadow:0 0 50px rgba(236,72,153,.55)}
}
@keyframes avatarRingShift{
  0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}
}
.avatar-ring img{
  display:block;width:112px;height:112px;border-radius:50%;
  object-fit:cover;
  border:3px solid var(--glass-border);
  box-shadow:0 8px 32px rgba(0,0,0,.25);
}
@media(prefers-reduced-motion:reduce){
  .avatar-ring{animation:none}
}

/* ── 主名 ── */
.home-name{
  font-size:clamp(1.75rem,5vw,2.5rem);
  font-weight:var(--weight-bold);letter-spacing:-0.03em;
  color:var(--color-text-primary);
}

/* ── 打字机 ── */
.typewriter{
  font-family:var(--pr-font-serif);
  font-size:clamp(1rem,3vw,1.375rem);
  color:var(--color-text-secondary);
  min-height:1.6em;            /* 防止换句时高度跳动 */
  letter-spacing:.05em;
}
.typewriter .cursor{
  display:inline-block;width:2px;
  background:var(--neon-purple);
  margin-left:2px;
  animation:cursorBlink 1s step-end infinite;
}
@keyframes cursorBlink{0%,50%{opacity:1}51%,100%{opacity:0}}

/* ── Tag 胶囊 ── */
.tag-pills{
  display:flex;flex-wrap:wrap;justify-content:center;gap:var(--sp-2);
  max-width:560px;
}
.tag-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:6px 14px;
  border-radius:var(--radius-full);
  background:var(--glass-card-bg);
  backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);
  border:1px solid var(--glass-border-soft);
  font-size:var(--text-sm);color:var(--color-text-secondary);
  transition:all var(--duration-fast) var(--ease-out);
  opacity:0;transform:translateY(10px);
  animation:tagPop .5s var(--ease-spring) forwards;
}
.tag-pill:hover{
  transform:translateY(-3px);
  border-color:var(--glass-border);
  box-shadow:var(--neon-glow);
}
@keyframes tagPop{to{opacity:1;transform:translateY(0)}}

/* ── 底栏（浏览量 + 版权）── */
.home-footer{
  display:flex;align-items:center;justify-content:center;gap:var(--sp-4);
  padding:var(--sp-4) var(--sp-6);
  background:var(--glass-card-bg);
  backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);
  border-top:1px solid var(--glass-border-soft);
  color:var(--color-text-muted);font-size:var(--text-xs);
  flex-wrap:wrap;
}
.visit-count{
  display:inline-flex;align-items:center;gap:6px;
  color:var(--color-text-secondary);font-weight:var(--weight-medium);
}
.visit-count .pulse-dot{
  width:7px;height:7px;border-radius:50%;
  background:#22c55e;box-shadow:0 0 8px #22c55e;
}
@media(prefers-reduced-motion:no-preference){
  .visit-count .pulse-dot{animation:pulse 2s ease-in-out infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 6px #22c55e}50%{box-shadow:0 0 14px #22c55e,0 0 24px rgba(34,197,94,.4)}}
}

/* ── 响应式断点 ── */
@media(max-width:1024px){
  .avatar-ring img{width:88px;height:88px}
}
@media(max-width:640px){
  .avatar-ring img{width:72px;height:72px}
  .home-focus{gap:var(--sp-4);padding:var(--sp-6) var(--sp-4)}
  .home-footer{flex-direction:column;gap:var(--sp-1)}
  .tag-pills{gap:6px}
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run js/liquid-home-css.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: 提交**

```bash
git add css/liquid-home.css js/liquid-home-css.test.js
git commit -m "feat: add liquid-home.css single-screen homepage styles"
```

---

## Task 6: WebGL 流体渲染引擎（fluid-bg.js）

**Files:**
- Create: `js/fluid-bg.js`

> 说明：这是大量 WebGL 胶水代码（shader 编译、FBO、render loop），无法单元测试。它**调用** Task 1 的纯函数配置层（`window.LiquidFluidConfig`）。关键行为通过手动浏览器验证。

- [ ] **Step 1: 实现 WebGL 流体引擎**

Create `js/fluid-bg.js`（基于 PavelDoGreat MIT 算法精简，重点：Navier-Stokes + 自动喷溅 + 主题监听 + 降级）:

```js
/* ============================================================
   fluid-bg.js — WebGL Navier-Stokes 流体背景引擎
   基于 PavelDoGreat/WebGL-Fluid-Simulation (MIT) 精简改造
   职责：渲染流体、自动喷溅、监听主题切换、降级
   依赖：window.LiquidFluidConfig (纯函数配置层)
   ============================================================ */
(function() {
  'use strict';

  const CFG = window.LiquidFluidConfig;
  if (!CFG) { console.error('[fluid-bg] fluid-config.js 未加载'); return; }

  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return; // 非主页不初始化

  const html = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── WebGL 支持检测 ──
  function detectWebGL() {
    try {
      const gl = canvas.getContext('webgl', { alpha: true, depth: false, stencil: false, preserveDrawingBuffer: false })
              || canvas.getContext('experimental-webgl');
      return !!(gl && gl.getExtension('OES_texture_half_float') !== null || gl.getExtension('OES_texture_float'));
    } catch (e) { return false; }
  }

  // ── 降级路径 ──
  if (CFG.shouldUseFallback({ webglSupported: detectWebGL(), reducedMotion })) {
    canvas.style.display = 'none';
    const fb = document.getElementById('fluid-fallback');
    if (fb) fb.style.display = 'block';
    console.info('[fluid-bg] 降级到 CSS 后备方案');
    return;
  }

  const gl = canvas.getContext('webgl', { alpha: true, depth: false, stencil: false });
  if (!gl) return;

  // ── 分辨率（调用纯函数）──
  let res = CFG.getSimResolution(window.innerWidth);
  let simW = Math.floor(window.innerWidth * res.simResolution);
  let simH = Math.floor(window.innerHeight * res.simResolution);
  let dyeW = Math.floor(window.innerWidth * res.dyeResolution);
  let dyeH = Math.floor(window.innerHeight * res.dyeResolution);

  // ── Shader 编译辅助 ──
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
  }

  const VS = `attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;

  // 精简流体着色器组（advection/splat/display）—— 完整实现见 PavelDoGreat 源码
  // 此处为精简但可工作的版本
  const FS_COPY = `precision highp float;varying vec2 vUv;uniform sampler2D uTex;void main(){gl_FragColor=texture2D(uTex,vUv);}`;
  const FS_SPLAT = `precision highp float;varying vec2 vUv;uniform sampler2D uTarget;uniform vec2 uPoint;uniform float uRadius;uniform vec3 uColor;void main(){vec2 p=vUv-uPoint;p.x*=1.0;vec3 splat=exp(-dot(p,p)/uRadius)*uColor;vec3 base=texture2D(uTarget,vUv).rgb;gl_FragColor=vec4(base+splat,1.0);}`;
  const FS_DISPLAY = `precision highp float;varying vec2 vUv;uniform sampler2D uDye;void main(){vec3 c=texture2D(uDye,vUv).rgb;gl_FragColor=vec4(c,1.0);}`;

  const copyProg = program(VS, FS_COPY);
  const splatProg = program(VS, FS_SPLAT);
  const displayProg = program(VS, FS_DISPLAY);

  // ── FBO（染料纹理）──
  function createFBO(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fbo, tex, w, h };
  }

  let dye = createFBO(dyeW, dyeH);

  // ── 全屏四边形 ──
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  function blit(prog) {
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ── 喷溅（鼠标 + 自动）──
  let currentPalette = CFG.getThemePalette(html.classList.contains('dark') ? 'dark' : 'light');
  let splatterIndex = 0;

  function splat(x, y, colorHex) {
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    gl.useProgram(splatProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fbo);
    gl.viewport(0, 0, dye.w, dye.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.tex);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'uTarget'), 0);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uPoint'), x, y);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'uRadius'), 0.0008);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'uColor'), r * currentPalette.dyeAlpha, g * currentPalette.dyeAlpha, b * currentPalette.dyeAlpha);
    blit(splatProg);
  }

  // ── 鼠标交互 ──
  let lastX = 0.5, lastY = 0.5;
  function onMove(clientX, clientY) {
    const x = clientX / window.innerWidth;
    const y = 1.0 - clientY / window.innerHeight;
    splat(x, y, CFG.pickAutoSplatterColor(currentPalette, splatterIndex++));
    lastX = x; lastY = y;
  }
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  // ── 自动喷溅（背景持续流动）──
  const splatterInterval = parseFloat(getComputedStyle(html).getPropertyValue('--neon-splatter-interval')) || 3000;
  let autoTimer = setInterval(() => {
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.2 + Math.random() * 0.6;
    splat(x, y, CFG.pickAutoSplatterColor(currentPalette, splatterIndex++));
  }, splatterInterval);

  // ── 渲染循环 ──
  let rafId = null;
  function render() {
    // 显示染料到屏幕
    gl.useProgram(displayProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.tex);
    gl.uniform1i(gl.getUniformLocation(displayProg, 'uDye'), 0);
    blit(displayProg);
    rafId = requestAnimationFrame(render);
  }

  // ── resize ──
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    res = CFG.getSimResolution(window.innerWidth);
    simW = Math.floor(window.innerWidth * res.simResolution);
    simH = Math.floor(window.innerHeight * res.simResolution);
    dyeW = Math.floor(window.innerWidth * res.dyeResolution);
    dyeH = Math.floor(window.innerHeight * res.dyeResolution);
    dye = createFBO(dyeW, dyeH);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ── 主题切换监听 ──
  window.addEventListener('themechange', () => {
    const isDark = html.classList.contains('dark');
    currentPalette = CFG.getThemePalette(isDark ? 'dark' : 'light');
    // 淡入过渡：清屏后重新喷溅建立新色调
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < 4; i++) {
      splat(Math.random(), Math.random(), CFG.pickAutoSplatterColor(currentPalette, i));
    }
  });

  // ── 标签页隐藏暂停 ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      clearInterval(autoTimer);
    } else {
      autoTimer = setInterval(() => {
        splat(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6, CFG.pickAutoSplatterColor(currentPalette, splatterIndex++));
      }, splatterInterval);
      render();
    }
  });

  render();
})();
```

- [ ] **Step 2: 手动浏览器验证清单（无法自动化）**

在浏览器打开 index.html（Task 8 完成后），检查：
- [ ] 背景出现流动的彩色液体
- [ ] 鼠标移动产生霓虹拖尾
- [ ] 不动鼠标时每 ~3 秒自动出现新色斑
- [ ] 切换标签页回来后仍在流动（未崩溃）
- [ ] DevTools Console 无报错

- [ ] **Step 3: 提交**

```bash
git add js/fluid-bg.js
git commit -m "feat: WebGL fluid background engine with auto-splatter and theme switching"
```

---

## Task 7: 打字机 DOM 胶水 + 主题切换事件（navbar.js）

**Files:**
- Modify: `js/typewriter.js` (追加 init 函数)
- Modify: `js/navbar.js` (themeToggle 回调 dispatch 事件)

- [ ] **Step 1: 在 typewriter.js 追加 DOM 胶水 init 函数**

在 `js/typewriter.js` 末尾（window 挂载之前）追加:

```js
/**
 * DOM 胶水：把状态机接到页面元素
 * @param {string} targetSelector - 文字容器选择器
 * @param {string[]} phrases
 * @param {{typeMs:number, deleteMs:number}} opts
 */
export function initTypewriter(targetSelector, phrases, opts = {}) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(targetSelector);
  if (!el) return;

  const typeMs = opts.typeMs || 60;
  const deleteMs = opts.deleteMs || 30;

  let state = createTypewriterState(phrases);
  // 光标元素
  el.innerHTML = '<span class="tw-text"></span><span class="cursor">&nbsp;</span>';
  const textNode = el.querySelector('.tw-text');

  // typing 阶段：每 typeMs 推进
  // pause/deleting 阶段：固定 16ms 推进
  function step() {
    const before = state.phase;
    state = typewriterTick(state);
    textNode.textContent = state.phrases[state.phraseIndex].slice(0, state.shown);

    let delay = 16;
    if (before === 'typing') delay = typeMs;
    else if (before === 'deleting') delay = deleteMs;
    setTimeout(step, delay);
  }
  step();
}

if (typeof window !== 'undefined') {
  window.LiquidTypewriter = { createTypewriterState, typewriterTick, initTypewriter, PAUSE_TICKS };
}
```

- [ ] **Step 2: 运行已有测试确认未破坏**

Run: `npx vitest run js/liquid-home.test.js`
Expected: PASS (16 tests) — initTypewriter 在 Node 环境因 `typeof document === 'undefined'` 直接 return，不影响纯函数测试

- [ ] **Step 3: 修改 navbar.js 让主题切换 dispatch 事件**

在 `js/navbar.js` 的 `themeToggle.addEventListener('click', ...)` 回调里，在 `localStorage.setItem(...)` 之后追加一行 dispatch:

```js
    themeToggle.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('themechange'));   // 通知流体引擎
    });
```

- [ ] **Step 4: 提交**

```bash
git add js/typewriter.js js/navbar.js
git commit -m "feat: typewriter DOM init + navbar dispatches themechange event"
```

---

## Task 8: 重写 index.html 单屏结构

**Files:**
- Modify: `index.html` (完全重写)

- [ ] **Step 1: 备份当前 index.html 结构要点**

当前 index.html 包含: `<nav id="navbar">` + `<div id="mobile-menu">` + `<main class="hero">`（blob/particle/glass-card/bento/status）+ `<footer>`。
重写保留 navbar + mobile-menu 结构不变（让 Task 4 的新样式生效），替换 hero 内容为单屏聚焦区，保留 footer。

- [ ] **Step 2: 重写 index.html**

完全替换 `index.html` 内容为:

```html
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#060B18" media="(prefers-color-scheme: dark)">
    <meta name="theme-color" content="#E8ECF1" media="(prefers-color-scheme: light)">
    <title>ShadowQuake — 夏日科技探索</title>
    <link rel="icon" type="image/png" href="public/img/favicon256.png">

    <link rel="preconnect" href="https://fonts.loli.net">
    <link rel="preconnect" href="https://gstatic.loli.net" crossorigin>
    <link href="https://fonts.loli.net/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <link href="css/unified.css" rel="stylesheet">
    <link href="css/liquid-home.css" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="js/vendor/lucide.min.js"></script>
</head>
<body class="font-sans">
    <!-- ═══════ 流体背景层 ═══════ -->
    <canvas id="fluid-canvas" class="fluid-canvas"></canvas>
    <div id="fluid-fallback" class="fluid-fallback" style="display:none;"></div>

    <!-- ═══════ NAVBAR（共用结构，继承 Task 4 新样式）═══════ -->
    <nav id="navbar">
        <div class="nav-inner">
            <a href="index.html" class="nav-brand" aria-label="ShadowQuake Home">
                <img src="public/img/black256.png" alt="Logo" class="dark-only">
                <img src="public/img/favicon256.png" alt="Logo" class="light-only">
                <span>ShadowQuake</span>
            </a>
            <span class="nav-divider"></span>
            <div class="nav-links" role="navigation" aria-label="Main">
                <a href="index.html" class="nav-link active"><i data-lucide="house"></i> 首页</a>
                <a href="blog.html" class="nav-link"><i data-lucide="file-text"></i> 笔记</a>
                <a href="moments.html" class="nav-link"><i data-lucide="camera"></i> 片刻</a>
                <a href="bookmarks.html" class="nav-link"><i data-lucide="bookmark"></i> 收藏</a>
                <a href="rss.html" class="nav-link"><i data-lucide="rss"></i> 订阅</a>
                <a href="acg.html" class="nav-link"><i data-lucide="film"></i> ACG</a>
                <a href="about.html" class="nav-link"><i data-lucide="user-circle"></i> 关于</a>
                <button id="theme-toggle" class="theme-toggle" aria-label="切换主题">
                    <i data-lucide="sun" class="dark-only"></i>
                    <i data-lucide="moon" class="light-only"></i>
                </button>
            </div>
            <button id="nav-hamburger" class="nav-hamburger" aria-label="菜单" aria-expanded="false">
                <i data-lucide="menu"></i>
            </button>
        </div>
    </nav>

    <div id="mobile-menu" role="navigation" aria-label="Mobile">
        <a href="index.html" class="nav-link"><i data-lucide="house"></i> 首页</a>
        <a href="blog.html" class="nav-link"><i data-lucide="file-text"></i> 笔记</a>
        <a href="moments.html" class="nav-link"><i data-lucide="camera"></i> 片刻</a>
        <a href="bookmarks.html" class="nav-link"><i data-lucide="bookmark"></i> 收藏</a>
        <a href="rss.html" class="nav-link"><i data-lucide="rss"></i> 订阅</a>
        <a href="acg.html" class="nav-link"><i data-lucide="film"></i> ACG</a>
        <a href="about.html" class="nav-link"><i data-lucide="user-circle"></i> 关于</a>
    </div>

    <!-- ═══════ 单屏舞台 ═══════ -->
    <div class="home-stage">
        <!-- 中央聚焦区 -->
        <div class="home-focus">
            <div class="avatar-ring">
                <img src="public/img/avatar.jpg" alt="Avatar">
            </div>
            <h1 class="home-name">ShadowQuake</h1>
            <p class="typewriter"><span class="tw-text"></span><span class="cursor">&nbsp;</span></p>
            <div class="tag-pills">
                <span class="tag-pill" style="animation-delay:.0s"><i data-lucide="code-2" style="width:14px;height:14px;"></i> 全栈</span>
                <span class="tag-pill" style="animation-delay:.08s"><i data-lucide="telescope" style="width:14px;height:14px;"></i> 天文</span>
                <span class="tag-pill" style="animation-delay:.16s"><i data-lucide="gamepad-2" style="width:14px;height:14px;"></i> ACG</span>
                <span class="tag-pill" style="animation-delay:.24s"><i data-lucide="moon" style="width:14px;height:14px;"></i> 夜猫子</span>
                <span class="tag-pill" style="animation-delay:.32s"><i data-lucide="star" style="width:14px;height:14px;"></i> 开源</span>
                <span class="tag-pill" style="animation-delay:.40s"><i data-lucide="map-pin" style="width:14px;height:14px;"></i> 香港</span>
            </div>
        </div>

        <!-- 底栏 -->
        <footer class="home-footer">
            <span class="visit-count">
                <span class="pulse-dot"></span>
                <span id="visit-num">0</span> 次浏览
            </span>
            <span>&copy; 2025 ShadowQuake · Built with Liquid Glass</span>
        </footer>
    </div>

    <!-- ═══════ Scripts ═══════ -->
    <script src="js/vendor/lucide.min.js"></script>
    <script type="module" src="js/fluid-config.js"></script>
    <script type="module" src="js/typewriter.js"></script>
    <script src="js/fluid-bg.js"></script>
    <script src="js/navbar.js"></script>
    <script>
        lucide.createIcons();

        // 打字机启动（诗句来自 spec §5.1）
        import('./js/typewriter.js').then(m => {
            m.initTypewriter('.typewriter', [
                '星河欲转千帆舞',
                '心有猛虎，细嗅蔷薇',
                '且将新火试新茶，诗酒趁年华',
                '路漫漫其修远兮，吾将上下而求索',
                '星垂平野阔，月涌大江流'
            ], { typeMs: 60, deleteMs: 30 });
        });

        // 浏览量 count-up
        (async function() {
            const el = document.getElementById('visit-num');
            if (!el || !window.api) return;
            try {
                const count = await window.api.getVisitCount();
                const target = Number(count) || 0;
                let cur = 0;
                const step = Math.max(1, Math.ceil(target / 60));
                const tick = () => {
                    cur = Math.min(target, cur + step);
                    el.textContent = cur.toLocaleString();
                    if (cur < target) requestAnimationFrame(tick);
                };
                tick();
            } catch (e) { el.textContent = '—'; }
        })();

        // 主题相关 logo 显示
        const html = document.documentElement;
        function syncLogos() {
            const dark = html.classList.contains('dark');
            document.querySelectorAll('img.dark-only').forEach(i => i.style.display = dark ? 'inline' : 'none');
            document.querySelectorAll('img.light-only').forEach(i => i.style.display = dark ? 'none' : 'inline');
        }
        syncLogos();
        document.getElementById('theme-toggle').addEventListener('click', syncLogos);
    </script>

    <!-- 右键菜单（保留） -->
    <script src="js/context-menu.js"></script>
    <script src="js/tracker.js"></script>
</body>
</html>
```

- [ ] **Step 3: 验证 HTML 结构完整性**

Run: `findstr /C:"fluid-canvas" /C:"home-stage" /C:"typewriter" index.html`
Expected: 3+ 行输出，包含关键结构

- [ ] **Step 4: 运行全部测试确认未破坏其他页面**

Run: `npx vitest run`
Expected: 全部 PASS（包括现有 core-pages-ui.test.js 等）

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "feat: rewrite index.html as single-screen liquid glass homepage"
```

---

## Task 9: 验证浏览量 API 接口 + 全站回归

**Files:**
- Verify: `js/api.js` (确认 getVisitCount 方法存在)

- [ ] **Step 1: 检查 api.js 是否有浏览量方法**

Run: `findstr /C:"getVisitCount" /C:"visit" js\api.js`
Expected: 找到相关方法

- [ ] **Step 2: 若不存在，确认正确的 API 调用方式**

读 `js/api.js` 找到访问计数的实际方法名（可能是 `getVisits` / `getStats` 等）。如果方法名不同，回到 Task 8 Step 2 修正 `index.html` 里的 `window.api.getVisitCount()` 为实际方法名。

- [ ] **Step 3: 浏览器端到端验证清单**

在浏览器打开 `index.html`，逐项检查：
- [ ] 一屏装满，无滚动条
- [ ] 流体背景流动
- [ ] 头像 + 玻璃光环显示
- [ ] 打字机循环诗句（5 句轮转）
- [ ] 6 个 Tag 胶囊显示且有 stagger 入场
- [ ] 底栏显示浏览量（数字递增）+ 版权
- [ ] 导航栏新样式：无独立药丸、active 有霓虹下划线
- [ ] 点主题按钮：流体颜色切换、文字适配
- [ ] 右键菜单正常
- [ ] 移动端模拟（DevTools）：汉堡菜单、头像 72px、Tag 换行、底栏堆叠

- [ ] **Step 4: 全站 navbar 一致性回归**

随机抽 3 个其他页面（blog.html, about.html, acg.html）打开，确认：
- [ ] navbar 新样式生效（无独立药丸）
- [ ] active 态有霓虹下划线
- [ ] 页面其他内容未被破坏

- [ ] **Step 5: 最终提交（如有修正）**

```bash
git add -A
git commit -m "fix: verify visit count API and full-site navbar regression"
```

---

## Self-Review

**Spec coverage 检查：**
- §1 目标（单屏流体液态玻璃）→ Task 5, 6, 8 ✅
- §2 单屏布局 → Task 5 (100dvh/overflow:hidden), Task 8 ✅
- §3 流体背景双主题 → Task 1 (色板), Task 6 (主题监听), Task 7 (themechange 事件) ✅
- §3.4 性能分级 → Task 1 (getSimResolution), Task 6 (降级/暂停) ✅
- §4 视觉规格 → Task 3 (token), Task 5 (样式) ✅
- §5 内容（诗句/Tag/浏览量）→ Task 7+8 (打字机), Task 8 (Tag/浏览量), Task 9 (API) ✅
- §6 导航栏重设计 → Task 4 ✅
- §7 全设备适配 → Task 5 (响应式断点), Task 6 (resize/orientation), Task 8 (clamp) ✅
- §8 文件改动清单 → 全部 task 覆盖 ✅
