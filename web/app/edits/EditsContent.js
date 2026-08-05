'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import StatChip from '@/components/StatChip';
import VideoCard from '@/components/VideoCard';
import VideoSkeleton from '@/components/VideoSkeleton';
import EmptyHint from '@/components/EmptyHint';
import VideoModal from '@/components/VideoModal';
import { fetchVideos } from '@/lib/api';
import { videoCategoryLabel, formatViews } from '@/lib/media';
import { withBase } from '@/lib/utils';

const VIDEO_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
const SKELETON_COUNT = 6;

export default function EditsPage() {
    const [videos, setVideos] = useState([]);
    const [filter, setFilter] = useState('all');
    const [modalVideo, setModalVideo] = useState(null);
    // 之前用 videos.length===0 判断"加载中",于是真的没有视频、或接口挂了,
    // 骨架屏就会一直转下去。用独立的 loaded 标记区分"还在加载"和"加载完但是空的"。
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchVideos().then(({ videos: v }) => {
            v.forEach((item) => { if (item.category) item.category = item.category.toLowerCase(); });
            setVideos(v);
        }).catch((e) => setError(e.message || '加载失败')).finally(() => setLoaded(true));
    }, []);

    // 过滤掉空分类,否则会渲染出一个没有文字的空药丸
    const categories = useMemo(() => ['all', ...new Set(videos.map((v) => v.category).filter(Boolean))], [videos]);
    const filtered = useMemo(() => (filter === 'all' ? videos : videos.filter((v) => v.category === filter)), [videos, filter]);

    const counts = useMemo(() => {
        const map = { all: videos.length };
        videos.forEach((v) => { if (v.category) map[v.category] = (map[v.category] || 0) + 1; });
        return map;
    }, [videos]);

    // 播放量累计：单看一支视频没概念,加起来才知道这堆剪辑到底被看了多少次
    const totalViews = useMemo(
        () => videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0),
        [videos]
    );

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Button variant="ghost" size="sm" className="mb-4" render={<a href={withBase('/acg')} />} nativeButton={false}>
                    <ArrowLeft size={14} /> 返回 ACG
                </Button>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Video Library</div>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">我的剪辑</h1>

                <div className="mt-3 mb-6 flex flex-wrap gap-2">
                    {loaded && videos.length > 0 && (
                        <>
                            <StatChip icon={Clapperboard} value={videos.length} label="支作品" />
                            {totalViews > 0 && <StatChip icon={Eye} value={formatViews(totalViews)} label="次播放" />}
                        </>
                    )}
                </div>

                {/* 只有一个「全部」时不必露出筛选器 —— 一个孤零零的胶囊点了也没变化 */}
                {loaded && categories.length > 1 && (
                    <ToggleGroup
                        variant="outline"
                        value={[filter]}
                        onValueChange={(vals) => vals.length && setFilter(vals[0])}
                        className="mb-6 flex-wrap justify-start"
                    >
                        {categories.map((cat) => (
                            <ToggleGroupItem key={cat} value={cat}>
                                {videoCategoryLabel(cat)}
                                {counts[cat] > 0 && (
                                    <span className="ml-1.5 text-xs opacity-60 tabular-nums">{counts[cat]}</span>
                                )}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                )}

                {!loaded ? (
                    <div className={VIDEO_GRID}>
                        {Array.from({ length: SKELETON_COUNT }, (_, i) => <VideoSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <EmptyHint icon={Clapperboard} text={`加载失败：${error}`} hint="稍后刷新试试" />
                ) : videos.length === 0 ? (
                    <EmptyHint icon={Clapperboard} text="还没有剪辑作品" />
                ) : filtered.length === 0 ? (
                    <EmptyHint icon={Clapperboard} text="这个分类下还没有作品" />
                ) : (
                    <div className={VIDEO_GRID}>
                        {/* 「全部」视图下才在缩略图上标分类,已经按分类筛过的话每张都一样,是废话 */}
                        {filtered.map((v) => (
                            <VideoCard key={v.id} video={v} onPlay={() => setModalVideo(v)} showCategory={filter === 'all'} />
                        ))}
                    </div>
                )}
            </main>

            <Footer pageId="edits" />
            <BackToTop />

            <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
        </>
    );
}
