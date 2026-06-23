// 流体引擎纯函数配置层 —— UMD 模式，浏览器和 vitest 通用
(function() {
  'use strict';

  // 暗色霓虹色板（高饱和发光）：蓝/紫/品红/青
  const DARK_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
  // 亮色色板（降饱和提亮，白底上像水彩晕染）：浅蓝/浅紫/浅粉/浅青
  const LIGHT_PALETTE = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#67e8f9'];

  /**
   * 根据主题返回流体色板配置
   */
  function getThemePalette(theme) {
    if (theme === 'light') {
      return { theme: 'light', colors: LIGHT_PALETTE, dyeAlpha: 0.35, bgColor: '#060B18' };
    }
    return { theme: 'dark', colors: DARK_PALETTE, dyeAlpha: 0.85, bgColor: '#060B18' };
  }

  /**
   * 根据视口宽度返回流体模拟分辨率（性能分级）
   */
  function getSimResolution(width) {
    if (width < 640) return { simResolution: 0.25, dyeResolution: 0.5 };
    if (width < 1024) return { simResolution: 0.35, dyeResolution: 0.7 };
    return { simResolution: 0.5, dyeResolution: 1.0 };
  }

  /**
   * 判定是否应降级到 CSS 后备方案
   */
  function shouldUseFallback(_a) {
    var webglSupported = _a.webglSupported, reducedMotion = _a.reducedMotion;
    return !webglSupported || reducedMotion;
  }

  /**
   * 自动喷溅选色 —— 确定性轮转
   */
  function pickAutoSplatterColor(palette, index) {
    return palette.colors[index % palette.colors.length];
  }

  const config = {
    getThemePalette: getThemePalette,
    getSimResolution: getSimResolution,
    shouldUseFallback: shouldUseFallback,
    pickAutoSplatterColor: pickAutoSplatterColor
  };

  // ── Browser ──
  if (typeof window !== 'undefined') {
    window.LiquidFluidConfig = config;
  }

  // ── Node / vitest ──
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  }
})();
