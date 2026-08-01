/**
 * 生成站点默认 OG 图(1200×630)—— public/img/og-default.png
 *
 * 为什么是「本地生成一次、把 PNG 提交进仓库」而不是运行时用 next/og 动态出图:
 * 动态出图要把中文字体打进镜像(全量 CJK 约 10MB,子集化又得引 fonttools 工具链),
 * 而默认卡片图是固定文案,没必要为它付这份运行时成本。
 * 这里借本机系统字体渲染,产物是纯 PNG,线上零依赖。
 *
 * 改完文案/配色后重新跑:cd web && node scripts/gen-og-image.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'img');
const OUT = path.join(PUBLIC_DIR, 'og-default.png');
const LOGO = path.join(PUBLIC_DIR, 'favicon256.png');

const W = 1200;
const H = 630;

/** 确定性伪随机,保证每次生成的星点位置一致(否则每次跑都产生 diff)。 */
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function starField(count) {
    const rand = mulberry32(20260801);
    let out = '';
    for (let i = 0; i < count; i++) {
        const x = Math.round(rand() * W);
        const y = Math.round(rand() * H);
        const r = (rand() * 1.6 + 0.4).toFixed(2);
        const o = (rand() * 0.5 + 0.15).toFixed(2);
        out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"/>`;
    }
    return out;
}

const FONT = 'Microsoft YaHei, Noto Sans SC, PingFang SC, sans-serif';
const FONT_LATIN = 'Space Grotesk, Inter, Segoe UI, Arial, sans-serif';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1120"/>
      <stop offset="55%" stop-color="#111c33"/>
      <stop offset="100%" stop-color="#0d1526"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPurple" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="logoGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.34"/>
      <stop offset="70%" stop-color="#60A5FA" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#A78BFA" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="215" cy="150" rx="520" ry="400" fill="url(#glowBlue)"/>
  <ellipse cx="1020" cy="560" rx="470" ry="360" fill="url(#glowPurple)"/>
  ${starField(140)}

  <!-- logo 背光:站标本身是深色描边,直接压在深色背景上会糊 -->
  <circle cx="1020" cy="180" r="150" fill="url(#logoGlow)"/>

  <!-- 主标题 -->
  <text x="96" y="316" font-family="${FONT}" font-size="104" font-weight="700"
        fill="#F8FAFC" letter-spacing="4">星空笔记</text>

  <!-- 英文站名 -->
  <text x="102" y="372" font-family="${FONT_LATIN}" font-size="30" font-weight="600"
        fill="#60A5FA" letter-spacing="7">SHADOWQUAKE</text>

  <rect x="98" y="404" width="420" height="3" rx="1.5" fill="url(#rule)"/>

  <!-- 副标题 -->
  <text x="98" y="464" font-family="${FONT}" font-size="30" fill="#94A3B8"
        letter-spacing="2">技术笔记 · 天文观测 · 生活片刻 · ACG</text>

  <!-- 域名 -->
  <text x="98" y="548" font-family="${FONT_LATIN}" font-size="26" font-weight="500"
        fill="#64748B" letter-spacing="1">shadowquake.top</text>
</svg>`;

const logo = await sharp(LOGO).resize(168, 168, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();

await sharp(Buffer.from(svg))
    .composite([{ input: logo, top: 96, left: 936 }])
    .png({ compressionLevel: 9 })
    .toFile(OUT);

const meta = await sharp(OUT).metadata();
const { size } = await stat(OUT);
console.log(`✓ ${path.relative(process.cwd(), OUT)} — ${meta.width}×${meta.height}, ${(size / 1024).toFixed(0)}KB`);
