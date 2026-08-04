/**
 * gen-cover-thumbs.mjs —— 给服务器上**已经存在**的封面补生成列表缩略图。
 *
 * 为什么需要它：缩略图是 2026-08-04 才加进发布流程的（mirrorImage 现在一次出两张），
 * 在那之前发的封面只有原图。这个脚本把历史欠账补上，跑一次就够；
 * 之后新发的文章由 publish-post.mjs 直接带上，不用再管。
 *
 * 为什么在本机转而不在服务器上转：那台 ECS 是 glibc 2.32 + Node 20，
 * 装不动新版原生依赖（sharp 同 better-sqlite3，见 CLAUDE.md 的排查章节）。
 * 所以是 scp 下来 → 本机 sharp → scp 回去。图不大，一趟几秒。
 *
 * 用法:
 *   cd web
 *   node scripts/gen-cover-thumbs.mjs --dry-run   # 只列出缺哪些，不动服务器
 *   node scripts/gen-cover-thumbs.mjs             # 补齐
 *   node scripts/gen-cover-thumbs.mjs --force     # 连已有的也重新生成
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { THUMB_WIDTH, thumbName } from './lib/post-meta.mjs';

const SSH_HOST = process.env.SSH_HOST || 'shadowsky';
const REMOTE_COVERS = '/www/wwwroot/shadowquake-v2/data/uploads/covers';

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2)));
const DRY = flags.has('dry-run');
const FORCE = flags.has('force');

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// ── 列出服务器上的封面 ──
const listing = run('ssh', [SSH_HOST, `ls -1 ${REMOTE_COVERS} 2>/dev/null || true`])
    .split('\n').map((s) => s.trim()).filter(Boolean);

const existing = new Set(listing);
const originals = listing.filter((f) => f.endsWith('.webp') && !f.endsWith('.thumb.webp'));
const todo = originals.filter((f) => FORCE || !existing.has(thumbName(f)));

console.log(`服务器上 ${originals.length} 张封面，其中 ${todo.length} 张缺缩略图${FORCE ? '（--force：全部重生成）' : ''}`);
if (!todo.length) {
    console.log('没有要补的，收工。');
    process.exit(0);
}
for (const f of todo) console.log(`  · ${f}`);

if (DRY) {
    console.log('\n[dry-run] 没有碰服务器。去掉 --dry-run 才会真的生成。');
    process.exit(0);
}

// ── 拉下来 → 本机转 → 传回去 ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-thumbs-'));
let saved = 0;
const made = [];

for (const f of todo) {
    const src = path.join(tmp, f);
    const out = path.join(tmp, thumbName(f));
    run('scp', ['-q', `${SSH_HOST}:${REMOTE_COVERS}/${f}`, src]);
    await sharp(src).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);

    const before = fs.statSync(src).size;
    const after = fs.statSync(out).size;
    saved += before - after;
    made.push(out);
    console.log(`  ${f}  ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
}

// 一次 scp 传完，省掉每张一次 ssh 握手
run('scp', ['-q', ...made, `${SSH_HOST}:${REMOTE_COVERS}/`]);
console.log(`\n✓ 已上传 ${made.length} 张缩略图，列表页每屏少下 ${Math.round(saved / 1024)}KB`);
console.log('  别忘了清 CF 缓存（列表页 HTML 会换成新地址）:');
console.log(`    ssh ${SSH_HOST} 'bash /www/wwwroot/shadowquake-v2/tools/cf-purge.sh /blog /'`);
