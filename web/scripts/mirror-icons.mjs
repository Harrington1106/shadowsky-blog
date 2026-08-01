/**
 * 镜像图标到本地 —— public/img/favicons/ + public/img/icons/ + lib/iconMap.json
 *
 * 两处运行时的跨境图片请求：
 *   收藏页  www.google.com/s2/favicons  → 大陆**完全不通**（实测 000），
 *           56 条收藏 = 55 个必然失败的请求
 *   关于页  cdn.simpleicons.org         → 大陆 TTFB 3.47s
 *
 * 都抓成本地小图：favicon 缩到 32×32 webp（约 1KB），社交图标是 SVG 原样存。
 * 抓取源用 icon.horse（大陆可达，1.2s）—— 只在这台机器上跑一次，线上不依赖它。
 * 没抓到的域名不写进映射表，页面自动退回字母块，不会有坏图。
 *
 * 用法：cd web && node scripts/mirror-icons.mjs
 *      收藏/社交链接变动后重跑（已存在的跳过）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const FAVICON_DIR = path.join(WEB, 'public', 'img', 'favicons');
const ICON_DIR = path.join(WEB, 'public', 'img', 'icons');
const MAP_FILE = path.join(WEB, 'lib', 'iconMap.json');
const SITE = process.env.SITE_URL || 'https://shadowquake.top';

fs.mkdirSync(FAVICON_DIR, { recursive: true });
fs.mkdirSync(ICON_DIR, { recursive: true });

const map = fs.existsSync(MAP_FILE)
    ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'))
    : { favicons: {}, simple: {} };
map.favicons ||= {};
map.simple ||= {};

async function getJson(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
}

/** 递归把嵌套结构里的 url 都挖出来（收藏是 categories → subcategories → items 的树） */
function collectUrls(node, out = []) {
    if (Array.isArray(node)) node.forEach((n) => collectUrls(n, out));
    else if (node && typeof node === 'object') {
        if (typeof node.url === 'string' && node.url.startsWith('http')) out.push(node.url);
        Object.values(node).forEach((v) => collectUrls(v, out));
    }
    return out;
}

// ── 收藏页的 favicon ──────────────────────────────────────
const bookmarks = await getJson(`${SITE}/api/bookmarks`);
const hosts = [...new Set(collectUrls(bookmarks).map((u) => {
    try { return new URL(u).hostname; } catch { return null; }
}).filter(Boolean))];

console.log(`收藏域名 ${hosts.length} 个`);
let ok = 0, skip = 0, fail = 0;
for (const host of hosts) {
    const name = `${host.replace(/[^a-z0-9.-]/gi, '_')}.webp`;
    const dest = path.join(FAVICON_DIR, name);
    if (fs.existsSync(dest)) { map.favicons[host] = `/img/favicons/${name}`; skip++; continue; }
    try {
        const res = await fetch(`https://icon.horse/icon/${host}`, { signal: AbortSignal.timeout(25000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(dest);
        map.favicons[host] = `/img/favicons/${name}`;
        ok++;
    } catch (e) {
        // 抓不到就不写映射,页面用字母块兜底
        fail++;
    }
}
console.log(`  favicon:新增 ${ok}，已存在 ${skip}，抓不到 ${fail}（这些会用字母块）`);

// ── 关于页的 simple-icons ────────────────────────────────
const social = await getJson(`${SITE}/api/social`);
const socialItems = Array.isArray(social) ? social : social.data || social.items || [];
const simpleNames = [...new Set(socialItems
    .map((s) => String(s.icon || ''))
    .filter((i) => i.startsWith('simple:'))
    .map((i) => i.slice('simple:'.length)))];

console.log(`社交图标 ${simpleNames.length} 个`);
for (const nm of simpleNames) {
    // 深浅色各存一份:<img> 没法用 CSS 改色,原来的实现也是按主题换 URL
    for (const [variant, color] of [['light', '333'], ['dark', 'white']]) {
        const file = `${nm}-${variant}.svg`;
        const dest = path.join(ICON_DIR, file);
        const key = `${nm}:${variant}`;
        if (fs.existsSync(dest)) { map.simple[key] = `/img/icons/${file}`; continue; }
        try {
            const res = await fetch(`https://cdn.simpleicons.org/${nm}/${color}`, { signal: AbortSignal.timeout(25000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            fs.writeFileSync(dest, await res.text(), 'utf8');
            map.simple[key] = `/img/icons/${file}`;
            console.log(`  ✓ ${file}`);
        } catch (e) {
            console.warn(`  ✗ ${file}: ${e.message}`);
        }
    }
}

fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8');
const fsize = fs.readdirSync(FAVICON_DIR).reduce((n, f) => n + fs.statSync(path.join(FAVICON_DIR, f)).size, 0);
console.log(`\n映射表 ${Object.keys(map.favicons).length} 个 favicon + ${Object.keys(map.simple).length} 个图标，favicon 目录合计 ${(fsize / 1024).toFixed(0)}KB`);
