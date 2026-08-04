/**
 * build-launcher.mjs —— 把 publish-launcher.vbs.src 生成成 WSH 能读的 .vbs。
 *
 * 为什么要这一步：WSH 按 ANSI 读 .vbs，UTF-8 会把中文字符串撑断
 * （"Unterminated string constant"），UTF-8 BOM 也不认（当成非法字符）。
 * 唯一可靠的是 **UTF-16LE + BOM**。但 UTF-16 在 git 里没法好好 diff，
 * 所以源文件用 UTF-8 存成 .src，产物由这个脚本生成。
 *
 * 用法: node scripts/build-launcher.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'publish-launcher.vbs.src');
const OUT = path.join(__dirname, 'publish-launcher.vbs');

const text = fs.readFileSync(SRC, 'utf8').replace(/\r?\n/g, '\r\n');   // WSH 习惯 CRLF
fs.writeFileSync(OUT, Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(text, 'utf16le')]));

console.log(`✓ ${path.basename(OUT)}  UTF-16LE+BOM  ${fs.statSync(OUT).size} 字节`);
