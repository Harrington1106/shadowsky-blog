'use client';

import { Sparkles, Film, Mic, Swords, Telescope, Moon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Typewriter from '@/components/Typewriter';
import Footer from '@/components/Footer';
import { withBase } from '@/lib/utils';
import { FALLBACK_PHRASES } from '@/lib/hitokoto';

// 这六个是站主自己定的(2026-08-01),偏兴趣/身份而不是内容索引 —— 首页是"我是谁",
// 不负责概括文章主题。站上能对上的:
//   AI   —— 每天 cron 生成的 AI 日报 + 订阅页的 AI 翻译
//   ACG  —— 78 部番 + 59 部漫画 + 10 个剪辑
//   追星 —— /gnz48.html 日程页 + 每天 3:00 的日历更新 cron
//   天文 —— 站名与整站视觉基调
// 换掉的:全栈(文章几乎不写编程,写的是运维,标签会造成预期错位)、香港(维度不一致)。
const TAGS = [
    { icon: Sparkles, label: 'AI' },
    { icon: Film, label: 'ACG' },
    { icon: Mic, label: '追星' },
    { icon: Swords, label: 'LOL' },
    { icon: Telescope, label: '天文' },
    { icon: Moon, label: '夜猫子' },
];

// phrases 由服务端从一言取好传进来(见 lib/hitokoto.js);取不到时用兜底那批
export default function HomeContent({ phrases = FALLBACK_PHRASES }) {
    return (
        <>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
                {/* 头像背后一层柔光,和站点的深空基调(OG 图、兜底封面)呼应。
                    纯装饰,aria-hidden;用 blur 的径向渐变而不是 box-shadow,免得跟头像边框叠出硬边。 */}
                <div className="relative">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.45)_0%,rgba(139,92,246,0.22)_45%,transparent_72%)] opacity-0 blur-2xl dark:opacity-100"
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
                    <Typewriter phrases={phrases} />
                </div>

                {/* 标签是纯展示,不可点 —— 所以不给 hover 效果,免得让人以为能点。
                    不要加 max-w:六个标签本来一行放得下,限宽会把最后一个挤到第二行落单。 */}
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {TAGS.map(({ icon: Icon, label }) => (
                        <Badge
                            key={label}
                            variant="outline"
                            className="gap-1.5 rounded-full border-border bg-muted/60 px-3 py-1 text-xs font-normal text-foreground/75 dark:bg-muted/30 dark:text-foreground/70"
                        >
                            <Icon className="size-3.5 opacity-60" /> {label}
                        </Badge>
                    ))}
                </div>
            </main>

            <Footer pageId="home" />
        </>
    );
}
