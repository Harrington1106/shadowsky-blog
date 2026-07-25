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
            <span ref={textRef} />
            <span className="ml-0.5 inline-block w-0.5 animate-pulse bg-current align-middle">&nbsp;</span>
        </p>
    );
}
