'use client';

import { Play, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * 视频卡片
 */
export default function VideoCard({ video, onPlay }) {
    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay();
        }
    }

    return (
        <Card
            role="button"
            tabIndex={0}
            aria-label={`播放 ${video.title}`}
            className="group cursor-pointer gap-2 overflow-hidden py-0 pb-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={onPlay}
            onKeyDown={onKeyDown}
        >
            <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                    src={`/api/image-proxy?url=${encodeURIComponent(video.thumbnail || '')}`}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                />
                <Badge variant="secondary" className="absolute bottom-2 right-2">{video.duration}</Badge>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex size-12 items-center justify-center rounded-full bg-background/80 shadow">
                        <Play size={20} className="fill-current" />
                    </div>
                </div>
            </div>
            <CardContent className="px-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={12} /> {video.views}
                </div>
            </CardContent>
        </Card>
    );
}
