'use client';

import { useState } from 'react';
import { Play, Eye, Film } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatViews, videoCategoryLabel } from '@/lib/media';
import { cardSurface, cardInteractive, cn } from '@/lib/utils';

/**
 * 视频卡片
 */
export default function VideoCard({ video, onPlay, showCategory = false }) {
    const [broken, setBroken] = useState(false);

    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay();
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`播放 ${video.title}`}
            className={cn(cardSurface, cardInteractive, 'group cursor-pointer overflow-hidden')}
            onClick={onPlay}
            onKeyDown={onKeyDown}
        >
            <div className="relative aspect-video overflow-hidden bg-muted">
                {/* 缩略图挂了就露出底下这层图标，别留一个空的灰框 */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                    <Film size={28} />
                </div>
                {!broken && (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(video.thumbnail || '')}`}
                        alt={video.title}
                        className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setBroken(true)}
                    />
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                {showCategory && video.category && (
                    <Badge variant="secondary" className="absolute top-2 left-2 shadow-sm">{videoCategoryLabel(video.category)}</Badge>
                )}
                <span className="absolute right-2 bottom-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] leading-none font-medium text-white tabular-nums">
                    {video.duration}
                </span>

                {/* ⚠ 播放键不能只挂 group-hover —— Tailwind 的 hover: 外面裹着 @media (hover: hover)，
                    触屏上永远不会亮，等于整张卡看不出是能点的。没有 hover 的设备直接常显。 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:bg-transparent [@media(hover:none)]:opacity-100">
                    <span className="flex size-12 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg backdrop-blur transition-transform duration-200 motion-safe:group-hover:scale-110">
                        <Play size={20} className="ml-0.5 fill-current" />
                    </span>
                </div>
            </div>

            <div className="px-3 pt-2.5 pb-3">
                <h3 className="line-clamp-2 text-sm leading-snug font-semibold transition-colors group-hover:text-primary">{video.title}</h3>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={12} /> <span className="tabular-nums">{formatViews(video.views)}</span>
                </div>
            </div>
        </div>
    );
}
