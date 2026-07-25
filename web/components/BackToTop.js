'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 回到顶部按钮 + Lenis 平滑滚动
 */
export default function BackToTop() {
    const [visible, setVisible] = useState(false);
    const lenisRef = useRef(null);

    useEffect(() => {
        let raf;
        let cancelled = false;
        import('@studio-freight/lenis').then(({ default: Lenis }) => {
            if (cancelled) return;
            const lenis = new Lenis({
                duration: 0.6,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -6 * t)),
                smoothTouch: false,
                touchMultiplier: 2,
            });
            lenisRef.current = lenis;
            window.lenis = lenis;
            function loop(time) {
                lenis.raf(time);
                raf = requestAnimationFrame(loop);
            }
            raf = requestAnimationFrame(loop);
            lenis.on('scroll', ({ scroll }) => setVisible(scroll > 500));
        });
        return () => {
            cancelled = true;
            if (raf) cancelAnimationFrame(raf);
            lenisRef.current?.destroy?.();
        };
    }, []);

    return (
        <Button
            variant="outline"
            size="icon"
            aria-label="回到顶部"
            onClick={() => lenisRef.current?.scrollTo(0, { duration: 0.8 })}
            className={cn(
                'fixed bottom-6 right-6 z-40 rounded-full shadow-md transition-opacity',
                visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
        >
            <ChevronUp size={20} />
        </Button>
    );
}
