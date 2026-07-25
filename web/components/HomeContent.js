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
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
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
            </main>

            <Footer pageId="home" />
        </>
    );
}
