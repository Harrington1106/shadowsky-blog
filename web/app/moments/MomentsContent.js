'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search, Shuffle, LayoutGrid, Rows3, List, X, Share2, ChevronLeft, ChevronRight,
    MapPin, Check, ImageOff, AlertCircle, Images, CalendarDays, Quote, Maximize2,
    ExternalLink, Hash, Camera,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import StatChip from '@/components/StatChip';
import { fetchMoments } from '@/lib/api';
import { cardSurface, cardInteractive, chipInteractive, cn } from '@/lib/utils';

/** 图片没测出真实比例前的占位比例（宽/高），竖构图偏多，取 4:5 */
const DEFAULT_RATIO = 4 / 5;

const VIEWS = [
    { id: 'feed', label: '瀑布', icon: Rows3 },
    { id: 'wall', label: '照片墙', icon: LayoutGrid },
    { id: 'timeline', label: '时间线', icon: List },
];

function cdn(u) {
    if (!u) return u;
    return u.replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh')
        .replace('/main/', '@main/').replace('/master/', '@master/');
}

// 位置链接原本指向 Google 地图 —— 大陆点开是空白页。站点读者基本在大陆,
// 换成高德搜索,点得开才有意义。
function mapUrl(location) {
    return `https://www.amap.com/search?query=${encodeURIComponent(location)}`;
}

function safeDate(s) {
    if (!s) return new Date();
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(String(s).replace(/-/g, '/'));
    return isNaN(d2.getTime()) ? new Date() : d2;
}

function fmtDate(s, opts) {
    return safeDate(s).toLocaleDateString('zh-CN', opts);
}

/**
 * 瀑布流的列数（跟 Tailwind 断点对齐）。
 * ⚠ 不能用 CSS `columns` 做瀑布 —— 那是列优先排版，第 1～n 条会全部落在第一列，
 *   而这页是按时间倒序的流，读者期待「最新的在左上、横着往右读」。
 *   所以列数在 JS 里算，条目自己往最矮的那列填（见 estimateHeight）。
 */
function useColumnCount() {
    const [cols, setCols] = useState(3);
    useEffect(() => {
        function measure() {
            const w = window.innerWidth;
            setCols(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1);
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);
    return cols;
}

export default function MomentsPage() {
    return (
        <Suspense fallback={null}>
            <MomentsPageInner />
        </Suspense>
    );
}

function MomentsPageInner() {
    const params = useSearchParams();
    const searchRef = useRef(null);

    const [moments, setMoments] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [viewMode, setViewMode] = useState('feed');
    const [lbIndex, setLbIndex] = useState(-1);
    // 每张图测出来的真实宽高比，key 是 moment.id。
    // 有了它瀑布流的占位框一次到位，图片加载完不会再把下面的卡片顶下去。
    const [ratios, setRatios] = useState({});

    const rememberRatio = useCallback((id, ratio) => {
        setRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
    }, []);

    // ── 初次加载数据 + 读取 URL 深链参数 ──
    useEffect(() => {
        fetchMoments()
            .then((data) => {
                setMoments(data);
                setLoaded(true);
                const v = params.get('view');
                if (VIEWS.some((x) => x.id === v)) setViewMode(v);
                if (params.get('tag')) setActiveTag(params.get('tag'));
                if (params.get('q')) setSearch(params.get('q'));
            })
            .catch(() => {
                setError('网络错误');
                setLoaded(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return moments.filter((m) => {
            if (q) {
                const ok = (m.content || '').toLowerCase().includes(q)
                    || (m.location || '').toLowerCase().includes(q)
                    || (m.tags || []).some((t) => t.toLowerCase().includes(q));
                if (!ok) return false;
            }
            if (activeTag && !(m.tags || []).includes(activeTag)) return false;
            return true;
        });
    }, [moments, search, activeTag]);

    const tagCounts = useMemo(() => {
        const counts = {};
        moments.forEach((m) => (m.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [moments]);

    const stats = useMemo(() => {
        const days = new Set();
        const locs = new Set();
        let photos = 0;
        filtered.forEach((m) => {
            days.add(safeDate(m.date).toDateString());
            if (m.location) locs.add(m.location);
            if (m.image) photos += 1;
        });
        return { count: filtered.length, photos, days: days.size, locs: locs.size };
    }, [filtered]);

    // 打开深链指定的 id（数据加载完成后）
    useEffect(() => {
        if (!loaded || !moments.length) return;
        const id = params.get('id');
        if (!id) return;
        const idx = filtered.findIndex((m) => m.id === id);
        if (idx !== -1) setLbIndex(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded]);

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

    function openLB(idx) {
        setLbIndex(idx);
        const m = filtered[idx];
        if (!m) return;
        const u = new URL(window.location.href);
        u.searchParams.set('id', m.id);
        window.history.pushState({}, '', u);
    }

    function closeLB() {
        setLbIndex(-1);
        const u = new URL(window.location.href);
        u.searchParams.delete('id');
        window.history.pushState({}, '', u);
    }

    function nextLB() {
        if (!filtered.length) return;
        openLB((lbIndex + 1) % filtered.length);
    }

    function prevLB() {
        if (!filtered.length) return;
        openLB((lbIndex - 1 + filtered.length) % filtered.length);
    }

    // 预加载下一张
    useEffect(() => {
        if (lbIndex < 0) return;
        const next = filtered[lbIndex + 1];
        if (next && next.image) {
            const p = new Image();
            p.src = cdn(next.image);
        }
    }, [lbIndex, filtered]);

    // 键盘导航
    useEffect(() => {
        if (lbIndex < 0) return;
        function onKey(e) {
            if (e.key === 'Escape') closeLB();
            if (e.key === 'ArrowRight') nextLB();
            if (e.key === 'ArrowLeft') prevLB();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lbIndex, filtered]);

    function pickRandom() {
        if (!filtered.length) return;
        openLB(Math.floor(Math.random() * filtered.length));
    }

    const filtering = !!(search.trim() || activeTag);
    const cardProps = { ratios, onRatio: rememberRatio, onOpen: openLB };

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <header className="mb-6">
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Moments</div>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight">片刻</h1>
                    <p className="mt-1 text-sm text-muted-foreground">随手拍下的照片与碎碎念</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <StatChip icon={Images} value={stats.count} label={filtering ? '条结果' : '条片刻'} />
                        <StatChip icon={Camera} value={stats.photos} label="张照片" />
                        <StatChip icon={CalendarDays} value={stats.days} label="个日子" />
                        <StatChip icon={MapPin} value={stats.locs} label="个地点" />
                    </div>
                </header>

                {/* 工具条固定在导航栏下方。两行：上行操作、下行标签横向滚动 ——
                    标签换行会让这条吸顶栏在筛选时忽高忽低，把下面的内容一起顶动。 */}
                <div className="sticky top-[calc(3.5rem+1px)] z-30 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:max-w-72">
                            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                placeholder="搜索照片、地点、标签…"
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
                            <Button variant="ghost" size="icon" aria-label="随机看一条" title="随机看一条" onClick={pickRandom} disabled={!filtered.length}>
                                <Shuffle size={16} />
                            </Button>
                            <ToggleGroup
                                variant="outline"
                                spacing={0}
                                value={[viewMode]}
                                onValueChange={(vals) => vals.length && setViewMode(vals[0])}
                            >
                                {VIEWS.map((v) => (
                                    <ToggleGroupItem key={v.id} value={v.id} aria-label={v.label} title={v.label}>
                                        <v.icon size={16} />
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                    </div>

                    {tagCounts.length > 0 && (
                        <div className="relative mt-2.5">
                            {/* ⚠ py/-my 不能删：横向滚动区在纵向也是裁剪区（CSS 规定一个轴非 visible 时，
                                另一个轴的 visible 会被算成 auto），胶囊 hover 上移的那 1px 和投影会被切掉。
                                内边距留出余量、负外边距再抵消回去，视觉间距不变。 */}
                            <div className="-my-1 flex gap-1.5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <Badge
                                    variant={!activeTag ? 'default' : 'outline'}
                                    className={cn('h-6 px-2.5', chipInteractive(!activeTag))}
                                    render={<button type="button" onClick={() => setActiveTag(null)} />}
                                >
                                    全部 <span className="opacity-60">{moments.length}</span>
                                </Badge>
                                {tagCounts.map(([t, n]) => (
                                    <Badge
                                        key={t}
                                        variant={activeTag === t ? 'default' : 'outline'}
                                        className={cn('h-6 px-2.5', chipInteractive(activeTag === t))}
                                        render={<button type="button" onClick={() => setActiveTag((v) => (v === t ? null : t))} />}
                                    >
                                        {t} <span className="opacity-60">{n}</span>
                                    </Badge>
                                ))}
                            </div>
                            {/* 右侧渐隐，提示还能横向滚 */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent" />
                        </div>
                    )}
                </div>

                {!loaded && <MomentSkeleton />}
                {loaded && error && <ErrorState msg={error} />}
                {loaded && !error && filtered.length === 0 && (
                    <EmptyState onReset={filtering ? () => { setSearch(''); setActiveTag(null); } : null} />
                )}
                {loaded && !error && filtered.length > 0 && viewMode === 'feed' && <FeedView items={filtered} {...cardProps} />}
                {loaded && !error && filtered.length > 0 && viewMode === 'wall' && <WallView items={filtered} {...cardProps} />}
                {loaded && !error && filtered.length > 0 && viewMode === 'timeline' && <TimelineView items={filtered} onOpen={openLB} />}
            </main>

            <Footer pageId="moments" />
            <BackToTop />

            <Lightbox
                items={filtered}
                index={lbIndex}
                onOpenChange={(open) => { if (!open) closeLB(); }}
                onJump={openLB}
                onNext={nextLB}
                onPrev={prevLB}
            />
        </>
    );
}

function MomentSkeleton() {
    const heights = [220, 150, 260, 180, 200, 240, 160, 210];
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {heights.map((h, i) => (
                <div key={i} className={cn(cardSurface, 'overflow-hidden')}>
                    <Skeleton className="w-full rounded-none" style={{ height: h }} />
                    <div className="space-y-2 p-3.5">
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-2/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ onReset }) {
    return (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
            <ImageOff className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">没有匹配的片刻</h3>
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

/**
 * 时间/地点这一行，卡片、时间线和灯箱共用。
 * 时间线里左边的日期栏已经写了日/时分、分组标题写了年月，所以那边传 showDate={false}。
 */
function MetaRow({ m, tone = 'muted', showDate = true }) {
    const muted = tone === 'muted';
    const d = safeDate(m.date);
    if (!showDate && !m.location) return null;
    return (
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', muted ? 'text-muted-foreground' : 'text-white/60')}>
            {showDate && (
                <time dateTime={d.toISOString()} className="tabular-nums">
                    {d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
            )}
            {m.location && (
                <a
                    href={mapUrl(m.location)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        'inline-flex items-center gap-1 underline-offset-2 transition-colors hover:underline',
                        muted ? 'hover:text-foreground' : 'hover:text-white'
                    )}
                >
                    <MapPin size={11} />{m.location}
                </a>
            )}
        </div>
    );
}

/** 瀑布流里的一张卡：图片（或纯文字）+ 正文 + 元信息 */
function MomentCard({ m, index, onOpen, ratios, onRatio, eager }) {
    const ratio = ratios[m.id] || DEFAULT_RATIO;
    const tags = m.tags || [];

    return (
        <article className={cn(cardSurface, cardInteractive, 'group overflow-hidden')}>
            {m.image ? (
                <button
                    type="button"
                    aria-label={m.content ? `查看照片：${m.content}` : '查看照片'}
                    onClick={() => onOpen(index)}
                    className="relative block w-full cursor-zoom-in overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    style={{ aspectRatio: ratio }}
                >
                    <img
                        src={cdn(m.image)}
                        alt={m.content || '片刻照片'}
                        loading={eager ? 'eager' : 'lazy'}
                        fetchPriority={eager ? 'high' : 'auto'}
                        decoding="async"
                        onLoad={(e) => {
                            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                            if (w && h) onRatio(m.id, w / h);
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
                    />
                    {/* 放大提示：只是 hover 时的辅助 affordance，触屏没有 hover 也不影响点开 */}
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Maximize2 className="size-5 text-white drop-shadow" />
                    </span>
                </button>
            ) : (
                <div className="relative bg-muted/40 px-4 pt-5 pb-1">
                    <Quote className="absolute top-3 left-3 size-4 text-muted-foreground/25" />
                    <p className="pl-5 text-sm leading-relaxed font-medium">{m.content}</p>
                </div>
            )}

            <div className="space-y-2.5 p-3.5">
                {m.image && m.content && <p className="text-sm leading-relaxed">{m.content}</p>}
                <MetaRow m={m} />
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                            <Badge key={t} variant="secondary" className="gap-0.5 px-1.5 text-[0.65rem]">
                                <Hash size={9} className="opacity-50" />{t}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

/**
 * 估一张卡有多高，单位是「一列的宽度」。
 * 只用来把卡片摊平到各列，不求准 —— 按 i % cols 轮流塞的话，
 * 一条长文案就能把某一列拉长半屏，右边几列早早见底。
 */
function estimateHeight(m, ratio) {
    const CHARS_PER_LINE = 22;   // 一列约 300px 宽、13px 中文字 ⇒ 每行 22 字上下
    const LINE = 0.07;           // 一行文字 ≈ 列宽的 7%
    let h = 0.28;                // 内边距 + 日期那一行
    if (m.image) h += 1 / (ratio || DEFAULT_RATIO);   // ratio 是宽/高，高度要取倒数
    h += Math.ceil((m.content || '').length / CHARS_PER_LINE) * LINE;
    if ((m.tags || []).length) h += 0.09;
    return h;
}

function FeedView({ items, onOpen, ratios, onRatio }) {
    const cols = useColumnCount();

    // 依次把每条塞进当前最矮的那列；高度相同时留在最左边，保住「横着读是倒序」
    const columns = useMemo(() => {
        const buckets = Array.from({ length: cols }, () => []);
        const heights = new Array(cols).fill(0);
        items.forEach((m, i) => {
            let target = 0;
            for (let c = 1; c < cols; c++) {
                if (heights[c] < heights[target] - 0.001) target = c;
            }
            buckets[target].push({ m, i });
            heights[target] += estimateHeight(m, ratios[m.id]) + 0.05;   // 0.05 是卡间距
        });
        return buckets;
    }, [items, cols, ratios]);

    return (
        <div className="flex items-start gap-4">
            {columns.map((col, ci) => (
                <div key={ci} className="flex min-w-0 flex-1 flex-col gap-4">
                    {col.map(({ m, i }) => (
                        <MomentCard
                            key={m.id}
                            m={m}
                            index={i}
                            onOpen={onOpen}
                            ratios={ratios}
                            onRatio={onRatio}
                            // 首屏那几张不要 lazy：图片一张张加载会把真实比例陆续填进来，
                            // 分列结果跟着重算，用户正读着的卡就会左右跳。让首屏一次性落定。
                            eager={i < 8}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

function WallView({ items, onOpen, onRatio }) {
    const photos = items.map((m, i) => ({ m, i })).filter(({ m }) => m.image);
    const hidden = items.length - photos.length;

    if (!photos.length) {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
                <ImageOff className="size-10 opacity-30" />
                <h3 className="text-base font-semibold text-foreground">这批片刻里没有照片</h3>
                <p className="text-sm">切到「瀑布」或「时间线」看纯文字的那些</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {photos.map(({ m, i }) => (
                    <button
                        key={m.id}
                        type="button"
                        aria-label={m.content || '查看照片'}
                        onClick={() => onOpen(i)}
                        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <img
                            src={cdn(m.image)}
                            alt={m.content || '片刻照片'}
                            loading="lazy"
                            decoding="async"
                            onLoad={(e) => {
                                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                                if (w && h) onRatio(m.id, w / h);
                            }}
                            className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-linear-to-t from-black/80 via-black/25 to-transparent p-2.5 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                            {m.content && <span className="line-clamp-2 text-[0.7rem] leading-snug text-white">{m.content}</span>}
                            <span className="text-[0.62rem] text-white/70 tabular-nums">{fmtDate(m.date, { month: 'numeric', day: 'numeric' })}</span>
                        </span>
                    </button>
                ))}
            </div>
            {hidden > 0 && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                    照片墙只放有图的，另有 <strong className="text-foreground">{hidden}</strong> 条纯文字片刻未显示
                </p>
            )}
        </>
    );
}

function TimelineView({ items, onOpen }) {
    // 按「年月」分组，组内保持倒序
    const groups = useMemo(() => {
        const out = [];
        items.forEach((m, i) => {
            const d = safeDate(m.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const last = out[out.length - 1];
            if (last && last.key === key) last.entries.push({ m, i });
            else out.push({ key, label: d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }), entries: [{ m, i }] });
        });
        return out;
    }, [items]);

    return (
        <div className="mx-auto max-w-3xl">
            {groups.map((g) => (
                <section key={g.key} className="mb-6">
                    <h2 className="mb-3 flex items-center gap-2.5">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">{g.label}</span>
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">{g.entries.length} 条</span>
                    </h2>
                    {/* 竖线走 ::before，避免给每一项都画一段线导致接缝 */}
                    <ol className="relative space-y-3 pl-8 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-px before:bg-border">
                        {g.entries.map(({ m, i }) => {
                            const d = safeDate(m.date);
                            return (
                                <li key={m.id} className="relative">
                                    {/* 圆点要压在竖线上：ol 有 pl-8(32px)、线在 left-2.5(10px)，
                                        圆点直径 10px ⇒ 相对 li 左移 32-10+5 = 27px */}
                                    <span className="absolute top-5 -left-6.75 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                                    <article className={cn(cardSurface, 'flex gap-3.5 p-3.5')}>
                                        <div className="w-9 shrink-0 text-center">
                                            <div className="font-mono text-lg leading-none font-bold text-primary">{d.getDate()}</div>
                                            <div className="mt-1 font-mono text-[0.62rem] text-muted-foreground tabular-nums">
                                                {d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        {m.image && (
                                            <button
                                                type="button"
                                                aria-label={m.content || '查看照片'}
                                                onClick={() => onOpen(i)}
                                                className="group size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            >
                                                <img
                                                    src={cdn(m.image)}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-110"
                                                />
                                            </button>
                                        )}
                                        <div className="min-w-0 flex-1 space-y-2">
                                            {m.content && <p className="text-sm leading-relaxed">{m.content}</p>}
                                            <MetaRow m={m} showDate={false} />
                                            {(m.tags || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {m.tags.map((t) => (
                                                        <Badge key={t} variant="secondary" className="gap-0.5 px-1.5 text-[0.65rem]">
                                                            <Hash size={9} className="opacity-50" />{t}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
}

/** 灯箱里那几个半透明圆按钮，样式统一在这儿 */
function GlassButton({ label, onClick, children, className }) {
    return (
        <Button
            aria-label={label}
            title={label}
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
                'rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/25 hover:text-white',
                'focus-visible:ring-2 focus-visible:ring-white/70',
                className
            )}
        >
            {children}
        </Button>
    );
}

function Lightbox({ items, index, onOpenChange, onJump, onNext, onPrev }) {
    const [shared, setShared] = useState(false);
    const touchX = useRef(0);
    const stripRef = useRef(null);

    const moment = index >= 0 ? items[index] : null;

    // 缩略图条自动跟到当前这张
    useEffect(() => {
        if (index < 0) return;
        const el = stripRef.current?.querySelector(`[data-idx="${index}"]`);
        el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, [index]);

    function onTouchStart(e) { touchX.current = e.changedTouches[0].screenX; }
    function onTouchEnd(e) {
        const d = touchX.current - e.changedTouches[0].screenX;
        if (Math.abs(d) > 50) { if (d > 0) onNext(); else onPrev(); }
    }

    function share() {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(window.location.href).then(() => {
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }).catch(() => {});
    }

    if (!moment) return <Dialog open={false} onOpenChange={onOpenChange} />;

    const tags = moment.tags || [];

    return (
        <Dialog open onOpenChange={onOpenChange}>
            {/* 底色只有 95% 不透明，页面上的标题/卡片会隐约透上来抢注意力，所以再糊一层 blur。
                另外 DialogContent 基类是 grid，这里必须显式写 flex 才盖得掉（tw-merge 同组才会去重）。 */}
            <DialogContent
                showCloseButton={false}
                className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 border-none bg-black/95 p-0 ring-0 backdrop-blur-md sm:max-w-none sm:rounded-none"
            >
                <DialogTitle className="sr-only">{moment.content || '片刻照片'}</DialogTitle>

                {/* ── 顶栏：计数 + 操作 ── */}
                <div className="flex shrink-0 items-center gap-2 px-4 py-3">
                    <span className="font-mono text-xs text-white/60 tabular-nums">
                        {index + 1} <span className="text-white/30">/ {items.length}</span>
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                        <GlassButton label={shared ? '已复制链接' : '复制本条链接'} onClick={share}>
                            {shared ? <Check className="text-emerald-400" /> : <Share2 />}
                        </GlassButton>
                        {moment.image && (
                            <GlassButton
                                label="查看原图"
                                onClick={() => window.open(cdn(moment.image), '_blank', 'noopener,noreferrer')}
                            >
                                <ExternalLink />
                            </GlassButton>
                        )}
                        <GlassButton label="关闭" onClick={() => onOpenChange(false)}><X /></GlassButton>
                    </div>
                </div>

                {/* ── 主体：图片（纯文字片刻显示引言卡） ── */}
                <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
                    {items.length > 1 && (
                        <>
                            <GlassButton label="上一条" onClick={onPrev} className="absolute left-2 z-10 sm:left-4">
                                <ChevronLeft />
                            </GlassButton>
                            <GlassButton label="下一条" onClick={onNext} className="absolute right-2 z-10 sm:right-4">
                                <ChevronRight />
                            </GlassButton>
                        </>
                    )}
                    {moment.image ? (
                        <img
                            key={moment.id}
                            src={cdn(moment.image)}
                            alt={moment.content || '片刻照片'}
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                            className="max-h-full max-w-full rounded object-contain duration-200 motion-safe:animate-in motion-safe:fade-in"
                        />
                    ) : (
                        <div
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                            className="max-w-lg rounded-xl bg-white/5 p-8 text-center ring-1 ring-white/10"
                        >
                            <Quote className="mx-auto mb-3 size-6 text-white/25" />
                            <p className="text-lg leading-relaxed text-white/90">{moment.content}</p>
                        </div>
                    )}
                </div>

                {/* ── 底部：文案 + 元信息 + 缩略图条 ── */}
                <div className="shrink-0 space-y-3 px-4 pt-3 pb-4">
                    <div className="mx-auto max-w-3xl space-y-2">
                        {moment.image && moment.content && (
                            <p className="text-sm leading-relaxed text-white/90">{moment.content}</p>
                        )}
                        <MetaRow m={moment} tone="dark" />
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {tags.map((t) => (
                                    <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] text-white/70">#{t}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {items.length > 1 && (
                        <div
                            ref={stripRef}
                            className="mx-auto flex max-w-3xl gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {items.map((m, i) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    data-idx={i}
                                    aria-label={`第 ${i + 1} 条`}
                                    aria-current={i === index}
                                    onClick={() => onJump(i)}
                                    className={cn(
                                        'size-12 shrink-0 cursor-pointer overflow-hidden rounded-md bg-white/10 transition-all outline-none',
                                        'focus-visible:ring-2 focus-visible:ring-white',
                                        i === index ? 'opacity-100 ring-2 ring-white' : 'opacity-45 hover:opacity-80'
                                    )}
                                >
                                    {m.image ? (
                                        <img src={cdn(m.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center text-white/50">
                                            <Quote size={14} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
