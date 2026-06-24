# Blog Task3 Style Contract Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐博客页 `css/style.css` 中缺失的合同选择器，并保持现有克制风格，使 `js/core-pages-ui.test.js` 重新通过。

**Architecture:** 仅在 `body.public-page.liquid-glass-ui[data-page="blog"]` 作用域内补充缺失的分页、卡片封面、工具胶囊和底栏选择器，复用现有博客页视觉参数，不改 `blog.html` 和 `js/blog.js`。同时同步更新 `docs/CODE_WIKI.md`，记录本次博客页合同修复。

**Tech Stack:** 原生 HTML、共享 `css/style.css`、Vitest 合同测试、Markdown 文档

---

### Task 1: 先确认红灯合同

**Files:**
- Modify: `d:/Projects/shadowsky-blog/js/core-pages-ui.test.js`
- Test: `d:/Projects/shadowsky-blog/js/core-pages-ui.test.js`

- [ ] **Step 1: 运行目标测试并确认失败点**

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: FAIL，断言缺失博客页 scoped 选择器，如 `.glass-pill`、`.pagination-btn`、`.blog-post-card .aspect-video` 或 `.public-footer`。

- [ ] **Step 2: 记录失败原因，不修改测试**

```text
失败原因必须来自合同选择器缺失，而不是命令不可执行、语法错误或路径错误。
```

- [ ] **Step 3: 不新增测试，保持合同不变**

```text
本次任务以现有 Vitest 合同为准，只修生产样式，不扩写测试文件。
```

### Task 2: 补齐博客页 scoped 样式选择器

**Files:**
- Modify: `d:/Projects/shadowsky-blog/css/style.css`
- Test: `d:/Projects/shadowsky-blog/js/core-pages-ui.test.js`

- [ ] **Step 1: 补博客页工具胶囊基础选择器**

```css
/* Keep a broad blog-scope hook so the contract stays valid even if the toolbar wrapper changes. */
body.public-page.liquid-glass-ui[data-page="blog"] .glass-pill {
  border-color: rgba(148, 163, 184, 0.12);
  background: rgba(5, 11, 24, 0.42);
  box-shadow: none;
}
```

- [ ] **Step 2: 补分页按钮选择器**

```css
/* Pagination keeps the same restrained material while remaining compatible with JS-generated buttons. */
body.public-page.liquid-glass-ui[data-page="blog"] .pagination-btn,
body.public-page.liquid-glass-ui[data-page="blog"] #pagination-container button {
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(5, 11, 24, 0.42);
  color: rgba(226, 232, 240, 0.92);
  box-shadow: none;
}
```

- [ ] **Step 3: 补卡片封面比例选择器**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card .aspect-video,
body.public-page.liquid-glass-ui[data-page="blog"] .blog-post-card > a > div:first-child {
  aspect-ratio: 16 / 9;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}
```

- [ ] **Step 4: 补博客页 scoped 底栏选择器**

```css
body.public-page.liquid-glass-ui[data-page="blog"] .public-footer {
  margin-top: clamp(1.25rem, 3vw, 2rem);
  background: transparent !important;
  border-top: none !important;
  box-shadow: none !important;
}
```

- [ ] **Step 5: 复用现有深色参数，不引入额外强光效**

```css
.dark body.public-page.liquid-glass-ui[data-page="blog"] .pagination-btn,
.dark body.public-page.liquid-glass-ui[data-page="blog"] #pagination-container button {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(5, 11, 24, 0.48);
}
```

### Task 3: 同步代码索引文档

**Files:**
- Modify: `d:/Projects/shadowsky-blog/docs/CODE_WIKI.md`
- Test: `d:/Projects/shadowsky-blog/js/core-pages-ui.test.js`

- [ ] **Step 1: 在前台液态玻璃 UI 系统章节补充 Task3 合同修复记录**

```md
- 博客页 Task3 合同补丁：`css/style.css` 在 `data-page="blog"` 作用域下补齐 `.glass-pill`、`.pagination-btn`、`.blog-post-card .aspect-video` 与 `.public-footer` 选择器，用于兼容现有 `js/blog.js` 动态输出并让 Vitest 合同测试重新转绿。
```

### Task 4: 验证与收尾

**Files:**
- Modify: `d:/Projects/shadowsky-blog/css/style.css`
- Modify: `d:/Projects/shadowsky-blog/docs/CODE_WIKI.md`
- Test: `d:/Projects/shadowsky-blog/js/core-pages-ui.test.js`

- [ ] **Step 1: 重新运行目标合同测试**

```bash
npx vitest run js/core-pages-ui.test.js
```

Expected: PASS

- [ ] **Step 2: 获取最近编辑文件诊断**

```text
检查 `css/style.css` 与 `docs/CODE_WIKI.md` 是否引入新的诊断问题。
```

- [ ] **Step 3: 输出结果摘要，不提交代码**

```text
向用户汇报修改摘要、测试结果与 QA 审计报告；由于用户未要求提交 commit，本次不执行 git commit。
```
