'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Marked } from 'marked';
import { ArrowLeft, Calendar, Folder, Clock, Eye, Edit3, List, X, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { cardSurface, cn, withBase } from '@/lib/utils';
import { fetchPostMarkdown, fetchVisitCount, fetchPosts, fetchAiDailyMarkdown } from '@/lib/api';
import { CATEGORY_IMAGES, calculateReadingTime, parseFrontMatter, normalizeTags } from '@/lib/postContent';

const HLJS_THEME_DARK = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
const HLJS_THEME_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';

// highlight.js / katex 都按需加载:两者合计占 /post 首屏包的绝大部分,
// 而大多数访问只是读文字。加载后缓存在模块级变量里,同一次会话不会重复请求。
let hljs = null;
async function ensureHljs() {
    // 用 lib/common(约 40 种常见语言)而不是全量 190+,体积小一个量级。
    // powershell 不在 common 里但文章用到,单独注册(约 2KB),避免降级成纯文本。
    if (!hljs) {
        const [core, ps] = await Promise.all([
            import('highlight.js/lib/common'),
            import('highlight.js/lib/languages/powershell'),
        ]);
        hljs = core.default;
        hljs.registerLanguage('powershell', ps.default);
    }
    return hljs;
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const marked = new Marked({ breaks: true, gfm: true });
marked.use({
    renderer: {
        image({ href, title, text }) {
            return `<img src="${href}" alt="${text || ''}" title="${title || ''}" class="rounded-lg shadow-md max-w-full h-auto my-6 mx-auto">`;
        },
        code({ text, lang }) {
            // hljs 未就绪时原样输出(转义后),不至于因为懒加载失败而丢内容
            const language = hljs && lang && hljs.getLanguage(lang) ? lang : 'plaintext';
            const highlighted = hljs ? hljs.highlight(text, { language }).value : escapeHtml(text);
            return `<pre class="group"><div class="code-header"><div class="window-controls"><div class="window-dot red"></div><div class="window-dot yellow"></div><div class="window-dot green"></div></div><div class="flex items-center gap-2"><div class="lang-label">${language}</div><button class="code-copy-btn" title="复制代码"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span></button></div></div><code class="hljs language-${language}">${highlighted}</code></pre>`;
        },
    },
});

export default function PostPage() {
    return (
        <Suspense fallback={null}>
            <PostPageInner />
        </Suspense>
    );
}

function PostPageInner() {
    const params = useSearchParams();
    const file = params.get('file');
    const aiDate = params.get('ai');
    const refHash = params.get('ref');

    const [title, setTitle] = useState('加载中…');
    const [postMeta, setPostMeta] = useState(null);
    const [tags, setTags] = useState([]);
    const [contentHtml, setContentHtml] = useState('');
    const [heroImage, setHeroImage] = useState(null);
    const [error, setError] = useState(null);
    const [toc, setToc] = useState([]);
    const [activeTocId, setActiveTocId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [visitCount, setVisitCount] = useState('...');
    const [navLinks, setNavLinks] = useState({ prev: null, next: null });
    const [recommendations, setRecommendations] = useState([]);
    const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const contentRef = useRef(null);
    const backHref = withBase(refHash ? '/blog' + refHash : '/blog');

    // ── 加载文章 ──
    useEffect(() => {
        let cancelled = false;

        async function loadAiDaily() {
            try {
                const md = await fetchAiDailyMarkdown(aiDate);
                if (cancelled) return;
                const titleMatch = md.match(/^#\s+(.+)/m);
                const rawTitle = titleMatch ? titleMatch[1] : 'AI日报 · ' + aiDate;
                const cleanTitle = rawTitle
                    .replace(/^[^\w一-鿿]+/, '')
                    .replace(/^(AI|📰)\s*[-—]?\s*/i, '')
                    .trim();
                // 标题现在由 page.js 的 generateMetadata 在服务端写好(含站名),
                // 这里不再改 document.title —— 否则会把它覆盖成没有站名的版本,
                // 而且 PageTracker 在挂载时就取过一次标题,时序上也对不上。
                setTitle(cleanTitle);
                const d = new Date(aiDate);
                const dateStr = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                setPostMeta({ kind: 'aidaily', dateStr });
                const kwMatch = md.match(/关键词[：:]\s*(.+)/);
                const keywords = kwMatch ? kwMatch[1].split(/[,，、]/).map((k) => k.trim()).filter(Boolean).slice(0, 5) : [];
                setTags(keywords);
                setHeroImage('https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80');
                await ensureHljs();
                setContentHtml(marked.parse(md));
            } catch (e) {
                if (!cancelled) {
                    setError(e.message);
                    setTitle('加载失败');
                }
            }
        }

        async function loadPost() {
            if (!file) { setError('URL 参数中缺少 file 字段。'); setTitle('错误'); return; }
            try {
                const { text, finalPath } = await fetchPostMarkdown(file);
                if (cancelled) return;
                const { metadata, content } = parseFrontMatter(text);

                setTitle(metadata.title || '无标题');

                let dateStr = '未知日期';
                if (metadata.date) {
                    const dateObj = new Date(metadata.date);
                    if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                }
                const category = metadata.category || '未分类';
                const readingTime = calculateReadingTime(content);
                const dateYm = metadata.date && /^\d{4}-\d{2}/.test(metadata.date) ? metadata.date.substring(0, 7) : null;
                const modifiedStr = (metadata.lastModified && metadata.lastModified !== metadata.date)
                    ? new Date(metadata.lastModified).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                    : null;

                const normalizedTags = normalizeTags(metadata.tags);
                setTags(normalizedTags);

                const imageUrl = metadata.coverImage || CATEGORY_IMAGES[category] || CATEGORY_IMAGES.default;
                setHeroImage(imageUrl);

                const dir = finalPath.substring(0, finalPath.lastIndexOf('/') + 1);
                marked.use({
                    renderer: {
                        image({ href, title: t, text: alt }) {
                            let cleanHref = String(href || '');
                            if (cleanHref && !cleanHref.startsWith('http') && !cleanHref.startsWith('//') && !cleanHref.startsWith('/')) {
                                cleanHref = dir + cleanHref;
                            }
                            return `<img src="${cleanHref}" alt="${alt || ''}" title="${t || ''}" class="rounded-lg shadow-md max-w-full h-auto my-6 mx-auto">`;
                        },
                    },
                });

                await ensureHljs();
                setContentHtml(marked.parse(content));

                const pageId = 'posts/' + file.replace(/\.md$/, '');
                fetchVisitCount(pageId).then((d) => setVisitCount(d.count)).catch(() => setVisitCount('-'));

                setPostMeta({ kind: 'post', dateStr, dateYm, category, readingTime, modifiedStr });

                // 上一篇/下一篇 + 相关推荐
                fetchPosts().then((posts) => {
                    if (cancelled) return;
                    const currentFileName = file.split('/').pop();
                    const idx = posts.findIndex((p) => p.file === currentFileName || p.file.endsWith(currentFileName));
                    if (idx !== -1) {
                        setNavLinks({
                            prev: idx < posts.length - 1 ? posts[idx + 1] : null, // 较旧
                            next: idx > 0 ? posts[idx - 1] : null, // 较新
                        });
                    }
                    if (normalizedTags.length > 0) {
                        const scored = posts
                            .filter((p) => p.file !== file)
                            .map((p) => ({ post: p, score: normalizeTags(p.tags).filter((t) => normalizedTags.includes(t)).length }))
                            .filter((x) => x.score > 0)
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 4);
                        setRecommendations(scored.map((x) => x.post));
                    }
                }).catch(() => {});
            } catch (e) {
                if (!cancelled) {
                    setError(e.message);
                    setTitle('404 Not Found');
                }
            }
        }

        if (aiDate) loadAiDaily();
        else loadPost();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, aiDate]);

    // ── 内容渲染后：KaTeX、TOC、滚动进度 ──
    useEffect(() => {
        if (!contentHtml || !contentRef.current) return;
        const container = contentRef.current;

        // 只有正文里真的出现数学分隔符才去加载 KaTeX(库 + CSS 约 300KB)
        const plain = container.textContent || '';
        const hasMath = plain.includes('$$') || plain.includes('\\(') || plain.includes('\\[')
            || new RegExp('\\$[^$\\n]+\\$').test(plain);
        if (hasMath) {
            (async () => {
                try {
                    const [{ default: renderMathInElement }] = await Promise.all([
                        import('katex/contrib/auto-render'),
                        import('katex/dist/katex.min.css'),
                    ]);
                    renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                        ],
                        throwOnError: false,
                    });
                } catch (e) { /* noop */ }
            })();
        }

        const headers = Array.from(container.querySelectorAll('h1, h2, h3'));
        const list = headers.map((h, i) => {
            if (!h.id) h.id = 'heading-' + i;
            return { id: h.id, level: parseInt(h.tagName.substring(1), 10), text: h.textContent };
        });
        setToc(list);

        if (headers.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveTocId(entry.target.id);
                });
            },
            { root: null, rootMargin: '-100px 0px -60% 0px', threshold: 0 }
        );
        headers.forEach((h) => observer.observe(h));
        return () => observer.disconnect();
    }, [contentHtml]);

    useEffect(() => {
        const onScroll = () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // ── 事件委托：代码复制按钮 + 图片灯箱 ──
    function onContentClick(e) {
        const copyBtn = e.target.closest('.code-copy-btn');
        if (copyBtn) {
            const code = copyBtn.closest('pre')?.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.innerText).then(() => {
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 2000);
                }).catch(() => {});
            }
            return;
        }
        const img = e.target.closest('#post-content img');
        if (img) setLightbox({ src: img.src, alt: img.alt });
    }

    // ── 代码高亮主题跟随全站深浅色切换 ──
    useEffect(() => {
        const link = document.createElement('link');
        link.id = 'hljs-theme';
        link.rel = 'stylesheet';
        link.href = document.documentElement.classList.contains('dark') ? HLJS_THEME_DARK : HLJS_THEME_LIGHT;
        document.head.appendChild(link);
        const onThemeChange = (e) => {
            link.href = e.detail.isDark ? HLJS_THEME_DARK : HLJS_THEME_LIGHT;
        };
        window.addEventListener('themeChange', onThemeChange);
        return () => {
            window.removeEventListener('themeChange', onThemeChange);
            link.remove();
        };
    }, []);

    return (
        <>
            <div className="fixed inset-x-0 top-0 z-60 h-0.5 bg-transparent">
                <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${progress}%` }} />
            </div>

            <article>
                <header className="relative flex min-h-72 items-end overflow-hidden border-b sm:min-h-96">
                    {heroImage && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${heroImage}')` }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20" />
                    <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-28 pb-10 sm:px-6">
                        <a href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft size={14} /> 返回文章列表
                        </a>
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <PostMetaRow meta={postMeta} visitCount={visitCount} />
                        </div>
                        <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">{title}</h1>
                        {tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {tags.map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}
                            </div>
                        )}
                    </div>
                </header>

                <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_260px]">
                    <div className="min-w-0">
                        {error ? (
                            <div className="py-16 text-center">
                                <p className="mb-2 text-base font-medium text-destructive">无法加载文章</p>
                                <p className="mb-6 text-sm text-muted-foreground">{error}</p>
                                <a href={withBase('/blog')} className="text-sm text-primary hover:underline">← 返回博客</a>
                            </div>
                        ) : (
                            <div
                                className="post-prose"
                                id="post-content"
                                ref={contentRef}
                                onClick={onContentClick}
                                dangerouslySetInnerHTML={{
                                    __html: contentHtml || '<div class="my-16 flex justify-center"><div class="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"></div></div>',
                                }}
                            />
                        )}

                        {(navLinks.prev || navLinks.next) && (
                            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                                {navLinks.prev ? (
                                    <a
                                        href={withBase(`/post?file=${encodeURIComponent(navLinks.prev.file)}`)}
                                        className={cn(cardSurface, 'flex flex-col gap-1 p-3 text-sm transition-colors hover:ring-primary/40 hover:bg-accent/40')}
                                    >
                                        <span className="text-xs text-muted-foreground">← 上一篇</span>
                                        <span className="line-clamp-1 font-medium">{navLinks.prev.title}</span>
                                    </a>
                                ) : <div />}
                                {navLinks.next ? (
                                    <a
                                        href={withBase(`/post?file=${encodeURIComponent(navLinks.next.file)}`)}
                                        className={cn(cardSurface, 'flex flex-col gap-1 p-3 text-sm transition-colors hover:ring-primary/40 hover:bg-accent/40 sm:items-end sm:text-right')}
                                    >
                                        <span className="text-xs text-muted-foreground">下一篇 →</span>
                                        <span className="line-clamp-1 font-medium">{navLinks.next.title}</span>
                                    </a>
                                ) : <div />}
                            </div>
                        )}

                        <div className="mt-8 border-t pt-6 text-center">
                            <a href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft size={14} /> 返回文章列表
                            </a>
                        </div>
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-20 space-y-6">
                            <div>
                                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    <List size={12} /> 目录
                                </h3>
                                <nav className="max-h-[55vh] overflow-y-auto pr-2">
                                    <TocList items={toc} activeId={activeTocId} />
                                </nav>
                            </div>
                            {recommendations.length > 0 && (
                                <div>
                                    <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">相关推荐</h3>
                                    <div className="flex flex-col gap-1">
                                        {recommendations.map((p) => (
                                            <a
                                                key={p.file}
                                                href={withBase(`/post?file=${encodeURIComponent(p.file)}`)}
                                                className="line-clamp-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                {p.title}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </article>

            {toc.length > 0 && (
                <>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="打开目录"
                        onClick={() => setTocDrawerOpen(true)}
                        className="fixed bottom-6 left-6 z-40 rounded-full shadow-md lg:hidden"
                    >
                        <List size={18} />
                    </Button>
                    <Sheet open={tocDrawerOpen} onOpenChange={setTocDrawerOpen}>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2"><List size={16} /> 文章目录</SheetTitle>
                            </SheetHeader>
                            <nav className="max-h-[70vh] overflow-y-auto px-4">
                                <TocList items={toc} activeId={activeTocId} onNavigate={() => setTocDrawerOpen(false)} />
                            </nav>
                        </SheetContent>
                    </Sheet>
                </>
            )}

            <Footer pageId="post" />

            {lightbox && (
                <Dialog open onOpenChange={(o) => { if (!o) setLightbox(null); }}>
                    <DialogContent showCloseButton={false} className="h-screen max-h-screen w-screen max-w-none border-none bg-black/95 p-0 sm:max-w-none sm:rounded-none">
                        <div className="relative flex h-full w-full items-center justify-center" onClick={() => setLightbox(null)}>
                            <img
                                src={lightbox.src}
                                alt={lightbox.alt}
                                onClick={(e) => e.stopPropagation()}
                                className="max-h-[90vh] max-w-[92vw] rounded object-contain"
                            />
                            <Button
                                aria-label="关闭"
                                variant="ghost"
                                size="icon"
                                className="absolute top-5 right-5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                onClick={() => setLightbox(null)}
                            >
                                <X />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <BackToTop />
        </>
    );
}

function PostMetaRow({ meta, visitCount }) {
    if (!meta) return null;
    if (meta.kind === 'aidaily') {
        return (
            <>
                <span className="inline-flex items-center gap-1"><Calendar size={13} className="opacity-60" />{meta.dateStr}</span>
                <span className="inline-flex items-center gap-1"><Bot size={13} className="opacity-60" /> AI日报</span>
            </>
        );
    }
    return (
        <>
            <span className="inline-flex items-center gap-1">
                <Calendar size={13} className="opacity-60" />
                {meta.dateYm ? <a href={withBase(`/blog?date=${meta.dateYm}`)} className="hover:text-foreground">{meta.dateStr}</a> : meta.dateStr}
            </span>
            {meta.modifiedStr && (
                <span className="inline-flex items-center gap-1" title="最近修改"><Edit3 size={13} className="opacity-60" /> {meta.modifiedStr}</span>
            )}
            <span className="inline-flex items-center gap-1"><Folder size={13} className="opacity-60" /> {meta.category}</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} className="opacity-60" /> {meta.readingTime} 分钟阅读</span>
            <span className="inline-flex items-center gap-1" title="阅读量"><Eye size={13} className="opacity-60" /> {visitCount}</span>
        </>
    );
}

function TocList({ items, activeId, onNavigate }) {
    if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">暂无目录</p>;
    }
    return (
        <ul className="space-y-0.5 border-l">
            {items.map((item) => (
                <li key={item.id}>
                    <a
                        href={`#${item.id}`}
                        onClick={onNavigate}
                        style={{ paddingLeft: 10 + (item.level - 1) * 12, marginLeft: -1 }}
                        className={cn(
                            'block border-l-2 py-1 text-xs transition-colors',
                            activeId === item.id
                                ? 'border-primary font-medium text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {item.text}
                    </a>
                </li>
            ))}
        </ul>
    );
}
