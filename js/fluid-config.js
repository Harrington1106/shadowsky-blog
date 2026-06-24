// 流体引擎纯函数配置层 —— 可被 vitest import 测试
// 末尾挂载到 window.LiquidFluidConfig 供非 module 脚本调用
// ============================================================

// 暗色霓虹色板（高饱和发光）：蓝/紫/品红/青
const DARK_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
// 亮色色板（降饱和提亮，白底上像水彩晕染）：浅蓝/浅紫/浅粉/浅青
const LIGHT_COLORS = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#67e8f9'];

/**
 * 根据主题返回流体色板配置
 * @param {'dark'|'light'} theme
 * @returns {{theme:string, colors:string[], dyeAlpha:number, bgColor:string, glowIntensity:number}}
 */
export function getThemePalette(theme) {
  if (theme === 'light') {
    return {
      theme: 'light',
      colors: LIGHT_COLORS,
      dyeAlpha: 0.18,        // 亮色下低透明度，柔和
      bgColor: '#E8ECF1',
      glowIntensity: 0.4
    };
  }
  return {
    theme: 'dark',
    colors: DARK_COLORS,
    dyeAlpha: 0.85,         // 暗色下高发光
    bgColor: '#060B18',
    glowIntensity: 0.7
  };
}

/**
 * 根据视口宽度返回流体模拟分辨率（性能分级）
 * @param {number} width - 视口宽度 px
 * @returns {{simResolution:number, dyeResolution:number}}
 */
export function getSimResolution(width) {
  if (width < 640) return { simResolution: 0.25, dyeResolution: 0.5 };
  if (width < 1024) return { simResolution: 0.35, dyeResolution: 0.7 };
  return { simResolution: 0.5, dyeResolution: 1.0 };
}

/**
 * 判定是否应降级到 CSS 后备方案
 * @param {{webglSupported:boolean, reducedMotion:boolean}} env
 * @returns {boolean}
 */
export function shouldUseFallback({ webglSupported, reducedMotion }) {
  return !webglSupported || reducedMotion;
}

/**
 * 自动喷溅选色 —— 确定性轮转（基于索引取模），保证无重复相邻
 * @param {{colors:string[]}} palette
 * @param {number} index - 喷溅序号
 * @returns {string} hex 颜色
 */
export function pickAutoSplatterColor(palette, index) {
  return palette.colors[index % palette.colors.length];
}

/**
 * 将 hex 颜色转为 RGB 分量 (0-1)
 * @param {string} hex
 * @returns {{r:number, g:number, b:number}}
 */
export function hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}

// ── window 挂载（供非 ES module 的 fluid-bg.js 调用）──
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = {
    getThemePalette,
    getSimResolution,
    shouldUseFallback,
    pickAutoSplatterColor,
    hexToRGB
  };
}

// ── CommonJS 兼容（供 vitest 直接 import）──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getThemePalette,
    getSimResolution,
    shouldUseFallback,
    pickAutoSplatterColor,
    hexToRGB
  };
}
