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
import hljs from 'highlight.js/lib/common';
import powershell from 'highlight.js/lib/languages/powershell';

// lib/common 覆盖约 40 种常见语言;powershell 不在其中但文章用到,单独注册。
hljs.registerLanguage('powershell', powershell);

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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

    return marked.parse(md);
}

/** 正文里是否出现数学分隔符 —— 决定客户端要不要去加载 KaTeX(约 300KB)。 */
export function hasMath(md) {
    return md.includes('$$') || md.includes('\\(') || md.includes('\\[') || /\$[^$\n]+\$/.test(md);
}
