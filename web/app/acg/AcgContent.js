'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import VideoModal from '@/components/VideoModal';
import MediaCard from '@/components/MediaCard';
import VideoCard from '@/components/VideoCard';
import { fetchMedia, fetchVideos } from '@/lib/api';
import { withBase } from '@/lib/utils';

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

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <header className="mb-8">
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Anime · Manga · Video</div>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight">二次元空间</h1>
                    <p className="mt-1 text-sm text-muted-foreground">追番、漫画与我的剪辑作品</p>
                </header>

                <Section title="我的追番" href="/anime">
                    <MediaGrid items={anime} type="anime" loaded={mediaLoaded} empty="还没有追番记录" />
                </Section>

                <Section title="我的漫画" href="/manga">
                    <MediaGrid items={manga} type="manga" loaded={mediaLoaded} empty="还没有漫画记录" />
                </Section>

                <Section title="最新剪辑" href="/edits">
                    <VideoGrid videos={videos} onPlay={setModalVideo} loaded={videosLoaded} empty="还没有剪辑作品" />
                </Section>

                <Section title="收藏视频">
                    <VideoGrid videos={favorites} onPlay={setModalVideo} limit={favorites.length || 3} loaded={videosLoaded} empty="还没有收藏视频" />
                </Section>
            </main>

            <Footer pageId="acg" />
            <BackToTop />

            <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
        </>
    );
}

function Section({ title, href, children }) {
    return (
        <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                {href && (
                    <Button variant="ghost" size="sm" render={<a href={withBase(href)} />} nativeButton={false}>
                        全部 <ChevronRight size={14} />
                    </Button>
                )}
            </div>
            {children}
        </section>
    );
}

function MediaGrid({ items, type, loaded, empty }) {
    if (!loaded) {
        return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-2/3 w-full" />)}
            </div>
        );
    }
    if (items.length === 0) {
        return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
    }
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {items.slice(0, 6).map((item) => <MediaCard key={item.id} item={item} type={type} />)}
        </div>
    );
}

function VideoGrid({ videos, onPlay, limit = 6, loaded, empty }) {
    if (!loaded) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-video w-full" />)}
            </div>
        );
    }
    if (videos.length === 0) {
        return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
    }
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.slice(0, limit).map((v) => <VideoCard key={v.id} video={v} onPlay={() => onPlay(v)} />)}
        </div>
    );
}
