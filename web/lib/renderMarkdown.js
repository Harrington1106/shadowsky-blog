/**
 * 服务端 Markdown → HTML（文章正文与 AI 日报共用）。
 *
 * 以前这段跑在客户端(PostContent 里 marked + 懒加载 hljs),爬虫拿到的是空壳,
 * 首屏也要等一次 /api 往返才有字。搬到服务端后正文直接进初始 HTML,
 * 客户端不再需要 marked/highlight.js —— 这两个库本来就是 /post 首屏包的大头。
 *
 * ⚠ 每次调用都新建 Marked 实例:renderer 里的图片基准目录是按文章变的,
 *   共用一个全局实例会让上一次的配置泄漏到下一篇(旧代码在客户端就有这个隐患)。
 */
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import hljs from 'highlight.js/lib/common';
import powershell from 'highlight.js/lib/languages/powershell';

// lib/common 覆盖约 40 种常见语言;powershell 不在其中但文章用到,单独注册。
hljs.registerLanguage('powershell', powershell);

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * 净化白名单。
 *
 * marked 默认把 Markdown 里的原生 HTML 原样透传,而 AI 日报的条目标题来自外部 RSS ——
 * 理论上可注入。之前这条链路一直没有净化(客户端渲染时也没有),这里补上。
 *
 * 两个约束让它不能用默认配置:
 *   1. 白名单必须覆盖**我们自己生成的**标记 —— 代码块的 pre/div/button/svg、
 *      复制按钮、标题的 id、图片的 class,漏一个就是可见的功能损坏。
 *   2. iframe 不能一刀切掉:站上有讲 B 站视频嵌入的文章,以后正文会真的放播放器。
 *      只放行 bilibili 域名。
 *
 * 净化的是整篇渲染结果而不是逐个原生 HTML 片段:日报里的 <details> 开闭标签
 * 分属不同 token,逐片净化会被自动闭合,结构就散了。
 */
const SANITIZE_POLICY = {
    allowedTags: [
        'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'pre', 'code', 'em', 'strong', 'del', 'ins', 'sub', 'sup', 'mark', 'kbd', 'small', 'abbr',
        'span', 'div', 'section', 'figure', 'figcaption', 'details', 'summary',
        'a', 'img', 'iframe',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        // 代码块头部那套(窗口圆点 + 语言标签 + 复制按钮里的图标)
        'button', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'g',
    ],
    allowedAttributes: {
        '*': ['class', 'id', 'title', 'aria-label', 'aria-hidden', 'role'],
        a: ['href', 'target', 'rel', 'name'],
        img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
        iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'framespacing', 'border', 'scrolling', 'allow', 'loading', 'sandbox'],
        button: ['type'],
        details: ['open'],
        td: ['colspan', 'rowspan', 'align'],
        th: ['colspan', 'rowspan', 'align', 'scope'],
        svg: ['width', 'height', 'viewBox', 'viewbox', 'fill', 'stroke', 'stroke-width', 'xmlns'],
        path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
        rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
        // 响应式视频外壳要靠内联样式撑比例,但只放行布局属性(见 allowedStyles)
        div: ['style'],
        span: ['style'],
    },
    allowedStyles: {
        '*': {
            position: [/^(relative|absolute|static)$/],
            width: [/^[\d.]+(%|px|rem|em|vw)$/],
            'max-width': [/^[\d.]+(%|px|rem|em|vw)$/],
            height: [/^[\d.]+(%|px|rem|em|vh|auto)$/],
            'padding-bottom': [/^[\d.]+(%|px|rem|em)$/],
            'padding-top': [/^[\d.]+(%|px|rem|em)$/],
            'aspect-ratio': [/^[\d./\s]+$/],
            overflow: [/^(hidden|auto|visible)$/],
            top: [/^[\d.-]+(%|px|rem|em)$/],
            left: [/^[\d.-]+(%|px|rem|em)$/],
            margin: [/^[\d.a-z%\s]+$/],
        },
    },
    // 只放行 B 站播放器；文章里的 //player.bilibili.com 是协议相对地址，靠 allowProtocolRelative 通过
    allowedIframeDomains: ['bilibili.com'],
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: true,
    // 站外链接一律补 noopener，防 tabnabbing
    transformTags: {
        a: (tagName, attribs) => {
            const href = attribs.href || '';
            if (/^https?:\/\//i.test(href) && !href.includes('shadowquake.top')) {
                return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } };
            }
            return { tagName, attribs };
        },
    },
};

/**
 * @param {string} md          Markdown 正文(已去掉 front matter)
 * @param {object} [opts]
 * @param {string} [opts.imageBaseDir] 相对图片路径的基准目录,与旧客户端行为保持一致
 * @returns {string} HTML
 */
export function renderMarkdown(md, { imageBaseDir = '' } = {}) {
    const marked = new Marked({ breaks: true, gfm: true });
    let headingSeq = 0;

    marked.use({
        renderer: {
            image({ href, title, text }) {
                let cleanHref = String(href || '');
                if (cleanHref && !cleanHref.startsWith('http') && !cleanHref.startsWith('//') && !cleanHref.startsWith('/')) {
                    cleanHref = imageBaseDir + cleanHref;
                }
                return `<img src="${cleanHref}" alt="${text || ''}" title="${title || ''}" class="rounded-lg shadow-md max-w-full h-auto my-6 mx-auto">`;
            },
            // 标题在服务端就带上 id,目录锚点在 JS 执行前就能用;
            // 客户端那段 `if (!h.id)` 会原样保留这里给的 id。
            heading({ tokens, depth }) {
                const text = this.parser.parseInline(tokens);
                const id = `heading-${headingSeq++}`;
                return `<h${depth} id="${id}">${text}</h${depth}>`;
            },
            code({ text, lang }) {
                const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
                let highlighted;
                try {
                    highlighted = hljs.highlight(text, { language }).value;
                } catch {
                    highlighted = escapeHtml(text);
                }
                return `<pre class="group"><div class="code-header"><div class="window-controls"><div class="window-dot red"></div><div class="window-dot yellow"></div><div class="window-dot green"></div></div><div class="flex items-center gap-2"><div class="lang-label">${language}</div><button class="code-copy-btn" title="复制代码"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span></button></div></div><code class="hljs language-${language}">${highlighted}</code></pre>`;
            },
        },
    });

    return sanitizeHtml(marked.parse(md), SANITIZE_POLICY);
}

/** 正文里是否出现数学分隔符 —— 决定客户端要不要去加载 KaTeX(约 300KB)。 */
export function hasMath(md) {
    return md.includes('$$') || md.includes('\\(') || md.includes('\\[') || /\$[^$\n]+\$/.test(md);
}
