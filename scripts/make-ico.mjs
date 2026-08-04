/**
 * make-ico.mjs —— 把站点 favicon 打成桌面启动器用的 .ico。
 *
 * 为什么手写 ICO：sharp 不能输出 ico，而这台机器上装 ico 转换库不值当。
 * Vista 起 ICO 允许直接内嵌 PNG（不用 BMP + AND 掩码那套老格式），
 * 所以结构就是「6 字节文件头 + 每尺寸 16 字节目录项 + 各 PNG 原始字节」。
 *
 * 用法: node scripts/make-ico.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '../web/node_modules/sharp/lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'web', 'public', 'img', 'favicon256.png');
const OUT = path.join(__dirname, 'post-ui.ico');

// Windows 在不同位置取不同尺寸：任务栏 32、桌面 48、大图标视图 256
const SIZES = [16, 32, 48, 64, 128, 256];

const pngs = [];
for (const size of SIZES) {
    pngs.push({
        size,
        buf: await sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    });
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // type: 1 = icon
header.writeUInt16LE(pngs.length, 4);  // 图片数量

const dir = Buffer.alloc(16 * pngs.length);
let offset = header.length + dir.length;
pngs.forEach(({ size, buf }, i) => {
    const p = i * 16;
    dir[p] = size >= 256 ? 0 : size;        // 宽：256 要写 0
    dir[p + 1] = size >= 256 ? 0 : size;    // 高：同上
    dir[p + 2] = 0;                          // 调色板数
    dir[p + 3] = 0;                          // reserved
    dir.writeUInt16LE(1, p + 4);             // 颜色平面
    dir.writeUInt16LE(32, p + 6);            // 位深
    dir.writeUInt32LE(buf.length, p + 8);    // 数据长度
    dir.writeUInt32LE(offset, p + 12);       // 数据偏移
    offset += buf.length;
});

fs.writeFileSync(OUT, Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]));
console.log(`✓ ${path.relative(process.cwd(), OUT)}  ${SIZES.join('/')} 六个尺寸，共 ${(fs.statSync(OUT).size / 1024).toFixed(1)}KB`);
