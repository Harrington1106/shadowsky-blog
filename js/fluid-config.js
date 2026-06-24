// 流体引擎纯函数配置层 —— v4 多页面支持
// 末尾挂载到 window.LiquidFluidConfig 供非 module 脚本调用
// ============================================================

// 暗色霓虹色板（高饱和发光）：青/蓝/紫/品红
const DARK_COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
// 亮色色板（降饱和提亮，白底上像水彩晕染）：浅青/浅蓝/浅紫/浅粉
const LIGHT_COLORS = ['#5eead4', '#93c5fd', '#c4b5fd', '#f9a8d4'];

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
      dyeAlpha: 0.18,
      bgColor: '#E8ECF1',
      glowIntensity: 0.4
    };
  }
  return {
    theme: 'dark',
    colors: DARK_COLORS,
    dyeAlpha: 0.85,
    bgColor: '#060B18',
    glowIntensity: 0.7
  };
}

/**
 * 根据视口宽度返回流体模拟分辨率（性能分级）
 * @param {number} width
 * @returns {{simResolution:number, dyeResolution:number}}
 */
export function getSimResolution(width) {
  if (width < 640) return { simResolution: 0.2, dyeResolution: 0.4 };
  if (width < 1024) return { simResolution: 0.3, dyeResolution: 0.6 };
  return { simResolution: 0.5, dyeResolution: 1.0 };
}

/**
 * 判定是否应降级到 CSS 后备方案
 * @param {{webglSupported:boolean, reducedMotion:boolean, isMobile:boolean}} env
 * @returns {boolean}
 */
export function shouldUseFallback({ webglSupported, reducedMotion, isMobile }) {
  if (reducedMotion) return true;
  if (!webglSupported) return true;
  if (isMobile) return true; // 移动端直接用 CSS 流体，省电
  return false;
}

/**
 * 页面流体模式配置
 * @param {string} pageName - 'home'|'blog'|'about'|'moments'|'other'
 * @returns {{mode:string, webgl:boolean, cssBlobs:boolean, intensity:string}}
 */
export function getPageFluidMode(pageName) {
  const modes = {
    home: {
      mode: 'full',
      webgl: true,
      cssBlobs: false,
      intensity: 'strong',
      description: '全屏 WebGL 流体画布'
    },
    blog: {
      mode: 'ambient',
      webgl: false,
      cssBlobs: true,
      intensity: 'gentle',
      description: 'CSS 流体光斑 + 可选 WebGL 微流体'
    },
    about: {
      mode: 'ambient',
      webgl: false,
      cssBlobs: true,
      intensity: 'gentle',
      description: 'CSS 流体光斑柔和背景'
    },
    moments: {
      mode: 'ambient',
      webgl: false,
      cssBlobs: true,
      intensity: 'subtle',
      description: '极淡 CSS 光斑，不干扰照片浏览'
    },
    other: {
      mode: 'ambient',
      webgl: false,
      cssBlobs: true,
      intensity: 'subtle',
      description: '极淡背景光斑'
    }
  };
  return modes[pageName] || modes.other;
}

/**
 * 自动喷溅选色 —— 确定性轮转
 * @param {{colors:string[]}} palette
 * @param {number} index
 * @returns {string}
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

// ── window 挂载 ──
if (typeof window !== 'undefined') {
  window.LiquidFluidConfig = {
    getThemePalette,
    getSimResolution,
    shouldUseFallback,
    getPageFluidMode,
    pickAutoSplatterColor,
    hexToRGB
  };
}

// ── CommonJS 兼容 ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getThemePalette,
    getSimResolution,
    shouldUseFallback,
    getPageFluidMode,
    pickAutoSplatterColor,
    hexToRGB
  };
}
