'use client';

import { Code2, Telescope, Gamepad2, Moon, Star, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Typewriter from '@/components/Typewriter';
import Footer from '@/components/Footer';
import { withBase } from '@/lib/utils';

const PHRASES = [
    '星河欲转千帆舞',
    '心有猛虎，细嗅蔷薇',
    '且将新火试新茶，诗酒趁年华',
    '路漫漫其修远兮，吾将上下而求索',
    '星垂平野阔，月涌大江流',
];

const TAGS = [
    { icon: Code2, label: '全栈' },
    { icon: Telescope, label: '天文' },
    { icon: Gamepad2, label: 'ACG' },
    { icon: Moon, label: '夜猫子' },
    { icon: Star, label: '开源' },
    { icon: MapPin, label: '香港' },
];

export default function HomeContent() {
    return (
        <>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
                {/* 头像背后一层柔光,和站点的深空基调(OG 图、兜底封面)呼应。
                    纯装饰,aria-hidden;用 blur 的径向渐变而不是 box-shadow,免得跟头像边框叠出硬边。 */}
                <div className="relative">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] opacity-15 blur-2xl dark:opacity-25"
                    />
                    <Avatar className="size-28 border-4 border-background shadow-lg">
                        {/* 原来是 1080×1080 的 147KB JPEG,却只显示 112px —— 换成 256px webp(16KB)。
                            它是首屏最大的图,给 fetchPriority 让它早点开始下载。 */}
                        <AvatarImage
                            src={withBase('/img/avatar.webp')}
                            alt="Thoi 的头像"
                            width={112}
                            height={112}
                            fetchPriority="high"
                        />
                        <AvatarFallback>S</AvatarFallback>
                    </Avatar>
                </div>

                {/* 全大写标题用 tracking-tight 会挤在一起 —— 大写字母本来就需要更松的字距 */}
                <h1 className="mt-7 text-4xl font-extrabold tracking-[0.08em] sm:text-5xl">SHADOW THOI</h1>

                {/* min-h 而不是固定 h:极窄屏上标语换行时不会被裁掉 */}
                <div className="mt-5 min-h-7">
                    <Typewriter phrases={PHRASES} />
                </div>

                {/* 标签是纯展示,不可点 —— 所以不给 hover 效果,免得让人以为能点 */}
                <div className="mt-8 flex max-w-md flex-wrap justify-center gap-2">
                    {TAGS.map(({ icon: Icon, label }) => (
                        <Badge
                            key={label}
                            variant="outline"
                            className="gap-1.5 rounded-full border-border/70 bg-muted/40 px-3 py-1 text-xs font-normal text-muted-foreground"
                        >
                            <Icon className="size-3.5 opacity-70" /> {label}
                        </Badge>
                    ))}
                </div>
            </main>

            <Footer pageId="home" />
        </>
    );
}
