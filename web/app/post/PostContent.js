'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Folder, Clock, Eye, Edit3, List, X, Bot, Share2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { cardSurface, cardInteractive, cn, withBase } from '@/lib/utils';
import { fetchVisitCount, fetchPosts } from '@/lib/api';
import { postHref } from '@/lib/links';

/**
 * 正文容器。单独 memo —— html 没变就整棵跳过，React 一次都不再碰这段 DOM。
 *
 * ⚠ 别把 memo 去掉。hydration 之后的第一次渲染（这里是 setToc 触发的）会把
 * dangerouslySetInnerHTML 整段重新灌一遍，容器节点还是原来那个，里面的子节点却全被换新。
 * 后果有两个，都不显眼但都是坏的：
 *   1. IntersectionObserver 观察的是重灌前那批标题，重灌后它们成了游离节点 ——
 *      **目录高亮从来就没亮过**（实测滚到底 aria-current 一个都没有）
 *   2. KaTeX 渲染结果、以及任何往这段 DOM 里塞的东西，同样会被抹掉
 * onClick 必须用 useCallback 固定，否则每次渲染都是新函数，memo 直接失效。
 */
const PostBody = memo(function PostBody({ html, onClick, innerRef }) {
    return (
        <div
            className="post-prose"
            id="post-content"
            ref={innerRef}
            onClick={onClick}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
});

/**
 * 取标题文字，跳过服务端加在末尾的「#」章节锚点。
 * 直接用 textContent 的话，目录里每一项后面都会拖一个 #。
 */
function headingText(h) {
    let s = '';
    h.childNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList?.contains('heading-anchor')) return;
        s += n.textContent;
    });
    return s.trim();
}

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
    const [visitCount, setVisitCount] = useState('...');
    const [navLinks, setNavLinks] = useState({ prev: null, next: null });
    const [recommendations, setRecommendations] = useState([]);
    const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const contentRef = useRef(null);
    const progressRef = useRef(null);
    const headersRef = useRef([]);   // 正文里的标题节点，滚动时算目录高亮用
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
            return { id: h.id, level: parseInt(h.tagName.substring(1), 10), text: headingText(h) };
        });
        setToc(list);
        headersRef.current = headers;
    }, [contentHtml]);

    /**
     * 阅读进度条 + 目录高亮，共用同一个滚动监听。
     *
     * 目录高亮原来用 IntersectionObserver，`entries.forEach(if intersecting) setActive`——
     * 同时有多个标题落在观察带里时是「最后一个赢」，而且一旦所有标题都离开观察带
     * 就再也不更新：滚回文章顶部时，高亮还停在最后读到的那节（实测在 scrollY=0
     * 高亮的是「总结」）。改成确定性的 scrollspy：取「顶端已经越过阈值的最后一个标题」，
     * 都没越过就落到第一个。
     *
     * 进度条直接写 DOM、不走 state —— 原来每个滚动事件都 setProgress，
     * 整个 PostContent 跟着重渲染一次，而实际变的只有一条 2px 高的进度条宽度。
     * 原来每个滚动事件都 setProgress，整个 PostContent 跟着重渲染一次：
     * 正文那个 dangerouslySetInnerHTML 的 div、还有几十项的目录列表，
     * 每帧都要过一遍 diff，而实际变的只有一条 2px 高的进度条宽度。
     * 顺带用 rAF 合并同一帧内的多次滚动事件。
     */
    useEffect(() => {
        const bar = progressRef.current;
        if (!bar) return;
        let queued = false;
        const paint = () => {
            queued = false;
            const el = document.documentElement;
            const max = el.scrollHeight - el.clientHeight;
            bar.style.width = max > 0 ? `${(el.scrollTop / max) * 100}%` : '0%';

            // 阈值 120px：略低于顶栏(57px)，标题刚滑到栏下方就算「读到这一节」
            const hs = headersRef.current;
            if (!hs.length) return;
            let current = hs[0];
            for (const h of hs) {
                if (h.getBoundingClientRect().top <= 120) current = h;
                else break;
            }
            setActiveTocId((prev) => (prev === current.id ? prev : current.id));
        };
        const onScroll = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(paint);
        };
        paint();   // 带 #hash 进来时首屏就不在顶部，先画一次
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    // ── 事件委托：代码复制按钮 + 图片灯箱 ──
    // useCallback 是 PostBody 那个 memo 的前提，见上面的注释
    const onContentClick = useCallback(function onContentClick(e) {
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
    }, []);

    // 代码高亮主题原先是运行时从 cdnjs 插 <link>、再监听 themeChange 换 href。
    // 大陆实测 cdnjs TTFB 3.66s,代码块要裸奔三秒多才上色。现在两套主题已按
    // html.dark 作用域内联进 globals.css(见 app/hljs-theme.css),深浅色由 CSS
    // 自己跟着走,这段逻辑连同那个跨境依赖一起删掉了。

    return (
        <>
            {/* 纯装饰,读屏跳过。不加 transition —— 宽度已经是每帧写一次,再补间反而会拖影 */}
            <div className="fixed inset-x-0 top-0 z-60 h-0.5 bg-transparent" aria-hidden="true">
                <div ref={progressRef} className="h-full w-0 rounded-r-full bg-primary shadow-[0_0_8px] shadow-primary/50" />
            </div>

            <article>
                <header className="relative flex min-h-72 items-end overflow-hidden border-b sm:min-h-96">
                    {heroImage && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${heroImage}')` }}
                        />
                    )}
                    {/* 封面多是截图/照片这类高频画面，原来渐变到顶只剩 20% 遮罩，
                        「返回文章列表」和那行元信息直接压在图的亮部上，几乎读不出来。
                        加重遮罩 + 顶部再补一层，正文信息优先于装饰图。 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/88 to-background/45" />
                    <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-28 pb-10 sm:px-6">
                        <a href={backHref} className="group/back mb-5 inline-flex items-center gap-1.5 text-sm text-foreground/75 transition-colors hover:text-foreground">
                            <ArrowLeft size={14} className="transition-transform duration-200 motion-safe:group-hover/back:-translate-x-0.5" /> 返回文章列表
                        </a>
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <PostMetaRow meta={postMeta} visitCount={visitCount} />
                        </div>
                        <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">{title}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                            {/* 标签本来是死的纯展示。它在 /blog 就是筛选维度，
                                「顺着这个标签再看看」是读完一篇后最自然的动作，接上去。
                                渲染成 <a> 后 Badge 基类里的 [a]:hover:* 也就生效了 */}
                            {tags.map((t) => (
                                <Badge
                                    key={t}
                                    variant="secondary"
                                    render={<a href={withBase(`/blog?tag=${encodeURIComponent(t)}`)} />}
                                >
                                    #{t}
                                </Badge>
                            ))}
                            <ShareButton title={title} className={tags.length > 0 ? 'ml-1' : ''} />
                        </div>
                    </div>
                </header>

                <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_260px]">
                    <div className="min-w-0">
                        {/* 正文由服务端渲染好后直接注入,不再有"加载中"状态;
                            文章不存在的情况在 page.js 里就 notFound() 了 */}
                        <PostBody html={contentHtml} onClick={onContentClick} innerRef={contentRef} />

                        {(navLinks.prev || navLinks.next) && (
                            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                                {navLinks.prev ? (
                                    <a
                                        href={withBase(postHref(navLinks.prev.file))}
                                        className={cn(cardSurface, cardInteractive, 'group/nav flex flex-col gap-1 p-3 text-sm')}
                                    >
                                        {/* 箭头跟着 hover 往外挪一点,给方向一个提示 */}
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <ArrowLeft size={12} className="transition-transform duration-200 motion-safe:group-hover/nav:-translate-x-0.5" /> 上一篇
                                        </span>
                                        <span className="line-clamp-1 font-medium">{navLinks.prev.title}</span>
                                    </a>
                                ) : <div />}
                                {navLinks.next ? (
                                    <a
                                        href={withBase(postHref(navLinks.next.file))}
                                        className={cn(cardSurface, cardInteractive, 'group/nav flex flex-col gap-1 p-3 text-sm sm:items-end sm:text-right')}
                                    >
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            下一篇 <ArrowRight size={12} className="transition-transform duration-200 motion-safe:group-hover/nav:translate-x-0.5" />
                                        </span>
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
                                                className="line-clamp-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground motion-safe:hover:translate-x-0.5"
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

/**
 * 分享按钮。之前文章页没有任何分享入口 —— 想转发只能手动抄地址栏。
 * 手机上走系统分享面板(navigator.share),桌面退回复制链接。
 */
function ShareButton({ title, className }) {
    const [copied, setCopied] = useState(false);

    async function onShare() {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return;
            } catch {
                // 用户取消分享,或系统不给用 —— 继续走复制
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* 剪贴板被拒就什么都不做,不弹错 */ }
    }

    return (
        <Button variant="ghost" size="sm" onClick={onShare} className={cn('h-6 gap-1 px-2 text-xs text-muted-foreground', className)}>
            {copied ? <><Check size={12} /> 已复制</> : <><Share2 size={12} /> 分享</>}
        </Button>
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
    const activeRef = useRef(null);

    /**
     * 目录本身是 max-h-[55vh] 的滚动区。长文里读到后半段时，高亮那一项早就滚出可视区，
     * 侧栏看着像整个失效了 —— 把它带回视野。
     *
     * 只改滚动容器的 scrollTop，不用 scrollIntoView：后者会连带滚动祖先，
     * 正文页面本身也是可滚的，稍不注意就变成「读着读着页面自己跳了」。
     */
    useEffect(() => {
        const el = activeRef.current;
        const box = el?.closest('nav');
        if (!el || !box) return;
        const e = el.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (e.top < b.top) box.scrollTop -= b.top - e.top + 8;
        else if (e.bottom > b.bottom) box.scrollTop += e.bottom - b.bottom + 8;
    }, [activeId]);

    if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">暂无目录</p>;
    }
    return (
        <ul className="space-y-0.5 border-l">
            {items.map((item) => {
                const active = activeId === item.id;
                return (
                    <li key={item.id}>
                        <a
                            ref={active ? activeRef : null}
                            href={`#${item.id}`}
                            onClick={onNavigate}
                            aria-current={active ? 'location' : undefined}
                            style={{ paddingLeft: 10 + (item.level - 1) * 12, marginLeft: -1 }}
                            className={cn(
                                'block border-l-2 py-1 text-xs transition-all duration-200',
                                active
                                    // 原来只有左边那 2px 边框和文字颜色在变,扫一眼很难定位;
                                    // 补一层淡底色,整行都成为指示器
                                    ? 'rounded-r border-primary bg-accent/60 font-medium text-foreground'
                                    : 'border-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                            )}
                        >
                            {item.text}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
