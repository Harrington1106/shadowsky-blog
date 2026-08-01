'use client';

import { Code2, Telescope, Gamepad2, Moon, Star, MapPin, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Typewriter from '@/components/Typewriter';
import Footer from '@/components/Footer';
import { cardSurface, cn, withBase } from '@/lib/utils';
import { postHref } from '@/lib/links';

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

function fmtDate(s) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s || '';
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function HomeContent({ latestPosts = [], stats = null }) {
    return (
        <>
            <main className="flex flex-1 flex-col items-center px-4 py-16 text-center sm:py-20">
                <Avatar className="size-28 border-4 border-background shadow-lg">
                    <AvatarImage src={withBase('/img/avatar.jpg')} alt="Avatar" />
                    <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">SHADOW THOI</h1>
                <div className="mt-4 h-7">
                    <Typewriter phrases={PHRASES} />
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {TAGS.map(({ icon: Icon, label }) => (
                        <Badge key={label} variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                            <Icon size={13} /> {label}
                        </Badge>
                    ))}
                </div>

                {stats && (
                    <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
                        <StatLink href="/blog" n={stats.postCount} label="篇笔记" />
                        <StatLink href="/anime" n={stats.animeCount} label="部追番" />
                        <StatLink href="/manga" n={stats.mangaCount} label="部漫画" />
                        <StatLink href="/bookmarks" n={stats.bookmarkCount} label="条收藏" />
                    </div>
                )}

                {latestPosts.length > 0 && (
                    <section className="mt-16 w-full max-w-3xl text-left">
                        <div className="mb-4 flex items-baseline justify-between">
                            <h2 className="text-lg font-bold">最新笔记</h2>
                            <Button variant="ghost" size="sm" render={<a href={withBase('/blog')} />} nativeButton={false}>
                                全部 <ArrowRight size={14} />
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {latestPosts.map((p) => (
                                <a
                                    key={p.file}
                                    href={withBase(postHref(p.file))}
                                    className={cn(cardSurface, 'block p-4 transition-colors hover:bg-accent/40 hover:ring-primary/40')}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="line-clamp-1 text-sm font-semibold">{p.title}</h3>
                                        {p.category && <Badge variant="secondary" className="shrink-0 text-[0.65rem]">{p.category}</Badge>}
                                    </div>
                                    {p.excerpt && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>}
                                    <div className="mt-2.5 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
                                        <span className="inline-flex items-center gap-1"><Calendar size={11} className="opacity-60" />{fmtDate(p.date)}</span>
                                        <span className="inline-flex items-center gap-1"><Clock size={11} className="opacity-60" />{p.readTime || 5} 分钟</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Footer pageId="home" />
        </>
    );
}

function StatLink({ href, n, label }) {
    return (
        <a href={withBase(href)} className="group inline-flex items-baseline gap-1.5 transition-colors hover:text-primary">
            <span className="text-xl font-bold tabular-nums">{n}</span>
            <span className="text-xs text-muted-foreground group-hover:text-primary">{label}</span>
        </a>
    );
}
