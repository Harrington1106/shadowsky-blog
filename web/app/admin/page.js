'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Camera, Clapperboard, Film, Rss } from 'lucide-react';
import { apiGet } from '@/lib/adminApi';

const CARDS = [
    { href: '/admin/bookmarks', label: '收藏', icon: Bookmark, load: async () => (await apiGet('/api/bookmarks')).bookmarks.length },
    { href: '/admin/moments', label: '随手拍', icon: Camera, load: async () => (await apiGet('/api/moments')).length },
    { href: '/admin/media', label: '追番/追漫', icon: Clapperboard, load: async () => { const m = await apiGet('/api/media'); return m.anime.length + m.manga.length; } },
    { href: '/admin/videos', label: '视频', icon: Film, load: async () => { const v = await apiGet('/api/videos'); return v.videos.length + v.favorites.length; } },
    { href: '/admin/feeds', label: '订阅源', icon: Rss, load: async () => (await apiGet('/api/feeds')).length },
];

export default function AdminOverview() {
    const [counts, setCounts] = useState({});

    useEffect(() => {
        CARDS.forEach(async (c) => {
            try {
                const n = await c.load();
                setCounts((prev) => ({ ...prev, [c.href]: n }));
            } catch { /* ignore */ }
        });
    }, []);

    return (
        <div className="mx-auto max-w-4xl px-8 py-10">
            <h1 className="text-2xl font-bold">概览</h1>
            <p className="mt-1 text-sm text-muted-foreground">ShadowQuake v2 · 内容管理</p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {CARDS.map(({ href, label, icon: Icon }) => (
                    <a key={href} href={href} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30">
                        <Icon className="size-5 text-muted-foreground" />
                        <div className="mt-3 text-2xl font-bold tabular-nums">{counts[href] ?? '—'}</div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                    </a>
                ))}
            </div>
        </div>
    );
}
