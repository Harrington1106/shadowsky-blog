'use client';

import { useEffect, useState } from 'react';
import {
    Code2, Telescope, Mail, Link as LinkIcon, Rss, Github, Twitter, ExternalLink,
    Layers, Database, Server, PenLine, Bot,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { withBase } from '@/lib/utils';
import { localSimpleIcon } from '@/lib/iconMirror';

const LUCIDE_ICON_MAP = {
    mail: Mail,
    rss: Rss,
    github: Github,
    twitter: Twitter,
    'external-link': ExternalLink,
    link: LinkIcon,
};

/**
 * 站点小档案 —— 写的都是线上真实在跑的东西，改栈了就来改这里。
 * 最后一条是故意放在最后的：既然上面那张卡已经坦白了，这里就把作者一栏也写实。
 */
const SITE_SPECS = [
    { icon: Layers, label: '框架', value: 'Next.js 15 · React 19' },
    { icon: Code2, label: '样式', value: 'Tailwind CSS v4 · shadcn/ui' },
    { icon: Database, label: '数据', value: 'SQLite · Drizzle · Markdown 文件' },
    { icon: Server, label: '主机', value: '阿里云 ECS（杭州）· Docker · Cloudflare' },
    { icon: PenLine, label: '写作', value: 'Obsidian，一条命令上线' },
    { icon: Bot, label: '代码', value: 'Claude Code 写，我审' },
];

/** 分节标题：小号大写 eyebrow + 一条渐隐横线，整页的分节节奏靠它统一 */
function SectionTitle({ id, children }) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <h2 id={id} className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {children}
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
    );
}

export default function AboutPage() {
    const [social, setSocial] = useState([]);
    const [isDark, setIsDark] = useState(true);
    const [waved, setWaved] = useState(false);

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

    return (
        <>
            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
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
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>大四学生</span>
                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>学习者</span>
                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>探索者</span>
                    </div>

                    <p className="mt-7 text-lg leading-relaxed text-balance text-muted-foreground italic">
                        仰望星空，是为了更好地脚踏实地。
                    </p>
                </header>

                {/* 各分节统一 mt-14，比原来的 mt-8 更能分出层次；节内元素才用 mt-4/6 */}
                <section className="mt-14" aria-labelledby="about-me">
                    <SectionTitle id="about-me">关于我</SectionTitle>
                    <p className="text-sm leading-7 text-foreground/90">
                        我是 Thoi，在读大四。这里放我看的番、读到的东西，以及折腾服务器时踩的坑。没有弹窗、广告和推荐算法，也不打算有。
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                    <Code2 size={18} />
                                </div>
                                <CardTitle className="mt-2">构建</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    想做的东西一般先在脑子里放几天，一个周末做出来，再花两周修它跑不起来的部分。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <Badge variant="secondary">Next.js</Badge>
                                    <Badge variant="secondary">SQLite</Badge>
                                    <Badge variant="secondary">Docker</Badge>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <Telescope size={18} />
                                </div>
                                <CardTitle className="mt-2">探索</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    天文、深空摄影、RSS、别人的开源项目。喜欢那些自己这辈子多半到不了的尺度。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <Badge variant="secondary">天文</Badge>
                                    <Badge variant="secondary">RSS</Badge>
                                    <Badge variant="secondary">开源</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="mt-14" aria-labelledby="about-site">
                    <SectionTitle id="about-site">建站说明</SectionTitle>

                    <p className="text-sm leading-7 text-foreground/90">
                        代码基本由 Claude Code 写，我提需求、做决定、负责让它在服务器上活着。列在这儿是因为该说一声。
                    </p>

                    {/* 独立站里叫 colophon 的那种清单：一行一条事实，不写成散文。
                        dt/dd 语义，宽屏两列；图标只引导视线、不承载信息，故 aria-hidden */}
                    <Card className="mt-4">
                        <CardContent>
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                {SITE_SPECS.map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-start gap-2.5">
                                        <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground/70" />
                                        <div className="min-w-0">
                                            <dt className="text-xs text-muted-foreground">{label}</dt>
                                            <dd className="text-sm text-foreground/90">{value}</dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        订阅和收藏那两页是我自己每天在用的，顺手就公开了。
                    </p>
                </section>

                <section className="mt-14" aria-labelledby="say-hi">
                    <SectionTitle id="say-hi">打个招呼</SectionTitle>

                    <div className="flex flex-col items-center gap-2 py-2">
                        <Button onClick={handleWave} disabled={waved}>
                            {waved ? '✨ 已收到！' : '👋 向 Thoi 打个招呼'}
                        </Button>
                        {/* 高度常驻，避免文案出现时把下面的内容顶下去 */}
                        <p className="min-h-5 text-sm text-muted-foreground transition-opacity" style={{ opacity: waved ? 1 : 0 }}>
                            谢谢你的来访！✨
                        </p>
                    </div>

                    <div className="mt-2 flex flex-wrap justify-center gap-1">
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
                    </div>
                </section>

                <div className="mt-14 border-t pt-8 text-center">
                    <p className="text-sm leading-7 text-balance text-muted-foreground">
                        这个站会一直改，因为总有看不顺眼的地方。<br />要是你在这儿找到点有用的东西，那就更好了。
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground italic">—— 2026. Thoi</p>
                </div>
            </main>

            <Footer pageId="about" />
            <BackToTop />
        </>
    );
}
