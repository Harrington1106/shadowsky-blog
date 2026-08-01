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

    useEffect(() => {
        fetchVideos().then(({ videos: v }) => {
            v.forEach((item) => { if (item.category) item.category = item.category.toLowerCase(); });
            setVideos(v);
        }).catch(() => {});
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

                {videos.length === 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-video w-full" />)}
                    </div>
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
