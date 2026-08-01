/**
 * 把外链封面图镜像到本地 —— public/img/covers/ + lib/coverMap.json
 *
 * 站上所有封面图都指向 images.unsplash.com，大陆实测 TTFB 4.5s、70KB 图要 5.2s，
 * 而文章头图基本就是 LCP 元素 —— 源站再快也被它拖住。
 * 抓一次转成 webp 存到自己的 public/，走自家边缘缓存。
 *
 * 文件名用 URL 的 sha1 前 8 位：内容不变则文件名不变，可以放心长缓存；
 * 换了图就是新文件名，不用清缓存。
 *
 * 用法：cd web && node scripts/mirror-covers.mjs
 *       新增/修改文章封面后重跑即可（已存在的会跳过，不重复下载）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const OUT_DIR = path.join(WEB, 'public', 'img', 'covers');
const MAP_FILE = path.join(WEB, 'lib', 'coverMap.json');
const POSTS_DIR = process.env.POSTS_DIR || path.join(WEB, '..', 'content', 'posts');

const URL_RE = /https:\/\/images\.unsplash\.com\/[^'"`)\s]+/g;

/** 扫代码里写死的（分类默认图、日报头图）+ 文章 frontmatter 的 coverImage */
function collectUrls() {
    const urls = new Set();

    const scanDir = (dir, exts) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                scanDir(full, exts);
            } else if (exts.some((e) => entry.name.endsWith(e))) {
                const text = fs.readFileSync(full, 'utf8');
                for (const m of text.match(URL_RE) || []) urls.add(m.replace(/\\$/, ''));
            }
        }
    };

    scanDir(path.join(WEB, 'lib'), ['.js']);
    scanDir(path.join(WEB, 'app'), ['.js']);
    scanDir(path.join(WEB, 'components'), ['.js']);
    scanDir(POSTS_DIR, ['.md']);
    return [...urls];
}

const key = (url) => crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);

fs.mkdirSync(OUT_DIR, { recursive: true });
const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : {};

const urls = collectUrls();
console.log(`发现 ${urls.length} 个外链封面`);

let done = 0, skipped = 0, failed = 0;
for (const url of urls) {
    const name = `${key(url)}.webp`;
    const dest = path.join(OUT_DIR, name);
    map[url] = `/img/covers/${name}`;

    if (fs.existsSync(dest)) { skipped++; continue; }

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        // 头图最宽 1600 就够(容器最大 max-w-5xl),webp 质量 80 视觉无损
        await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
        const kb = (fs.statSync(dest).size / 1024).toFixed(0);
        console.log(`  ✓ ${name}  ${(buf.length / 1024).toFixed(0)}KB → ${kb}KB`);
        done++;
    } catch (e) {
        console.warn(`  ✗ 下载失败(保留外链): ${url.slice(0, 70)}… ${e.message}`);
        delete map[url];
        failed++;
    }
}

fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8');
console.log(`\n新增 ${done}，已存在 ${skipped}，失败 ${failed}；映射表 ${Object.keys(map).length} 条 → ${path.relative(process.cwd(), MAP_FILE)}`);
