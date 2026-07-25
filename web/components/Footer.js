'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { fetchVisitCount } from '@/lib/api';

/**
 * 底栏 —— 访问计数
 */
export default function Footer({ pageId = 'blog' }) {
    const [count, setCount] = useState('—');

    useEffect(() => {
        let cancelled = false;
        fetchVisitCount(pageId).then((d) => {
            if (!cancelled) setCount(d.count);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [pageId]);

    return (
        <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
                <Eye size={14} /> <span>{count}</span>
            </span>
            <span className="mx-2">·</span>
            <span>&copy; 2026 夏日科技探索 — Designed with ❤️</span>
        </footer>
    );
}
