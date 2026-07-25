/**
 * 打字机状态机 —— 移植自 ../../js/typewriter.js
 */

const PAUSE_TICKS = 150;

function createTypewriterState(phrases) {
    return { phrases, phraseIndex: 0, shown: 0, phase: 'typing', pauseTicks: 0 };
}

function typewriterTick(state) {
    const current = state.phrases[state.phraseIndex];

    if (state.phase === 'typing') {
        const shown = state.shown + 1;
        if (shown >= current.length) {
            return { ...state, shown: current.length, phase: 'pause', pauseTicks: 0 };
        }
        return { ...state, shown, phase: 'typing', pauseTicks: 0 };
    }

    if (state.phase === 'pause') {
        const pt = state.pauseTicks + 1;
        if (pt >= PAUSE_TICKS) return { ...state, phase: 'deleting', pauseTicks: 0 };
        return { ...state, phase: 'pause', pauseTicks: pt };
    }

    // deleting
    const ds = state.shown - 1;
    if (ds <= 0) {
        return { ...state, phraseIndex: (state.phraseIndex + 1) % state.phrases.length, shown: 0, phase: 'typing', pauseTicks: 0 };
    }
    return { ...state, shown: ds, phase: 'deleting', pauseTicks: 0 };
}

/**
 * DOM 胶水：驱动一个 <span> 文本节点的打字机效果
 * @param {HTMLElement} textNode
 * @param {string[]} phrases
 * @param {{typeMs?: number, deleteMs?: number}} opts
 * @returns {() => void} 停止函数
 */
export function initTypewriter(textNode, phrases, opts = {}) {
    if (!textNode) return () => {};
    const typeMs = opts.typeMs || 60;
    const deleteMs = opts.deleteMs || 30;

    let state = createTypewriterState(phrases);
    let timer = null;
    let stopped = false;

    function step() {
        if (stopped) return;
        const before = state.phase;
        state = typewriterTick(state);
        textNode.textContent = state.phrases[state.phraseIndex].slice(0, state.shown);

        let delay = 16;
        if (before === 'typing') delay = typeMs;
        else if (before === 'deleting') delay = deleteMs;
        timer = setTimeout(step, delay);
    }
    step();

    return function stop() {
        stopped = true;
        if (timer) clearTimeout(timer);
    };
}
