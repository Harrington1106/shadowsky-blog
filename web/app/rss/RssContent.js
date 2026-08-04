'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Inbox, Settings, RotateCw, X, ChevronLeft, ChevronUp, BookOpen, Loader2,
    AlertCircle, Rss, List, Calendar, Clock, User, ExternalLink, ScrollText,
    Share2, Languages, ScanEye, Check, Undo2, Sparkles, ShieldCheck, Eye, EyeOff, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useConfirm } from '@/components/useConfirm';
import { toast } from 'sonner';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { cn } from '@/lib/utils';
import {
    AI_PROVIDERS, DEFAULT_AI_SETTINGS, getReadingTime, getRelativeTime,
    fetchFeeds, fetchFeedXml, parseRSSContent, fetchAllFeedsArticles,
    loadAISettings, saveAISettingsToStorage, translateArticle, testAIConnection,
} from '@/lib/rss';

// 阅读器工具条:展示型元信息用 PILL(纯 span),可交互项一律用 shadcn Button + PILL_BTN 对齐尺寸
const PILL = 'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition-colors';
const PILL_BTN = 'h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-primary';
const FONT_SIZE_STYLES = {
    sm: { fontSize: '0.9rem', lineHeight: 1.75 },
    md: { fontSize: '1.05rem', lineHeight: 1.85 },
    lg: { fontSize: '1.2rem', lineHeight: 1.95 },
};

function getFontSizePreference() {
    if (typeof window === 'undefined') return 'md';
    return localStorage.getItem('rs-font-size') || 'md';
}

export default function RssPage() {
    return (
        <Suspense fallback={null}>
            <RssPageInner />
        </Suspense>
    );
}

function RssPageInner() {
    const params = useSearchParams();

    const [feeds, setFeeds] = useState([]);
    const [feedsLoaded, setFeedsLoaded] = useState(false);
    const [feedsError, setFeedsError] = useState(null);
    const [feedsRefreshing, setFeedsRefreshing] = useState(false);

    const [activeFeedUrl, setActiveFeedUrl] = useState(null); // 'all' | url | null
    const [feedTitle, setFeedTitle] = useState('全部文章');
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [articlesError, setArticlesError] = useState(null);
    const [progress, setProgress] = useState(null); // {completed,total} while aggregating all feeds

    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [mobilePanel, setMobilePanel] = useState('sidebar');
    const [focusMode, setFocusMode] = useState(false);
    const [fontSize, setFontSize] = useState('md');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const initialFeedHandled = useRef(false);
    const loadSeq = useRef(0);

    useEffect(() => {
        setFontSize(getFontSizePreference());
    }, []);

    // ── 加载订阅源列表 ──
    useEffect(() => {
        fetchFeeds()
            .then((data) => {
                setFeeds(data);
                setFeedsLoaded(true);

                const feedParam = params.get('feed');
                if (!initialFeedHandled.current) {
                    initialFeedHandled.current = true;
                    if (feedParam) {
                        let normalized = feedParam;
                        try { normalized = decodeURIComponent(feedParam); } catch (e) { /* noop */ }
                        normalized = normalized.trim();
                        if (normalized === 'all') {
                            setActiveFeedUrl('all');
                        } else {
                            const target = data.find((f) => f.xmlUrl === normalized);
                            setActiveFeedUrl(target ? target.xmlUrl : 'all');
                        }
                    } else {
                        setActiveFeedUrl('all');
                    }
                }
            })
            .catch((e) => {
                setFeedsError(e.message || '加载失败');
                setFeedsLoaded(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 加载文章：切换 activeFeedUrl 时 ──
    useEffect(() => {
        if (activeFeedUrl === null) return;
        const seq = ++loadSeq.current;

        setSelectedIndex(-1);
        setArticlesLoading(true);
        setArticlesError(null);
        setProgress(null);

        if (activeFeedUrl === 'all') {
            setFeedTitle('全部文章');
            setProgress({ completed: 0, total: feeds.length });
            fetchAllFeedsArticles(feeds, (completed, total) => {
                if (loadSeq.current === seq) setProgress({ completed, total });
            }).then((list) => {
                if (loadSeq.current !== seq) return;
                setArticles(list);
                setArticlesLoading(false);
            }).catch((e) => {
                if (loadSeq.current !== seq) return;
                setArticlesError(e.message || '加载失败');
                setArticlesLoading(false);
            });
        } else {
            const feed = feeds.find((f) => f.xmlUrl === activeFeedUrl);
            if (!feed) { setArticlesLoading(false); return; }
            setFeedTitle(feed.title);
            fetchFeedXml(feed.xmlUrl)
                .then((xmlText) => {
                    if (loadSeq.current !== seq) return;
                    setArticles(parseRSSContent(xmlText));
                    setArticlesLoading(false);
                })
                .catch((e) => {
                    if (loadSeq.current !== seq) return;
                    setArticlesError(e.message || '加载失败');
                    setArticlesLoading(false);
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFeedUrl, feeds]);

    function selectFeed(url) {
        setActiveFeedUrl(url);
        if (typeof window !== 'undefined' && window.innerWidth <= 768) setMobilePanel('inbox');
    }

    function openArticle(index) {
        setSelectedIndex(index);
        if (typeof window !== 'undefined' && window.innerWidth <= 768) setMobilePanel('reader');
    }

    function refreshFeeds() {
        setFeedsRefreshing(true);
        fetchFeeds()
            .then((data) => setFeeds(data))
            .catch(() => {})
            .finally(() => setTimeout(() => setFeedsRefreshing(false), 500));
    }

    const categorized = useMemo(() => {
        const cats = {};
        feeds.forEach((f) => {
            const cat = f.category || '未分类';
            (cats[cat] ||= []).push(f);
        });
        return Object.keys(cats).sort().map((cat) => [cat, cats[cat]]);
    }, [feeds]);

    const catCount = useMemo(() => new Set(feeds.map((f) => f.category || '未分类')).size, [feeds]);

    /*
      每个分类都只有一个源时,分组不传达任何信息 —— 只是把 N 个源拆成 N 个
      标题 + N 个单元素列表,垂直空间白白多花一倍。这种情况下平铺。
      源多起来、真出现「一个分类几个源」时会自动恢复分组。
    */
    const showCategories = catCount > 1 && catCount < feeds.length;
    const [lastUpdated, setLastUpdated] = useState('—');
    useEffect(() => {
        if (feedsLoaded) setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, [feedsLoaded, feeds]);

    return (
        <>
            {focusMode && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFocusMode(false)}
                    className="fixed top-24 left-1/2 z-60 -translate-x-1/2 gap-1.5 rounded-full bg-background/90 shadow-lg backdrop-blur"
                >
                    <X size={14} /> 退出专注
                </Button>
            )}

            <main className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-2 pt-3 pb-16 sm:px-4 md:pb-3">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card md:flex-row">
                    <aside
                        className={cn(
                            'min-h-0 flex-1 flex-col border-b bg-background md:flex md:w-64 md:flex-none md:shrink-0 md:border-r md:border-b-0 lg:w-72',
                            focusMode && 'md:hidden',
                            mobilePanel === 'sidebar' ? 'flex' : 'hidden'
                        )}
                    >
                        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
                            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">订阅源</span>
                            <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground/70">
                                <span>{feeds.length} 个源</span><span className="opacity-40">·</span>
                                <span>{catCount} 类</span><span className="opacity-40">·</span>
                                <span>{lastUpdated}</span>
                            </span>
                        </div>

                        <button
                            onClick={() => selectFeed('all')}
                            className={cn(
                                'mx-2 mb-1 flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors',
                                activeFeedUrl === 'all' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:bg-accent/50'
                            )}
                        >
                            <Inbox size={16} /> 全部文章
                        </button>

                        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                            {!feedsLoaded && <PanelLoading text="正在加载订阅源…" />}
                            {feedsLoaded && feedsError && (
                                <PanelEmpty icon={AlertCircle} title="加载失败">
                                    <Button size="sm" onClick={() => window.location.reload()}>重试</Button>
                                </PanelEmpty>
                            )}
                            {feedsLoaded && !feedsError && feeds.length === 0 && (
                                <PanelEmpty icon={Rss} title="暂无订阅">
                                    <p className="text-xs text-muted-foreground">请联系管理员添加订阅源</p>
                                </PanelEmpty>
                            )}
                            {feedsLoaded && !feedsError && categorized.map(([cat, list]) => (
                                <div key={cat}>
                                    {showCategories && (
                                        <div className="px-2 pt-3 pb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{cat}</div>
                                    )}
                                    {list.map((feed) => (
                                        <FeedRow
                                            key={feed.xmlUrl}
                                            feed={feed}
                                            category={showCategories ? null : cat}
                                            active={activeFeedUrl === feed.xmlUrl}
                                            onClick={() => selectFeed(feed.xmlUrl)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="border-t p-2">
                            <button
                                onClick={() => setSettingsOpen(true)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                            >
                                <Settings size={15} /> AI 设置
                            </button>
                        </div>
                    </aside>

                    <section
                        className={cn(
                            'min-h-0 flex-1 flex-col border-b bg-background md:flex md:w-80 md:flex-none md:shrink-0 md:border-r md:border-b-0 lg:w-96',
                            mobilePanel === 'inbox' ? 'flex' : 'hidden'
                        )}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
                            <h2 className="min-w-0 flex-1 truncate text-base font-bold">{feedTitle}</h2>
                            <div className="flex shrink-0 items-center gap-2">
                                {!articlesLoading && articles.length > 0 && (
                                    <Badge variant="secondary" className="text-[0.7rem]">{articles.length} 篇</Badge>
                                )}
                                <Button variant="outline" size="icon-sm" onClick={refreshFeeds} aria-label="刷新">
                                    <RotateCw size={14} className={feedsRefreshing ? 'animate-spin' : ''} />
                                </Button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {articlesLoading && (
                                <PanelLoading text={activeFeedUrl === 'all' ? '正在聚合所有文章…' : '正在获取文章…'}>
                                    {progress && <p className="mt-1 text-xs text-muted-foreground">{progress.completed}/{progress.total}</p>}
                                </PanelLoading>
                            )}
                            {!articlesLoading && articlesError && (
                                <PanelEmpty icon={AlertCircle} title="无法加载内容">
                                    <p className="text-xs text-muted-foreground">{articlesError}</p>
                                </PanelEmpty>
                            )}
                            {!articlesLoading && !articlesError && articles.map((article, i) => (
                                <ArticleCard
                                    key={i}
                                    article={article}
                                    feedTitle={feedTitle}
                                    active={i === selectedIndex}
                                    onClick={() => openArticle(i)}
                                />
                            ))}
                        </div>
                    </section>

                    <section
                        className={cn(
                            'min-h-0 flex-1 flex-col bg-background md:relative md:flex md:flex-1',
                            mobilePanel === 'reader' ? 'fixed inset-0 z-50 flex' : 'hidden md:flex'
                        )}
                    >
                        <div className="relative h-0.5 shrink-0 bg-transparent md:h-1">
                            <div id="reading-progress" className="h-full w-0 bg-primary transition-[width] duration-100" />
                        </div>
                        <Button variant="outline" size="sm" className="m-3 w-fit gap-1.5 md:hidden" onClick={() => setMobilePanel('inbox')}>
                            <ChevronLeft size={16} /> 返回列表
                        </Button>
                        {selectedIndex >= 0 && articles[selectedIndex] ? (
                            <ArticleReader
                                key={selectedIndex}
                                article={articles[selectedIndex]}
                                fontSize={fontSize}
                                onFontSize={(s) => { localStorage.setItem('rs-font-size', s); setFontSize(s); }}
                                focusMode={focusMode}
                                onToggleFocus={() => setFocusMode((v) => !v)}
                            />
                        ) : (
                            <ReaderPlaceholder
                                feedTitle={feedTitle}
                                count={articles.length}
                                // 订阅源还没加载完时也算「加载中」—— 否则会先闪一句
                                // 「这个源暂时没有文章」，而那时候我们根本还不知道有没有
                                loading={articlesLoading || !feedsLoaded}
                                onOpenFirst={() => articles.length && openArticle(0)}
                            />
                        )}
                    </section>
                </div>

                <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 px-2 py-1.5 backdrop-blur md:hidden">
                    {[
                        { id: 'sidebar', label: '订阅源', icon: Rss },
                        { id: 'inbox', label: '文章', icon: List },
                        { id: 'reader', label: '阅读', icon: BookOpen },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setMobilePanel(id)}
                            className={cn(
                                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.65rem] font-medium transition-colors',
                                mobilePanel === id ? 'bg-accent text-primary' : 'text-muted-foreground'
                            )}
                        >
                            <Icon size={19} />
                            {label}
                        </button>
                    ))}
                </nav>
            </main>

            <Footer pageId="rss" />
            <BackToTop />

            <AiSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
    );
}

/**
 * 还没选文章时的阅读区。
 *
 * 桌面上这一栏占了整页约 40% 的宽度，原来只放一句「选择左侧的文章开始阅读」——
 * 首屏最大的一块什么也不做。现在至少告诉用户当前看的是哪个源、有多少篇，
 * 并给一个直接开读的入口（新访客最常见的下一步就是"看第一篇"）。
 */
function ReaderPlaceholder({ feedTitle, count, loading, onOpenFirst }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <BookOpen size={26} />
            </span>
            <div className="space-y-1.5">
                <h2 className="text-lg font-bold">{feedTitle}</h2>
                <p className="text-sm text-muted-foreground">
                    {loading ? '正在获取文章…' : count > 0 ? `${count} 篇待读，从左侧挑一篇` : '这个源暂时没有文章'}
                </p>
            </div>
            {!loading && count > 0 && (
                <Button size="sm" className="gap-1.5" onClick={onOpenFirst}>
                    <BookOpen size={14} /> 读第一篇
                </Button>
            )}
            <p className="max-w-64 text-xs leading-relaxed text-muted-foreground/70">
                打开文章后可以调字号、开专注模式，也能让 AI 翻译整篇——右上角那排按钮。
            </p>
        </div>
    );
}

/**
 * 侧栏里的一个订阅源。
 *
 * 副标题显示**域名**而不是完整 xmlUrl：整条地址在 264px 宽的侧栏里必然被截断，
 * 截出来的还都是没有信息量的前缀（`https://rss-hub-teal-delta.vercel.app/zhihu/…`
 * 你看不出这是知乎日报）。域名短、认得出、也不会被截。
 * 不分组时把分类名挪到这里，免得分类信息整个丢掉。
 */
function FeedRow({ feed, category, active, onClick }) {
    const letter = (feed.title || '?')[0].toUpperCase();
    let host = feed.xmlUrl;
    try { host = new URL(feed.xmlUrl).hostname.replace(/^www\./, ''); } catch (e) { /* 地址不合法就原样显示 */ }

    return (
        <button
            onClick={onClick}
            title={feed.xmlUrl}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            )}
        >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{letter}</span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{feed.title}</span>
                <span className="block truncate text-[0.68rem] text-muted-foreground">
                    {category ? `${category} · ${host}` : host}
                </span>
            </span>
        </button>
    );
}

function PanelLoading({ text, children }) {
    return (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin opacity-60" />
            <p className="text-sm">{text}</p>
            {children}
        </div>
    );
}

function PanelEmpty({ icon: Icon, title, children }) {
    return (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Icon className="size-8 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold">{title}</h3>
            {children}
        </div>
    );
}

function ArticleCard({ article, feedTitle, active, onClick }) {
    // 源没给日期时 pubDate 是 null —— 那就不显示时间，别编一个
    const relativeTime = article.pubDate ? getRelativeTime(article.pubDate) : null;
    const readingTime = getReadingTime(article.content || article.description || '');
    const sourceLabel = article.feedTitle || feedTitle;
    const desc = article.description ? article.description.substring(0, 120).trim() + '…' : '暂无描述';

    return (
        <button
            onClick={onClick}
            className={cn(
                'mb-1 block w-full rounded-lg border p-3 text-left transition-colors',
                active ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-accent/50'
            )}
        >
            <span className="text-[0.68rem] font-medium text-primary">{sourceLabel}</span>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold">{article.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
                {relativeTime && <span className="inline-flex items-center gap-1"><Clock size={10} />{relativeTime}</span>}
                <span className="inline-flex items-center gap-1"><BookOpen size={10} />{readingTime}</span>
                {article.author && <span>{article.author}</span>}
            </div>
        </button>
    );
}

function stripTags(html) {
    return (html || '').replace(/<[^>]*>/g, '');
}

function cjkRatio(text) {
    const cjkCount = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
    return text.length > 0 ? cjkCount / text.length : 0;
}

function ArticleReader({ article, fontSize, onFontSize, focusMode, onToggleFocus }) {
    const [safeContent, setSafeContent] = useState('');
    const [showTranslated, setShowTranslated] = useState(false);
    const [translatedHtml, setTranslatedHtml] = useState('');
    const [translating, setTranslating] = useState(false);
    const [shared, setShared] = useState(false);
    const [fullLoading, setFullLoading] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const [confirm, confirmDialog] = useConfirm();

    const contentRef = useRef(null);
    const bodyRef = useRef(null);
    const bttRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        import('dompurify').then(({ default: DOMPurify }) => {
            if (!cancelled) setSafeContent(DOMPurify.sanitize(article.content));
        }).catch(() => {
            if (!cancelled) setSafeContent(article.content);
        });
        return () => { cancelled = true; };
    }, [article]);

    // 阅读进度 + 回顶按钮显隐
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        function onScroll() {
            const scrollTop = el.scrollTop;
            const scrollHeight = el.scrollHeight - el.clientHeight;
            const pct = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;
            const bar = document.getElementById('reading-progress');
            if (bar) bar.style.width = pct + '%';
            if (bttRef.current) {
                const visible = scrollTop > 100;
                bttRef.current.style.opacity = visible ? '1' : '0';
                bttRef.current.style.pointerEvents = visible ? 'auto' : 'none';
            }
        }
        el.addEventListener('scroll', onScroll, { passive: true });
        el.scrollTop = 0;
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, [article, safeContent]);

    // pubDate 可能是 null(源没给日期)—— 直接 .toLocaleString() 会整页白屏
    const dateStr = article.pubDate ? article.pubDate.toLocaleString() : '';
    const relativeTime = article.pubDate ? getRelativeTime(article.pubDate) : null;
    const readingTime = getReadingTime(article.content || article.description || '');

    async function handleTranslate() {
        if (showTranslated) { setShowTranslated(false); return; }

        const currentText = stripTags(safeContent);
        const ratio = cjkRatio(currentText);
        if (ratio > 0.3) {
            const go = await confirm({
                title: '这篇文章可能已经是中文',
                description: `正文中约 ${Math.round(ratio * 100)}% 是中文字符，仍然要翻译吗？`,
                confirmText: '仍然翻译',
                destructive: false,
            });
            if (!go) return;
        }

        setTranslating(true);
        try {
            const html = await translateArticle(article.content);
            setTranslatedHtml(html);
            setShowTranslated(true);
        } catch (e) {
            toast.error('翻译失败: ' + e.message);
        } finally {
            setTranslating(false);
        }
    }

    async function handleShare() {
        const shareData = { title: article.title, text: article.title, url: article.link };
        if (navigator.share) {
            try { await navigator.share(shareData); return; } catch (e) { if (e.name === 'AbortError') return; }
        }
        try {
            await navigator.clipboard.writeText(article.link);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        } catch (e) {
            toast.error('无法分享: ' + e.message);
        }
    }

    async function handleFullArticle() {
        setFullLoading(true);
        try {
            const resp = await fetch('/api/article-content?url=' + encodeURIComponent(article.link));
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            if (data.success && data.content) {
                setShowTranslated(false);
                setTranslatedHtml('');
                setSafeContent(data.content);
            } else {
                toast.error('未能提取完整文章，请尝试打开原文阅读。');
            }
        } catch (e) {
            toast.error('加载失败: ' + e.message, { description: '请尝试直接打开原文。' });
        } finally {
            setFullLoading(false);
        }
    }

    function onContentClick(e) {
        const img = e.target.closest('.post-prose img');
        if (img) setLightbox({ src: img.src, alt: img.alt });
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto" ref={contentRef}>
            {confirmDialog}
            <article className={cn('mx-auto w-full px-6 py-8 sm:px-10', focusMode ? 'max-w-[860px]' : 'max-w-[720px]')}>
                <header className="mb-8 border-b pb-6">
                    <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{article.title}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {relativeTime && <span className={PILL} title={dateStr}><Calendar size={13} />{relativeTime}</span>}
                        <span className={PILL}><Clock size={13} />{readingTime}</span>
                        {article.author && <span className={PILL}><User size={13} />{article.author}</span>}
                        <Button variant="outline" size="sm" className={PILL_BTN} nativeButton={false} render={<a href={article.link} target="_blank" rel="noopener noreferrer" />}>
                            <ExternalLink size={13} /> 原文
                        </Button>
                        <Button variant="outline" size="sm" className={PILL_BTN} title="通过服务器加载完整文章" onClick={handleFullArticle} disabled={fullLoading}>
                            {fullLoading ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />} 加载全文
                        </Button>
                        <Button variant="outline" size="sm" className={PILL_BTN} title="分享这篇文章" onClick={handleShare}>
                            {shared ? <Check size={13} className="text-primary" /> : <Share2 size={13} />} {shared ? '已复制' : '分享'}
                        </Button>
                        <Button variant="outline" size="sm" className={PILL_BTN} onClick={handleTranslate} disabled={translating}>
                            {translating ? <Loader2 size={13} className="animate-spin" /> : showTranslated ? <Undo2 size={13} /> : <Languages size={13} />}
                            {translating ? '翻译中' : showTranslated ? '显示原文' : '翻译'}
                        </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ToggleGroup variant="outline" size="sm" spacing={0} value={[fontSize]} onValueChange={(v) => v.length && onFontSize(v[0])}>
                            <ToggleGroupItem value="sm" className="text-xs">A</ToggleGroupItem>
                            <ToggleGroupItem value="md" className="text-sm">A</ToggleGroupItem>
                            <ToggleGroupItem value="lg" className="text-base">A</ToggleGroupItem>
                        </ToggleGroup>
                        <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" onClick={onToggleFocus}>
                            <ScanEye size={14} />{focusMode ? '退出专注' : '专注模式'}
                        </Button>
                    </div>
                </header>

                <div
                    className="post-prose"
                    style={FONT_SIZE_STYLES[fontSize]}
                    ref={bodyRef}
                    onClick={onContentClick}
                    dangerouslySetInnerHTML={{ __html: showTranslated ? translatedHtml : safeContent }}
                />

                <p className="mt-10 text-center text-xs text-muted-foreground">— 完 —</p>
            </article>

            <button
                ref={bttRef}
                title="回到顶部"
                aria-label="回到顶部"
                onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{ opacity: 0, pointerEvents: 'none' }}
                className="fixed bottom-6 right-6 z-20 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity"
            >
                <ChevronUp size={20} />
            </button>

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
        </div>
    );
}

function AiSettingsModal({ open, onClose }) {
    const [form, setForm] = useState(DEFAULT_AI_SETTINGS);
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState('');
    const [testing, setTesting] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            const s = loadAISettings();
            setForm({ ...DEFAULT_AI_SETTINGS, ...s });
            setTestStatus('');
            setSaved(false);
        }
    }, [open]);

    const provider = AI_PROVIDERS[form.provider] || AI_PROVIDERS.openai;

    function pickProvider(key) {
        const p = AI_PROVIDERS[key];
        setForm((f) => ({
            ...f,
            provider: key,
            baseUrl: key !== 'custom' ? p.baseUrl : f.baseUrl,
            model: f.model && p.models.includes(f.model) ? f.model : (p.models[0] || ''),
        }));
    }

    function save() {
        saveAISettingsToStorage(form);
        setSaved(true);
        setTimeout(() => onClose(), 400);
    }

    async function test() {
        setTesting(true);
        setTestStatus('');
        try {
            await testAIConnection({ baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model });
            setTestStatus('✅ 连接成功');
        } catch (e) {
            setTestStatus('❌ ' + e.message);
        } finally {
            setTesting(false);
        }
    }

    const presets = [
        { label: '默认', prompt: '你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。' },
        { label: '学术', prompt: '你是一名学术翻译专家，请将以下内容翻译成简体中文，保持学术严谨性，专业术语准确，格式规范。' },
        { label: '口语化', prompt: '你是一个口语化翻译助手，请将以下内容翻译成自然流畅的中文口语表达，接地气、不生硬。' },
        { label: '技术', prompt: '你是一名技术文档翻译工程师，请将以下内容翻译成简体中文，保持技术术语一致性，代码和命令不翻译。' },
    ];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI 翻译设置</DialogTitle>
                    <DialogDescription>凭据仅保存在本地浏览器</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                        <button
                            key={key}
                            onClick={() => pickProvider(key)}
                            className={cn(
                                'flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
                                key === 'custom' && 'col-span-2',
                                form.provider === key ? 'border-primary/50 bg-primary/5' : 'hover:bg-accent/50'
                            )}
                        >
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.65rem] font-bold">
                                {key === 'custom' ? <Settings size={12} /> : p.name[0]}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-semibold">{p.name}</span>
                                <span className="block truncate text-[0.65rem] text-muted-foreground">{p.help}</span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Base URL</label>
                        <Input
                            placeholder="https://api.openai.com/v1"
                            autoComplete="off"
                            value={form.baseUrl}
                            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium">
                            API Key
                            <Badge variant="outline" className="gap-1 text-[0.6rem] font-normal"><ShieldCheck size={10} /> 本地存储</Badge>
                        </label>
                        <div className="relative">
                            <Input
                                type={showKey ? 'text' : 'password'}
                                placeholder="sk-..."
                                autoComplete="off"
                                value={form.apiKey}
                                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                                className="pr-9"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey((v) => !v)}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </div>
                        {provider.apiKeyUrl && (
                            <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={provider.apiKeyUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={11} /> 获取 Key
                            </a>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">模型</label>
                        <Input
                            list="model-presets"
                            placeholder="输入或选择模型"
                            autoComplete="off"
                            value={form.model}
                            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                        />
                        <datalist id="model-presets">
                            {provider.models.map((m) => <option key={m} value={m} />)}
                        </datalist>
                        <div className="flex flex-wrap gap-1.5">
                            {provider.models.map((m) => (
                                <Button key={m} type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, model: m }))} className="h-auto rounded-full px-2 py-0.5 text-[0.65rem] font-normal">
                                    {m}
                                </Button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{provider.help}</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center justify-between text-xs font-medium">
                            系统提示词
                            <span className="text-muted-foreground">{form.systemPrompt.length}</span>
                        </label>
                        <Textarea
                            rows={3}
                            maxLength={2000}
                            placeholder="你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。"
                            value={form.systemPrompt}
                            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {presets.map((p) => (
                                <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, systemPrompt: p.prompt }))} className="h-auto rounded-full px-2 py-0.5 text-[0.65rem] font-normal">
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={test} disabled={testing}>
                        <Zap size={14} /> {testing ? '测试中…' : '测试连接'}
                        {testStatus && <span className="text-xs">{testStatus}</span>}
                    </Button>
                    <Button onClick={save}>
                        <Check size={14} /> {saved ? '已保存' : '保存配置'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
