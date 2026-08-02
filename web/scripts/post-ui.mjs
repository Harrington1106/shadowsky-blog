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
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    parseFrontMatter, buildFrontMatter, computeExcerpt, computeReadTime,
    collectImageUrls, validate, duplicateH1,
} from './lib/post-meta.mjs';
import { renderMarkdown } from '../lib/renderMarkdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');
const PORT = Number(process.env.PORT_UI || 4000);

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

function listDrafts() {
    if (!fs.existsSync(DRAFTS_DIR)) return [];
    return fs.readdirSync(DRAFTS_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const full = path.join(DRAFTS_DIR, f);
            const { fm } = parseFrontMatter(fs.readFileSync(full, 'utf8'));
            return { file: f, title: fm.title || f, mtime: fs.statSync(full).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
}

/** 发布预检 + 渲染预览。和 publish-post.mjs 用同一套函数算，不会出现两个答案。 */
function inspect(file) {
    const full = draftPath(file);
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const { fm, body } = parseFrontMatter(raw);

    const out = { ...fm };
    out.author = fm.author || 'Thoi';
    out.excerpt = fm.excerpt || computeExcerpt(body, fm.title);
    out.readTime = computeReadTime(body);
    out.lastModified = new Date().toISOString().slice(0, 10);

    return {
        file,
        slug: path.basename(file).replace(/\.md$/, ''),
        mtime: fs.statSync(full).mtimeMs,
        meta: out,
        raw: fm,                       // 编辑表单要回填「作者原本写了什么」，不能拿自动值
        excerptAuto: !fm.excerpt,
        problems: validate(path.basename(file), fm),
        duplicateH1: duplicateH1(body, fm.title),
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
function writeMeta(file, fields) {
    const full = draftPath(file);
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
  .wrap { display:grid; grid-template-columns: 230px 1fr 310px; height:100vh; }
  .col { overflow:auto; padding:16px; }
  .col + .col { border-left:1px solid var(--border); }
  .col:nth-child(2) > div { max-width: 724px; margin: 0 auto; }
  .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  h2 { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted-foreground);
       margin:0; font-weight:600; }
  .mini { font-size:11px; padding:2px 8px; border-radius:6px; border:1px solid var(--border);
          background:transparent; color:var(--muted-foreground); cursor:pointer; }
  .mini:hover { background: var(--muted); color: var(--foreground); }
  .draft { padding:9px 10px; border-radius:8px; cursor:pointer; border:1px solid transparent; }
  .draft:hover { background: var(--muted); }
  .draft.on { background: var(--muted); border-color: var(--border); }
  .draft b { display:block; font-weight:600; font-size:13px; }
  .draft span { color: var(--muted-foreground); font-size:11px; }
  .empty { color: var(--muted-foreground); font-size:13px; padding:8px 0; }
  .row { display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid var(--border); font-size:12px; }
  .row span:first-child { color: var(--muted-foreground); white-space:nowrap; flex:none; }
  .row span:last-child { text-align:right; min-width:0; word-break:break-all; }
  .tag { display:inline-block; padding:1px 7px; border:1px solid var(--border); border-radius:999px; font-size:11px; margin:0 3px 3px 0; }
  .auto { color: var(--muted-foreground); font-size:10px; border:1px solid var(--border); border-radius:4px; padding:0 4px; margin-left:5px; }
  .warn { background: color-mix(in oklch, orange 14%, transparent); border:1px solid color-mix(in oklch, orange 40%, transparent);
          border-radius:8px; padding:9px 11px; font-size:12px; margin-bottom:10px; }
  .bad { background: color-mix(in oklch, red 14%, transparent); border-color: color-mix(in oklch, red 45%, transparent); }
  input, textarea { width:100%; padding:6px 8px; margin:3px 0 8px; border-radius:6px; border:1px solid var(--border);
                    background: var(--background); color: var(--foreground); font: inherit; font-size:12px; }
  textarea { resize:vertical; min-height:52px; }
  label { font-size:11px; color: var(--muted-foreground); }
  button.act { width:100%; padding:9px; border-radius:8px; border:1px solid var(--border); background:var(--foreground);
               color:var(--background); font-size:13px; font-weight:600; cursor:pointer; margin-top:12px; }
  button.act.ghost { background:transparent; color:var(--foreground); font-weight:400; margin-top:7px; }
  button.act:disabled { opacity:.45; cursor:not-allowed; }
  pre.log { background: var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px;
            font-size:11px; line-height:1.5; white-space:pre-wrap; max-height:34vh; overflow:auto; margin-top:12px; }
  .hero { font-size:22px; font-weight:800; letter-spacing:-.01em; margin:0 0 4px; }
  .herometa { color:var(--muted-foreground); font-size:12px; margin-bottom:22px; padding-bottom:14px; border-bottom:1px solid var(--border); }
  details.edit { margin-top:12px; border-top:1px solid var(--border); padding-top:10px; }
  details.edit summary { font-size:11px; color:var(--muted-foreground); cursor:pointer; text-transform:uppercase; letter-spacing:.08em; }
  .flash { position:fixed; right:14px; bottom:14px; background:var(--foreground); color:var(--background);
           padding:7px 13px; border-radius:8px; font-size:12px; opacity:0; transition:opacity .2s; pointer-events:none; }
  .flash.on { opacity:1; }
</style></head>
<body>
<div class="wrap">
  <div class="col">
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
  </div>
  <div class="col">
    <div class="head"><h2>预览</h2><button class="mini" id="theme">深色</button></div>
    <div id="preview"><p class="empty">左边选一篇。</p></div>
  </div>
  <div class="col">
    <h2>发布信息</h2><div id="side"><p class="empty">—</p></div>
  </div>
</div>
<div class="flash" id="flash"></div>
<script>
let cur = null, curMtime = 0, busy = false;
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
    $('drafts').innerHTML = list.length ? list.map(d =>
        \`<div class="draft" data-f="\${esc(d.file)}"><b>\${esc(d.title)}</b><span>\${esc(d.file)}</span></div>\`
    ).join('') : '<p class="empty">还没有草稿，点右上角新建。</p>';
    document.querySelectorAll('.draft').forEach(el => {
        el.onclick = () => select(el.dataset.f);
        el.classList.toggle('on', el.dataset.f === cur);
    });
    // ⚠ 只在还没选过时自动选第一篇。无条件 select 会在每次发布结束后把右栏重绘，
    //   连带把刚跑完的日志擦掉 —— 真人点完按钮只会看到日志一闪而过。
    if (list.length && !cur) select(list[0].file);
    return list;
}

// ── 选中并渲染 ──
async function select(file, keepScroll) {
    cur = file;
    document.querySelectorAll('.draft').forEach(el => el.classList.toggle('on', el.dataset.f === file));
    const d = await (await fetch('/api/inspect?file=' + encodeURIComponent(file))).json();
    curMtime = d.mtime;

    const col = document.querySelectorAll('.col')[1];
    const keep = keepScroll ? col.scrollTop : 0;
    $('preview').innerHTML =
        \`<div class="hero">\${esc(d.meta.title)}</div>
         <div class="herometa">\${esc(d.meta.date)} · \${esc(d.meta.category)} · \${d.meta.readTime} 分钟阅读</div>
         <div class="post-prose">\${d.html}</div>\`;
    col.scrollTop = keep;

    const warn = [];
    d.problems.forEach(p => warn.push(\`<div class="warn bad">\${esc(p)}</div>\`));
    if (d.duplicateH1) warn.push(\`<div class="warn">正文第一个 H1「\${esc(d.duplicateH1)}」和标题重复，页面会有两个 h1。发布时可勾选删掉。</div>\`);
    if (!d.meta.excerpt) warn.push('<div class="warn">没能自动抽出摘要，在下面「改字段」里补一句。</div>');

    $('side').innerHTML = warn.join('') + \`
      <div class="row"><span>地址</span><span>/post/\${esc(d.slug)}</span></div>
      <div class="row"><span>阅读时长</span><span>\${d.meta.readTime} 分钟<span class="auto">自动</span></span></div>
      <div class="row"><span>最后修改</span><span>\${esc(d.meta.lastModified)}<span class="auto">自动</span></span></div>
      <div class="row"><span>分类</span><span>\${esc(d.meta.category)}</span></div>
      <div class="row"><span>标签</span><span>\${(d.meta.tags||[]).map(t=>\`<i class="tag">\${esc(t)}</i>\`).join('')}</span></div>
      <div class="row"><span>摘要\${d.excerptAuto?'<span class="auto">自动</span>':''}</span><span></span></div>
      <div style="font-size:12px;color:var(--muted-foreground);padding:6px 0 10px">\${esc(d.meta.excerpt) || '（空）'}</div>
      <div class="row"><span>待镜像图片</span><span>\${d.images.length ? d.images.length + ' 张' : '无跨境图片 ✓'}</span></div>
      \${d.images.map(u => \`<div style="font-size:10px;color:var(--muted-foreground);word-break:break-all;padding:3px 0">\${esc(u)}</div>\`).join('')}

      <details class="edit"><summary>改字段</summary>
        <label>标题</label><input id="eTitle" value="\${esc(d.raw.title||'')}">
        <label>分类</label><input id="eCat" value="\${esc(d.raw.category||'')}">
        <label>标签（逗号分隔）</label><input id="eTags" value="\${esc((d.raw.tags||[]).join(', '))}">
        <label>封面地址（PicList 传完粘这里，可空）</label><input id="eCover" value="\${esc(d.raw.coverImage||'')}">
        <label>摘要（留空=自动抽）</label><textarea id="eExcerpt">\${esc(d.raw.excerpt||'')}</textarea>
        <button class="act ghost" id="eSave">保存到草稿文件</button>
      </details>

      \${d.duplicateH1 ? '<label style="display:block;font-size:12px;margin-top:10px"><input type="checkbox" id="striph1" checked> 发布时删掉重复的 H1</label>' : ''}
      <button class="act" id="pub" \${d.problems.length ? 'disabled' : ''}>发布到线上</button>
      <button class="act ghost" id="prev">本地预览（写入 content/posts）</button>
      <pre class="log" id="log" style="display:none"></pre>\`;

    $('pub').onclick = () => act('publish');
    $('prev').onclick = () => act('preview');
    $('eSave').onclick = saveMeta;
}

// ── 改 frontmatter ──
async function saveMeta() {
    await fetch('/api/meta', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            file: cur,
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
    $('pub').disabled = true; $('prev').disabled = true;
    const stripH1 = $('striph1')?.checked ? '1' : '';
    const res = await fetch('/api/run', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: cur, mode, stripH1 }),
    });
    const reader = res.body.getReader(); const dec = new TextDecoder();
    log.textContent = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        log.textContent += dec.decode(value);
        log.scrollTop = log.scrollHeight;
    }
    $('pub').disabled = false; $('prev').disabled = false;
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
        if (url.pathname === '/api/inspect') return json(res, inspect(url.searchParams.get('file') || ''));

        if (url.pathname === '/api/meta' && req.method === 'POST') {
            const b = await readBody(req);
            writeMeta(b.file, b);
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
            const { file, mode, stripH1 } = await readBody(req);
            const argv = [path.join(__dirname, 'publish-post.mjs'), path.basename(file)];
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
    const open = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
        : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    try { execFileSync(open[0], open[1], { stdio: 'ignore' }); } catch { /* 打不开就自己点上面那个地址 */ }
});
