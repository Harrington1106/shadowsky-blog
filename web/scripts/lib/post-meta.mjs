/**
 * 文章元数据的共用逻辑 —— CLI(publish-post.mjs) 与本地发布台(post-ui.mjs) 都用这一份。
 *
 * 抽出来的原因很实际:发布台要在点「发布」之前**如实**显示将要写入的字段，
 * 两边各算一遍迟早会算出不一样的结果，那种界面比没有界面更坏。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

/** 站内地址:这些不用镜像。其余一律视为跨境外链。 */
export const SELF_HOSTS = new Set(['shadowquake.top', 'www.shadowquake.top']);

export const REQUIRED_FIELDS = ['title', 'date', 'category', 'tags'];
/** 字段顺序固定,让每篇文件长得一样,diff 才干净 */
export const FIELD_ORDER = ['title', 'date', 'category', 'author', 'tags', 'excerpt', 'lastModified', 'readTime', 'coverImage'];

/**
 * 解析 frontmatter。语义必须和 lib/posts.js 里那个手写解析器**完全一致**,
 * 否则本地看着好好的、线上索引里字段是空的。
 * 它按第一个 ':' 切、只剥首尾各一个引号、tags 走 JSON.parse。
 */
export function parseFrontMatter(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, body: raw };
    const fm = {};
    for (const line of m[1].split('\n')) {
        const ci = line.indexOf(':');
        if (ci === -1) continue;
        const k = line.slice(0, ci).trim();
        const v = line.slice(ci + 1).trim().replace(/^["']|["']$/g, '');
        if (k === 'tags') { try { fm[k] = JSON.parse(line.slice(ci + 1).trim()); } catch { fm[k] = []; } }
        else if (k === 'readTime') fm[k] = parseInt(v, 10) || 0;
        else fm[k] = v;
    }
    return { fm, body: raw.slice(m[0].length) };
}

/**
 * 序列化 frontmatter。
 * ⚠ 每个值必须单行、不能含 `---`:线上解析器是 raw.split('---', 3) + 逐行 indexOf(':'),
 *   值里一个换行就能把后面所有字段冲掉。这里统一压平并做防御。
 */
export function buildFrontMatter(fm) {
    const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/-{3,}/g, '—').trim();
    const lines = [];
    for (const k of FIELD_ORDER) {
        if (fm[k] === undefined || fm[k] === '') continue;
        if (k === 'tags') lines.push(`tags: ${JSON.stringify(fm.tags)}`);
        else if (k === 'readTime') lines.push(`readTime: ${fm.readTime}`);
        else lines.push(`${k}: "${clean(fm[k]).replace(/"/g, '\\"')}"`);
    }
    return `---\n${lines.join('\n')}\n---\n`;
}

/** 去掉代码块、HTML 注释,用于统计和摘要提取 */
function stripNoise(body) {
    return body.replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * 阅读时长:中文 250 字/分钟 + 代码 15 行/分钟 + 英文 200 词/分钟。
 *
 * 系数是拿现有 19 篇作者手写的 readTime 拟合出来的(那些值彼此并不自洽 ——
 * 同样 800 字有的写 3 有的写 4),这组参数下 15/19 落在手写值 ±1 分钟内。
 * 代码必须单独计:blog-workflow 只有 777 字却有 94 行代码,把代码丢掉会算成 3 分钟,
 * 作者写的是 8。
 */
export function computeReadTime(body) {
    const codeLines = (body.match(/```[\s\S]*?```/g) || [])
        .reduce((n, block) => n + Math.max(0, block.split('\n').length - 2), 0);
    const text = stripNoise(body);
    const cjk = (text.match(/[一-龥]/g) || []).length;
    const words = (text.replace(/[一-龥]/g, ' ').match(/[A-Za-z0-9_'-]+/g) || []).length;

    const prose = cjk / 250 + words / 200;
    // 扫代码的时间不超过读正文的时间 —— 没有这个上限，B 站嵌入那篇(159 行 HTML 片段)
    // 会被算成 20 分钟，作者写的是 14。代码块越长越是复制粘贴，不是逐行读。
    const code = Math.min(codeLines / 15, prose);
    return Math.max(1, Math.round(prose + code));
}

/**
 * 摘要。优先用开头的 TL;DR 引用块(这个站的写法习惯,本来就是作者自己写的一句话总结),
 * 否则取第一段正文。
 *
 * ⚠ 必须跳过与标题重复的 H1 —— 现有 19 篇的 excerpt 几乎全是把标题又抄了一遍,
 *   卡片上只有两行摘要,重复一遍等于白丢一行,BlogContent.js 里那个 trimTitlePrefix
 *   就是为了在展示时把它剥掉。从源头生成就不该再产生这个问题。
 */
export function computeExcerpt(body, title) {
    const text = stripNoise(body);
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    const demote = (s) => s
        .replace(/^>\s?/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*|__|\*|_|`/g, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

    const norm = (s) => s.replace(/[\s\p{P}]/gu, '');
    const titleNorm = norm(title || '');

    for (const raw of blocks) {
        const s = demote(raw);
        if (!s) continue;
        if (/^(\||---|===)/.test(raw)) continue;
        if (titleNorm && norm(s) === titleNorm) continue;
        if (titleNorm && norm(s).startsWith(titleNorm) && norm(s).length < titleNorm.length + 8) continue;
        if (s.length < 12) continue;
        const cleaned = s.replace(/^TL;?DR[:：]?\s*/i, '');
        return cleaned.length > 120 ? cleaned.slice(0, 118).trimEnd() + '…' : cleaned;
    }
    return '';
}

/**
 * 收集正文与封面里的所有跨境 http(s) 图片地址。
 *
 * ⚠ 扫描前必须剥掉代码块与行内代码，理由和 lintBody 那条一样：
 *   讲前端的教程里，```html 代码块中的 `<img src="…/YOUR_COVER_IMAGE.jpg">` 是**示例**，
 *   不是真图片。不剥就会去抓这个占位地址，404 → 镜像失败 → 整篇发不出去。
 *   （2026-08-04 bilibili-embedding 那篇就是这么卡住的）
 */
export function collectImageUrls(body, coverImage) {
    const urls = new Set();
    const add = (u) => {
        if (!u || !/^https?:\/\//i.test(u)) return;
        try {
            if (SELF_HOSTS.has(new URL(u).hostname)) return;
        } catch { return; }
        urls.add(u);
    };
    const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    add(coverImage);
    for (const m of prose.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) add(m[1]);
    for (const m of prose.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
    return [...urls];
}

/** 列表缩略图的宽度:显示尺寸 64–80 CSS px,给到 3 倍屏 */
export const THUMB_WIDTH = 240;

/** 由原图文件名推出缩略图文件名(前端也按这条规则拼,改这里要同步 BlogContent.js) */
export function thumbName(name) {
    return name.replace(/\.webp$/, '.thumb.webp');
}

/**
 * 下载 → 转 webp → 返回本地临时文件路径与目标文件名。
 * 文件名用源 URL 的 sha1 前 8 位:同一张图重复发不会重复占空间,换了图就是新文件名,
 * 也就不用为图片清缓存(和 mirror-covers.mjs 的约定保持一致)。
 *
 * 下载走 curl 而不是 fetch:PicList 常用的 GitHub/jsDelivr 在大陆多半要过代理,
 * curl 会读 HTTPS_PROXY,Node 22 的全局 fetch 不会。
 *
 * 同时出一张 <hash>.thumb.webp 给列表用。为什么必须有:
 *   封面存的是 1000px 级别的原图(23–127KB),而 /blog 的缩略图框只有 64–80px ——
 *   按面积算下载的像素是用到的 150 倍。首屏 11 张就是 664KB,每一张还都要跨太平洋,
 *   浏览器的转圈要等它们全部结束(2026-08-04 实测)。缩略图一张只有几 KB。
 *   文章页头图和 og:image 仍然用原图,那里是真的要大图。
 */
export async function mirrorImage(url, tmpDir) {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);
    const name = `${hash}.webp`;
    const src = path.join(tmpDir, `${hash}.src`);
    const out = path.join(tmpDir, name);
    const thumb = path.join(tmpDir, thumbName(name));

    execFileSync('curl', ['-fsSL', '--max-time', '40', '-o', src, url], { stdio: ['ignore', 'pipe', 'pipe'] });
    await sharp(src).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
    await sharp(src).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(thumb);

    return {
        name, out, bytes: fs.statSync(out).size,
        thumbName: thumbName(name), thumbOut: thumb, thumbBytes: fs.statSync(thumb).size,
    };
}

/** 校验文件名/必填字段，返回问题列表（空数组=没问题） */
export function validate(fileName, fm) {
    const problems = [];
    if (!fileName.endsWith('.md')) problems.push('只接受 .md 文件');
    else if (!/^[a-z0-9][a-z0-9.-]*\.md$/.test(fileName)) {
        problems.push(`文件名「${fileName}」不合法：它就是线上地址 /post/<slug>，只允许小写字母、数字、连字符`);
    }
    for (const k of REQUIRED_FIELDS) {
        const empty = fm[k] === undefined || fm[k] === '' || (k === 'tags' && !fm.tags?.length);
        if (empty) problems.push(`frontmatter 缺字段: ${k}`);
    }
    if (fm.date && !/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) problems.push(`date 必须是 YYYY-MM-DD，现在是「${fm.date}」`);
    if (fm.tags !== undefined && !Array.isArray(fm.tags)) problems.push('tags 必须是数组，例如 ["Docker", "教程"]');
    return problems;
}

/**
 * 站点不认的 Markdown 语法。
 *
 * 渲染管线是**纯 GFM**（renderMarkdown.js 里 `new Marked({breaks:true, gfm:true})`，
 * 没挂任何扩展），而草稿是在 Obsidian 里写的 —— Obsidian 的自有语法在编辑器里好看，
 * 发出去全是字面量。这是「本地看着对、线上不对」最容易中招的一类。
 */
const UNSUPPORTED_SYNTAX = [
    { name: 'callout（> [!NOTE]）', re: /^>\s*\[!\w+\]/gm, effect: '渲染成普通引用块，还带着字面的 [!NOTE]' },
    { name: '嵌入（![[图片]]）', re: /!\[\[[^\]\n]+\]\]/g, effect: '整段原样显示，图片不出现' },
    { name: '双链（[[页面]]）', re: /(?<!!)\[\[[^\]\n]+\]\]/g, effect: '原样显示方括号' },
    { name: '高亮（==文字==）', re: /==[^=\n]+==/g, effect: '原样显示等号' },
    { name: '脚注（[^1]:）', re: /^\[\^[^\]\n]+\]:/gm, effect: 'marked 不支持脚注，定义行会当成普通段落' },
];

/** 段落中文字数上限。现有 19 篇最长 132 字（99 分位 103），180 只拦真正的大段。 */
const LONG_PARAGRAPH_CJK = 180;

/**
 * 正文写法体检 —— 回答「为什么每篇文章的渲染效果不一样」。
 *
 * 渲染管线只有一套（lib/renderMarkdown.js），所以差异 100% 来自源文件写法。
 * 只报告，不自动改 —— 正文是作者的东西。
 *
 * ⚠ 除「代码块没标语言」外，所有规则都跑在**剥掉代码块与行内代码**的正文上。
 *   站里有讲 Obsidian、讲 Markdown 的教程，正文里出现 `[[双链]]` 这类示例是内容不是错误；
 *   不剥就会把教程本身报成问题。
 */
export function lintBody(body, title) {
    const issues = [];
    const codeBlocks = body.match(/```[\s\S]*?```/g) || [];
    const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    const lines = prose.split('\n');

    const dup = duplicateH1(body, title);
    if (dup) issues.push({ kind: 'dup-h1', msg: `正文开头的 H1「${dup}」和标题重复，页面会出现两个大标题`, fix: '发布时加 --strip-h1' });

    const fake = lines.filter((l) => /^\*\*[^*]+\*\*[:：]?\s*$/.test(l.trim()));
    if (fake.length) {
        issues.push({
            kind: 'fake-heading',
            msg: `${fake.length} 处整行粗体被当成小标题用（如「${fake[0].trim().slice(0, 24)}」）—— 它不是标题：没有标题样式、没有锚点、不进目录`,
            fix: '改成 ### 小标题',
        });
    }

    const levels = lines.map((l) => (l.match(/^(#{1,6})\s/) || [])[1]?.length).filter(Boolean);
    for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
            issues.push({ kind: 'skip-level', msg: `标题层级跳级（h${levels[i - 1]} 直接到 h${levels[i]}），目录缩进会错乱`, fix: '补上中间那一级' });
            break;
        }
    }

    // 代码块没标语言：hljs 认不出语言就退化成没有配色的纯文本，
    // 而代码块是技术文章里视觉分量最重的元素，缺高亮一眼就能看出来。
    const unlabeled = codeBlocks.filter((b) => !/^```[A-Za-z0-9+#._-]+/.test(b));
    if (unlabeled.length) {
        issues.push({
            kind: 'code-no-lang',
            msg: `${unlabeled.length}/${codeBlocks.length} 个代码块没标语言 —— 高亮不生效，渲染成没有配色的纯文本`,
            fix: '开头写 ```bash / ```js / ```nginx 等；纯命令输出用 ```text',
        });
    }

    // 图片缺 alt：图挂了就是一片空白，读屏软件也读不出来。封面镜像后文件名是 sha1，
    // 更没有任何可读信息。
    const imgs = prose.match(/!\[([^\]]*)\]\(/g) || [];
    const noAlt = imgs.filter((m) => m === '![](');
    if (noAlt.length) {
        issues.push({
            kind: 'img-no-alt',
            msg: `${noAlt.length}/${imgs.length} 张图片没有 alt 文本 —— 图加载不出来时是一片空白，读屏软件也读不出来`,
            fix: '写成 ![宝塔面板的网站列表](/uploads/covers/xxx.webp)',
        });
    }

    // Obsidian 自有语法：本地好看、线上是字面量
    const found = UNSUPPORTED_SYNTAX
        .map((s) => ({ ...s, n: (prose.match(s.re) || []).length }))
        .filter((s) => s.n > 0);
    if (found.length) {
        issues.push({
            kind: 'obsidian-syntax',
            msg: `用了 ${found.length} 种站点不认的语法：${found.map((s) => `${s.name}×${s.n}（${s.effect}）`).join('；')}`,
            fix: '站点是纯 GFM。要提示框就写 > **TL;DR**：…；要强调用 **粗体**；链接写成 [文字](地址)',
        });
    }

    // 段落过长：手机上一屏 20 字左右一行，180 字就是连着 9 行没有喘息
    const longParas = prose
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p && !/^[#>|\-*+\d]/.test(p) && !p.startsWith('<'))
        .map((p) => ({ p, cjk: (p.match(/[一-龥]/g) || []).length }))
        .filter((x) => x.cjk > LONG_PARAGRAPH_CJK);
    if (longParas.length) {
        const worst = longParas.reduce((a, b) => (b.cjk > a.cjk ? b : a));
        issues.push({
            kind: 'long-paragraph',
            msg: `${longParas.length} 个段落超过 ${LONG_PARAGRAPH_CJK} 字（最长 ${worst.cjk} 字，开头「${worst.p.slice(0, 20)}…」）—— 手机上是一堵墙`,
            fix: '按意群拆成几段，或改写成列表',
        });
    }

    return issues;
}

/** 正文第一个 H1 是否与标题重复（页面顶部已有大标题，重复会导致每篇两个 h1） */
export function duplicateH1(body, title) {
    const h1 = body.match(/^#\s+(.+)$/m);
    if (!h1) return null;
    const norm = (s) => s.replace(/[\s\p{P}]/gu, '');
    return norm(h1[1]) === norm(String(title || '')) ? h1[1] : null;
}
