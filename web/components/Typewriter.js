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

    // leading-7 是固定行高(28px),和外层容器的 min-h-7 对齐。
    // 必须固定:否则删完字后行盒高度只由内容撑,整行会塌几个像素,
    // 底下的标签跟着上下跳(实测跳 1.9px)。
    return (
        <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            {/*
              逐字变化的文本对读屏软件是噪音(每打一个字都可能被重读),
              所以动画部分整体 aria-hidden,另给一句静态的仅读屏文本。
            */}
            <span className="sr-only">{phrases[0]}</span>
            {/* ⚠ 这里不能用 inline-flex:flex 容器的高度由内容决定,文字删空后
                只剩光标撑着,行盒会塌。普通行内布局的行高来自父元素的 line-height,
                与内容多少无关,才不会抖。 */}
            <span aria-hidden="true" className="group/tw">
                <span ref={textRef} />
                {/*
                  光标:
                  - 用 caret-blink(硬切)而不是 animate-pulse(正弦淡入淡出)—— 后者像呼吸灯,不像光标
                  - 打字/删字时(父元素带 data-typing)停止闪烁保持常亮,停顿时才闪,与真终端一致
                  - 高度跟随字号但压在行高以内(1.05em < leading-7),不会把行盒撑高
                  - motion-safe:只在用户没要求减少动效时才闪
                */}
                <span
                    className="ml-1 inline-block h-[1.05em] w-[2px] rounded-full bg-foreground/70 align-middle motion-safe:animate-caret-blink group-data-[typing=true]/tw:animate-none"
                />
            </span>
        </p>
    );
}
