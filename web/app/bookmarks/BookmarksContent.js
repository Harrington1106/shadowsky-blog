'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Search, Copy, Check, ExternalLink, Link2, AlertCircle, X, LayoutGrid, List,
    FolderOpen, Sparkles, ArrowUpDown, Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { fetchBookmarks } from '@/lib/api';
import { cardSurface, cardInteractive, chipInteractive, cn } from '@/lib/utils';
import { localFavicon } from '@/lib/iconMirror';

/** 加进来多少天内算「新」 */
const NEW_DAYS = 30;

const SORTS = [
    { value: 'category', label: '按分类' },
    { value: 'recent', label: '最近添加' },
    { value: 'name', label: '按名称' },
];

const CAT_FALLBACKS = {
    dev_tech: '开发与技术',
    ai_tools: 'AI与工具类',
    resources: '资源下载与搜索',
    life_tools: '生活实用工具',
    my_favorites: '我的收藏',
    entertainment: '休闲娱乐',
    literature_reading: '文献与阅读',
    education: '学习与教育',
    blogs_tutorials: '博客与教程',
    system_resources: '系统与资源',
    video_editing: '视频与剪辑',
    personal: '个人兴趣',
    others: '其他',
    kfxm: '开发项目',
    gjx: '工具箱',
    yfw: '云服务',
    zy: '资源',
    gr: '个人',
    ai: 'AI工具',
    bkyw: '博客运维',
    azgj: '资源站',
    r18: 'R18',
};

/**
 * 子分类名的最后兜底。
 * 正常情况下名字来自 API 的 categories[父分类].subcategories，
 * 这里只覆盖不属于任何分类的伪子分类,以及库里万一缺失时的常见项。
 */
const SUB_FALLBACKS = {
    aitool: 'AI工具',
    gjgj: '工具集合',
    gjzy: '工具资源',
    dns: 'DNS',
    ip: 'IP工具',
    tc: '图床',
    ym: '域名',
    wygj: '网页工具',
    zmgj: '桌面工具',
    cj: '创作',
    yxxg: '游戏相关',
    kyck: '开源仓库',
    qdbs: '前端部署',
    gngw: '云服务商',
    wpzy: '网盘资源',
    uncategorized: '未分类',
    top: '置顶常用',
};

function catName(key, categories) {
    const c = categories[key];
    if (c && c.name) return c.name;
    return CAT_FALLBACKS[key] || key;
}

/**
 * 取子分类的显示名。
 * ⚠ API 返回的是 categories[父分类].subcategories —— 一个 {slug: 中文名} 的对象。
 *   这里原本读的是 v1 时代的 children 数组([{id,name}]),字段名对不上,
 *   于是永远走到兜底、页面上直接显示 slug(fwq / vibe / syzn …)。
 * 兜底里再找不到就退回 slug,至少不会变成 undefined。
 */
function subName(key, parentCat, categories) {
    const c = categories[parentCat];
    const name = c && c.subcategories && c.subcategories[key];
    if (name) return name;
    return SUB_FALLBACKS[key] || key;
}

function domain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch (e) { return url; }
}

// 原来这里返回 www.google.com/s2/favicons —— 大陆完全不通,56 条收藏就是 55 个
// 必然失败的请求。改成查本地镜像(scripts/mirror-icons.mjs),没有就返回空,
// 由调用方显示域名首字母块,不再有任何跨境请求。
function favicon(url) {
    return localFavicon(url) || '';
}

/** 没有镜像图标时的兜底:域名首字母 */
function initial(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return host.charAt(0).toUpperCase();
    } catch { return '#'; }
}

/** 是不是最近 NEW_DAYS 天内加进来的 */
function isFresh(addedAt) {
    if (!addedAt) return false;
    const t = new Date(addedAt).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t < NEW_DAYS * 864e5;
}

export default function BookmarksPage() {
    const [categories, setCategories] = useState({});
    const [bookmarks, setBookmarks] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState(null);
    const [sort, setSort] = useState('category');
    const [viewMode, setViewMode] = useState('grid');
    const searchRef = useRef(null);

    useEffect(() => {
        fetchBookmarks()
            .then(({ categories: cats, bookmarks: data }) => {
                setCategories(cats);
                const sorted = [...data].sort((a, b) => {
                    const ca = catName(a.category, cats);
                    const cb = catName(b.category, cats);
                    if (ca !== cb) return ca.localeCompare(cb);
                    return (a.title || '').localeCompare(b.title || '');
                });
                setBookmarks(sorted);
                setLoaded(true);
            })
            .catch((e) => {
                setError(e.message || '网络错误');
                setLoaded(true);
            });
    }, []);

    // 「/」聚焦搜索框（正在别的输入框里打字时不抢）
    useEffect(() => {
        function onKey(e) {
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            e.preventDefault();
            searchRef.current?.focus();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        const list = bookmarks.filter((b) => {
            if (activeCat && b.category !== activeCat) return false;
            if (q) {
                const title = (b.title || '').toLowerCase();
                const desc = (b.description || '').toLowerCase();
                const url = (b.url || '').toLowerCase();
                const cat = catName(b.category, categories).toLowerCase();
                const sub = subName(b.subcategory, b.category, categories).toLowerCase();
                const txt = `${title} ${desc} ${url} ${cat} ${sub}`;
                if (!txt.includes(q)) return false;
            }
            return true;
        });
        if (sort === 'recent') return [...list].sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
        if (sort === 'name') return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));
        return list;
    }, [bookmarks, search, activeCat, categories, sort]);

    const catCounts = useMemo(() => {
        const counts = {};
        bookmarks.forEach((b) => {
            const k = b.category || 'others';
            counts[k] = (counts[k] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => {
            const oa = (categories[a[0]] && categories[a[0]].order) || 99;
            const ob = (categories[b[0]] && categories[b[0]].order) || 99;
            if (oa !== ob) return oa - ob;
            return catName(a[0], categories).localeCompare(catName(b[0], categories), 'zh-CN');
        });
    }, [bookmarks, categories]);

    const freshCount = useMemo(() => bookmarks.filter((b) => isFresh(b.addedAt)).length, [bookmarks]);

    // 「按分类」时才分组；换成时间/名称排序后分组会把排序结果切碎，直接平铺
    const groups = useMemo(() => {
        if (sort !== 'category') return null;
        const g = {};
        filtered.forEach((b) => {
            const key = b.category || 'others';
            if (!g[key]) g[key] = { bookmarks: [], subcategories: {} };
            g[key].bookmarks.push(b);
            const sub = b.subcategory || '_none';
            if (!g[key].subcategories[sub]) g[key].subcategories[sub] = [];
            g[key].subcategories[sub].push(b);
        });
        const entries = Object.entries(g);
        entries.sort((a, b) => {
            const oa = (categories[a[0]] && categories[a[0]].order) || 99;
            const ob = (categories[b[0]] && categories[b[0]].order) || 99;
            if (oa !== ob) return oa - ob;
            return catName(a[0], categories).localeCompare(catName(b[0], categories), 'zh-CN');
        });
        return entries;
    }, [filtered, categories, sort]);

    const filtering = !!(search.trim() || activeCat);

    function resetFilters() {
        setSearch('');
        setActiveCat(null);
    }

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <header className="mb-6">
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Bookmarks</div>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight">网页收藏</h1>
                    <p className="mt-1 text-sm text-muted-foreground">值得反复回看的站点、工具与文章</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <StatChip icon={Link2} value={filtering ? filtered.length : bookmarks.length} label={filtering ? '条结果' : '个收藏'} />
                        <StatChip icon={FolderOpen} value={catCounts.length} label="个分类" />
                        {freshCount > 0 && <StatChip icon={Sparkles} value={freshCount} label={`个近${NEW_DAYS}天新增`} />}
                    </div>
                </header>

                <div className="sticky top-[calc(3.5rem+1px)] z-30 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:max-w-80">
                            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                placeholder="搜索标题、描述、域名…（按 / 聚焦）"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 pr-8 pl-8 text-sm"
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label="清空搜索"
                                    onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                                    className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
                            <Select
                                items={SORTS}
                                value={sort}
                                onValueChange={(v) => v && setSort(v)}
                            >
                                <SelectTrigger size="sm" aria-label="排序方式" className="gap-1.5">
                                    <ArrowUpDown className="size-3.5 text-muted-foreground" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <ToggleGroup
                                variant="outline"
                                spacing={0}
                                value={[viewMode]}
                                onValueChange={(vals) => vals.length && setViewMode(vals[0])}
                            >
                                <ToggleGroupItem value="grid" aria-label="卡片视图" title="卡片视图"><LayoutGrid size={16} /></ToggleGroupItem>
                                <ToggleGroupItem value="list" aria-label="紧凑列表" title="紧凑列表"><List size={16} /></ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>

                    {/* 分类切换：窄屏放这里横向滚动，宽屏交给左侧边栏 */}
                    {catCounts.length > 0 && (
                        <div className="relative mt-2.5 lg:hidden">
                            {/* ⚠ py/-my 不能删：横向滚动区在纵向也是裁剪区（CSS 规定一个轴非 visible 时，
                                另一个轴的 visible 会被算成 auto），胶囊 hover 上移的那 1px 和投影会被切掉。
                                内边距留出余量、负外边距再抵消回去，视觉间距不变。 */}
                            <div className="-my-1 flex gap-1.5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <Badge
                                    variant={!activeCat ? 'default' : 'outline'}
                                    className={cn('h-6 px-2.5', chipInteractive(!activeCat))}
                                    render={<button type="button" onClick={() => setActiveCat(null)} />}
                                >
                                    全部 <span className="opacity-60">{bookmarks.length}</span>
                                </Badge>
                                {catCounts.map(([key, n]) => (
                                    <Badge
                                        key={key}
                                        variant={activeCat === key ? 'default' : 'outline'}
                                        className={cn('h-6 px-2.5', chipInteractive(activeCat === key))}
                                        render={<button type="button" onClick={() => setActiveCat((v) => (v === key ? null : key))} />}
                                    >
                                        {catName(key, categories)} <span className="opacity-60">{n}</span>
                                    </Badge>
                                ))}
                            </div>
                            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent" />
                        </div>
                    )}
                </div>

                <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
                    <CategorySidebar
                        catCounts={catCounts}
                        categories={categories}
                        total={bookmarks.length}
                        activeCat={activeCat}
                        onPick={setActiveCat}
                        loaded={loaded}
                    />

                    <div className="min-w-0">
                        {!loaded && <BookmarkSkeleton />}
                        {loaded && error && <ErrorState msg={error} />}
                        {loaded && !error && filtered.length === 0 && (
                            <EmptyState onReset={filtering ? resetFilters : null} />
                        )}
                        {loaded && !error && filtered.length > 0 && groups && (
                            groups.map(([catKey, data]) => (
                                <CategorySection
                                    key={catKey}
                                    catKey={catKey}
                                    data={data}
                                    categories={categories}
                                    viewMode={viewMode}
                                />
                            ))
                        )}
                        {loaded && !error && filtered.length > 0 && !groups && (
                            <BookmarkList items={filtered} viewMode={viewMode} categories={categories} showCategory />
                        )}
                    </div>
                </div>
            </main>

            <Footer pageId="bookmarks" />
            <BackToTop />
        </>
    );
}

function StatChip({ icon: Icon, value, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Icon size={12} className="opacity-60" />
            <strong className="font-semibold text-foreground tabular-nums">{value}</strong>
            {label}
        </span>
    );
}

/**
 * 宽屏左侧的分类导航。
 * 吸顶位置要让开上面那条同样吸顶的工具条（56px 导航 + 1px 边框 + 57px 工具条 ≈ 8rem）。
 */
function CategorySidebar({ catCounts, categories, total, activeCat, onPick, loaded }) {
    return (
        <aside className="hidden lg:block">
            <nav className="sticky top-[calc(3.5rem+1px+4.5rem)] max-h-[calc(100dvh-10rem)] space-y-0.5 overflow-y-auto pr-1 pb-4">
                <SidebarItem active={!activeCat} count={total} onClick={() => onPick(null)}>
                    全部收藏
                </SidebarItem>
                {!loaded && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                {catCounts.map(([key, n]) => (
                    <SidebarItem
                        key={key}
                        active={activeCat === key}
                        count={n}
                        onClick={() => onPick(activeCat === key ? null : key)}
                    >
                        {catName(key, categories)}
                    </SidebarItem>
                ))}
            </nav>
        </aside>
    );
}

function SidebarItem({ active, count, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'true' : undefined}
            className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
        >
            <span className={cn('h-4 w-0.5 shrink-0 rounded-full transition-colors', active ? 'bg-primary' : 'bg-transparent')} />
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>
        </button>
    );
}

function BookmarkSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className={cn(cardSurface, 'space-y-2.5 p-4')}>
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ onReset }) {
    return (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
            <Link2 className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">没有匹配的收藏</h3>
            <p className="text-sm">换个关键词，或者清掉筛选看看全部</p>
            {onReset && <Button size="sm" variant="outline" onClick={onReset}>清除筛选</Button>}
        </div>
    );
}

function ErrorState({ msg }) {
    return (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
            <AlertCircle className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">加载失败</h3>
            <p className="text-sm">{msg || '请稍后重试'}</p>
            <Button size="sm" onClick={() => window.location.reload()}>刷新</Button>
        </div>
    );
}

function CategorySection({ catKey, data, categories, viewMode }) {
    // 有名字的子分类排在前，「没有子分类」那堆垫底
    const subKeys = Object.keys(data.subcategories).sort((a, b) => {
        if (a === '_none') return 1;
        if (b === '_none') return -1;
        return subName(a, catKey, categories).localeCompare(subName(b, catKey, categories), 'zh-CN');
    });

    return (
        <section className="mb-9">
            <h2 className="mb-4 flex items-center gap-2.5">
                <span className="h-4 w-1 rounded-full bg-primary" />
                <span className="text-base font-bold">{catName(catKey, categories)}</span>
                <span className="h-px flex-1 bg-border" />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{data.bookmarks.length} 个</span>
            </h2>
            {subKeys.map((subKey) => (
                <div key={subKey} className="mb-5 last:mb-0">
                    {subKey !== '_none' && (
                        <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <span className="size-1 rounded-full bg-muted-foreground/50" />
                            {subName(subKey, catKey, categories)}
                        </h3>
                    )}
                    <BookmarkList items={data.subcategories[subKey]} viewMode={viewMode} categories={categories} />
                </div>
            ))}
        </section>
    );
}

function BookmarkList({ items, viewMode, categories, showCategory }) {
    if (viewMode === 'list') {
        return (
            <div className="space-y-1.5">
                {items.map((b) => <BookmarkRow key={b.id} b={b} categories={categories} showCategory={showCategory} />)}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => <BookmarkCard key={b.id} b={b} categories={categories} showCategory={showCategory} />)}
        </div>
    );
}

/** 站点图标：有本地镜像就用镜像，否则退回域名首字母块（零跨境请求） */
function SiteIcon({ url, size = 'md' }) {
    const [failed, setFailed] = useState(false);
    const src = favicon(url);
    const box = size === 'sm' ? 'size-7' : 'size-8';
    const img = size === 'sm' ? 'size-4' : 'size-4.5';

    return (
        <span className={cn(box, 'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5')}>
            {failed || !src ? (
                <span className="text-[0.7rem] font-semibold text-muted-foreground">{initial(url)}</span>
            ) : (
                <img
                    src={src}
                    alt=""
                    loading="lazy"
                    width={18}
                    height={18}
                    className={cn(img, 'object-contain')}
                    onError={() => setFailed(true)}
                />
            )}
        </span>
    );
}

/** 复制链接按钮 —— 卡片和列表行共用 */
function CopyButton({ url, className }) {
    const [copied, setCopied] = useState(false);
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? '已复制' : '复制链接'}
            title={copied ? '已复制' : '复制链接'}
            className={className}
            onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                }).catch(() => {});
            }}
        >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </Button>
    );
}

/**
 * 整张卡都可点。
 * ⚠ 不能用 <a> 包整卡 —— 里面还有「复制 / 新窗口打开」两个操作，<a> 套 <a> 是非法嵌套。
 *   所以外层是 role="button" 的 div，自己补键盘响应；标题另给一个真链接便于新标签页打开。
 */
function openHandlers(url) {
    function open(e) {
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(e);
        }
    }
    return { open, onKeyDown };
}

/** 操作区：宽屏 hover 才浮现，触屏常驻（没有 hover 就永远看不到） */
const ACTIONS_CLS = 'flex shrink-0 gap-0.5 transition-opacity max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100';

function BookmarkCard({ b, categories, showCategory }) {
    const { open, onKeyDown } = openHandlers(b.url);
    const fresh = isFresh(b.addedAt);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={b.title || domain(b.url)}
            className={cn(cardSurface, cardInteractive, 'group flex cursor-pointer flex-col gap-2.5 p-4')}
            onClick={open}
            onKeyDown={onKeyDown}
        >
            <div className="flex items-center gap-2.5">
                <SiteIcon url={b.url} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{domain(b.url)}</span>
                <div className={ACTIONS_CLS} onClick={(e) => e.stopPropagation()}>
                    <CopyButton url={b.url} />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="在新标签页打开"
                        title="在新标签页打开"
                        render={<a href={b.url} target="_blank" rel="noopener noreferrer" />}
                        nativeButton={false}
                    >
                        <ExternalLink size={13} />
                    </Button>
                </div>
            </div>

            <h3 className="line-clamp-2 text-sm leading-snug font-semibold underline-offset-2 group-hover:underline">
                {b.title || domain(b.url)}
                {fresh && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 align-middle text-[0.6rem]">新</Badge>}
            </h3>

            {b.description && <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">{b.description}</p>}

            {(showCategory || (b.tags || []).length > 0) && (
                <div className="flex flex-wrap items-center gap-1">
                    {showCategory && b.category && (
                        <Badge variant="outline" className="gap-1 px-1.5 text-[0.65rem] text-muted-foreground">
                            <FolderOpen size={9} />{catName(b.category, categories)}
                        </Badge>
                    )}
                    {(b.tags || []).map((t) => (
                        <Badge key={t} variant="secondary" className="px-1.5 text-[0.65rem]">#{t}</Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

function BookmarkRow({ b, categories, showCategory }) {
    const { open, onKeyDown } = openHandlers(b.url);
    const fresh = isFresh(b.addedAt);

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={b.title || domain(b.url)}
            className={cn(
                cardSurface,
                'group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/40 hover:ring-primary/40'
            )}
            onClick={open}
            onKeyDown={onKeyDown}
        >
            <SiteIcon url={b.url} size="sm" />
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="shrink-0 max-w-[45%] truncate text-sm font-semibold underline-offset-2 group-hover:underline">
                    {b.title || domain(b.url)}
                </span>
                {fresh && <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[0.6rem]">新</Badge>}
                {b.description && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{b.description}</span>}
            </div>
            {showCategory && b.category && (
                <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{catName(b.category, categories)}</span>
            )}
            <span className="hidden shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground sm:inline-flex">
                <Globe size={10} className="opacity-50" />{domain(b.url)}
            </span>
            <div className={ACTIONS_CLS} onClick={(e) => e.stopPropagation()}>
                <CopyButton url={b.url} />
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="在新标签页打开"
                    title="在新标签页打开"
                    render={<a href={b.url} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                >
                    <ExternalLink size={13} />
                </Button>
            </div>
        </div>
    );
}
