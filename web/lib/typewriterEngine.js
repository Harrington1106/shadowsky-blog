/**
 * 打字机状态机 —— 移植自 v1 的 js/typewriter.js
 *
 * 2026-08-01 修了三处浪费/打扰：
 *   1. 句子打完的停顿原本是「150 次 × 16ms 的空转 tick」,每跳都跑一次状态机
 *      并给 textContent 赋值(内容根本没变)。改成一次 setTimeout(PAUSE_MS)。
 *   2. 标签页切到后台后照跑不误 —— 现在监听 visibilitychange,不可见就停,回来再继续。
 *   3. 尊重 prefers-reduced-motion:用户要求减少动效时不做逐字动画,直接显示第一句。
 */

const PAUSE_MS = 2400;

function createTypewriterState(phrases) {
    return { phrases, phraseIndex: 0, shown: 0, phase: 'typing' };
}

/** 推进一步,返回 { state, delay } —— delay 是下一步该等多久 */
function typewriterTick(state, { typeMs, deleteMs }) {
    const current = state.phrases[state.phraseIndex];

    if (state.phase === 'typing') {
        const shown = state.shown + 1;
        if (shown >= current.length) {
            // 整句打完 → 停顿一次,不再用一堆空转 tick 凑时间
            return { state: { ...state, shown: current.length, phase: 'pause' }, delay: PAUSE_MS };
        }
        return { state: { ...state, shown, phase: 'typing' }, delay: typeMs };
    }

    if (state.phase === 'pause') {
        return { state: { ...state, phase: 'deleting' }, delay: deleteMs };
    }

    const shown = state.shown - 1;
    if (shown <= 0) {
        const phraseIndex = (state.phraseIndex + 1) % state.phrases.length;
        return { state: { ...state, phraseIndex, shown: 0, phase: 'typing' }, delay: typeMs };
    }
    return { state: { ...state, shown, phase: 'deleting' }, delay: deleteMs };
}

/**
 * DOM 胶水：驱动一个 <span> 的打字机效果
 * @param {HTMLElement} textNode
 * @param {string[]} phrases
 * @param {{typeMs?: number, deleteMs?: number}} opts
 * @returns {() => void} 停止函数
 */
export function initTypewriter(textNode, phrases, opts = {}) {
    if (!textNode || !phrases?.length) return () => {};

    const typeMs = opts.typeMs || 60;
    const deleteMs = opts.deleteMs || 30;

    // 用户要求减少动效 → 直接把第一句摆上,不做动画
    const reduceMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        textNode.textContent = phrases[0];
        return () => {};
    }

    let state = createTypewriterState(phrases);
    let timer = null;
    let stopped = false;
    let lastText = '';
    let lastPhase = '';

    // 光标的行为交给 CSS:正在打字/删字时挂 data-typing,让它保持常亮;
    // 停顿时去掉,恢复闪烁 —— 真终端就是这样,一边打一边闪会很躁。
    const host = textNode.parentElement;
    function markPhase(phase) {
        if (!host || phase === lastPhase) return;
        if (phase === 'pause') delete host.dataset.typing;
        else host.dataset.typing = 'true';
        lastPhase = phase;
    }

    function schedule(delay) {
        timer = setTimeout(step, delay);
    }

    function step() {
        if (stopped) return;
        const { state: next, delay } = typewriterTick(state, { typeMs, deleteMs });
        state = next;
        const text = state.phrases[state.phraseIndex].slice(0, state.shown);
        if (text !== lastText) { // 内容没变就不碰 DOM
            textNode.textContent = text;
            lastText = text;
        }
        markPhase(state.phase);
        schedule(delay);
    }

    function onVisibility() {
        if (document.hidden) {
            clearTimeout(timer);
            timer = null;
        } else if (!stopped && timer === null) {
            schedule(typeMs);
        }
    }

    document.addEventListener('visibilitychange', onVisibility);
    schedule(typeMs);

    return function stop() {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
