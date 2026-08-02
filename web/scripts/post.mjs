/**
 * post.mjs —— 写文章的唯一入口。一条命令，不带参数。
 *
 *   cd web && npm run post
 *
 * 它自己判断你在哪一步:
 *   草稿箱是空的  → 问你标题，建一篇新的
 *   有草稿        → 列出来选一篇，先给你看发布预检结果，再问预览还是发布
 *
 * 底层还是 new-post.mjs / publish-post.mjs（它们仍可单独用、可进 CI），
 * 这里只是把「要记住哪个脚本、什么参数、什么文件名」这件事消掉。
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');

/*
  自己拉行，而不是用 rl.question ——
  后者在 stdin 不是 TTY（管道、CI、`printf … | npm run post`）时会挂住不返回，
  最后抛一个莫名其妙的 "unsettled top-level await"。
  这里用异步迭代器逐行取，输入提前结束就退回默认值，两种场景都能跑。
*/
const rl = readline.createInterface({ input: stdin });
const lines = rl[Symbol.asyncIterator]();
const ask = async (q, dflt = '') => {
    stdout.write(dflt ? `${q}（回车=${dflt}）: ` : `${q}: `);
    const { value, done } = await lines.next();
    if (done) { stdout.write('\n'); return dflt; }
    return String(value).trim() || dflt;
};

/** 跑底层脚本，输出直接透传到终端 */
function runScript(name, argv) {
    const r = spawnSync(process.execPath, [path.join(__dirname, name), ...argv], {
        stdio: 'inherit',
        cwd: WEB,
        env: process.env,
    });
    return r.status === 0;
}

function listDrafts() {
    if (!fs.existsSync(DRAFTS_DIR)) return [];
    return fs.readdirSync(DRAFTS_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({ file: f, mtime: fs.statSync(path.join(DRAFTS_DIR, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);   // 最近改过的排最前，多半就是想发的那篇
}

// ─────────────── 新建 ───────────────

async function createNew() {
    console.log('草稿箱是空的，建一篇新的。\n');
    const title = await ask('标题');
    if (!title) { console.log('没输标题，退出。'); return; }

    // slug 就是线上地址，发布后再改等于换地址、丢外链，所以这里必须问清楚
    let slug = await ask('英文 slug（就是网址 /post/日期-slug）');
    while (!slug || /[一-龥]/.test(slug)) {
        console.log(slug ? '  网址里别用中文，会变成一长串百分号编码。' : '  slug 不能空。');
        slug = await ask('英文 slug');
    }

    const category = await ask('分类', '教程');
    const tags = await ask('标签（逗号分隔，可空）');

    const argv = [title, '--slug', slug, '--category', category];
    if (tags) argv.push('--tags', tags);
    runScript('new-post.mjs', argv);
}

// ─────────────── 发布 ───────────────

async function publishFlow(drafts) {
    let target = drafts[0].file;

    if (drafts.length > 1) {
        console.log('草稿箱:\n');
        drafts.forEach((d, i) => {
            const days = Math.floor((Date.now() - d.mtime) / 86400000);
            console.log(`  ${i + 1}. ${d.file}   ${days === 0 ? '今天改过' : `${days} 天前`}`);
        });
        const pick = parseInt(await ask(`\n发哪篇`, '1'), 10);
        if (!(pick >= 1 && pick <= drafts.length)) { console.log('没选中，退出。'); return; }
        target = drafts[pick - 1].file;
    }

    // 先跑预检:所有要写入的字段、要镜像的图片都打出来，一个字节都不碰服务器
    console.log(`\n检查 ${target} …`);
    if (!runScript('publish-post.mjs', [target, '--dry-run'])) {
        console.log('\n预检没过，先按上面的提示改。');
        return;
    }

    console.log('\n  [1] 本地预览排版（不上线）');
    console.log('  [2] 发布到线上');
    console.log('  [3] 先不动');
    const choice = await ask('选', '1');

    if (choice === '1') {
        runScript('publish-post.mjs', [target, '--preview']);
        console.log('\n然后开另一个终端跑 npm run dev。看完满意了，再跑一次 npm run post 选发布。');
    } else if (choice === '2') {
        if (runScript('publish-post.mjs', [target])) {
            console.log('\n归档进 git: bash ../scripts/pull-content.sh --commit');
        }
    } else {
        console.log('好，什么都没做。');
    }
}

// ─────────────── 入口 ───────────────

const drafts = listDrafts();
if (drafts.length === 0) await createNew();
else await publishFlow(drafts);
rl.close();
