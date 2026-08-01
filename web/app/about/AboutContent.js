'use client';

import { useEffect, useState } from 'react';
import { Code2, Telescope, Mail, Link as LinkIcon, Rss, Github, Twitter, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { withBase } from '@/lib/utils';

const LUCIDE_ICON_MAP = {
    mail: Mail,
    rss: Rss,
    github: Github,
    twitter: Twitter,
    'external-link': ExternalLink,
    link: LinkIcon,
};

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
                    <Avatar className="size-24 border-4 border-background shadow">
                        <AvatarImage src={withBase('/img/avatar.jpg')} alt="Avatar" />
                        <AvatarFallback>T</AvatarFallback>
                    </Avatar>
                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Thoi</h1>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>大四学生</span>
                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>学习者</span>
                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                        <span>探索者</span>
                    </div>
                </header>

                <p className="mt-8 text-center text-lg italic leading-relaxed text-muted-foreground">
                    仰望星空，是为了更好地脚踏实地。<br />构建代码，是为了更自由地表达思想。
                </p>

                <p className="mt-8 text-justify text-sm leading-relaxed text-foreground/90">
                    很高兴你能来到这里。我是 Thoi，一个在多元兴趣中探索成长的大四学生。从代码构建到星空观测，我始终保持着好奇与热情。这个网站没有弹窗、没有广告、没有复杂交互——一个在数字洪流中可以片刻驻足的安静角落。
                </p>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                <Code2 size={18} />
                            </div>
                            <CardTitle className="mt-2">构建</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">崇尚简洁与高效。好的代码应该像诗歌一样，逻辑清晰，韵律优美。</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <Badge variant="secondary">React</Badge>
                                <Badge variant="secondary">TypeScript</Badge>
                                <Badge variant="secondary">Tailwind</Badge>
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
                            <p className="text-sm text-muted-foreground">被未知与宏大所吸引。深空摄影、RSS 阅读、开源世界——拓展认知的边界。</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <Badge variant="secondary">Astro</Badge>
                                <Badge variant="secondary">Nature</Badge>
                                <Badge variant="secondary">RSS</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mt-8">
                    <CardContent className="text-center">
                        <p className="text-sm italic leading-relaxed text-muted-foreground">
                            在这个信息爆炸的时代，我希望通过 RSS 订阅回归阅读的本质，通过精选的网页收藏构建知识的图谱。去除了多余的装饰，只保留最核心的阅读体验。
                        </p>
                    </CardContent>
                </Card>

                <div className="mt-8 flex flex-col items-center gap-2">
                    <Button onClick={handleWave} disabled={waved}>
                        {waved ? '✨ 已收到！' : '👋 向 Thoi 打个招呼'}
                    </Button>
                    <p className="text-sm text-muted-foreground transition-opacity" style={{ opacity: waved ? 1 : 0 }}>
                        谢谢你的来访！✨
                    </p>
                </div>

                <p className="mt-8 text-center text-sm leading-relaxed text-muted-foreground">
                    这个网站是我数字生命的一部分，它会随着我的成长而缓慢生长。<br />如果你能在这里找到一篇有用的文章，一张喜欢的图片，那便是我最大的荣幸。
                </p>
                <p className="mt-2 text-center text-sm italic text-muted-foreground">—— 2025. Thoi</p>

                <div className="mt-8 flex flex-wrap justify-center gap-1">
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
                                    <img src={`https://cdn.simpleicons.org/${icon.replace('simple:', '')}/${isDark ? 'white' : '333'}`} width={20} height={20} alt="" />
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
            </main>

            <Footer pageId="about" />
            <BackToTop />
        </>
    );
}
