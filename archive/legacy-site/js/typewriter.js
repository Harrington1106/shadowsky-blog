// 打字机状态机 —— 纯函数 + DOM 胶水，UMD 通用
(function() {
  'use strict';

  var PAUSE_TICKS = 150;

  function createTypewriterState(phrases) {
    return {
      phrases: phrases,
      phraseIndex: 0,
      shown: 0,
      phase: 'typing',
      pauseTicks: 0
    };
  }

  function typewriterTick(state) {
    var current = state.phrases[state.phraseIndex];

    if (state.phase === 'typing') {
      var shown = state.shown + 1;
      if (shown >= current.length) {
        return { phrases: state.phrases, phraseIndex: state.phraseIndex, shown: current.length, phase: 'pause', pauseTicks: 0 };
      }
      return { phrases: state.phrases, phraseIndex: state.phraseIndex, shown: shown, phase: 'typing', pauseTicks: 0 };
    }

    if (state.phase === 'pause') {
      var pt = state.pauseTicks + 1;
      if (pt >= PAUSE_TICKS) {
        return { phrases: state.phrases, phraseIndex: state.phraseIndex, shown: state.shown, phase: 'deleting', pauseTicks: 0 };
      }
      return { phrases: state.phrases, phraseIndex: state.phraseIndex, shown: state.shown, phase: 'pause', pauseTicks: pt };
    }

    // deleting
    var ds = state.shown - 1;
    if (ds <= 0) {
      var nextIndex = (state.phraseIndex + 1) % state.phrases.length;
      return { phrases: state.phrases, phraseIndex: nextIndex, shown: 0, phase: 'typing', pauseTicks: 0 };
    }
    return { phrases: state.phrases, phraseIndex: state.phraseIndex, shown: ds, phase: 'deleting', pauseTicks: 0 };
  }

  /**
   * DOM 胶水：把状态机接到页面元素
   */
  function initTypewriter(targetSelector, phrases, opts) {
    if (typeof document === 'undefined') return;
    opts = opts || {};
    var el = document.querySelector(targetSelector);
    if (!el) return;

    var typeMs = opts.typeMs || 60;
    var deleteMs = opts.deleteMs || 30;

    var state = createTypewriterState(phrases);
    el.innerHTML = '<span class="tw-text"></span><span class="cursor">&nbsp;</span>';
    var textNode = el.querySelector('.tw-text');
    if (!textNode) return;

    function step() {
      var before = state.phase;
      state = typewriterTick(state);
      textNode.textContent = state.phrases[state.phraseIndex].slice(0, state.shown);

      var delay = 16;
      if (before === 'typing') delay = typeMs;
      else if (before === 'deleting') delay = deleteMs;
      setTimeout(step, delay);
    }
    step();
  }

  var api = {
    createTypewriterState: createTypewriterState,
    typewriterTick: typewriterTick,
    initTypewriter: initTypewriter,
    PAUSE_TICKS: PAUSE_TICKS
  };

  if (typeof window !== 'undefined') {
    window.LiquidTypewriter = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
