'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Bookmark, Camera, Clapperboard, Rss, Film, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SECTIONS = [
    { href: '/admin/bookmarks', label: '收藏管理', icon: Bookmark },
    { href: '/admin/moments', label: '随手拍', icon: Camera },
    { href: '/admin/media', label: '追番/追漫', icon: Clapperboard },
    { href: '/admin/videos', label: '视频', icon: Film },
    { href: '/admin/feeds', label: 'RSS 订阅源', icon: Rss },
    { href: '/admin/notice', label: '公告', icon: Bell },
];

export default function AdminDashboard() {
    const router = useRouter();

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/admin/login');
        router.refresh();
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">管理后台</h1>
                    <p className="mt-1 text-sm text-muted-foreground">ShadowQuake v2 · 已登录</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="size-4" /> 退出
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SECTIONS.map(({ href, label, icon: Icon }) => (
                    <a
                        key={href}
                        href={href}
                        className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                        <Icon className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{label}</span>
                    </a>
                ))}
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
                各管理页将在模块 4c 用 shadcn 逐个实现。当前登录会话由 httpOnly cookie 承载,写接口受鉴权保护。
            </p>
        </main>
    );
}
