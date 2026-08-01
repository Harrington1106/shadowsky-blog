/**
 * 把 highlight.js 的两套主题合成一份自托管 CSS —— app/hljs-theme.css
 *
 * 原先这两个主题是运行时用 <link> 从 cdnjs 拉的，还要监听主题切换事件换 href。
 * 大陆实测 cdnjs TTFB 3.66s：代码块要裸奔三秒多才上色，而且多一个跨境依赖。
 * 主题本身才 1.3KB，直接按 .dark 作用域内联进自己的 CSS 更划算。
 *
 * 改 highlight.js 版本或想换主题后重新跑：cd web && node scripts/gen-hljs-css.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLES = path.join(__dirname, '..', 'node_modules', 'highlight.js', 'styles');
const OUT = path.join(__dirname, '..', 'app', 'hljs-theme.css');

/**
 * 给主题里的每条选择器加作用域前缀。
 * 深色主题挂在 html.dark 下，浅色的作为默认 —— 与全站 .dark class 的切换方式一致。
 */
function scope(css, prefix) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')            // 去掉注释(里面有色板说明,没必要进产物)
        .replace(/(^|\})\s*([^{}]+)\{/g, (_, close, selectors) => {
            const scoped = selectors
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => (prefix ? `${prefix} ${s}` : s))
                .join(', ');
            return `${close}\n${scoped} {`;
        })
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

const light = fs.readFileSync(path.join(STYLES, 'atom-one-light.css'), 'utf8');
const dark = fs.readFileSync(path.join(STYLES, 'atom-one-dark.css'), 'utf8');

const out = `/* 由 scripts/gen-hljs-css.mjs 生成，不要手改 —— 改主题请改脚本后重跑。
   来源：highlight.js/styles/atom-one-{light,dark}.css
   自托管理由：cdnjs 在大陆 TTFB 3.66s，代码块要等三秒多才上色。 */

/* ── 浅色(默认) ───────────────────────────── */
${scope(light, '')}

/* ── 深色(html.dark) ──────────────────────── */
${scope(dark, 'html.dark')}
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log(`✓ ${path.relative(process.cwd(), OUT)} — ${(out.length / 1024).toFixed(1)}KB`);
