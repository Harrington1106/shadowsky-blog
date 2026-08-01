'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Copy, Check, ExternalLink, Link2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { fetchBookmarks } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { cardSurface, cn } from '@/lib/utils';
import { localFavicon } from '@/lib/iconMirror';

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

function subName(key, parentCat, categories) {
    const c = categories[parentCat];
    if (c && c.children) {
        const found = c.children.find((ch) => ch.id === key);
        if (found) return found.name;
    }
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

export default function BookmarksPage() {
    const [categories, setCategories] = useState({});
    const [bookmarks, setBookmarks] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState(null);

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

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return bookmarks.filter((b) => {
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
    }, [bookmarks, search, activeCat, categories]);

    const catCounts = useMemo(() => {
        const counts = {};
        bookmarks.forEach((b) => {
            const k = b.category || 'others';
            counts[k] = (counts[k] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => {
            const oa = (categories[a[0]] && categories[a[0]].order) || 99;
            const ob = (categories[b[0]] && categories[b[0]].order) || 99;
            return oa - ob;
        });
    }, [bookmarks, categories]);

    const catCount = useMemo(() => {
        const s = new Set(bookmarks.map((b) => b.category || 'others'));
        return s.size;
    }, [bookmarks]);

    const groups = useMemo(() => {
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
            return oa - ob;
        });
        return entries;
    }, [filtered, categories]);

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                <div className="sticky top-14 z-30 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                            <span>共 <strong className="text-foreground">{bookmarks.length}</strong> 个收藏</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span><strong className="text-foreground">{catCount}</strong> 个分类</span>
                        </div>
                        <div className="relative min-w-0 flex-1 sm:min-w-40 sm:max-w-72">
                            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="搜索收藏..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
                        <div className="flex w-full min-w-0 flex-wrap gap-1.5 sm:w-auto sm:flex-1">
                            <Badge
                                variant={!activeCat ? 'default' : 'outline'}
                                className="h-6 cursor-pointer px-2.5 sm:h-5 sm:px-2"
                                render={<button type="button" onClick={() => setActiveCat(null)} />}
                            >
                                全部 <span className="opacity-60">{bookmarks.length}</span>
                            </Badge>
                            {catCounts.map(([key, n]) => (
                                <Badge
                                    key={key}
                                    variant={activeCat === key ? 'default' : 'outline'}
                                    className="h-6 cursor-pointer px-2.5 sm:h-5 sm:px-2"
                                    render={<button type="button" onClick={() => setActiveCat((v) => (v === key ? null : key))} />}
                                >
                                    {catName(key, categories)} <span className="opacity-60">{n}</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {!loaded && <BookmarkSkeleton />}
                {loaded && error && <ErrorState msg={error} />}
                {loaded && !error && filtered.length === 0 && <EmptyState />}
                {loaded && !error && filtered.length > 0 && (
                    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                        {groups.map(([catKey, data]) => (
                            <CategorySection key={catKey} catKey={catKey} data={data} categories={categories} />
                        ))}
                    </div>
                )}
            </main>

            <Footer pageId="bookmarks" />
            <BackToTop />
        </>
    );
}

function BookmarkSkeleton() {
    return (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {Array.from({ length: 8 }, (_, i) => (
                <Card key={i} className="mb-4 gap-2 break-inside-avoid p-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-2/5" />
                </Card>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <Link2 className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">没有匹配的收藏</h3>
            <p className="text-sm">换个关键词试试</p>
        </div>
    );
}

function ErrorState({ msg }) {
    return (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <AlertCircle className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">加载失败</h3>
            <p className="text-sm">{msg || '请稍后重试'}</p>
            <Button size="sm" onClick={() => window.location.reload()}>刷新</Button>
        </div>
    );
}

function CategorySection({ catKey, data, categories }) {
    const subKeys = Object.keys(data.subcategories).sort((a, b) => {
        if (a === '_none') return 1;
        if (b === '_none') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="break-inside-avoid">
            <div className="mb-3 flex items-center gap-2.5 pt-1">
                <div className="h-5 w-0.5 rounded-full bg-primary" />
                <h2 className="text-sm font-bold">{catName(catKey, categories)}</h2>
                <span className="text-xs text-muted-foreground">{data.bookmarks.length}个</span>
            </div>
            {subKeys.map((subKey) => (
                <div key={subKey}>
                    {subKey !== '_none' && (
                        <div className="mb-2 pl-1 text-xs font-semibold text-primary">{subName(subKey, catKey, categories)}</div>
                    )}
                    {data.subcategories[subKey].map((b) => <BookmarkCard key={b.id} b={b} />)}
                </div>
            ))}
        </div>
    );
}

function BookmarkCard({ b }) {
    const [faviconFailed, setFaviconFailed] = useState(false);
    const [copied, setCopied] = useState(false);

    function copyLink(e) {
        e.stopPropagation();
        navigator.clipboard?.writeText(b.url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    }

    function openLink(e) {
        e.stopPropagation();
        window.open(b.url, '_blank', 'noopener,noreferrer');
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLink(e);
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={b.title || domain(b.url)}
            className={cn(cardSurface, 'group mb-3 cursor-pointer break-inside-avoid p-4 transition-[box-shadow,color] hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none')}
            onClick={openLink}
            onKeyDown={onKeyDown}
        >
            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {faviconFailed || !favicon(b.url) ? (
                        <span className="text-[0.7rem] font-semibold text-muted-foreground">{initial(b.url)}</span>
                    ) : (
                        <img src={favicon(b.url)} alt="" loading="lazy" width={18} height={18} className="size-4.5 object-contain" onError={() => setFaviconFailed(true)} />
                    )}
                </div>
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{domain(b.url)}</span>
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" title="复制链接" onClick={copyLink}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="打开" render={<a href={b.url} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                        <ExternalLink size={13} />
                    </Button>
                </div>
            </div>
            <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold">{b.title || domain(b.url)}</h3>
            {b.description && <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">{b.description}</p>}
            {(b.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {b.tags.map((t) => <Badge key={t} variant="secondary" className="text-[0.65rem]">#{t}</Badge>)}
                </div>
            )}
        </div>
    );
}
