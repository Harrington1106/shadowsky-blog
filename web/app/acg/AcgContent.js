'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Tv, BookOpen, Clapperboard, Heart, CheckCheck, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import StatChip from '@/components/StatChip';
import VideoModal from '@/components/VideoModal';
import MediaCard from '@/components/MediaCard';
import VideoCard from '@/components/VideoCard';
import MediaSkeleton from '@/components/MediaSkeleton';
import VideoSkeleton from '@/components/VideoSkeleton';
import EmptyHint from '@/components/EmptyHint';
import { fetchMedia, fetchVideos } from '@/lib/api';
import { sortForOverview, filterMedia } from '@/lib/media';
import { cn, withBase } from '@/lib/utils';

/** 概览每类只放一屏能看完的量：海报 6 张（宽屏正好一行），视频 3 支（宽屏一行） */
const MEDIA_PREVIEW = 6;
const VIDEO_PREVIEW = 3;

/**
 * 四个区块各给一种图标底色。
 * 原先全是 primary，一屏四个一模一样的方块，滚动时分不出自己在哪一段；
 * 换成不同色相后余光扫一眼就知道位置。写法跟 /about 的图标块一致
 * （amber 在浅色底下对比度不够，所以按那边的惯例降一档到 600）。
 */
const ACCENT = {
    anime: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    manga: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
    edits: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    favorites: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default function AcgPage() {
    const [anime, setAnime] = useState([]);
    const [manga, setManga] = useState([]);
    const [videos, setVideos] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [modalVideo, setModalVideo] = useState(null);
    // 之前四个区块都用 length===0 当"加载中",于是某类真的为空(或接口挂了)时
    // 骨架屏永远转下去。两个请求各记一个 loaded 标记。
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const [videosLoaded, setVideosLoaded] = useState(false);

    useEffect(() => {
        fetchMedia().then(({ anime: a, manga: m }) => { setAnime(a); setManga(m); })
            .catch(() => {}).finally(() => setMediaLoaded(true));
        fetchVideos().then(({ videos: v, favorites: f }) => { setVideos(v); setFavorites(f); })
            .catch(() => {}).finally(() => setVideosLoaded(true));
    }, []);

    // 一律走 filterMedia：头部这三个数字和 /anime、/manga 上筛选胶囊的数字必须是同一套口径，
    // 否则「在追 3」点进去只看到 2 部，看着像丢了数据（watching / reading 两种状态混用见 lib/media）
    const stats = useMemo(() => ({
        watching: filterMedia(anime, 'watching').length,
        reading: filterMedia(manga, 'reading').length,
        finished: filterMedia([...anime, ...manga], 'completed').length,
    }), [anime, manga]);

    // 库里排在最前的往往是很久以前看完的，概览要的是「现在在追什么」
    const animePreview = useMemo(() => sortForOverview(anime).slice(0, MEDIA_PREVIEW), [anime]);
    const mangaPreview = useMemo(() => sortForOverview(manga).slice(0, MEDIA_PREVIEW), [manga]);

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <header className="mb-8">
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Anime · Manga · Video</div>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight">二次元空间</h1>
                    <p className="mt-1 text-sm text-muted-foreground">追番、漫画与我的剪辑作品</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {mediaLoaded ? (
                            <>
                                <StatChip icon={Tv} value={stats.watching} label="部在追" />
                                <StatChip icon={BookOpen} value={stats.reading} label="部在读" />
                                <StatChip icon={CheckCheck} value={stats.finished} label="部已完结" />
                            </>
                        ) : (
                            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[26px] w-20 rounded-full" />)
                        )}
                        {videosLoaded ? (
                            <StatChip icon={Clapperboard} value={videos.length} label="支剪辑" />
                        ) : (
                            <Skeleton className="h-[26px] w-20 rounded-full" />
                        )}
                    </div>
                </header>

                <Section id="anime" icon={Tv} title="我的追番" desc="在追与看过的番剧，每天从 Bangumi 同步"
                    href="/anime" total={anime.length} loaded={mediaLoaded} accent={ACCENT.anime}>
                    <MediaGrid items={animePreview} type="anime" loaded={mediaLoaded} empty="还没有追番记录" />
                </Section>

                <Section id="manga" icon={BookOpen} title="我的漫画" desc="在读与读过的漫画，同样来自 Bangumi"
                    href="/manga" total={manga.length} loaded={mediaLoaded} accent={ACCENT.manga}>
                    <MediaGrid items={mangaPreview} type="manga" loaded={mediaLoaded} empty="还没有漫画记录" />
                </Section>

                <Section id="edits" icon={Clapperboard} title="最新剪辑" desc="自己剪的视频作品"
                    href="/edits" total={videos.length} loaded={videosLoaded} accent={ACCENT.edits}>
                    <VideoGrid videos={videos} onPlay={setModalVideo} limit={VIDEO_PREVIEW} loaded={videosLoaded} empty="还没有剪辑作品" />
                </Section>

                {/* 收藏视频没有二级页面，这里就是它唯一的去处 —— 不截断 */}
                <Section id="favorites" icon={Heart} title="收藏视频" desc="顺手存下、想再看一遍的"
                    total={favorites.length} loaded={videosLoaded} accent={ACCENT.favorites}>
                    <VideoGrid videos={favorites} onPlay={setModalVideo} loaded={videosLoaded} empty="还没有收藏视频" />
                </Section>
            </main>

            <Footer pageId="acg" />
            <BackToTop />

            <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
        </>
    );
}

/**
 * 区块标题：图标 + 标题 + 条数，右侧「全部」入口。
 * 条数放在标题旁边，因为概览只露 3～6 条，不写清总数会让人以为库里就这么点。
 */
function Section({ id, icon: Icon, title, desc, href, total, loaded, accent, children }) {
    return (
        <section id={id} className="mb-12 scroll-mt-20">
            <div className="mb-4 flex items-end justify-between gap-3 border-b pb-3">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', accent || 'bg-primary/10 text-primary')}>
                            <Icon size={15} />
                        </span>
                        <span className="truncate">{title}</span>
                        {loaded && total > 0 && (
                            <Badge variant="secondary" className="shrink-0 tabular-nums">{total}</Badge>
                        )}
                    </h2>
                    {desc && <p className="mt-1 truncate text-xs text-muted-foreground">{desc}</p>}
                </div>
                {href && (
                    <Button variant="ghost" size="sm" className="shrink-0" render={<a href={withBase(href)} />} nativeButton={false}>
                        全部 <ChevronRight size={14} />
                    </Button>
                )}
            </div>
            {children}
        </section>
    );
}

/** 海报网格：md 挤到 6 列时每张只剩 110px，中间加两档过渡 */
const MEDIA_GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
const VIDEO_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

function MediaGrid({ items, type, loaded, empty }) {
    if (!loaded) {
        return (
            <div className={MEDIA_GRID}>
                {Array.from({ length: MEDIA_PREVIEW }, (_, i) => <MediaSkeleton key={i} />)}
            </div>
        );
    }
    if (items.length === 0) return <EmptyHint icon={Bookmark} text={empty} />;
    return (
        <div className={MEDIA_GRID}>
            {items.map((item) => <MediaCard key={item.id} item={item} type={type} />)}
        </div>
    );
}

function VideoGrid({ videos, onPlay, limit, loaded, empty }) {
    if (!loaded) {
        return (
            <div className={VIDEO_GRID}>
                {Array.from({ length: VIDEO_PREVIEW }, (_, i) => <VideoSkeleton key={i} />)}
            </div>
        );
    }
    if (videos.length === 0) return <EmptyHint icon={Clapperboard} text={empty} />;
    return (
        <div className={VIDEO_GRID}>
            {(limit ? videos.slice(0, limit) : videos).map((v) => <VideoCard key={v.id} video={v} onPlay={() => onPlay(v)} />)}
        </div>
    );
}

