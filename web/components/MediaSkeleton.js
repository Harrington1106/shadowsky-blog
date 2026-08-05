import { Skeleton } from '@/components/ui/skeleton';

/**
 * 追番/追漫卡片的骨架屏。
 *
 * 照着 MediaCard 的形状搭：2:3 封面 + 标题行 + 进度行，外面同样一圈 ring。
 * /anime 与 /manga 原先各写了一个光秃秃的 `aspect-2/3` 方块，真卡片进来时
 * 底下那截文字凭空多出来，整页要往下顶一截 —— 骨架屏和真身必须同高。
 */
export default function MediaSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Skeleton className="aspect-2/3 w-full rounded-none" />
            <div className="space-y-2 px-3 pt-2.5 pb-3">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}
