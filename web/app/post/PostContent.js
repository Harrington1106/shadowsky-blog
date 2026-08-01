'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Folder, Clock, Eye, Edit3, List, X, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { cardSurface, cn, withBase } from '@/lib/utils';
import { fetchVisitCount, fetchPosts } from '@/lib/api';
import { postHref } from '@/lib/links';

const HLJS_THEME_DARK = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
const HLJS_THEME_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';

/**
 * 文章阅读页的交互层。正文 HTML、标题、元信息全部由服务端 page.js 算好传进来
 * (见 lib/renderMarkdown.js),这里只做需要浏览器的部分:目录高亮、KaTeX、
 * 代码复制、图片灯箱、阅读进度、访问计数、上下篇与相关推荐。
 *
 * marked 与 highlight.js 已经不在客户端了 —— 它们曾是 /post 首屏包的大头。
 */
export default function PostContent({ article, backRef }) {
    const { title, tags, heroImage, html: contentHtml, meta: postMeta, needsMath } = article;

    const [toc, setToc] = useState([]);
    const [activeTocId, setActiveTocId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [visitCount, setVisitCount] = useState('...');
    const [navLinks, setNavLinks] = useState({ prev: null, next: null });
    const [recommendations, setRecommendations] = useState([]);
    const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const contentRef = useRef(null);
    // ?ref= 记着来时在 /blog 的哪个视图/锚点,返回时还原
    const backHref = withBase(backRef ? '/blog' + backRef : '/blog');

    // ── 访问计数 + 上下篇 + 相关推荐(都不影响正文,后台补齐)──
    useEffect(() => {
        if (article.kind !== 'post') return;
        let cancelled = false;

        fetchVisitCount(article.pageId).then((d) => { if (!cancelled) setVisitCount(d.count); }).catch(() => setVisitCount('-'));

        fetchPosts().then((posts) => {
            if (cancelled) return;
            const idx = posts.findIndex((p) => p.file === article.file);
            if (idx !== -1) {
                setNavLinks({
                    prev: idx < posts.length - 1 ? posts[idx + 1] : null, // 较旧
                    next: idx > 0 ? posts[idx - 1] : null, // 较新
                });
            }
            if (tags.length > 0) {
                const scored = posts
                    .filter((p) => p.file !== article.file)
                    .map((p) => ({ post: p, score: (p.tags || []).filter((t) => tags.includes(t)).length }))
                    .filter((x) => x.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4);
                setRecommendations(scored.map((x) => x.post));
            }
        }).catch(() => {});

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [article.file]);

    // ── 内容渲染后：KaTeX、TOC、滚动进度 ──
    useEffect(() => {
        if (!contentHtml || !contentRef.current) return;
        const container = contentRef.current;

        // 只有正文里真的出现数学分隔符才去加载 KaTeX(库 + CSS 约 300KB)。
        // 判断已经在服务端做完(lib/renderMarkdown 的 hasMath),这里直接用结论。
        if (needsMath) {
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
                        {/* 正文由服务端渲染好后直接注入,不再有"加载中"状态;
                            文章不存在的情况在 page.js 里就 notFound() 了 */}
                        <div
                            className="post-prose"
                            id="post-content"
                            ref={contentRef}
                            onClick={onContentClick}
                            dangerouslySetInnerHTML={{ __html: contentHtml }}
                        />

                        {(navLinks.prev || navLinks.next) && (
                            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                                {navLinks.prev ? (
                                    <a
                                        href={withBase(postHref(navLinks.prev.file))}
                                        className={cn(cardSurface, 'flex flex-col gap-1 p-3 text-sm transition-colors hover:ring-primary/40 hover:bg-accent/40')}
                                    >
                                        <span className="text-xs text-muted-foreground">← 上一篇</span>
                                        <span className="line-clamp-1 font-medium">{navLinks.prev.title}</span>
                                    </a>
                                ) : <div />}
                                {navLinks.next ? (
                                    <a
                                        href={withBase(postHref(navLinks.next.file))}
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
                                                href={withBase(postHref(p.file))}
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
