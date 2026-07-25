'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

    // ── 滑动激活 pill：静止在当前页项，hover 时跟随，指针移出后归位 ──
    const headerRef = useRef(null);
    const pillRef = useRef(null);
    const linkRefs = useRef(new Map());
    const [hovered, setHovered] = useState(null);

    const activeHref = NAV_ITEMS.find(({ match }) => match(pathname))?.href ?? null;

    /** 把 pill 移到目标链接位置；instant=true 跳过弹簧动画（初始化/resize 用） */
    const movePill = useCallback((href, instant) => {
        const pill = pillRef.current;
        const link = href ? linkRefs.current.get(href) : null;
        if (!pill) return;
        if (!link) {
            pill.style.opacity = '0';
            return;
        }
        if (instant) pill.style.transition = 'none';
        pill.style.transform = `translate(${link.offsetLeft}px, -50%)`;
        pill.style.width = `${link.offsetWidth}px`;
        pill.style.opacity = '1';
        if (instant) {
            pill.getBoundingClientRect();   // 强制 reflow，保证下次移动仍有弹簧动画
            pill.style.transition = '';
        }
    }, []);

    // 首屏 / 路由切换：立即定位到当前页项
    useLayoutEffect(() => { movePill(activeHref, true); }, [activeHref, movePill]);
    // hover 变化：带弹簧动画滑过去
    useEffect(() => { movePill(hovered ?? activeHref, false); }, [hovered, activeHref, movePill]);

    // 窗口尺寸变化、Web 字体加载完成后都要重新量一次（字体会改变链接宽度）
    useEffect(() => {
        const reposition = () => movePill(hovered ?? activeHref, true);
        window.addEventListener('resize', reposition);
        document.fonts?.ready?.then(reposition);
        return () => window.removeEventListener('resize', reposition);
    }, [hovered, activeHref, movePill]);

    // ── 光标跟随镜面高光：写 --mx/--my 驱动 .nav-glass::after 的径向渐变 ──
    useEffect(() => {
        const header = headerRef.current;
        if (!header) return;
        const finePointer = window.matchMedia('(pointer: fine)').matches;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!finePointer || reducedMotion) return;

        let rafId = null;
        const onPointerMove = (e) => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                const rect = header.getBoundingClientRect();
                header.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
                header.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
                header.style.setProperty('--glass-opacity', '1');
                rafId = null;
            });
        };
        const onPointerLeave = () => header.style.setProperty('--glass-opacity', '0');

        header.addEventListener('pointermove', onPointerMove);
        header.addEventListener('pointerleave', onPointerLeave);
        return () => {
            header.removeEventListener('pointermove', onPointerMove);
            header.removeEventListener('pointerleave', onPointerLeave);
            if (rafId) cancelAnimationFrame(rafId);
        };
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
        <header
            ref={headerRef}
            className="nav-glass sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
        >
            <div className="relative z-10 mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <a href={withBase('/')} className="flex items-center gap-2 font-semibold" aria-label="夏日科技探索 Home">
                        <span>夏日科技探索</span>
                    </a>
                    <nav
                        className="relative hidden items-center gap-1 md:flex"
                        aria-label="Main"
                        onPointerLeave={() => setHovered(null)}
                    >
                        <span ref={pillRef} className="nav-pill" aria-hidden="true" />
                        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
                            const active = match(pathname);
                            return (
                                <a
                                    key={href}
                                    href={withBase(href)}
                                    ref={(el) => {
                                        if (el) linkRefs.current.set(href, el);
                                        else linkRefs.current.delete(href);
                                    }}
                                    onPointerEnter={() => setHovered(href)}
                                    onFocus={() => setHovered(href)}
                                    onBlur={() => setHovered(null)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                                        'transition-[color,transform] duration-200 active:scale-95',
                                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
