'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMedia().then(({ anime: a }) => setAnime(a)).catch(() => {});
    }, []);

    // 七十多部番只有状态筛选时,找一部得肉眼扫一遍 —— 叠一层标题搜索
    const filtered = useMemo(() => {
        const base = filterMedia(anime, filter);
        const term = search.trim().toLowerCase();
        return term ? base.filter((it) => (it.title || '').toLowerCase().includes(term)) : base;
    }, [anime, filter, search]);

    return (
        <>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
                <Button variant="ghost" size="sm" className="mb-4" render={<a href={withBase('/acg')} />} nativeButton={false}>
                    <ArrowLeft size={14} /> 返回 ACG
                </Button>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Anime Library</div>
                <h1 className="mt-1 mb-6 text-3xl font-extrabold tracking-tight">我的追番</h1>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <ToggleGroup
                        variant="outline"
                        value={[filter]}
                        onValueChange={(vals) => vals.length && setFilter(vals[0])}
                        className="flex-wrap justify-start"
                    >
                        {ANIME_FILTERS.map((f) => (
                            <ToggleGroupItem key={f.id} value={f.id}>{f.label}</ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <div className="relative w-full sm:w-56">
                        <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="搜索番剧标题"
                            aria-label="搜索番剧标题"
                            className="h-9 pl-8 text-sm"
                        />
                    </div>
                </div>

                {anime.length === 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-2/3 w-full" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">
                        没有匹配的作品{search.trim() ? `（搜索「${search.trim()}」）` : ''}
                    </div>
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
