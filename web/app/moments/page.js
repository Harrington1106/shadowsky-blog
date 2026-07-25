'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Shuffle, LayoutGrid, List, X, Share2, ChevronLeft, ChevronRight, Calendar, MapPin, Check, ImageOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { fetchMoments } from '@/lib/api';
import { Card } from '@/components/ui/card';

function cdn(u) {
    if (!u) return u;
    return u.replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh')
        .replace('/main/', '@main/').replace('/master/', '@master/');
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

export default function MomentsPage() {
    return (
        <Suspense fallback={null}>
            <MomentsPageInner />
        </Suspense>
    );
}

function MomentsPageInner() {
    const params = useSearchParams();

    const [moments, setMoments] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [lbIndex, setLbIndex] = useState(-1);

    // ── 初次加载数据 + 读取 URL 深链参数 ──
    useEffect(() => {
        fetchMoments()
            .then((data) => {
                setMoments(data);
                setLoaded(true);
                if (params.get('view') === 'timeline') setViewMode('timeline');
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
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    }, [moments]);

    const stats = useMemo(() => {
        const days = new Set();
        const locs = new Set();
        filtered.forEach((m) => {
            days.add(safeDate(m.date).toDateString());
            if (m.location) locs.add(m.location);
        });
        return { count: filtered.length, days: days.size, locs: locs.size };
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

    const lbMoment = lbIndex >= 0 ? filtered[lbIndex] : null;

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                <div className="sticky top-14 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
                    <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        <span><strong className="text-foreground">{stats.count}</strong> 张</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span><strong className="text-foreground">{stats.days}</strong> 天</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span><strong className="text-foreground">{stats.locs}</strong> 地</span>
                    </div>
                    <div className="relative min-w-40 max-w-64 flex-1">
                        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="搜索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        <Badge variant={!activeTag ? 'default' : 'outline'} className="cursor-pointer" render={<button type="button" onClick={() => setActiveTag(null)} />}>全部</Badge>
                        {tagCounts.map((t) => (
                            <Badge
                                key={t}
                                variant={activeTag === t ? 'default' : 'outline'}
                                className="cursor-pointer"
                                render={<button type="button" onClick={() => setActiveTag((v) => (v === t ? null : t))} />}
                            >
                                {t}
                            </Badge>
                        ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" title="随机漫游" onClick={pickRandom}><Shuffle size={16} /></Button>
                        <ToggleGroup
                            variant="outline"
                            value={[viewMode]}
                            onValueChange={(vals) => vals.length && setViewMode(vals[0])}
                        >
                            <ToggleGroupItem value="grid" title="网格"><LayoutGrid size={16} /></ToggleGroupItem>
                            <ToggleGroupItem value="timeline" title="时间线"><List size={16} /></ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>

                {!loaded && <MomentSkeleton />}
                {loaded && error && <ErrorState msg={error} />}
                {loaded && !error && filtered.length === 0 && <EmptyState />}
                {loaded && !error && filtered.length > 0 && viewMode === 'grid' && (
                    <GridView items={filtered} onOpen={openLB} />
                )}
                {loaded && !error && filtered.length > 0 && viewMode === 'timeline' && (
                    <TimelineView items={filtered} onOpen={openLB} />
                )}
            </main>

            <Footer pageId="moments" />
            <BackToTop />

            <Lightbox
                moment={lbMoment}
                onOpenChange={(open) => { if (!open) closeLB(); }}
                onNext={nextLB}
                onPrev={prevLB}
            />
        </>
    );
}

function MomentSkeleton() {
    const ratios = [0.82, 1.1, 0.95, 1.25, 0.78, 1.05, 0.9, 1.15];
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {ratios.map((r, i) => <Skeleton key={i} style={{ aspectRatio: r }} className="w-full" />)}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <ImageOff className="size-10 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">没有匹配的照片</h3>
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

function GridView({ items, onOpen }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((m, i) => {
                const date = fmtDate(m.date, { month: 'short', day: 'numeric' });
                const hasImg = !!m.image;
                let ratio = 0.75;
                if (m.imageWidth && m.imageHeight) ratio = m.imageHeight / m.imageWidth;

                return (
                    <button
                        key={m.id}
                        type="button"
                        aria-label={m.content || '查看照片'}
                        className="group relative block w-full cursor-pointer overflow-hidden rounded-lg bg-muted text-left"
                        style={hasImg ? { aspectRatio: 1 / (ratio || 0.75) } : undefined}
                        onClick={() => onOpen(i)}
                    >
                        {hasImg ? (
                            <img src={cdn(m.image)} alt={m.content || ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="flex min-h-40 items-center justify-center bg-linear-to-br from-primary/5 to-primary/10 p-5 text-center text-sm font-medium text-primary">
                                {m.content}
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-1.5 bg-linear-to-t from-black/75 via-black/20 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                            {hasImg && m.content && <p className="line-clamp-3 text-xs leading-snug text-white">{m.content}</p>}
                            <div className="flex flex-wrap items-center gap-2 text-[0.65rem] text-white/70">
                                <span className="inline-flex items-center gap-1"><Calendar size={10} />{date}</span>
                                {m.location && <span className="inline-flex items-center gap-1"><MapPin size={10} />{m.location}</span>}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function TimelineView({ items, onOpen }) {
    let lastYm = '';
    return (
        <div className="mx-auto max-w-2xl border-l pl-8">
            {items.map((m, i) => {
                const d = safeDate(m.date);
                const ym = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
                const day = d.getDate();
                const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                const showMonth = ym !== lastYm;
                lastYm = ym;

                return (
                    <Card key={m.id} className="relative mb-2 flex-row gap-3.5 p-3">
                        {showMonth && (
                            <div className="absolute -left-11.5 -top-1 flex items-center gap-2">
                                <div className="size-2 rounded-full bg-primary" />
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{ym}</span>
                            </div>
                        )}
                        <div className="w-8 shrink-0 text-center font-mono text-lg font-bold text-primary">{day}</div>
                        {m.image && (
                            <button type="button" aria-label={m.content || '查看照片'} className="h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-md" onClick={() => onOpen(i)}>
                                <img src={cdn(m.image)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-110" />
                            </button>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm">{m.content || ''}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{time}</span>
                                {m.location && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 hover:text-primary"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MapPin size={10} />{m.location}
                                    </a>
                                )}
                                {(m.tags || []).length > 0 && <span className="text-primary">{m.tags.map((t) => '#' + t).join(' ')}</span>}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

function Lightbox({ moment, onOpenChange, onNext, onPrev }) {
    const [shared, setShared] = useState(false);
    const touchX = useRef(0);

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

    const exifParts = [];
    if (moment.exif) {
        if (moment.exif.camera) exifParts.push(moment.exif.camera);
        if (moment.exif.lens) exifParts.push(moment.exif.lens);
        if (moment.exif.iso) exifParts.push('ISO ' + moment.exif.iso);
        if (moment.exif.aperture) exifParts.push(moment.exif.aperture);
        if (moment.exif.shutter) exifParts.push(moment.exif.shutter);
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="h-screen max-h-screen w-screen max-w-none sm:max-w-none flex-col border-none bg-black/95 p-0 sm:rounded-none"
            >
                <div className="relative flex h-full w-full items-center justify-center">
                    <img
                        src={moment.image ? cdn(moment.image) : ''}
                        alt={moment.content || '照片'}
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                        className="max-h-[85vh] max-w-[90vw] rounded object-contain"
                    />

                    <Button aria-label="关闭" variant="ghost" size="icon" className="absolute top-5 right-5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => onOpenChange(false)}>
                        <X />
                    </Button>
                    <Button aria-label={shared ? '已复制链接' : '分享'} variant="ghost" size="icon" className="absolute top-5 right-19 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={share}>
                        {shared ? <Check className="text-primary" /> : <Share2 />}
                    </Button>
                    <Button aria-label="上一张" variant="ghost" size="icon" className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
                        <ChevronLeft />
                    </Button>
                    <Button aria-label="下一张" variant="ghost" size="icon" className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); onNext(); }}>
                        <ChevronRight />
                    </Button>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-6 text-white">
                        <p className="mb-2 text-base">{moment.content || ''}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                            <span>{fmtDate(moment.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
                            {moment.location && (
                                <span
                                    className="pointer-events-auto inline-flex cursor-pointer items-center gap-1"
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(moment.location)}`, '_blank', 'noopener,noreferrer')}
                                >
                                    <MapPin size={12} /> {moment.location}
                                </span>
                            )}
                        </div>
                        {(moment.tags || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {moment.tags.map((t) => <Badge key={t} variant="secondary" className="text-[0.65rem]">#{t}</Badge>)}
                            </div>
                        )}
                        {exifParts.length > 0 && <div className="mt-2 font-mono text-[0.65rem] text-white/35">{exifParts.join(' · ')}</div>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
