/**
 * post-ui.mjs —— 本地发布台。一个网页界面，管发布，不管写作。
 *
 *   cd web && npm run post:ui
 *
 * 为什么是本地网页而不是桌面应用:
 *   写作用 Obsidian（已经很好了，不该再造一个编辑器），缺的只是「发布」这一步的界面。
 *   本地网页零打包、零新工具链，而且能直接复用 lib/renderMarkdown.js —— 预览用的是
 *   **站点自己的渲染管线和样式**，所见即所得，不是另写一个 Markdown 预览器。
 *
 * 摆在 Obsidian 旁边用：那边保存，这边自动刷新（轮询 mtime）。
 * 只监听 127.0.0.1，不对外。所有真正的动作都转交 publish-post.mjs 执行。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    parseFrontMatter, buildFrontMatter, computeExcerpt, computeReadTime,
    collectImageUrls, validate, duplicateH1, mirrorImage, lintBody,
} from './lib/post-meta.mjs';
import { renderMarkdown } from '../lib/renderMarkdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');
const LOCAL_POSTS = path.join(WEB, '..', 'content', 'posts');
const PORT = Number(process.env.PORT_UI || 4000);

/**
 * 站上是否已有同名文章 —— 决定这次是「新发」还是「更新」。
 * 看的是本地镜像 content/posts（服务器内容的副本），够用：
 * 它唯一的作用是给个提示，真正的覆盖判断在服务器那边。
 */
const alreadyLive = (file) => fs.existsSync(path.join(LOCAL_POSTS, path.basename(file)));

// ─────────────── 预览样式 ───────────────

/**
 * 直接从 app/globals.css 里切出主题变量与 .post-prose 那一层，注进预览页面。
 * 手抄一份的话，改了正文样式而忘了同步，预览就开始骗人 —— 那比没有预览更糟。
 * 能这么切是因为 @layer components 里是**纯 CSS**（没有 @apply），
 * 变量块也是普通的 `--x: value` 行。
 */
function previewCss() {
    const src = fs.readFileSync(path.join(WEB, 'app', 'globals.css'), 'utf8');
    const hljs = fs.readFileSync(path.join(WEB, 'app', 'hljs-theme.css'), 'utf8');
    const grab = (re) => (src.match(re) || [])[0] || '';
    const root = grab(/:root\s*\{[\s\S]*?\n\}/);
    const dark = grab(/\.dark\s*\{[\s\S]*?\n\}/);
    const compStart = src.indexOf('@layer components {');
    const components = compStart === -1 ? '' : src.slice(src.indexOf('{', compStart) + 1, src.lastIndexOf('}'));
    return `${root}\n${dark}\n${hljs}\n${components}`;
}

// ─────────────── 数据 ───────────────

/** 只接受 drafts 目录下的裸文件名，挡掉路径穿越 */
function draftPath(file) {
    const name = path.basename(String(file || ''));
    if (!name.endsWith('.md')) throw new Error('只接受 .md');
    return path.join(DRAFTS_DIR, name);
}

/**
 * 解析「哪一篇」。src 只有两种：
 *   draft —— content/drafts，写作区
 *   post  —— content/posts，**服务器内容的本地镜像**（改了不发布不生效）
 * 一律 basename，挡路径穿越。
 */
function resolveFile(file, src) {
    const name = path.basename(String(file || ''));
    if (!name.endsWith('.md')) throw new Error('只接受 .md');
    if (src === 'post') return path.join(LOCAL_POSTS, name);
    return path.join(DRAFTS_DIR, name);
}

/**
 * 已发布文章列表。
 * 库上移到 content/ 之后，Obsidian 里能看到这 19 篇了，发布台却只列草稿 ——
 * 「翻出旧文改一处再发」是真实需求（比如补代码块的语言标注），所以这里也列出来。
 */
function listPublished() {
    if (!fs.existsSync(LOCAL_POSTS)) return [];
    return fs.readdirSync(LOCAL_POSTS)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const full = path.join(LOCAL_POSTS, f);
            const raw = fs.readFileSync(full, 'utf8');
            const { fm, body } = parseFrontMatter(raw);
            return {
                file: f,
                src: 'post',
                title: fm.title || f,
                date: fm.date || '',
                category: fm.category || '',
                mtime: fs.statSync(full).mtimeMs,
                words: (body.match(/[一-龥]/g) || []).length,
            };
        })
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function listDrafts() {
    if (!fs.existsSync(DRAFTS_DIR)) return [];
    return fs.readdirSync(DRAFTS_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const full = path.join(DRAFTS_DIR, f);
            const raw = fs.readFileSync(full, 'utf8');
            const { fm, body } = parseFrontMatter(raw);
            return {
                file: f,
                title: fm.title || f,
                mtime: fs.statSync(full).mtimeMs,
                live: alreadyLive(f),
                words: (body.match(/[一-龥]/g) || []).length,
            };
        })
        .sort((a, b) => b.mtime - a.mtime);
}

/** 发布预检 + 渲染预览。和 publish-post.mjs 用同一套函数算，不会出现两个答案。 */
function inspect(file, src) {
    const full = resolveFile(file, src);
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const { fm, body } = parseFrontMatter(raw);

    const out = { ...fm };
    out.author = fm.author || 'Thoi';
    out.excerpt = fm.excerpt || computeExcerpt(body, fm.title);
    out.readTime = computeReadTime(body);
    out.lastModified = new Date().toISOString().slice(0, 10);

    return {
        file,
        src: src === 'post' ? 'post' : 'draft',
        slug: path.basename(file).replace(/\.md$/, ''),
        mtime: fs.statSync(full).mtimeMs,
        live: alreadyLive(file),
        meta: out,
        raw: fm,                       // 编辑表单要回填「作者原本写了什么」，不能拿自动值
        excerptAuto: !fm.excerpt,
        problems: validate(path.basename(file), fm),
        duplicateH1: duplicateH1(body, fm.title),
        lint: lintBody(body, fm.title).filter((i) => i.kind !== 'dup-h1'),
        images: collectImageUrls(body, fm.coverImage),
        html: renderMarkdown(body, { imageBaseDir: '/api/posts/' }),
    };
}

/**
 * 回写 frontmatter。
 * ⚠ 只写「人写的」字段。excerpt/readTime/lastModified 除非用户在界面里明确填了，
 *   否则不落盘 —— 一旦写进草稿，它们就变成手写值，以后即使正文改了也不会再重算，
 *   正好退回这套工作流当初要解决的那个问题。
 */
function writeMeta(file, fields, src) {
    const full = resolveFile(file, src);
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const { fm, body } = parseFrontMatter(raw);

    const next = { ...fm };
    for (const k of ['title', 'date', 'category', 'author', 'coverImage', 'excerpt']) {
        if (fields[k] !== undefined) next[k] = fields[k];
    }
    if (fields.tags !== undefined) {
        next.tags = String(fields.tags).split(',').map((t) => t.trim()).filter(Boolean);
    }
    delete next.readTime;
    delete next.lastModified;
    if (!next.excerpt) delete next.excerpt;

    fs.writeFileSync(full, buildFrontMatter(next) + '\n' + body.replace(/^\n+/, ''), 'utf8');
}

// ─────────────── 页面 ───────────────

const PAGE = (css) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>发布台 — ShadowQuake</title>
<style>
  ${css}
  * { box-sizing: border-box; }
  body { margin:0; font: 14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
         background: var(--background); color: var(--foreground); }
  /* 布局分三档。原来是固定三栏 + min-width:1084px —— 窗口一窄就整体横向滚动，
     而这个界面跑在一个可以随便拉大拉小的 app 窗口里，横向滚动是最糟的退化方式。
     现在：宽 → 三栏；中 → 两栏，右边的信息/操作栏落到底部；窄 → 全部竖着堆。
     无论哪一档，预览都保持完整宽度，发布按钮都够得到。 */
  .wrap { display:grid; grid-template-columns: 244px minmax(0,1fr) 320px; height:100vh; overflow:hidden; }
  .col { overflow:auto; padding:16px; min-width:0; min-height:0; }
  .col + .col { border-left:1px solid var(--border); }
  .col.main > div { max-width: 724px; margin: 0 auto; }

  @media (max-width: 1080px) {
    /* 两栏：列表 + 预览在上，信息/操作横跨底部 */
    .wrap { grid-template-columns: 216px minmax(0,1fr); grid-template-rows: minmax(0,1fr) auto; }
    .col.side { grid-column: 1 / -1; border-left:none; border-top:1px solid var(--border); max-height: 44vh; }
  }
  @media (max-width: 760px) {
    /* 单栏：列表收成一条可横向滑的胶囊行，把高度让给预览 */
    .wrap { grid-template-columns: minmax(0,1fr); grid-template-rows: auto minmax(0,1fr) auto; }
    .col.list { max-height: 33vh; border-bottom:1px solid var(--border); }
    .col + .col { border-left:none; }
    .col { padding:12px; }
    .hero { font-size:19px; }
  }
  /* 右栏改成「可滚动内容 + 吸底操作区」。
     ⚠ 展开「改字段」后表单很长，操作区原来跟着被推到屏幕外 ——
       最重要的按钮要滚动才找得到。现在它永远贴在底部。 */
  .col.side { display:flex; flex-direction:column; overflow:hidden; padding-bottom:0; }
  .side-scroll { flex:1; overflow:auto; min-height:0; margin:0 -16px; padding:0 16px; }
  .side-foot { border-top:1px solid var(--border); margin:0 -16px; padding:12px 16px 16px;
               background: var(--background); }
  .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  h2 { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted-foreground);
       margin:0; font-weight:600; }
  .mini { font-size:11px; padding:2px 8px; border-radius:6px; border:1px solid var(--border);
          background:transparent; color:var(--muted-foreground); cursor:pointer; }
  .mini:hover { background: var(--muted); color: var(--foreground); }
  .brand { font-size:13px; font-weight:700; letter-spacing:-.01em; margin-bottom:2px; }
  .brand + p { color:var(--muted-foreground); font-size:11px; margin:0 0 16px; }
  .draft { padding:10px 11px; border-radius:9px; cursor:pointer; border:1px solid transparent; margin-bottom:4px;
           transition: background .15s, border-color .15s; }
  .draft:hover { background: var(--muted); }
  .draft.on { background: var(--muted); border-color: var(--border); }
  .draft b { display:block; font-weight:600; font-size:13px; line-height:1.4; margin-bottom:3px; }
  .draft .sub { color: var(--muted-foreground); font-size:11px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  .dot { width:5px; height:5px; border-radius:999px; background: var(--muted-foreground); opacity:.45; flex:none; }
  .pill { font-size:10px; padding:1px 6px; border-radius:999px; border:1px solid var(--border); }
  .pill.live { border-color: color-mix(in oklch, green 45%, transparent);
               background: color-mix(in oklch, green 12%, transparent); }
  .empty { color: var(--muted-foreground); font-size:13px; padding:8px 0; }
  .row { display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid var(--border); font-size:12px; }
  .row span:first-child { color: var(--muted-foreground); white-space:nowrap; flex:none; }
  .row span:last-child { text-align:right; min-width:0; word-break:break-all; }
  .tag { display:inline-block; padding:1px 7px; border:1px solid var(--border); border-radius:999px; font-size:11px; margin:0 3px 3px 0; }
  .auto { color: var(--muted-foreground); font-size:10px; border:1px solid var(--border); border-radius:4px; padding:0 4px; margin-left:5px; }
  .warn { background: color-mix(in oklch, orange 14%, transparent); border:1px solid color-mix(in oklch, orange 40%, transparent);
          border-radius:8px; padding:9px 11px; font-size:12px; margin-bottom:10px; }
  .bad { background: color-mix(in oklch, red 14%, transparent); border-color: color-mix(in oklch, red 45%, transparent); }
  input, textarea { width:100%; padding:7px 9px; margin:3px 0 10px; border-radius:7px; border:1px solid var(--border);
                    background: var(--background); color: var(--foreground); font: inherit; font-size:12px;
                    outline:none; transition: border-color .15s, box-shadow .15s; }
  input:focus, textarea:focus { border-color: var(--foreground);
                                box-shadow: 0 0 0 3px color-mix(in oklch, var(--foreground) 12%, transparent); }
  textarea { resize:vertical; min-height:52px; }
  label { font-size:11px; color: var(--muted-foreground); }
  /* 分区标题：状态 / 字段 / 操作三段，之前是一路平铺，什么都一样重 */
  .sect { font-size:10px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted-foreground);
          margin:18px 0 6px; font-weight:600; }
  .sect:first-child { margin-top:0; }
  button.act { width:100%; padding:9px; border-radius:8px; border:1px solid var(--border); background:var(--foreground);
               color:var(--background); font-size:13px; font-weight:600; cursor:pointer; margin-top:12px; }
  button.act.ghost { background:transparent; color:var(--foreground); font-weight:400; margin-top:7px; }
  button.act:disabled { opacity:.45; cursor:not-allowed; }
  pre.log { background: var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px;
            font-size:11px; line-height:1.5; white-space:pre-wrap; max-height:34vh; overflow:auto; margin-top:12px; }
  .cover { height:170px; border-radius:12px; background-size:cover; background-position:center;
           margin-bottom:18px; border:1px solid var(--border); }
  .cover.nocover { display:flex; align-items:center; justify-content:center; height:76px;
                   color:var(--muted-foreground); font-size:12px; background:var(--muted); }
  .hero { font-size:22px; font-weight:800; letter-spacing:-.01em; margin:0 0 4px; }
  .herometa { color:var(--muted-foreground); font-size:12px; margin-bottom:22px; padding-bottom:14px; border-bottom:1px solid var(--border); }
  details.edit { margin-top:10px; }
  details.edit summary, details.imgs summary { font-size:11px; color:var(--muted-foreground); cursor:pointer; padding:5px 0; }
  details.edit summary:hover, details.imgs summary:hover { color: var(--foreground); }
  .url { font-size:10px; color:var(--muted-foreground); word-break:break-all; padding:3px 0; }
  .excerpt { font-size:12px; color:var(--muted-foreground); padding:7px 0 2px; line-height:1.65; }
  /* 三个次要动作并排，省掉两行高度，也把「删除」压得比发布轻 */
  .foot-row { display:flex; gap:6px; }
  .foot-row .act { margin-top:7px; font-size:12px; padding:7px 4px; }
  .act.danger { color: color-mix(in oklch, red 65%, var(--foreground)); }
  .act.danger:hover { border-color: color-mix(in oklch, red 50%, transparent); }
  .flash { position:fixed; right:14px; bottom:14px; background:var(--foreground); color:var(--background);
           padding:7px 13px; border-radius:8px; font-size:12px; opacity:0; transition:opacity .2s; pointer-events:none;
           z-index:30; }
  .flash.on { opacity:1; }

  /* 列表分区：草稿在上、已发布在下。已发布那段默认折起来，19 篇平铺会把草稿挤没。 */
  .group { margin-top:18px; }
  .group > summary { list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between;
                     font-size:11px; text-transform:uppercase; letter-spacing:.08em; font-weight:600;
                     color:var(--muted-foreground); padding:5px 0; border-radius:6px; }
  .group > summary::-webkit-details-marker { display:none; }
  .group > summary:hover { color: var(--foreground); }
  .group > summary .count { font-size:10px; opacity:.7; letter-spacing:0; }
  .draft .when { font-variant-numeric: tabular-nums; }
  /* 已发布的条目压得比草稿轻一档 —— 主角是草稿 */
  .draft.pub b { font-weight:500; }

  /* 键盘可达：整个界面都能 Tab，焦点必须看得见 */
  :focus-visible { outline:2px solid var(--foreground); outline-offset:2px; border-radius:6px; }

  @media (prefers-reduced-motion: reduce) {
    * { transition:none !important; animation:none !important; }
  }
</style></head>
<body>
<div class="wrap">
  <div class="col list">
    <div class="brand">发布台</div>
    <p>写作在 Obsidian，这里只管发布</p>
    <div class="head"><h2>草稿</h2>
      <div><button class="mini" id="newBtn">+ 新建</button></div>
    </div>
    <div id="newForm" style="display:none">
      <label>标题</label><input id="nTitle">
      <label>英文 slug（就是网址）</label><input id="nSlug" placeholder="my-post">
      <label>分类</label><input id="nCat" value="教程">
      <label>标签（逗号分隔）</label><input id="nTags">
      <button class="act" id="nGo">创建</button>
      <button class="act ghost" id="nCancel">取消</button>
    </div>
    <div id="drafts"></div>
    <details class="group" id="pubGroup">
      <summary><span>已发布</span><span class="count" id="pubCount"></span></summary>
      <div id="published"></div>
    </details>
  </div>
  <div class="col main">
    <div class="head"><h2>预览</h2><button class="mini" id="theme">深色</button></div>
    <div id="preview"><p class="empty">左边选一篇。</p></div>
  </div>
  <div class="col side">
    <h2 style="margin-bottom:10px">发布信息</h2>
    <div class="side-scroll" id="side"><p class="empty">—</p></div>
    <div class="side-foot" id="foot"></div>
  </div>
</div>
<div class="flash" id="flash"></div>
<script>
let cur = null, curSrc = 'draft', curMtime = 0, busy = false;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const flash = (msg) => { const f = $('flash'); f.textContent = msg; f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 1600); };

// ── 主题 ──
// 预览必须能两套都看：注入的 :root / .dark 变量靠 <html> 上的 class 切换，
// 站点本身也是这个机制（globals.css 的 @custom-variant dark）。
const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    $('theme').textContent = dark ? '浅色' : '深色';
    localStorage.setItem('ui-dark', dark ? '1' : '');
};
applyTheme(localStorage.getItem('ui-dark') === '1');
$('theme').onclick = () => applyTheme(!document.documentElement.classList.contains('dark'));

// ── 草稿列表 ──
async function loadDrafts() {
    const list = await (await fetch('/api/drafts')).json();
    const ago = (ms) => {
        const m = Math.floor((Date.now() - ms) / 60000);
        if (m < 1) return '刚刚';
        if (m < 60) return m + ' 分钟前';
        const h = Math.floor(m / 60);
        return h < 24 ? h + ' 小时前' : Math.floor(h / 24) + ' 天前';
    };
    $('drafts').innerHTML = list.length ? list.map(d =>
        \`<div class="draft" tabindex="0" data-f="\${esc(d.file)}" data-src="draft">
           <b>\${esc(d.title)}</b>
           <div class="sub">
             <span class="when">\${ago(d.mtime)}</span><i class="dot"></i><span>\${d.words} 字</span>
             \${d.live ? '<i class="pill live">站上已有</i>' : '<i class="pill">新文章</i>'}
           </div>
         </div>\`
    ).join('') : '<p class="empty">还没有草稿，点右上角新建。</p>';

    // 已发布的那 19 篇：能翻出来改一处再重发（补代码块语言标注之类）
    const pub = await (await fetch('/api/published')).json();
    $('pubCount').textContent = pub.length ? pub.length + ' 篇' : '';
    $('published').innerHTML = pub.length ? pub.map(d =>
        \`<div class="draft pub" tabindex="0" data-f="\${esc(d.file)}" data-src="post">
           <b>\${esc(d.title)}</b>
           <div class="sub">
             <span class="when">\${esc(d.date)}</span>\${d.category ? '<i class="dot"></i><span>' + esc(d.category) + '</span>' : ''}
             <i class="dot"></i><span>\${d.words} 字</span>
           </div>
         </div>\`
    ).join('') : '<p class="empty">还没有已发布的文章镜像。</p>';

    document.querySelectorAll('.draft').forEach(el => {
        const pick = () => select(el.dataset.f, false, el.dataset.src);
        el.onclick = pick;
        el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
        el.classList.toggle('on', el.dataset.f === cur && el.dataset.src === curSrc);
    });
    // ⚠ 只在还没选过时自动选第一篇。无条件 select 会在每次发布结束后把右栏重绘，
    //   连带把刚跑完的日志擦掉 —— 真人点完按钮只会看到日志一闪而过。
    if (list.length && !cur) select(list[0].file, false, 'draft');
    return list;
}

// ── 选中并渲染 ──
async function select(file, keepScroll, src) {
    cur = file;
    if (src) curSrc = src;
    document.querySelectorAll('.draft').forEach(el =>
        el.classList.toggle('on', el.dataset.f === file && el.dataset.src === curSrc));
    const d = await (await fetch('/api/inspect?file=' + encodeURIComponent(file) + '&src=' + curSrc)).json();
    curMtime = d.mtime;

    const col = document.querySelector('.col.main');
    const keep = keepScroll ? col.scrollTop : 0;
    // 站点文章页顶部是一整块 hero 封面，预览里原来完全没有 ——
    // 刚用 PicList 配好的封面看不到，等于这一步白配。
    const cover = d.meta.coverImage
        ? \`<div class="cover" style="background-image:url('\${esc(d.meta.coverImage)}')"></div>\`
        : '<div class="cover nocover">未设封面 · 线上会用分类默认图</div>';
    $('preview').innerHTML =
        \`\${cover}
         <div class="hero">\${esc(d.meta.title)}</div>
         <div class="herometa">\${esc(d.meta.date)} · \${esc(d.meta.category)} · \${d.meta.readTime} 分钟阅读</div>
         <div class="post-prose">\${d.html}</div>\`;
    col.scrollTop = keep;

    const warn = [];
    d.problems.forEach(p => warn.push(\`<div class="warn bad">\${esc(p)}</div>\`));
    if (d.duplicateH1) warn.push(\`<div class="warn">正文第一个 H1「\${esc(d.duplicateH1)}」和标题重复，页面会有两个 h1。发布时可勾选删掉。</div>\`);
    // 写法体检：渲染管线只有一套，各篇看起来不一样全是这些差异造成的
    d.lint.forEach(i => warn.push(\`<div class="warn">\${esc(i.msg)}<br><span style="opacity:.75">建议：\${esc(i.fix)}</span></div>\`));
    if (!d.meta.excerpt) warn.push('<div class="warn">没能自动抽出摘要，在下面「改字段」里补一句。</div>');

    // 打开的是已发布文章时把话说在前面：content/posts 是服务器的单向镜像，
    // 在这儿改只动本地副本，不重发线上就是没变。
    const mirrorNote = d.src === 'post'
        ? '<div class="warn">这是<b>已发布文章的本地镜像</b>。在这里改只动本地副本 —— 要线上生效，改完必须点下面的「更新线上文章」。</div>'
        : '';

    $('side').innerHTML = mirrorNote + warn.join('') + \`
      <div class="sect">这次发布</div>
      <div class="row"><span>动作</span><span>\${d.live ? '更新站上已有的文章' : '新发一篇'}</span></div>
      <div class="row"><span>地址</span><span>/post/\${esc(d.slug)}</span></div>
      <div class="row"><span>待镜像图片</span><span>\${d.images.length ? d.images.length + ' 张' : '无跨境图片 ✓'}</span></div>
      \${d.images.length ? \`<details class="imgs"><summary>看图片地址</summary>\${d.images.map(u => \`<div class="url">\${esc(u)}</div>\`).join('')}</details>\` : ''}

      <div class="sect">自动算的</div>
      <div class="row"><span>阅读时长</span><span>\${d.meta.readTime} 分钟</span></div>
      <div class="row"><span>最后修改</span><span>\${esc(d.meta.lastModified)}</span></div>
      <div class="row"><span>摘要</span><span>\${d.excerptAuto ? '自动抽取' : '你写的'}</span></div>
      <div class="excerpt">\${esc(d.meta.excerpt) || '（空）'}</div>

      <div class="sect">字段</div>
      <div class="row"><span>分类</span><span>\${esc(d.meta.category)}</span></div>
      <div class="row"><span>标签</span><span>\${(d.meta.tags||[]).map(t=>\`<i class="tag">\${esc(t)}</i>\`).join('')}</span></div>
      <details class="edit"><summary>改字段</summary>
        <label>标题</label><input id="eTitle" value="\${esc(d.raw.title||'')}">
        <label>分类</label><input id="eCat" value="\${esc(d.raw.category||'')}">
        <label>标签（逗号分隔）</label><input id="eTags" value="\${esc((d.raw.tags||[]).join(', '))}">
        <label>封面地址（PicList 传完粘这里，可空）</label><input id="eCover" value="\${esc(d.raw.coverImage||'')}">
        <label>摘要（留空=自动抽）</label><textarea id="eExcerpt">\${esc(d.raw.excerpt||'')}</textarea>
        <button class="act ghost" id="eSave">保存到草稿文件</button>
      </details>
      <pre class="log" id="log" style="display:none"></pre>\`;

    // 操作区吸底，永远看得见（展开改字段后也不会被推走）
    $('foot').innerHTML = \`
      \${d.duplicateH1 ? '<label style="display:block;font-size:12px;margin-bottom:8px"><input type="checkbox" id="striph1" checked style="width:auto;margin:0 5px 0 0"> 发布时删掉重复的 H1</label>' : ''}
      <button class="act" id="pub" \${d.problems.length ? 'disabled' : ''}>\${d.live ? '更新线上文章' : '发布到线上'}</button>
      <div class="foot-row">
        \${d.images.length ? '<button class="act ghost" id="chk">试抓图片</button>' : ''}
        \${d.src === 'draft' ? '<button class="act ghost" id="prev">本地预览</button>' : ''}
        \${d.src === 'draft' ? '<button class="act ghost danger" id="del">删除</button>' : ''}
      </div>\`;

    // 发布是对外动作、而且立刻公开，不该一次点击就发生。
    // 用行内二次确认而不是 confirm() 弹窗：弹窗会挡住后面的日志，也没法带上下文。
    let armed = false;
    $('pub').onclick = () => {
        if (!armed) {
            armed = true;
            const label = d.live ? '更新线上文章' : '发布到线上';
            $('pub').textContent = \`确认\${d.live ? '覆盖' : '发布'} shadowquake.top/post/\${d.slug}\`;
            $('pub').style.background = 'crimson';
            $('pub').style.color = '#fff';
            setTimeout(() => {   // 5 秒不点就复位，免得下次误触
                if (!armed) return;
                armed = false;
                $('pub').textContent = label;
                $('pub').style.background = ''; $('pub').style.color = '';
            }, 5000);
            return;
        }
        armed = false;
        act('publish');
    };
    if ($('prev')) $('prev').onclick = () => act('preview');
    $('eSave').onclick = saveMeta;
    if ($('chk')) $('chk').onclick = checkImages;

    // 删除同样两步（已发布的没有这个按钮）
    let delArmed = false;
    if ($('del')) $('del').onclick = async () => {
        if (!delArmed) {
            delArmed = true;
            $('del').textContent = '真的删除？再点一次';
            setTimeout(() => { delArmed = false; $('del').textContent = '删除这篇草稿'; }, 5000);
            return;
        }
        await fetch('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: cur, src: curSrc }) });
        cur = null;
        $('side').innerHTML = '<p class="empty">—</p>';
        $('preview').innerHTML = '<p class="empty">左边选一篇。</p>';
        await loadDrafts();
        flash('草稿已删除');
    };
}

/**
 * 试抓图片。
 * 镜像失败现在会中止发布（见 publish-post.mjs），但那是点了发布之后才知道 ——
 * 跨境图床要不要走代理是环境问题，值得提前一步试出来。
 */
async function checkImages() {
    const btn = $('chk');
    btn.disabled = true; btn.textContent = '抓取中…';
    const r = await (await fetch('/api/check-images?file=' + encodeURIComponent(cur) + '&src=' + curSrc)).json();
    btn.disabled = false;
    const bad = r.filter(x => !x.ok);
    btn.textContent = bad.length ? \`\${bad.length}/\${r.length} 张抓不到\` : \`\${r.length} 张都能抓 ✓\`;
    const log = $('log');
    log.style.display = 'block';
    log.textContent = r.map(x => (x.ok ? '✓ ' : '✗ ') + x.url + (x.ok ? \`  (\${x.kb}KB)\` : \`\\n    \${x.msg}\`)).join('\\n')
        + (bad.length ? '\\n\\n跨境图床多半要过代理。关掉发布台，带上代理再启动：\\n  HTTPS_PROXY=http://127.0.0.1:7890 npm run post:ui' : '');
}

// ── 改 frontmatter ──
async function saveMeta() {
    await fetch('/api/meta', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            file: cur, src: curSrc,
            title: $('eTitle').value, category: $('eCat').value, tags: $('eTags').value,
            coverImage: $('eCover').value, excerpt: $('eExcerpt').value,
        }),
    });
    flash('已写回草稿');
    await loadDrafts();
    await select(cur, true);
}

// ── 执行 ──
async function act(mode) {
    busy = true;
    const log = $('log');
    log.style.display = 'block';
    log.textContent = '执行中…\\n';
    $('pub').disabled = true; if ($('prev')) $('prev').disabled = true;
    const stripH1 = $('striph1')?.checked ? '1' : '';
    const res = await fetch('/api/run', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: cur, mode, stripH1, src: curSrc }),
    });
    const reader = res.body.getReader(); const dec = new TextDecoder();
    log.textContent = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        log.textContent += dec.decode(value);
        log.scrollTop = log.scrollHeight;
    }
    $('pub').disabled = false; if ($('prev')) $('prev').disabled = false;
    busy = false;
    loadDrafts();
}

// ── 新建 ──
$('newBtn').onclick = () => { $('newForm').style.display = 'block'; $('nTitle').focus(); };
$('nCancel').onclick = () => { $('newForm').style.display = 'none'; };
$('nGo').onclick = async () => {
    const body = { title: $('nTitle').value, slug: $('nSlug').value, category: $('nCat').value, tags: $('nTags').value };
    if (!body.title || !body.slug) return flash('标题和 slug 都要填');
    const r = await fetch('/api/new', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) return flash(j.error);
    $('newForm').style.display = 'none';
    $('nTitle').value = ''; $('nSlug').value = ''; $('nTags').value = '';
    cur = null;
    await loadDrafts();
    select(j.file);
    flash('已创建，去编辑器里写吧');
};

// ── 保存即刷新 ──
// 摆在 Obsidian 旁边用：那边 Ctrl+S，这边自动重渲染。
// 轮询 mtime 就够了（1.5s，本地读目录），不值得为此引 watcher 和 SSE。
// 正在跑发布时不刷新，否则会把日志冲掉。
setInterval(async () => {
    if (busy || !cur) return;
    try {
        const list = await (await fetch('/api/drafts')).json();
        const me = list.find(d => d.file === cur);
        if (me && me.mtime !== curMtime) { await select(cur, true); flash('已更新'); }
        if (list.length !== document.querySelectorAll('.draft').length) loadDrafts();
    } catch { /* 服务停了就安静等着 */ }
}, 1500);

loadDrafts();
</script></body></html>`;

// ─────────────── 服务 ───────────────

const json = (res, obj, code = 200) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
};
const readBody = async (req) => {
    let raw = '';
    for await (const c of req) raw += c;
    return JSON.parse(raw || '{}');
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
        if (url.pathname === '/') {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            return res.end(PAGE(previewCss()));
        }
        if (url.pathname === '/api/drafts') return json(res, listDrafts());
        if (url.pathname === '/api/published') return json(res, listPublished());
        if (url.pathname === '/api/inspect') {
            return json(res, inspect(url.searchParams.get('file') || '', url.searchParams.get('src')));
        }

        // 试抓：用和发布时同一条路径（curl，会读 HTTPS_PROXY），才测得准
        if (url.pathname === '/api/check-images') {
            const d = inspect(url.searchParams.get('file') || '', url.searchParams.get('src'));
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-check-'));
            const out = [];
            for (const u of d.images) {
                try {
                    const r = await mirrorImage(u, tmp);
                    out.push({ url: u, ok: true, kb: Math.round(r.bytes / 1024) });
                } catch (e) {
                    out.push({ url: u, ok: false, msg: String(e.message).split('\n')[0] });
                }
            }
            fs.rmSync(tmp, { recursive: true, force: true });
            return json(res, out);
        }

        if (url.pathname === '/api/delete' && req.method === 'POST') {
            const b = await readBody(req);
            // 只允许删草稿。content/posts 是线上内容的镜像，从这里删等于把留档也弄没了，
            // 而且线上照样还在 —— 是个只有坏处的操作。
            if (b.src === 'post') return json(res, { error: '已发布的文章不能在这里删' });
            fs.unlinkSync(draftPath(b.file));
            return json(res, { ok: true });
        }

        if (url.pathname === '/api/meta' && req.method === 'POST') {
            const b = await readBody(req);
            writeMeta(b.file, b, b.src);
            return json(res, { ok: true });
        }

        if (url.pathname === '/api/new' && req.method === 'POST') {
            const b = await readBody(req);
            const argv = [path.join(__dirname, 'new-post.mjs'), b.title, '--slug', b.slug];
            if (b.category) argv.push('--category', b.category);
            if (b.tags) argv.push('--tags', b.tags);
            const r = spawn(process.execPath, argv, { cwd: WEB });
            let out = '';
            r.stdout.on('data', (d) => { out += d; });
            r.stderr.on('data', (d) => { out += d; });
            return r.on('close', (code) => {
                if (code !== 0) return json(res, { error: out.trim().split('\n')[0] || '创建失败' });
                const m = out.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}-[^\s\\/]+\.md)/);
                json(res, { file: m ? m[1] : null });
            });
        }

        if (url.pathname === '/api/run' && req.method === 'POST') {
            const { file, mode, stripH1, src } = await readBody(req);
            // publish-post.mjs 认「存在的路径」也认「草稿箱里的裸文件名」——
            // 重发已发布的文章就把 content/posts 下的完整路径传给它
            const target = src === 'post' ? resolveFile(file, 'post') : path.basename(file);
            const argv = [path.join(__dirname, 'publish-post.mjs'), target];
            if (mode === 'preview') argv.push('--preview');
            if (stripH1) argv.push('--strip-h1');

            res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
            const child = spawn(process.execPath, argv, { cwd: WEB, env: process.env });
            child.stdout.on('data', (d) => res.write(d));
            child.stderr.on('data', (d) => res.write(d));
            child.on('close', (code) => res.end(`\n[退出码 ${code}]\n`));
            return;
        }
        res.writeHead(404).end('not found');
    } catch (e) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(e.stack || e));
    }
});

// 只绑 127.0.0.1：这个界面能往线上发文章，不该出现在局域网里
server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`发布台  ${url}`);
    console.log(`草稿箱  ${DRAFTS_DIR}\n`);
    // 桌面启动器会自己用 Edge 的 app 模式开一个独立窗口，这时候别再弹一个普通标签页
    if (process.env.POST_UI_NO_OPEN) return;
    const open = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
        : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    try { execFileSync(open[0], open[1], { stdio: 'ignore' }); } catch { /* 打不开就自己点上面那个地址 */ }
});
