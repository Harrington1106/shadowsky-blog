'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Camera, Clapperboard, Film, Rss, FileText, ExternalLink } from 'lucide-react';
import { apiGet } from '@/lib/adminApi';
import { cn, cardSurface, cardInteractive } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import AdminPage from '@/components/admin/AdminPage';

const CARDS = [
    { href: '/admin/posts', label: '文章', icon: FileText, load: async () => (await apiGet('/api/posts')).length },
    { href: '/admin/bookmarks', label: '收藏', icon: Bookmark, load: async () => (await apiGet('/api/bookmarks')).bookmarks.length },
    { href: '/admin/moments', label: '随手拍', icon: Camera, load: async () => (await apiGet('/api/moments')).length },
    { href: '/admin/media', label: '追番/追漫', icon: Clapperboard, load: async () => { const m = await apiGet('/api/media'); return m.anime.length + m.manga.length; } },
    { href: '/admin/videos', label: '视频', icon: Film, load: async () => { const v = await apiGet('/api/videos'); return v.videos.length + v.favorites.length; } },
    { href: '/admin/feeds', label: '订阅源', icon: Rss, load: async () => (await apiGet('/api/feeds')).length },
];

export default function AdminOverview() {
    // 每张卡各自一条请求,谁先回来谁先显示。
    // 值可能是 0(合法数字),所以「还没回来」用 undefined 判,不能用 falsy。
    const [counts, setCounts] = useState({});
    const [failed, setFailed] = useState({});

    useEffect(() => {
        CARDS.forEach(async (c) => {
            try {
                const n = await c.load();
                setCounts((prev) => ({ ...prev, [c.href]: n }));
            } catch {
                // 原来这里静默吞掉,那张卡就永远停在占位符上,分不清是「在加载」还是「取不到」
                setFailed((prev) => ({ ...prev, [c.href]: true }));
            }
        });
    }, []);

    return (
        <AdminPage width="4xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">概览</h1>
                    <p className="mt-1 text-sm text-muted-foreground">ShadowQuake v2 · 内容管理</p>
                </div>
                <Button variant="outline" size="sm" nativeButton={false} render={<a href="/" target="_blank" rel="noreferrer" />}>
                    <ExternalLink className="size-4" /> 查看站点
                </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                {CARDS.map(({ href, label, icon: Icon }) => (
                    <a key={href} href={href} className={cn(cardSurface, cardInteractive, 'p-4 sm:p-5')}>
                        <Icon className="size-5 text-muted-foreground" />
                        <div className="mt-3 text-2xl font-bold tabular-nums">
                            {counts[href] !== undefined
                                ? counts[href]
                                : failed[href]
                                    ? <span className="text-base font-normal text-destructive">取不到</span>
                                    : <Skeleton className="h-8 w-10" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                    </a>
                ))}
            </div>
        </AdminPage>
    );
}
