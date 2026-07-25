'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import MediaCard from '@/components/MediaCard';
import { fetchMedia } from '@/lib/api';
import { ANIME_FILTERS, filterMedia } from '@/lib/media';
import { withBase } from '@/lib/utils';

export default function AnimePage() {
    const [anime, setAnime] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchMedia().then(({ anime: a }) => setAnime(a)).catch(() => {});
    }, []);

    const filtered = useMemo(() => filterMedia(anime, filter), [anime, filter]);

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Button variant="ghost" size="sm" className="mb-4" render={<a href={withBase('/acg')} />} nativeButton={false}>
                    <ArrowLeft size={14} /> 返回 ACG
                </Button>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Anime Library</div>
                <h1 className="mt-1 mb-6 text-3xl font-extrabold tracking-tight">我的追番</h1>

                <ToggleGroup
                    variant="outline"
                    value={[filter]}
                    onValueChange={(vals) => vals.length && setFilter(vals[0])}
                    className="mb-6 flex-wrap justify-start"
                >
                    {ANIME_FILTERS.map((f) => (
                        <ToggleGroupItem key={f.id} value={f.id}>{f.label}</ToggleGroupItem>
                    ))}
                </ToggleGroup>

                {anime.length === 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-2/3 w-full" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">没有匹配的作品</div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                        {filtered.map((item) => <MediaCard key={item.id} item={item} type="anime" />)}
                    </div>
                )}
            </main>

            <Footer pageId="anime" />
            <BackToTop />
        </>
    );
}
