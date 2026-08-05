'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, Bookmark, Camera, Clapperboard, Film, Rss, Bell, FileText, Settings, BarChart3, Link2, Hand, LogOut, Rocket, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetFooter } from '@/components/ui/sheet';
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

/** 某个导航项是否命中当前路径 */
function matches(item, pathname) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** 导航项样式 —— 侧栏和抽屉共用,改一处两边都变 */
function itemClass(active) {
    return cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
    );
}

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isLogin = pathname === '/admin/login';
    const [drawerOpen, setDrawerOpen] = useState(false);

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

    const current = NAV.find((item) => matches(item, pathname));

    return (
        // ⚠ 四处 57px 都对应站点 NavBar 的高度(内容 h-14 = 56px + border-b 1px),
        //   改导航栏高度这里要跟着改。少算那 1px 边框,短页面上就会凭空多出一条滚动条。
        //   外层用 min-h-[calc(100vh-57px)] 而不是 min-h-screen:后台渲染在 NavBar *下面*,
        //   用满屏高会让每个页面都多出 57px 的滚动距离。
        <div className="flex min-h-[calc(100vh-57px)]">
            {/*
              宽屏(lg+):吸顶侧栏。用 sticky 而不是自建滚动容器(把 main 设成 overflow-auto):
              后者会夺走文档滚动,浏览器的滚动位置恢复、页内锚点、Ctrl+End 全都跟着失效。
              sticky 需要元素高度不等于容器高度才有移动空间 —— 显式 h-[calc(...)] 配 self-start,
              否则 flex 默认的 align-items:stretch 会把它拉满,看起来就像没生效。
              断点取 lg 而不是 NavBar 用的 md:后台好几页是表格,760px 宽再被侧栏切掉 208px 就没法看了。
            */}
            <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-52 shrink-0 flex-col self-start border-r bg-card lg:flex">
                <div className="border-b px-5 py-4">
                    <div className="text-sm font-bold">管理后台</div>
                    <div className="text-xs text-muted-foreground">ShadowQuake v2</div>
                </div>
                {/* 菜单 14 项,矮屏(或页面缩放大)时会超出一屏 —— 让它自己滚,把退出登录留在底部 */}
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                    {NAV.map((item) => (
                        <a key={item.href} href={item.href} className={itemClass(matches(item, pathname))}>
                            <item.icon className="size-4" />
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="border-t p-3">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
                        <LogOut className="size-4" /> 退出登录
                    </Button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/*
                  窄屏(<lg):侧栏收成顶部栏 + 左侧抽屉。
                  z-40 是刻意压在站点 NavBar(z-50)之下 —— 两条都是 sticky,顶部栏得贴在 NavBar 下沿,
                  盖住它的话滚动时会把站点导航吃掉。
                */}
                <div className="sticky top-[57px] z-40 flex items-center gap-1 border-b bg-card px-2 py-2 lg:hidden">
                    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="后台菜单" />}>
                            <Menu size={20} />
                        </SheetTrigger>
                        <SheetContent side="left">
                            <SheetHeader>
                                <SheetTitle>管理后台</SheetTitle>
                                <div className="text-xs text-muted-foreground">ShadowQuake v2</div>
                            </SheetHeader>
                            {/* 抽屉本身高度有限,菜单同样要能自己滚,否则矮屏上够不到底部几项 */}
                            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
                                {NAV.map((item) => (
                                    // nativeButton={false} 不能省:SheetClose 默认按原生 <button> 处理,
                                    // 这里 render 成 <a>,不声明就报 Base UI 语义警告(控制台一条 error)
                                    <SheetClose
                                        key={item.href}
                                        nativeButton={false}
                                        render={<a href={item.href} className={itemClass(matches(item, pathname))} />}
                                    >
                                        <item.icon className="size-4" />
                                        {item.label}
                                    </SheetClose>
                                ))}
                            </nav>
                            {/* 退出登录在窄屏只有这一个入口,别删 */}
                            <SheetFooter>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
                                    <LogOut className="size-4" /> 退出登录
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                    <span className="truncate text-sm font-medium">{current?.label || '管理后台'}</span>
                </div>

                <main className="min-w-0 flex-1 bg-background">{children}</main>
            </div>
            <Toaster />
        </div>
    );
}
