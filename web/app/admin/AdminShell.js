'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, Bookmark, Camera, Clapperboard, Film, Rss, Bell, FileText, Settings, BarChart3, Link2, Hand, LogOut, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { JUST_LOGGED_IN_KEY } from '@/lib/adminSession';

const NAV = [
    { href: '/admin', label: '概览', icon: LayoutDashboard, exact: true },
    { href: '/admin/posts', label: '文章', icon: FileText },
    // 发布台只在本机 dev 有意义：发布要 ssh/scp，线上容器没有私钥。
    // 后端 route 也各自有 devOnly() 守卫，这里只是不给入口。
    ...(process.env.NODE_ENV === 'production' ? [] : [{ href: '/admin/publish', label: '发布台', icon: Rocket }]),
    { href: '/admin/bookmarks', label: '收藏', icon: Bookmark },
    { href: '/admin/moments', label: '随手拍', icon: Camera },
    { href: '/admin/media', label: '追番/追漫', icon: Clapperboard },
    { href: '/admin/videos', label: '视频', icon: Film },
    { href: '/admin/feeds', label: '订阅源', icon: Rss },
    { href: '/admin/social', label: '社交链接', icon: Link2 },
    { href: '/admin/notice', label: '公告', icon: Bell },
    { href: '/admin/greetings', label: '打招呼', icon: Hand },
    { href: '/admin/stats', label: '统计', icon: BarChart3 },
    { href: '/admin/settings', label: '设置', icon: Settings },
];

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isLogin = pathname === '/admin/login';

    // 登录成功后弹一次欢迎;标记读完即删,刷新不会重复弹
    useEffect(() => {
        if (isLogin) return;
        try {
            if (sessionStorage.getItem(JUST_LOGGED_IN_KEY)) {
                sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
                toast.success('欢迎回来');
            }
        } catch { /* 隐私模式下没有 sessionStorage,忽略 */ }
    }, [isLogin]);

    // 登录页不套后台外壳(hooks 必须先跑完再 return)
    if (isLogin) return <>{children}</>;

    async function logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch { /* 网络失败也照样跳登录页,cookie 过期后自然失效 */ }
        router.replace('/admin/login');
        router.refresh();
    }

    return (
        // ⚠ 三处 3.5rem / top-14 都对应站点 NavBar 的 h-14,改导航栏高度这里要跟着改。
        //   外层用 min-h-[calc(100vh-3.5rem)] 而不是 min-h-screen:后台是渲染在 NavBar
        //   *下面*的,用满屏高会让页面凭空多出 56px 的滚动距离。
        <div className="flex min-h-[calc(100vh-3.5rem)]">
            {/*
              侧栏吸顶。用 sticky 而不是自建滚动容器(把 main 设成 overflow-auto):
              后者会夺走文档滚动,浏览器的滚动位置恢复、页内锚点、Ctrl+End 全都跟着失效。
              sticky 需要元素高度不等于容器高度才有移动空间 —— 显式 h-[calc(...)] 配 self-start,
              否则 flex 默认的 align-items:stretch 会把它拉满,看起来就像没生效。
            */}
            <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-52 shrink-0 flex-col self-start border-r bg-card">
                <div className="border-b px-5 py-4">
                    <div className="text-sm font-bold">管理后台</div>
                    <div className="text-xs text-muted-foreground">ShadowQuake v2</div>
                </div>
                {/* 菜单 14 项,窄屏(或缩放大)时会超出一屏 —— 让它自己滚,把退出登录留在底部 */}
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
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
