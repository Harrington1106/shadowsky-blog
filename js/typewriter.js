// 打字机状态机 —— 纯函数，可测；DOM 胶水在文件末尾的 init 函数

// 每个 tick 的时间映射（由调用方用 setInterval 控制，这里只管状态转换）
export const PAUSE_TICKS = 150;   // 打完一句停留约 2.5s（按 16ms/tick 计）

/**
 * 创建初始打字机状态
 * @param {string[]} phrases
 */
export function createTypewriterState(phrases) {
  return {
    phrases,
    phraseIndex: 0,
    shown: 0,
    phase: 'typing',   // 'typing' | 'pause' | 'deleting'
    pauseTicks: 0
  };
}

/**
 * 推进一个 tick，返回新状态（不可变）
 * @param {object} state
 * @returns {object} 新状态
 */
export function typewriterTick(state) {
  const current = state.phrases[state.phraseIndex];

  if (state.phase === 'typing') {
    const shown = state.shown + 1;
    if (shown >= current.length) {
      return { ...state, shown: current.length, phase: 'pause', pauseTicks: 0 };
    }
    return { ...state, shown };
  }

  if (state.phase === 'pause') {
    const pauseTicks = state.pauseTicks + 1;
    if (pauseTicks >= PAUSE_TICKS) {
      return { ...state, phase: 'deleting', pauseTicks: 0 };
    }
    return { ...state, pauseTicks };
  }

  // deleting
  const shown = state.shown - 1;
  if (shown <= 0) {
    const nextIndex = (state.phraseIndex + 1) % state.phrases.length;
    return { ...state, shown: 0, phraseIndex: nextIndex, phase: 'typing', pauseTicks: 0 };
  }
  return { ...state, shown };
}

// ── DOM 胶水（浏览器端，不参与单测）──

/**
 * DOM 胶水：把状态机接到页面元素
 * @param {string} targetSelector - 文字容器选择器
 * @param {string[]} phrases
 * @param {{typeMs:number, deleteMs:number}} opts
 */
export function initTypewriter(targetSelector, phrases, opts = {}) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(targetSelector);
  if (!el) return;

  const typeMs = opts.typeMs || 60;
  const deleteMs = opts.deleteMs || 30;

  let state = createTypewriterState(phrases);
  // 光标元素
  el.innerHTML = '<span class="tw-text"></span><span class="cursor">&nbsp;</span>';
  const textNode = el.querySelector('.tw-text');

  // typing 阶段：每 typeMs 推进
  // pause/deleting 阶段：固定 16ms 推进
  function step() {
    const before = state.phase;
    state = typewriterTick(state);
    textNode.textContent = state.phrases[state.phraseIndex].slice(0, state.shown);

    let delay = 16;
    if (before === 'typing') delay = typeMs;
    else if (before === 'deleting') delay = deleteMs;
    setTimeout(step, delay);
  }
  step();
}

if (typeof window !== 'undefined') {
  window.LiquidTypewriter = { createTypewriterState, typewriterTick, initTypewriter, PAUSE_TICKS };
}
