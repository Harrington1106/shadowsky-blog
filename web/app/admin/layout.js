'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Bookmark, Camera, Clapperboard, Film, Rss, Bell, FileText, Settings, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';

const NAV = [
    { href: '/admin', label: '概览', icon: LayoutDashboard, exact: true },
    { href: '/admin/posts', label: '文章', icon: FileText },
    { href: '/admin/bookmarks', label: '收藏', icon: Bookmark },
    { href: '/admin/moments', label: '随手拍', icon: Camera },
    { href: '/admin/media', label: '追番/追漫', icon: Clapperboard },
    { href: '/admin/videos', label: '视频', icon: Film },
    { href: '/admin/feeds', label: '订阅源', icon: Rss },
    { href: '/admin/notice', label: '公告', icon: Bell },
    { href: '/admin/stats', label: '统计', icon: BarChart3 },
    { href: '/admin/settings', label: '设置', icon: Settings },
];

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();

    // 登录页不套后台外壳
    if (pathname === '/admin/login') return <>{children}</>;

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/admin/login');
        router.refresh();
    }

    return (
        <div className="flex min-h-screen">
            <aside className="flex w-52 shrink-0 flex-col border-r bg-card">
                <div className="border-b px-5 py-4">
                    <div className="text-sm font-bold">管理后台</div>
                    <div className="text-xs text-muted-foreground">ShadowQuake v2</div>
                </div>
                <nav className="flex flex-1 flex-col gap-1 p-3">
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = exact ? pathname === href : pathname.startsWith(href);
                        return (
                            <a
                                key={href}
                                href={href}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                                    active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                                )}
                            >
                                <Icon className="size-4" />
                                {label}
                            </a>
                        );
                    })}
                </nav>
                <div className="border-t p-3">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
                        <LogOut className="size-4" /> 退出登录
                    </Button>
                </div>
            </aside>
            <main className="min-w-0 flex-1 bg-background">{children}</main>
            <Toaster />
        </div>
    );
}
