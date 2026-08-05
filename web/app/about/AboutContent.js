'use client';

import { useEffect, useState } from 'react';
import {
    Sparkles, Film, Mic, Swords, Telescope, Moon,
    Mail, Link as LinkIcon, Rss, Github, Twitter, ExternalLink,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { withBase } from '@/lib/utils';
import { localSimpleIcon } from '@/lib/iconMirror';
import { INTEREST_TAGS } from '@/lib/site';
import { FAVORITES } from '@/lib/favorites';
import BGM_COVERS from '@/lib/bgmCovers.json';

const LUCIDE_ICON_MAP = {
    mail: Mail,
    rss: Rss,
    github: Github,
    twitter: Twitter,
    'external-link': ExternalLink,
    link: LinkIcon,
};

// 兴趣标签的图标；清单本身在 lib/site.js，首页用的是同一份
const TAG_ICONS = { Sparkles, Film, Mic, Swords, Telescope, Moon };

/**
 * 站点声明 —— 是「规矩」不是「参数」：转载、隐私、广告、免责、评论。
 * 技术栈那类细节不属于这里（访客不关心，站主也不需要一个页面来记）。
 *
 * 隐私那条对应 /api/page-visit：访问记录写自家 SQLite，站上没有任何第三方
 * 统计脚本 —— next.config.js 的 no-transform 还专门挡掉了 Cloudflare 自动
 * 注入的 RUM beacon。改动这些之前别动这句话。
 */
const FACTS = [
    '文章随便转，带上原文链接、注明出处就行。',
    '没用第三方统计，访问记录只留在自己的服务器上，不交给任何人。',
    '不放广告，也不接推广和恰饭外链。',
    '文章只代表写的时候的我，看到过时或写错的地方欢迎告诉我。',
    '站上没有评论区，有话直接邮件或私信。',
    '代码基本由 Claude Code 写。',
];

/** 小节标题：一条细线 + 标题，比整块 eyebrow 轻，不会把页面切碎 */
function Heading({ children, extra }) {
    return (
        <div className="mt-10 mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">{children}</h2>
            {extra}
        </div>
    );
}

export default function AboutPage() {
    const [social, setSocial] = useState([]);
    const [isDark, setIsDark] = useState(true);
    const [waved, setWaved] = useState(false);
    const [media, setMedia] = useState(null);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
        function onThemeChange(e) {
            setIsDark(e.detail ? e.detail.isDark : document.documentElement.classList.contains('dark'));
        }
        window.addEventListener('themeChange', onThemeChange);
        return () => window.removeEventListener('themeChange', onThemeChange);
    }, []);

    useEffect(() => {
        fetch('/api/social')
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data)) setSocial(data.filter(Boolean)); })
            .catch(() => {});
        // 追番进度实时读库 —— 写死在页面上就会变成第二份要人工维护的清单
        fetch('/api/media')
            .then((r) => r.json())
            .then((d) => { if (d && Array.isArray(d.anime)) setMedia(d); })
            .catch(() => {});
    }, []);

    async function handleWave() {
        const { default: confetti } = await import('canvas-confetti');
        const d = { origin: { y: 0.7 } };
        confetti({ ...d, particleCount: 50, spread: 26, startVelocity: 55 });
        confetti({ ...d, particleCount: 40, spread: 60 });
        confetti({ ...d, particleCount: 70, spread: 100, decay: 0.91, scalar: 0.8 });
        confetti({ ...d, particleCount: 20, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        confetti({ ...d, particleCount: 20, spread: 120, startVelocity: 45 });
        setWaved(true);
        fetch('/api/wave', { method: 'POST' }).catch(() => {});
    }

    const watching = media ? media.anime.filter((a) => a.status === 'watching') : [];
    const reading = media ? media.manga.filter((m) => m.status === 'reading').length : 0;
    const finished = media ? [...media.anime, ...media.manga].filter((m) => m.status === 'completed').length : 0;

    return (
        <>
            <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
                <header className="flex flex-col items-center text-center">
                    {/* 头像柔光和首页同一套，两页之间跳转时视觉是连着的；纯装饰，只在深色下出现 */}
                    <div className="relative">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-7 -z-10 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.45)_0%,rgba(139,92,246,0.22)_45%,transparent_72%)] opacity-0 blur-2xl dark:opacity-100"
                        />
                        <Avatar className="size-24 border-4 border-background shadow-lg">
                            <AvatarImage src={withBase('/img/avatar.webp')} alt="Thoi 的头像" width={96} height={96} fetchPriority="high" />
                            <AvatarFallback>T</AvatarFallback>
                        </Avatar>
                    </div>
                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Thoi</h1>

                    {/* 小档案排成一行点分隔，不另起一块 —— 三条信息不值得占一张卡，
                        分块反而把页面切碎(参考 Tw93:坐标 + 专业 + 身份一句话带过) */}
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span>江西</span>
                        <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>测绘工程 · 大四</span>
                        <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/50" />
                        <a
                            href="https://www.16personalities.com/infp-personality"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
                        >
                            INFP-T
                        </a>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground italic">仰望星空，是为了更好地脚踏实地。</p>
                </header>

                <p className="mt-8 text-sm leading-7 text-foreground/90">
                    这个站是自己搭着玩的，写点东西、存点东西，顺便把追的番和收藏的网页都放在一处。
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {INTEREST_TAGS.map(({ icon, label }) => {
                        const Icon = TAG_ICONS[icon];
                        return (
                            <Badge
                                key={label}
                                variant="outline"
                                className="gap-1.5 rounded-full border-border bg-muted/60 px-3 py-1 text-xs font-normal text-foreground/75 dark:bg-muted/30 dark:text-foreground/70"
                            >
                                <Icon className="size-3.5 opacity-60" /> {label}
                            </Badge>
                        );
                    })}
                </div>

                <Heading>我喜欢的</Heading>
                {/* 封面是镜像到本站的 webp(scripts/mirror-bgm-covers.mjs)，不直连 bgm 图床。
                    海报固定 2:3，图没加载完也不会跳版 */}
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {FAVORITES.map(({ id, title }) => (
                        <li key={id}>
                            <a
                                href={`https://bgm.tv/subject/${id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`在 Bangumi 上查看《${title}》`}
                                className="group block outline-none"
                            >
                                <img
                                    src={withBase(BGM_COVERS[id])}
                                    alt=""
                                    width={240}
                                    height={360}
                                    loading="lazy"
                                    className="aspect-2/3 w-full rounded-lg bg-muted object-cover ring-1 ring-foreground/10 transition-all duration-200 group-hover:ring-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-primary motion-safe:group-hover:-translate-y-0.5"
                                />
                                <span className="mt-1.5 block truncate text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                                    {title}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>

                <Heading
                    extra={
                        <a href={withBase('/acg')} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                            全部 →
                        </a>
                    }
                >
                    最近在追
                </Heading>
                <ul className="space-y-2.5">
                    {watching.map((a) => {
                        const total = Number(a.total) > 0 ? Number(a.total) : null;
                        const pct = total ? Math.min(100, Math.round((a.progress / total) * 100)) : 0;
                        return (
                            <li key={a.id} className="flex items-center gap-3">
                                <span className="min-w-0 flex-1 truncate text-sm" title={a.title}>{a.title}</span>
                                {/* 进度条给 role+aria-label，屏读器不会只听见一个空 span */}
                                <span
                                    role="img"
                                    aria-label={`已看 ${a.progress} 话，共 ${a.total} 话`}
                                    className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-muted"
                                >
                                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                                </span>
                                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                    {a.progress}/{a.total}
                                </span>
                            </li>
                        );
                    })}
                    {media && watching.length === 0 && <li className="text-sm text-muted-foreground">这阵子没追新番。</li>}
                    {!media && <li className="text-sm text-muted-foreground">读取中…</li>}
                </ul>

                {media && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        另有 <strong className="font-semibold text-foreground tabular-nums">{reading}</strong> 部漫画在读，
                        <strong className="font-semibold text-foreground tabular-nums">{finished}</strong> 部已看完。
                    </p>
                )}

                <Heading>这个站</Heading>
                <ul className="space-y-2">
                    {FACTS.map((f) => (
                        <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span>{f}</span>
                        </li>
                    ))}
                </ul>

                <Heading>找我</Heading>
                <div className="flex flex-wrap items-center gap-1">
                    {social.map((s) => {
                        const isMail = s.url && s.url.indexOf('mailto:') === 0;
                        const icon = s.icon || 'lucide:link';
                        const linkProps = {
                            href: s.url,
                            target: isMail ? undefined : '_blank',
                            rel: isMail ? undefined : 'noopener noreferrer',
                            'aria-label': s.name,
                            title: s.name,
                        };
                        if (icon.startsWith('simple:')) {
                            return (
                                <Button key={s.name} variant="ghost" size="icon" render={<a {...linkProps} />} nativeButton={false}>
                                    {/* 本地镜像优先(scripts/mirror-icons.mjs);没镜像才回落 CDN —— 那条大陆 TTFB 3.5s */}
                                    <img
                                        src={localSimpleIcon(icon.replace('simple:', ''), isDark)
                                            || `https://cdn.simpleicons.org/${icon.replace('simple:', '')}/${isDark ? 'white' : '333'}`}
                                        width={20}
                                        height={20}
                                        alt=""
                                    />
                                </Button>
                            );
                        }
                        const Icon = LUCIDE_ICON_MAP[icon.replace('lucide:', '')] || LinkIcon;
                        return (
                            <Button key={s.name} variant="ghost" size="icon" render={<a {...linkProps} />} nativeButton={false}>
                                <Icon size={18} />
                            </Button>
                        );
                    })}
                    <Button variant="outline" size="sm" onClick={handleWave} disabled={waved} className="ml-1 rounded-full">
                        {waved ? '✨ 收到了，谢谢' : '👋 打个招呼'}
                    </Button>
                </div>

                <p className="mt-10 border-t pt-6 text-sm leading-7 text-muted-foreground">
                    这个站会一直改，因为总有看不顺眼的地方。要是你在这儿找到点有用的东西，那就更好了。
                </p>
            </main>

            <Footer pageId="about" />
            <BackToTop />
        </>
    );
}
