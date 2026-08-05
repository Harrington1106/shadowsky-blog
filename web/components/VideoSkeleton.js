import { Skeleton } from '@/components/ui/skeleton';

/** 视频卡片的骨架屏，形状对齐 VideoCard（16:9 缩略图 + 标题 + 播放量）。理由同 MediaSkeleton。 */
export default function VideoSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-2 px-3 pt-2.5 pb-3">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
    );
}
