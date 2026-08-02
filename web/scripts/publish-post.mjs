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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    REQUIRED_FIELDS, parseFrontMatter, buildFrontMatter,
    computeExcerpt, computeReadTime, collectImageUrls, mirrorImage,
    validate, duplicateH1,
} from './lib/post-meta.mjs';

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

// ─────────────────────────── 主流程 ───────────────────────────

const input = args._[0];
if (!input) {
    console.error('用法: node scripts/publish-post.mjs <草稿文件名或路径> [--dry-run] [--strip-h1] [--keep-remote-images]');
    process.exit(1);
}

const draftPath = fs.existsSync(input) ? path.resolve(input) : path.join(DRAFTS_DIR, input);
if (!fs.existsSync(draftPath)) die(`找不到草稿: ${draftPath}`);

const fileName = path.basename(draftPath);
const slug = fileName.replace(/\.md$/, '');

const raw = fs.readFileSync(draftPath, 'utf8').replace(/\r\n/g, '\n');
const { fm, body } = parseFrontMatter(raw);

// ── 校验 ──（判断标准放在 lib/post-meta.mjs，和发布台共用一份，免得两边标准分叉）
const problems = validate(fileName, fm);
if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
}

// 正文里与标题重复的 H1：页面顶部已经有大标题，这里再来一个等于每篇两个 h1
const dupH1 = duplicateH1(body, fm.title);
let finalBody = body;
if (dupH1) {
    if (args.flags.has('strip-h1')) {
        finalBody = body.replace(/^#\s+.+$\n*/m, '');
        console.log('· 已删除正文里与标题重复的 H1');
    } else {
        console.warn(`⚠ 正文第一个 H1「${dupH1}」和标题重复 —— 页面顶部已有大标题，会出现两个 h1。`);
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
const failed = [];
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
            failed.push({ url, msg: String(e.message).split('\n')[0] });
        }
    }
}

/*
  镜像失败必须中止，不能「保持外链继续发」。
  原来是 warn 一句就往下走 —— 文章照样上线，只是带着跨境外链，
  而那条警告淹在一堆输出里（发布台的日志框里更看不见）。
  结果就是站点那条「前端零跨境依赖」的硬约束被静默破坏，
  等你发现时已经是大陆用户加载 4.5 秒了。
  真要带外链发，得自己明写 --keep-remote-images，把这个决定说出口。
*/
if (failed.length) {
    console.error(`\n✗ ${failed.length} 张图片镜像失败，已中止发布（文章没有上线）:`);
    for (const f of failed) console.error(`    ${f.url}\n      ${f.msg}`);
    console.error('\n  跨境图床多半要过代理，带上代理再跑:');
    console.error(`    HTTPS_PROXY=http://127.0.0.1:7890 node scripts/publish-post.mjs ${fileName}`);
    console.error('  确实想带着外链发（大陆会很慢）: 加 --keep-remote-images');
    process.exit(1);
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
