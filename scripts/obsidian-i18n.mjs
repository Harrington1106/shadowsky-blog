/**
 * obsidian-i18n.mjs —— 给 content/drafts 这个 Obsidian 库里的插件打中文补丁。
 *
 * 为什么要有这个脚本，而不是手改一遍 main.js:
 *   Templater 没有任何 i18n 机制（对比 Image auto upload，它自带 zh-cn 词典，
 *   跟随 Obsidian 界面语言自动切，一行都不用改），汉化只能改打包后的字面量。
 *   而 main.js 是插件产物 —— 一升级就被覆盖，手改的东西全没。
 *   所以把「原文 → 译文」写成一张表，随时可重跑、可还原。
 *
 * 怎么保证不改坏:
 *   1. 第一次运行时把原始 main.js 存成 main.js.orig，之后**每次都从 orig 重新生成**
 *      （不是在已改过的文件上叠加），所以脚本天然幂等
 *   2. 译文里出现半角双引号会截断 JS 字符串 —— 直接拒绝
 *   3. 表里的键必须在源码里真实出现，一个找不到就报错（插件升级改了文案能立刻发现）
 *   4. 改完过一遍 node --check，语法不过就自动回滚
 *
 * 用法:
 *   node scripts/obsidian-i18n.mjs            # 打补丁
 *   node scripts/obsidian-i18n.mjs --check    # 只体检，不写文件；顺带列出没被翻到的英文
 *   node scripts/obsidian-i18n.mjs --restore  # 还原成官方原版
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
// 库根是 content/（2026-08-03 从 content/drafts 上移，好在 Obsidian 里也能看到
// posts/ 与 ai-daily/）。发布台的 DRAFTS_DIR 仍是 content/drafts，两者不是一回事。
const VAULT = path.join(REPO, 'content');

/** 目前只有 Templater 需要打补丁；将来加插件就往这里加一条 */
const TARGETS = [
    { id: 'templater-obsidian', table: 'obsidian-i18n.templater.json' },
];

const args = new Set(process.argv.slice(2).map((a) => a.replace(/^--/, '')));
const CHECK = args.has('check');
const RESTORE = args.has('restore');

function die(msg) {
    console.error(`✗ ${msg}`);
    process.exit(1);
}

/**
 * 抹掉一段代码里的字符串**内容**，只留下代码骨架，用来比对「译文有没有动到代码」。
 * 双引号串整段抹平；反引号串保留里面的 ${...} 占位符 ——
 * 那些是要原样带过去的（比如命令名 `Insert ${i}`），漏掉一个就该报错。
 * 抹完若还剩 " 或 `，说明字面量没闭合。
 */
function skeleton(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
        const q = s[i];
        // 单引号也算 —— 2.24 里有 `' in "Hotkeys" settings.'` 这种单引号串。
        // 顺序扫描保证了安全：串内的撇号（can't）会被外层双引号先吃掉，不会被当成定界符。
        if (q !== '"' && q !== '`' && q !== "'") { out += s[i++]; continue; }
        // 从这里开始是一段字面量，一路吃到同类引号（反斜杠转义的不算收尾）
        let j = i + 1;
        let inner = '';
        while (j < s.length && s[j] !== q) {
            if (s[j] === '\\') { j += 2; continue; }
            inner += s[j++];
        }
        if (j >= s.length) return `${out}${q}`;   // 没闭合：留个引号让调用方发现
        out += q === '`' ? `§tpl${(inner.match(/\$\{[^}]*\}/g) || []).join('')}§` : '§str§';
        i = j + 1;
    }
    return out;
}

/**
 * 从表里挑出真正的翻译项（`_` 开头的是注释/元数据）。
 * `_skip` 列的是**故意不翻**的字符串（tp.* 那套自动补全文档，是 API 说明，
 * 翻了反而对不上文档），体检时不再当成漏译报出来。
 */
function loadTable(file) {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
    const skip = new Set(raw._skip || []);
    const pairs = Object.entries(raw).filter(([k]) => !k.startsWith('_'));
    return { pairs, skip };
}

/**
 * 体检：把源码里所有「一眼就是给人看的」英文字面量捞出来，减去表里已覆盖的，
 * 剩下的就是漏译。插件升级后跑一次就知道新增了什么文案。
 */
function findUntranslated(src, pairs, skip) {
    const covered = new Set(pairs.map(([k]) => k));
    const patterns = [
        /setName\("([^"]{2,160})"\)/g,
        /setDesc\("([^"]{2,300})"\)/g,
        /setTooltip\("([^"]{2,80})"\)/g,
        /setPlaceholder\("([^"]{2,80})"\)/g,
        /setButtonText\("([^"]{2,80})"\)/g,
        /addCommand\(\{id:"[^"]+",name:"([^"]{2,120})"/g,
        /name:`([^`]{2,120})`/g,          // 每个模板会另外生成两条命令，名字是模板串
        /new [A-Z]\("([^"]{4,220})"/g,    // Templater 自己的报错类（压缩后名字每版都变）
        // 2.24 起设置页改成声明式的 {name, desc, heading, emptyState}
        /[,{]name:"([^"]{2,200})"/g,
        /[,{]desc:"([^"]{2,300})"/g,
        /[,{]heading:"([^"]{2,120})"/g,
        /emptyState:"([^"]{2,120})"/g,
        /warning:"([^"]{2,300})"/g,       // 开启危险设置时的二次确认弹窗
        /[,{]title:"([^"]{2,200})"/g,
        /setTitle\("([^"]{2,160})"\)/g,   // 右键菜单项
    ];
    const out = new Set();
    for (const re of patterns) {
        let m;
        while ((m = re.exec(src))) {
            /*
             * 表里的键可能是裸字面量（双引号或反引号），也可能带上下文
             * （setName("x") / name:"x" / heading:"x"）。声明式那几条正则会把前面的
             * `,` 或 `{` 一起吃进 m[0]，而表里的键不带它，所以要剥掉再比一次。
             */
            const bare = m[0].replace(/^[,{]/, '');
            const forms = [`"${m[1]}"`, `\`${m[1]}\``, m[0], bare];
            if (forms.some((f) => covered.has(f))) continue;
            if (!/[a-z]{2}/.test(m[1])) continue;       // 纯符号 / 变量名之类跳过
            if (/[一-龥]/.test(m[1])) continue; // 已经是中文
            if (skip.has(m[1])) continue;               // 表里明写了不翻
            // tp.* 的 API 标识符（date / create_new / prompt_text …）不是文案，翻了就调不通
            if (/^[a-z][a-z0-9_]*$/.test(m[1])) continue;
            out.add(m[1]);
        }
    }
    return [...out];
}

for (const { id, table } of TARGETS) {
    const dir = path.join(VAULT, '.obsidian', 'plugins', id);
    const main = path.join(dir, 'main.js');
    const orig = path.join(dir, 'main.js.orig');

    console.log(`\n── ${id} ──`);
    if (!fs.existsSync(main)) {
        console.log('  插件没装，跳过');
        continue;
    }

    if (RESTORE) {
        if (!fs.existsSync(orig)) { console.log('  没有 main.js.orig，本来就是原版'); continue; }
        fs.copyFileSync(orig, main);
        fs.rmSync(orig);
        console.log('  已还原成官方原版（重启 Obsidian 生效）');
        continue;
    }

    /*
     * 建立 / 沿用原版副本。
     * 判断「当前 main.js 是不是原版」靠的是有没有中文 —— 插件升级后 Obsidian 会覆盖
     * main.js，这时旧的 orig 已经过期，必须重新取一份，否则会拿旧版本覆盖新版本。
     */
    const cur = fs.readFileSync(main, 'utf8');
    const curIsPatched = /[一-龥]/.test(cur) && cur.includes('模板文件夹');
    if (!curIsPatched) {
        fs.writeFileSync(orig, cur);
        if (fs.existsSync(orig)) console.log('  已记下原版 main.js.orig');
    } else if (!fs.existsSync(orig)) {
        die(`${id}: main.js 看着已经汉化过，但找不到 main.js.orig。\n  请在 Obsidian 里重装一次该插件，再跑这个脚本。`);
    }

    const src = fs.readFileSync(orig, 'utf8');
    const { pairs, skip } = loadTable(table);

    /*
     * 校验译文本身。
     * 条目有两种形态：裸字面量 "Move up"，和带上下文的 setTooltip("Move up") ——
     * 后者本来就含引号，所以不能简单地「值里不许有引号」。
     * 真正要保证的是两件事：
     *   1. 引号成对闭合（否则替换进去会把后面的代码整段吞掉）
     *   2. 键和值去掉所有字符串字面量之后，剩下的**代码骨架完全一致**
     *      —— 这样 setTooltip 被手滑写成 setToolTip 之类的错误当场就能拦下
     */
    for (const [k, v] of pairs) {
        if (v.includes('\n')) die(`译文不能换行: ${k}`);
        const rk = skeleton(k);
        const rv = skeleton(v);
        // 骨架里还剩引号 = 字面量没闭合，替换进去会把后面的代码整段吞掉
        if (/["`]/.test(rv)) die(`译文里的引号没有成对闭合: ${k}`);
        if (rk !== rv) {
            die(`译文的代码骨架和原文对不上，改错了:\n    原 ${rk}\n    译 ${rv}`);
        }
    }

    // ── 逐条替换。长键先替，免得短键啃掉长键的一部分 ──
    const missing = [];
    let out = src;
    let applied = 0;
    for (const [k, v] of [...pairs].sort((a, b) => b[0].length - a[0].length)) {
        const n = out.split(k).length - 1;
        if (n === 0) { missing.push(k); continue; }
        out = out.split(k).join(v);
        applied += n;
    }

    console.log(`  翻译条目 ${pairs.length}，命中 ${pairs.length - missing.length}，共替换 ${applied} 处`);
    if (missing.length) {
        console.log(`  ⚠ ${missing.length} 条在源码里找不到（多半是插件升级改了文案）:`);
        for (const k of missing) console.log(`      ${k}`);
    }

    const left = findUntranslated(src, pairs, skip);
    if (left.length) {
        console.log(`  ⚠ 还有 ${left.length} 条界面英文没翻:`);
        for (const s of left) console.log(`      ${s}`);
    } else {
        console.log('  界面英文已全部覆盖 ✓');
    }

    if (CHECK) { console.log('  [check] 没有写文件'); continue; }
    if (missing.length) die('有找不到的条目，先改表再跑（没有写文件）');

    // ── 落盘前先验语法 ──
    const probe = path.join(os.tmpdir(), `i18n-probe-${Date.now()}.js`);
    fs.writeFileSync(probe, out);
    try {
        execFileSync(process.execPath, ['--check', probe], { stdio: 'pipe' });
    } catch (e) {
        fs.rmSync(probe, { force: true });
        die(`替换后 JS 语法不通过，已放弃写入:\n${String(e.stderr || e.message).slice(0, 500)}`);
    }
    fs.rmSync(probe, { force: true });

    fs.writeFileSync(main, out);
    console.log('  ✓ 已写入 main.js（重启 Obsidian 生效）');
}

if (!RESTORE && !CHECK) {
    console.log('\n提示：Obsidian 本体和 Image auto upload 插件不用打补丁 ——');
    console.log('      设置 → 关于 → 语言 → 简体中文，两者都会跟着变中文。');
}
