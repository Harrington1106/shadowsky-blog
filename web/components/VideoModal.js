'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * B 站视频播放弹窗 —— 优先通过 /api/bilibili_playurl 拿真实视频流，失败回退官方 iframe 播放器
 */
export default function VideoModal({ video, onClose }) {
    const [player, setPlayer] = useState(null); // { kind: 'video'|'iframe'|'demo', url|bvid }

    useEffect(() => {
        if (!video) return;
        setPlayer(null);

        let cancelled = false;
        if (video.bvid) {
            fetch(`/api/bilibili_playurl?bvid=${video.bvid}`)
                .then((r) => r.json())
                .then((data) => {
                    if (cancelled) return;
                    if (data.success && data.url) setPlayer({ kind: 'video', url: data.url });
                    else setPlayer({ kind: 'iframe', bvid: video.bvid });
                })
                .catch(() => {
                    if (!cancelled) setPlayer({ kind: 'iframe', bvid: video.bvid });
                });
        } else {
            setPlayer({ kind: 'demo' });
        }
        return () => { cancelled = true; };
    }, [video]);

    return (
        <Dialog open={!!video} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-2xl">
                {video && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{video.title}</DialogTitle>
                        </DialogHeader>

                        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                            {!player && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            )}
                            {player?.kind === 'video' && (
                                <video
                                    src={player.url}
                                    controls
                                    autoPlay
                                    poster={video.thumbnail || ''}
                                    playsInline
                                    className="absolute inset-0 h-full w-full object-contain"
                                />
                            )}
                            {player?.kind === 'iframe' && (
                                <iframe
                                    src={`https://player.bilibili.com/player.html?bvid=${player.bvid}&page=1&high_quality=1&autoplay=1&danmaku=0&as_wide=1`}
                                    scrolling="no"
                                    frameBorder="no"
                                    allowFullScreen
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                                    allow="autoplay; fullscreen"
                                    className="absolute inset-0 h-full w-full"
                                />
                            )}
                            {player?.kind === 'demo' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white">
                                    <p className="font-bold">{video.title}</p>
                                    <p className="text-sm text-white/60">视频播放演示模式</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">Bilibili</Badge>
                            <span>{video.views} 次播放</span>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
