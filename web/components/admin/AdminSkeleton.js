import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * 后台列表的骨架屏。
 *
 * 每个后台页原本都是 `useState([])` 起手,数据没回来时那句 `items.length === 0 &&
 * <p>暂无 XX</p>` 就先渲染出来了 —— 慢网络下先闪一句「暂无收藏」再跳出满屏数据,
 * 看着像数据丢过一次。加载态和空态必须是两件事。
 *
 * 三个形状分别对着三类页面:横条列表(文章/随手拍/订阅源)、封面网格(追番/视频)、
 * 表格(收藏/打招呼)。骨架高度照真身量,免得数据进来时整页往下顶。
 */

/** 横条列表:左侧一个方图标 + 两行文字 + 右侧操作位 */
export function ListSkeleton({ rows = 5, thumb = true }) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
                <Card key={i} className="flex-row items-center gap-3 p-3">
                    {thumb && <Skeleton className="size-10 shrink-0 rounded-md" />}
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="size-8 shrink-0 rounded-md" />
                </Card>
            ))}
        </div>
    );
}

/** 封面网格。aspect 跟着页面走:追番是 2:3 海报,视频是 16:9 */
export function GridSkeleton({ count = 8, aspect = 'poster', className }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className={cn('gap-0 overflow-hidden py-0', className)}>
                    <Skeleton className={cn('w-full rounded-none', aspect === 'video' ? 'aspect-video' : 'aspect-[2/3]')} />
                    <CardContent className="space-y-2 p-2.5">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                </Card>
            ))}
        </>
    );
}

/** 表格行骨架 —— 套在真表格的 thead 下面,列宽跟着表头走 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    );
}

/** 独立表格骨架(连表头一起),给还没渲染出表头的场景用 */
export function StandaloneTableSkeleton({ rows = 5, cols = 3 }) {
    return (
        <Card className="overflow-hidden py-0">
            <Table><TableSkeleton rows={rows} cols={cols} /></Table>
        </Card>
    );
}
