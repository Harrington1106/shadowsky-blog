'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import { fetchVideos } from '@/lib/api';
import { videoCategoryLabel } from '@/lib/media';
import { withBase } from '@/lib/utils';

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

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Button variant="ghost" size="sm" className="mb-4" render={<a href={withBase('/acg')} />} nativeButton={false}>
                    <ArrowLeft size={14} /> 返回 ACG
                </Button>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Video Library</div>
                <h1 className="mt-1 mb-6 text-3xl font-extrabold tracking-tight">我的剪辑</h1>

                <ToggleGroup
                    variant="outline"
                    value={[filter]}
                    onValueChange={(vals) => vals.length && setFilter(vals[0])}
                    className="mb-6 flex-wrap justify-start"
                >
                    {categories.map((cat) => (
                        <ToggleGroupItem key={cat} value={cat}>{videoCategoryLabel(cat)}</ToggleGroupItem>
                    ))}
                </ToggleGroup>

                {!loaded ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-video w-full" />)}
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">加载失败：{error}</div>
                ) : videos.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">还没有剪辑作品</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">这个分类下还没有作品</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((v) => <VideoCard key={v.id} video={v} onPlay={() => setModalVideo(v)} />)}
                    </div>
                )}
            </main>

            <Footer pageId="edits" />
            <BackToTop />

            <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
        </>
    );
}
