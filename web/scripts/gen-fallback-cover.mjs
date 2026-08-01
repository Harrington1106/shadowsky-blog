/**
 * 生成本地兜底封面 —— public/img/covers/fallback-space.webp（1600×900）
 *
 * 原来的分类默认图指向 unsplash 的两张图，2026-08-01 实测已经 404：
 *   天文/天文观测 → photo-1519681393784…  404
 *   default      → photo-1499750310159…  404
 * 也就是说以后任何没填 coverImage 的文章都会是一张坏图。
 * 换成自己生成的星空渐变：不依赖外部、风格和 OG 图一致、可长缓存。
 *
 * 重新生成：cd web && node scripts/gen-fallback-cover.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'img', 'covers', 'fallback-space.webp');

const W = 1600;
const H = 900;

/** 确定性伪随机：每次生成结果一致，不会平白产生 diff */
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function stars(count) {
    const rand = mulberry32(20260801);
    let out = '';
    for (let i = 0; i < count; i++) {
        const x = Math.round(rand() * W);
        const y = Math.round(rand() * H);
        const r = (rand() * 1.8 + 0.3).toFixed(2);
        const o = (rand() * 0.6 + 0.12).toFixed(2);
        out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
    }
    return out;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1120"/>
      <stop offset="50%" stop-color="#131f38"/>
      <stop offset="100%" stop-color="#0d1526"/>
    </linearGradient>
    <radialGradient id="g1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="380" cy="240" rx="640" ry="440" fill="url(#g1)"/>
  <ellipse cx="1280" cy="720" rx="560" ry="420" fill="url(#g2)"/>
  ${stars(220)}
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(OUT);
const { size } = await stat(OUT);
console.log(`✓ ${path.relative(process.cwd(), OUT)} — ${W}×${H}, ${(size / 1024).toFixed(0)}KB`);
