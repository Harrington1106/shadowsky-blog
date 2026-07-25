'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { House, FileText, Camera, Bookmark, Rss, Film, UserCircle, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from '@/components/ui/sheet';
import { cn, withBase } from '@/lib/utils';

const NAV_ITEMS = [
    { href: '/', label: '首页', icon: House, match: (p) => p === '/' },
    { href: '/blog', label: '笔记', icon: FileText, match: (p) => p.startsWith('/blog') },
    { href: '/moments', label: '片刻', icon: Camera, match: (p) => p.startsWith('/moments') },
    { href: '/bookmarks', label: '收藏', icon: Bookmark, match: (p) => p.startsWith('/bookmarks') },
    { href: '/rss', label: '订阅', icon: Rss, match: (p) => p.startsWith('/rss') },
    { href: '/acg', label: 'ACG', icon: Film, match: (p) => p.startsWith('/acg') },
    { href: '/about', label: '关于', icon: UserCircle, match: (p) => p.startsWith('/about') },
];

/**
 * 站点导航栏 —— shadcn 化重构：顶部 sticky 条 + 移动端 Sheet 抽屉
 */
export default function NavBar() {
    const pathname = usePathname() || '/';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    function toggleTheme() {
        const next = !isDark;
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
        setIsDark(next);
        window.dispatchEvent(new CustomEvent('themechange'));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: next } }));
        const meta = document.querySelector('meta[name="theme-color"]:not([media])');
        if (meta) meta.content = next ? '#0B1120' : '#F5F7FA';
    }

    // 供其他脚本调用（等价于原版各页面内联的 window.toggleTheme）
    useEffect(() => {
        window.toggleTheme = toggleTheme;
        return () => { delete window.toggleTheme; };
    });

    return (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <a href={withBase('/')} className="flex items-center gap-2 font-semibold" aria-label="夏日科技探索 Home">
                        <span>夏日科技探索</span>
                    </a>
                    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
                            const active = match(pathname);
                            return (
                                <a
                                    key={href}
                                    href={withBase(href)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    <Icon size={16} />
                                    {label}
                                </a>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="切换主题" onClick={toggleTheme}>
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </Button>

                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger
                            render={<Button variant="ghost" size="icon" aria-label="菜单" className="md:hidden" />}
                        >
                            <Menu size={20} />
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle>夏日科技探索</SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                                {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
                                    const active = match(pathname);
                                    return (
                                        <SheetClose
                                            key={href}
                                            render={
                                                <a
                                                    href={withBase(href)}
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                                        active
                                                            ? 'bg-accent text-accent-foreground'
                                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                    )}
                                                />
                                            }
                                        >
                                            <Icon size={18} />
                                            {label}
                                        </SheetClose>
                                    );
                                })}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
