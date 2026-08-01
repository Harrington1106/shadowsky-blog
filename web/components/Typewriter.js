'use client';

import { useEffect, useRef } from 'react';
import { initTypewriter } from '@/lib/typewriterEngine';

export default function Typewriter({ phrases, typeMs = 60, deleteMs = 30 }) {
    const textRef = useRef(null);

    useEffect(() => {
        const stop = initTypewriter(textRef.current, phrases, { typeMs, deleteMs });
        return stop;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <p className="text-base text-muted-foreground sm:text-lg">
            {/*
              逐字变化的文本对读屏软件是噪音(每打一个字都可能被重读),
              所以动画部分整体 aria-hidden,另给一句静态的仅读屏文本。
            */}
            <span className="sr-only">{phrases[0]}</span>
            <span aria-hidden="true">
                <span ref={textRef} />
                {/* 光标:motion-safe 才闪,用户要求减少动效时保持常亮 */}
                <span className="ml-0.5 inline-block w-0.5 bg-current align-middle motion-safe:animate-pulse">&nbsp;</span>
            </span>
        </p>
    );
}
