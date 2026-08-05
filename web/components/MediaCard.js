'use client';

import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUS_VARIANT, statusText, progressInfo } from '@/lib/media';
import { cardSurface, cardInteractive, cn, withBase } from '@/lib/utils';

/**
 * 追番/追漫 卡片
 *
 * 条目 id 就是 Bangumi 的 subject id（见 /api/media 的 POST 注释），能拼出条目页地址，
 * 于是整张卡做成外链 —— 卡片上只有标题和进度，想看简介/评分总得再去搜一次。
 * 手工加进来的条目未必是数字 id，拿不准就退回不可点的普通卡片。
 */
export default function MediaCard({ item, type }) {
    const variant = STATUS_VARIANT[item.status] || 'outline';
    const status = statusText(type, item.status);
    const displayTag = item.tag && item.tag.trim() ? item.tag : status;
    const { text, percent } = progressInfo(item, type);
    const subjectUrl = /^\d+$/.test(String(item.id || '')) ? `https://bgm.tv/subject/${item.id}` : null;

    const cover = (
        <div className="relative aspect-2/3 overflow-hidden bg-muted">
            <img
                src={item.cover}
                alt={item.title}
                className={cn(
                    'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
                    // 漫画封面统一去色，和追番区分开；鼠标停上去再还原成彩色
                    type === 'manga' && 'grayscale transition-[transform,filter] group-hover:grayscale-0'
                )}
                loading="lazy"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = withBase('/img/default-book.jpg'); }}
            />

            {/* 底部压一层渐变：进度条和集数是白字，浅色封面上没这层就糊成一片 */}
            {percent !== null && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
            )}

            <Badge variant={variant} className="absolute top-2 right-2 max-w-[80%] truncate shadow-sm">{displayTag}</Badge>

            {subjectUrl && (
                <span
                    className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                >
                    <ExternalLink size={12} />
                </span>
            )}

            {percent !== null && (
                <div className="absolute inset-x-2.5 bottom-2.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-1 text-right text-[10px] leading-none font-medium text-white/90 tabular-nums">{percent}%</div>
                </div>
            )}
        </div>
    );

    const body = (
        <div className="px-3 pt-2.5 pb-3">
            <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary" title={item.title}>
                {item.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{text}</p>
        </div>
    );

    if (!subjectUrl) {
        return <div className={cn(cardSurface, 'group overflow-hidden')}>{cover}{body}</div>;
    }

    return (
        <a
            href={subjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`在 Bangumi 查看《${item.title}》`}
            className={cn(cardSurface, cardInteractive, 'group block overflow-hidden')}
        >
            {cover}
            {body}
        </a>
    );
}
