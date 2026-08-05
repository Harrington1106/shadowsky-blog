/**
 * 把「我喜欢的」那几部的 Bangumi 封面镜像到本地 —— public/img/bgm/ + lib/bgmCovers.json
 *
 * 为什么不直接用 lain.bgm.tv 的地址：那是跨境域名，与「前端零跨境依赖」冲突；
 * 走站内 /api/image-proxy 也不行 —— 实测服务器回源要 8.2 秒，且 /api 不进 CDN 缓存。
 * 抓一次转 webp 存进自己的 public/，之后就是本地文件 + immutable 长缓存。
 *
 * 卡片宽度约 110px，出 240px 宽（2x 屏够用）就行，别照搬文章头图的 1600。
 * 文件名取源 URL 的 sha1 前 8 位：换图即换名，不用清缓存。
 *
 * 用法（跨境图床基本要走代理）：
 *   cd web && HTTPS_PROXY=http://127.0.0.1:7897 node scripts/mirror-bgm-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { FAVORITES } from '../lib/favorites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const OUT_DIR = path.join(WEB, 'public', 'img', 'bgm');
const MAP_FILE = path.join(WEB, 'lib', 'bgmCovers.json');

// Node 的 fetch 不认 HTTPS_PROXY 环境变量，得自己挂 dispatcher
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
    setGlobalDispatcher(new ProxyAgent(proxy));
    console.log(`走代理 ${proxy}`);
}

const key = (url) => crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);

fs.mkdirSync(OUT_DIR, { recursive: true });
const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : {};

let done = 0, skipped = 0, failed = 0;
for (const { id, title, remote } of FAVORITES) {
    const name = `${key(remote)}.webp`;
    const dest = path.join(OUT_DIR, name);
    map[id] = `/img/bgm/${name}`;

    if (fs.existsSync(dest)) { skipped++; continue; }

    try {
        const res = await fetch(remote, { signal: AbortSignal.timeout(45000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf).resize({ width: 240, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
        const kb = (fs.statSync(dest).size / 1024).toFixed(0);
        console.log(`  ✓ ${title}  ${name}  ${(buf.length / 1024).toFixed(0)}KB → ${kb}KB`);
        done++;
    } catch (e) {
        // 抓不到就从映射表里去掉，页面会回落成纯文字卡，不至于挂一个坏图
        console.warn(`  ✗ ${title} 下载失败: ${e.message}`);
        delete map[id];
        failed++;
    }
}

fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8');
console.log(`\n新增 ${done}，已存在 ${skipped}，失败 ${failed}；映射表 ${Object.keys(map).length} 条`);
