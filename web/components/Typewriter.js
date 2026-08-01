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
            <span aria-hidden="true" className="group/tw inline-flex items-center">
                <span ref={textRef} />
                {/*
                  光标:
                  - 用 caret-blink(硬切)而不是 animate-pulse(正弦淡入淡出)—— 后者像呼吸灯,不像光标
                  - 打字/删字时(父元素带 data-typing)停止闪烁保持常亮,停顿时才闪,与真终端一致
                  - 高度跟随字号(h-[1.15em])而不是靠 &nbsp; 撑,换字号不会错位
                  - motion-safe:只在用户没要求减少动效时才闪
                */}
                <span
                    className="ml-1 inline-block h-[1.15em] w-[2px] shrink-0 translate-y-[0.08em] rounded-full bg-foreground/70 motion-safe:animate-caret-blink group-data-[typing=true]/tw:animate-none"
                />
            </span>
        </p>
    );
}
