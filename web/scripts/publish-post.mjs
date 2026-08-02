/**
 * publish-post.mjs —— 把一篇草稿发到线上。
 *
 * 为什么发文章不需要部署:
 *   文章正文是**挂载卷**里的文件(content/posts),不在 Docker 镜像里。
 *   丢一个 .md 上去、清掉 CF 边缘缓存,就生效了 —— lib/posts.js 的索引只缓存 30s,
 *   正文渲染按文件 mtime 失效。所以这个脚本全程不碰 docker build。
 *
 * 它做的事:
 *   1. 校验 frontmatter(缺字段 / slug 非法 / 日期格式 / 值里有换行会喂坏解析器)
 *   2. 自动补 excerpt、readTime、lastModified —— 这三个是机械字段,手写只会写错
 *   3. 把**跨境图片**(PicList 传的 GitHub/jsDelivr 等)抓下来转 webp,
 *      传到服务器 uploads 卷,并把正文/封面里的地址改写成 /uploads/covers/xxx.webp。
 *      CLAUDE.md 的「前端零跨境依赖」是硬约束:大陆实测这些域名 TTFB 3.7-4.9s,
 *      而封面基本就是 LCP 元素。你照常用 PicList,落地由这一步兜底。
 *   4. scp 到服务器 content/posts/
 *   5. 清 CF 缓存(该文 + / + /blog + /sitemap.xml + /feed.xml)
 *   6. 验证线上真的 200 且标题出现
 *
 * 用法:
 *   cd web
 *   node scripts/publish-post.mjs 2026-08-02-my-post.md --dry-run   # 只看会做什么,不碰服务器
 *   node scripts/publish-post.mjs 2026-08-02-my-post.md             # 真发
 *   node scripts/publish-post.mjs <文件> --strip-h1                 # 顺手删掉正文里与标题重复的那个 H1
 *   node scripts/publish-post.mjs <文件> --keep-remote-images        # 不镜像图片(自担跨境代价)
 *
 * 环境变量:
 *   DRAFTS_DIR   草稿目录(默认 ../content/drafts,可指到 Obsidian 库)
 *   SSH_HOST     默认 shadowsky
 *   HTTPS_PROXY  下载跨境图片时需要 —— 下载走 curl,会自动读这个变量
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');
const LOCAL_POSTS = path.join(WEB, '..', 'content', 'posts');

const SSH_HOST = process.env.SSH_HOST || 'shadowsky';
const REMOTE_ROOT = '/www/wwwroot/shadowquake-v2';
const REMOTE_POSTS = `${REMOTE_ROOT}/content/posts`;
const REMOTE_COVERS = `${REMOTE_ROOT}/data/uploads/covers`;
const REMOTE_PURGE = `${REMOTE_ROOT}/tools/cf-purge.sh`;
const SITE = 'https://shadowquake.top';

/** 站内地址:这些不用镜像。其余一律视为跨境外链。 */
const SELF_HOSTS = new Set(['shadowquake.top', 'www.shadowquake.top']);

const REQUIRED_FIELDS = ['title', 'date', 'category', 'tags'];
/** 字段顺序固定,让每篇文件长得一样,diff 才干净 */
const FIELD_ORDER = ['title', 'date', 'category', 'author', 'tags', 'excerpt', 'lastModified', 'readTime', 'coverImage'];

function parseArgs(argv) {
    const out = { _: [], flags: new Set() };
    for (const a of argv) {
        if (a.startsWith('--')) out.flags.add(a.slice(2));
        else out._.push(a);
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));
const DRY = args.flags.has('dry-run');

function die(msg) {
    console.error(`✗ ${msg}`);
    process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
    return execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

// ─────────────────────────── frontmatter ───────────────────────────

/**
 * 解析 frontmatter。语义必须和 lib/posts.js 里那个手写解析器**完全一致**,
 * 否则本地看着好好的、线上索引里字段是空的。
 * 它按第一个 ':' 切、只剥首尾各一个引号、tags 走 JSON.parse。
 */
function parseFrontMatter(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, fmRaw: '', body: raw };
    const fm = {};
    for (const line of m[1].split('\n')) {
        const ci = line.indexOf(':');
        if (ci === -1) continue;
        const k = line.slice(0, ci).trim();
        const v = line.slice(ci + 1).trim().replace(/^["']|["']$/g, '');
        if (k === 'tags') { try { fm[k] = JSON.parse(line.slice(ci + 1).trim()); } catch { fm[k] = []; } }
        else if (k === 'readTime') fm[k] = parseInt(v, 10) || 0;
        else fm[k] = v;
    }
    return { fm, fmRaw: m[1], body: raw.slice(m[0].length) };
}

/**
 * 序列化 frontmatter。
 * ⚠ 每个值必须单行、不能含 `---`:线上解析器是 raw.split('---', 3) + 逐行 indexOf(':'),
 *   值里一个换行就能把后面所有字段冲掉。这里统一压平并做防御。
 */
function buildFrontMatter(fm) {
    const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/-{3,}/g, '—').trim();
    const lines = [];
    for (const k of FIELD_ORDER) {
        if (fm[k] === undefined || fm[k] === '') continue;
        if (k === 'tags') lines.push(`tags: ${JSON.stringify(fm.tags)}`);
        else if (k === 'readTime') lines.push(`readTime: ${fm.readTime}`);
        else lines.push(`${k}: "${clean(fm[k]).replace(/"/g, '\\"')}"`);
    }
    return `---\n${lines.join('\n')}\n---\n`;
}

// ─────────────────────────── 自动字段 ───────────────────────────

/** 去掉代码块、HTML 注释,用于统计和摘要提取 */
function stripNoise(body) {
    return body
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * 阅读时长:中文 250 字/分钟 + 代码 15 行/分钟 + 英文 200 词/分钟。
 *
 * 系数是拿现有 19 篇作者手写的 readTime 拟合出来的(那些值彼此并不自洽 ——
 * 同样 800 字有的写 3 有的写 4),这组参数下多数篇目落在手写值 ±1 分钟内。
 * 代码必须单独计:blog-workflow 只有 777 字却有 94 行代码,把代码丢掉会算成 3 分钟,
 * 作者写的是 8。
 */
function computeReadTime(body) {
    const codeLines = (body.match(/```[\s\S]*?```/g) || [])
        .reduce((n, block) => n + Math.max(0, block.split('\n').length - 2), 0);
    const text = stripNoise(body);
    const cjk = (text.match(/[一-龥]/g) || []).length;
    const words = (text.replace(/[一-龥]/g, ' ').match(/[A-Za-z0-9_'-]+/g) || []).length;

    const prose = cjk / 250 + words / 200;
    // 扫代码的时间不超过读正文的时间 —— 没有这个上限，B 站嵌入那篇(159 行 HTML 片段)
    // 会被算成 20 分钟，作者写的是 14。代码块越长越是复制粘贴，不是逐行读。
    const code = Math.min(codeLines / 15, prose);
    return Math.max(1, Math.round(prose + code));
}

/**
 * 摘要。优先用开头的 TL;DR 引用块(这个站的写法习惯,本来就是作者自己写的一句话总结),
 * 否则取第一段正文。
 *
 * ⚠ 必须跳过与标题重复的 H1 —— 现有 19 篇的 excerpt 几乎全是把标题又抄了一遍,
 *   卡片上只有两行摘要,重复一遍等于白丢一行,BlogContent.js 里那个 trimTitlePrefix
 *   就是为了在展示时把它剥掉。从源头生成就不该再产生这个问题。
 */
function computeExcerpt(body, title) {
    const text = stripNoise(body);
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    const demote = (s) => s
        .replace(/^>\s?/gm, '')                       // 引用标记
        .replace(/^#{1,6}\s+/gm, '')                  // 标题标记
        .replace(/\*\*|__|\*|_|`/g, '')               // 强调 / 行内代码
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')    // 链接与图片保留文字
        .replace(/\s+/g, ' ')
        .trim();

    const norm = (s) => s.replace(/[\s\p{P}]/gu, '');
    const titleNorm = norm(title || '');

    for (const raw of blocks) {
        const s = demote(raw);
        if (!s) continue;
        if (/^(\||---|===)/.test(raw)) continue;                       // 表格 / 分隔线
        if (titleNorm && norm(s) === titleNorm) continue;              // 与标题重复的 H1
        if (titleNorm && norm(s).startsWith(titleNorm) && norm(s).length < titleNorm.length + 8) continue;
        if (s.length < 12) continue;                                   // 太短的过渡句
        const cleaned = s.replace(/^TL;?DR[:：]?\s*/i, '');
        return cleaned.length > 120 ? cleaned.slice(0, 118).trimEnd() + '…' : cleaned;
    }
    return '';
}

// ─────────────────────────── 图片 ───────────────────────────

/** 收集正文与封面里的所有绝对 http(s) 图片地址 */
function collectImageUrls(body, coverImage) {
    const urls = new Set();
    const add = (u) => {
        if (!u || !/^https?:\/\//i.test(u)) return;
        try {
            if (SELF_HOSTS.has(new URL(u).hostname)) return;
        } catch { return; }
        urls.add(u);
    };
    add(coverImage);
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) add(m[1]);
    for (const m of body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
    return [...urls];
}

/**
 * 下载 → 转 webp → 返回本地临时文件路径与目标文件名。
 * 文件名用源 URL 的 sha1 前 8 位:同一张图重复发不会重复占空间,换了图就是新文件名,
 * 也就不用为图片清缓存(和 mirror-covers.mjs 的约定保持一致)。
 *
 * 下载走 curl 而不是 fetch:PicList 常用的 GitHub/jsDelivr 在大陆多半要过代理,
 * curl 会读 HTTPS_PROXY,Node 22 的全局 fetch 不会。
 */
async function mirrorImage(url, tmpDir) {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);
    const name = `${hash}.webp`;
    const src = path.join(tmpDir, `${hash}.src`);
    const out = path.join(tmpDir, name);

    run('curl', ['-fsSL', '--max-time', '40', '-o', src, url]);
    await sharp(src)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(out);

    return { name, out, bytes: fs.statSync(out).size };
}

// ─────────────────────────── 主流程 ───────────────────────────

const input = args._[0];
if (!input) {
    console.error('用法: node scripts/publish-post.mjs <草稿文件名或路径> [--dry-run] [--strip-h1] [--keep-remote-images]');
    process.exit(1);
}

const draftPath = fs.existsSync(input) ? path.resolve(input) : path.join(DRAFTS_DIR, input);
if (!fs.existsSync(draftPath)) die(`找不到草稿: ${draftPath}`);

const fileName = path.basename(draftPath);
if (!fileName.endsWith('.md')) die('只接受 .md 文件');
if (!/^[a-z0-9][a-z0-9.-]*\.md$/.test(fileName)) {
    die(`文件名「${fileName}」不合法。它就是线上地址 /post/<slug>，只允许小写字母、数字、连字符。`);
}
const slug = fileName.replace(/\.md$/, '');

const raw = fs.readFileSync(draftPath, 'utf8').replace(/\r\n/g, '\n');
const { fm, body } = parseFrontMatter(raw);

// ── 校验 ──
const missing = REQUIRED_FIELDS.filter((k) => fm[k] === undefined || fm[k] === '' || (k === 'tags' && !fm.tags?.length));
if (missing.length) die(`frontmatter 缺字段: ${missing.join(', ')}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) die(`date 必须是 YYYY-MM-DD,现在是「${fm.date}」`);
if (!Array.isArray(fm.tags)) die('tags 必须是数组,例如 ["Docker", "教程"]');

// 正文里与标题重复的 H1：页面顶部已经有大标题，这里再来一个等于每篇两个 h1
const h1 = body.match(/^#\s+(.+)$/m);
const sameH1 = h1 && h1[1].replace(/[\s\p{P}]/gu, '') === String(fm.title).replace(/[\s\p{P}]/gu, '');
let finalBody = body;
if (sameH1) {
    if (args.flags.has('strip-h1')) {
        finalBody = body.replace(/^#\s+.+$\n*/m, '');
        console.log('· 已删除正文里与标题重复的 H1');
    } else {
        console.warn(`⚠ 正文第一个 H1「${h1[1]}」和标题重复 —— 页面顶部已有大标题，会出现两个 h1。`);
        console.warn('  想去掉就加 --strip-h1（默认不动你的正文）');
    }
}

// ── 自动字段 ──
const out = { ...fm };
out.author = fm.author || process.env.POST_AUTHOR || 'Thoi';
out.excerpt = fm.excerpt || computeExcerpt(finalBody, fm.title);
out.readTime = computeReadTime(finalBody);
out.lastModified = new Date().toISOString().slice(0, 10);
if (!out.excerpt) console.warn('⚠ 没能自动抽出摘要，建议在 frontmatter 里手写一句 excerpt');

// ── 图片镜像 ──
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-publish-'));
const mirrored = [];
if (!args.flags.has('keep-remote-images')) {
    const urls = collectImageUrls(finalBody, out.coverImage);
    for (const url of urls) {
        try {
            const r = await mirrorImage(url, tmpDir);
            const localUrl = `/uploads/covers/${r.name}`;
            // 全文替换该 URL（封面 frontmatter 与正文里的引用一起换掉）
            finalBody = finalBody.split(url).join(localUrl);
            if (out.coverImage === url) out.coverImage = localUrl;
            mirrored.push({ url, localUrl, kb: Math.round(r.bytes / 1024), file: r.out });
        } catch (e) {
            console.warn(`⚠ 镜像失败,保持外链: ${url}`);
            console.warn(`  ${String(e.message).split('\n')[0]}`);
            console.warn('  跨境图床多半要过代理,试试 HTTPS_PROXY=http://127.0.0.1:7890 再跑');
        }
    }
}

const finalDoc = buildFrontMatter(out) + '\n' + finalBody.replace(/^\n+/, '');

// ── 预览 ──
console.log(`\n── ${fileName} ──`);
console.log(`  标题      ${out.title}`);
console.log(`  日期      ${out.date}   分类 ${out.category}   标签 ${out.tags.join(' / ')}`);
console.log(`  阅读时长  ${out.readTime} 分钟${fm.readTime && fm.readTime !== out.readTime ? `（原写 ${fm.readTime}，已重算）` : ''}`);
console.log(`  摘要      ${out.excerpt || '（空）'}`);
console.log(`  封面      ${out.coverImage || '（无）'}`);
if (mirrored.length) {
    console.log(`  镜像图片  ${mirrored.length} 张`);
    for (const m of mirrored) console.log(`    ${m.url}\n      → ${m.localUrl}  (${m.kb}KB)`);
} else if (!args.flags.has('keep-remote-images')) {
    console.log('  镜像图片  无跨境图片 ✓');
}
console.log(`  线上地址  ${SITE}/post/${slug}`);

// --preview:把成品放进本地 content/posts/,用真实的列表/上下篇/相关推荐看排版。
// 这是**本地副本,没有上线**;content/posts 是服务器内容的镜像,所以这里会多出一个
// 服务器上没有的文件 —— pull-content.sh 会把它标出来,免得忘了删或误提交。
if (args.flags.has('preview')) {
    fs.mkdirSync(LOCAL_POSTS, { recursive: true });
    const local = path.join(LOCAL_POSTS, fileName);
    fs.writeFileSync(local, finalDoc, 'utf8');
    console.log(`\n[preview] 已写入本地 content/posts/${fileName}（**未上线**）`);
    console.log('  看排版:  npm run dev');
    console.log(`           然后开 http://localhost:3000/post/${slug}`);
    console.log(`  不要了:  rm "${path.relative(process.cwd(), local)}"`);
    console.log(`  确认发布: node scripts/publish-post.mjs ${fileName}`);
    process.exit(0);
}

if (DRY) {
    const preview = path.join(tmpDir, fileName);
    fs.writeFileSync(preview, finalDoc, 'utf8');
    console.log(`\n[dry-run] 没有碰服务器,也没有碰仓库。成品在:\n  ${preview}`);
    console.log(`\n想在本地真实环境里看排版: node scripts/publish-post.mjs ${fileName} --preview`);
    process.exit(0);
}

// ── 上传 ──
console.log('\n==> 上传…');
const stagedMd = path.join(tmpDir, fileName);
fs.writeFileSync(stagedMd, finalDoc, 'utf8');

if (mirrored.length) {
    run('ssh', [SSH_HOST, `mkdir -p ${REMOTE_COVERS}`]);
    for (const m of mirrored) {
        run('scp', ['-q', m.file, `${SSH_HOST}:${REMOTE_COVERS}/`]);
        console.log(`    图片 ${path.basename(m.file)} ✓`);
    }
}
run('scp', ['-q', stagedMd, `${SSH_HOST}:${REMOTE_POSTS}/`]);
console.log(`    ${fileName} ✓`);

// 本地镜像目录同步一份，省得下次 pull-content.sh 才看到这篇
fs.mkdirSync(LOCAL_POSTS, { recursive: true });
fs.writeFileSync(path.join(LOCAL_POSTS, fileName), finalDoc, 'utf8');

// ── 清缓存 ──
// 只有 /post/* 是服务端渲染正文，靠 purge 保新鲜；/blog 是壳 + 客户端读 /api，
// 但壳里的 sitemap/首页最新文章也要跟着更新，所以一并清。
console.log('==> 清 CF 边缘缓存…');
const purgePaths = [`/post/${slug}`, '/', '/blog', '/sitemap.xml', '/feed.xml'];
try {
    const r = run('ssh', [SSH_HOST, `bash ${REMOTE_PURGE} ${purgePaths.join(' ')}`]);
    console.log(`    ${r.trim().split('\n').pop()}`);
} catch (e) {
    console.warn('⚠ 清缓存失败（文章已经上线，只是边缘可能还发旧页面）');
    console.warn(`  ${String(e.message).split('\n')[0]}`);
}

// ── 验证 ──
// ⚠ --noproxy '*'：本机代理会把测量结果搞成假的（见 CLAUDE.md 的延迟排查）
console.log('==> 验证…');
const url = `${SITE}/post/${slug}`;
try {
    const code = run('curl', ['-s', '-o', os.devNull, '-w', '%{http_code}', '--noproxy', '*', url]).trim();
    const html = run('curl', ['-s', '--noproxy', '*', url]);
    const hasTitle = html.includes(out.title.slice(0, 12));
    const inIndex = run('curl', ['-s', '--noproxy', '*', `${SITE}/api/posts`]).includes(fileName);
    console.log(`    ${url}  ${code}${hasTitle ? ' ✓ 标题在' : ' ⚠ 页面里没找到标题'}`);
    console.log(`    /api/posts 索引  ${inIndex ? '已收录 ✓' : '⚠ 未收录（索引缓存 30s，稍后再看）'}`);
    if (code !== '200') process.exitCode = 1;
} catch {
    console.warn('⚠ 验证请求失败，手工开一下上面那个地址');
}

console.log('\n完成。归档到 git：bash scripts/pull-content.sh --commit');
