'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X, Inbox, CheckCheck, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import StatChip from '@/components/StatChip';
import MediaCard from '@/components/MediaCard';
import MediaSkeleton from '@/components/MediaSkeleton';
import EmptyHint from '@/components/EmptyHint';
import { fetchMedia } from '@/lib/api';
import { filterMedia, countByFilter, statusText } from '@/lib/media';
import { withBase } from '@/lib/utils';

/** 列数跟着 /acg 的概览网格走，md 那一档同样先落 4 列再到 6 列 */
const MEDIA_GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
const SKELETON_COUNT = 12;

/**
 * 追番库 / 漫画库的整页实现。
 *
 * /anime 与 /manga 原先是两份逐字重复的实现（diff 下来只差类型名和几句文案），
 * 于是 /acg 修好的毛病在这两页各留了一份：用 `list.length === 0` 当加载中，
 * 真的空库或接口挂掉时骨架屏就一直转。合并成一个组件，两页只传参数。
 *
 * @param {'anime'|'manga'} type 媒体类型，决定取哪一半数据与文案口径（在看/在读）
 * @param {Array<{id: string, label: string}>} filters 状态筛选项，见 lib/media 的 ANIME_FILTERS / MANGA_FILTERS
 */
export default function MediaLibrary({ type, eyebrow, title, filters, searchPlaceholder, pageId }) {
    const [list, setList] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMedia()
            .then((data) => setList(data[type] || []))
            .catch((e) => setError(e.message || '加载失败'))
            .finally(() => setLoaded(true));
    }, [type]);

    const term = search.trim().toLowerCase();

    // 七十多部只有状态筛选时,找一部得肉眼扫一遍 —— 叠一层标题搜索
    const filtered = useMemo(() => {
        const base = filterMedia(list, filter);
        return term ? base.filter((it) => (it.title || '').toLowerCase().includes(term)) : base;
    }, [list, filter, term]);

    // 胶囊上的数字和点进去看到的条数共用 filterMedia,不会对不上
    const counts = useMemo(() => countByFilter(list, filters), [list, filters]);

    // 「在追」那一档的 id 两边不同：番剧是 watching,漫画是 reading
    const activeId = type === 'anime' ? 'watching' : 'reading';

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Button variant="ghost" size="sm" className="mb-4" render={<a href={withBase('/acg')} />} nativeButton={false}>
                    <ArrowLeft size={14} /> 返回 ACG
                </Button>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{eyebrow}</div>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>

                {/* 统计条与 /acg 头部同一个组件,两页之间跳转时视觉是连的 */}
                <div className="mt-3 mb-6 flex flex-wrap gap-2">
                    {loaded && list.length > 0 && (
                        <>
                            <StatChip icon={Inbox} value={list.length} label="部收录" />
                            {counts[activeId] > 0 && (
                                <StatChip icon={Bookmark} value={counts[activeId]} label={`部${statusText(type, activeId)}`} />
                            )}
                            {counts.completed > 0 && (
                                <StatChip icon={CheckCheck} value={counts.completed} label={`部${statusText(type, 'completed')}`} />
                            )}
                        </>
                    )}
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <ToggleGroup
                        variant="outline"
                        value={[filter]}
                        onValueChange={(vals) => vals.length && setFilter(vals[0])}
                        className="flex-wrap justify-start"
                    >
                        {filters.map((f) => (
                            <ToggleGroupItem key={f.id} value={f.id}>
                                {f.label}
                                {/* 数字要等数据到位再露,否则一排 0 会被当成「这里什么都没有」 */}
                                {loaded && counts[f.id] > 0 && (
                                    <span className="ml-1.5 text-xs opacity-60 tabular-nums">{counts[f.id]}</span>
                                )}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>

                    <div className="relative w-full sm:w-56 sm:shrink-0">
                        <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                            className="h-9 pr-8 pl-8 text-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="清空搜索"
                                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {!loaded ? (
                    <div className={MEDIA_GRID}>
                        {Array.from({ length: SKELETON_COUNT }, (_, i) => <MediaSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <EmptyHint icon={Inbox} text={`加载失败：${error}`} hint="稍后刷新试试" />
                ) : list.length === 0 ? (
                    <EmptyHint icon={Inbox} text="库里还没有记录" hint="每天从 Bangumi 同步" />
                ) : filtered.length === 0 ? (
                    <EmptyHint
                        icon={Search}
                        text={term ? `没有匹配「${search.trim()}」的作品` : '这个状态下还没有作品'}
                        hint={term ? '换个关键词，或清空搜索看全部' : undefined}
                    />
                ) : (
                    <>
                        <div className={MEDIA_GRID}>
                            {filtered.map((item) => <MediaCard key={item.id} item={item} type={type} />)}
                        </div>
                        {/* 筛过之后给一句「看到的是几条」,否则不翻到底不知道自己漏没漏 */}
                        {(term || filter !== 'all') && (
                            <p className="mt-6 text-center text-xs text-muted-foreground">
                                共 <strong className="font-semibold text-foreground tabular-nums">{filtered.length}</strong> 部
                            </p>
                        )}
                    </>
                )}
            </main>

            <Footer pageId={pageId} />
            <BackToTop />
        </>
    );
}
