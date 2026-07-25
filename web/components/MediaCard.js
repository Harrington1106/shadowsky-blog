'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { STATUS_VARIANT, statusText } from '@/lib/media';
import { withBase } from '@/lib/utils';

/**
 * 追番/追漫 卡片
 */
export default function MediaCard({ item, type }) {
    const variant = STATUS_VARIANT[item.status] || 'outline';
    const text = statusText(type, item.status);
    const displayTag = item.tag && item.tag.trim() ? item.tag : text;

    const progressInfo = type === 'anime'
        ? (item.status === 'plan' ? '加入片单' : (item.status === 'completed' ? `全 ${item.total} 话` : `看到第 ${item.progress} 话`))
        : (item.status === 'completed' ? '已读完' : `上次读到第 ${item.progress}`);

    const showProgressBar = !(item.status === 'plan' || (!item.total && !item.progress));
    const percentage = item.total && typeof item.total === 'number' ? (item.progress / item.total) * 100 : 50;

    return (
        <Card className="gap-2 overflow-hidden py-0 pb-3">
            <div className="relative aspect-2/3 overflow-hidden bg-muted">
                <img
                    src={item.cover}
                    alt={item.title}
                    className={`h-full w-full object-cover transition-transform duration-500 hover:scale-105 ${type === 'manga' ? 'grayscale' : ''}`}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = withBase('/img/default-book.jpg'); }}
                />
                <Badge variant={variant} className="absolute top-2 right-2 max-w-[80%] truncate shadow">{displayTag}</Badge>
                {type === 'anime' && showProgressBar && (
                    <div className="absolute inset-x-2 bottom-2">
                        <Progress value={percentage} />
                    </div>
                )}
            </div>
            <CardContent className="px-3">
                <h3 className="line-clamp-1 text-sm font-semibold" title={item.title}>{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{progressInfo}</p>
            </CardContent>
        </Card>
    );
}
