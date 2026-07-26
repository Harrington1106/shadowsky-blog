'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * B 站视频播放弹窗 —— 用 B 站的 H5 移动端播放器嵌入。
 *
 * 为什么不是 player.bilibili.com/player.html：那个外链播放器在第三方站点内嵌时，
 * 画面区域会被「你感兴趣的视频都在B站」推广面板盖住（加 isOutside=true、去 sandbox、
 * referrerPolicy=no-referrer 均无效，三个不同 bvid 表现一致，非单个稿件的转载设置）。
 * blackboard/html5mobileplayer.html 则能正常出画面，实测于 2026-07-26。
 *
 * 参数：danmaku=0 关弹幕，hideCoverInfo=1 去播放量浮层，highQuality=1 优先高清，
 *       fjw=0 关“记忆上次播放位置”的跳转提示。
 */
export default function VideoModal({ video, onClose }) {
    const [player, setPlayer] = useState(null); // { kind: 'iframe'|'demo', bvid }

    useEffect(() => {
        if (!video) return;
        setPlayer(video.bvid ? { kind: 'iframe', bvid: video.bvid } : { kind: 'demo' });
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
                            {player?.kind === 'iframe' && (
                                <iframe
                                    src={`https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${player.bvid}&p=1&autoplay=1&danmaku=0&hideCoverInfo=1&highQuality=1&fjw=0`}
                                    scrolling="no"
                                    frameBorder="no"
                                    allowFullScreen
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

                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">Bilibili</Badge>
                            <span>{video.views} 次播放</span>
                            {video.bvid && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto"
                                    nativeButton={false}
                                    render={
                                        <a
                                            href={`https://www.bilibili.com/video/${video.bvid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    }
                                >
                                    <ExternalLink className="size-4" /> 在 B 站打开
                                </Button>
                            )}
                        </div>

                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
