'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * B 站视频播放弹窗 —— 用官方 iframe 播放器。
 *
 * 这里原本先请求 /api/bilibili_playurl 取直链、失败再回退 iframe，但该端点在 v1 时代
 * 就不存在（v2 也没有），每次打开视频都只是白跑一个 404 再回退，故直接走 iframe。
 * 若将来要取直链，需要新增 Route Handler 处理 B 站的 referer/wbi 签名限制。
 *
 * 注意：外链播放器必须带 isOutside=true，否则 B 站只返回「你感兴趣的视频都在B站」占位页。
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
                                    src={`https://player.bilibili.com/player.html?isOutside=true&bvid=${player.bvid}&p=1&high_quality=1&autoplay=1&danmaku=0&as_wide=1`}
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
                        {player?.kind === 'iframe' && (
                            <p className="text-xs text-muted-foreground/70">
                                B 站对第三方站点内嵌有限制，播放器可能只显示占位图 —— 点上方按钮到 B 站观看。
                            </p>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
