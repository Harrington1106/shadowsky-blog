import { describe, it, expect } from 'vitest';
import { createTypewriterState, typewriterTick } from './typewriter.js';
import {
  getThemePalette,
  getSimResolution,
  shouldUseFallback,
  pickAutoSplatterColor,
  hexToRGB
} from './fluid-config.js';

// ═══════════════════════════════════════════
// fluid-config 纯函数测试
// ═══════════════════════════════════════════

describe('fluid-config: getThemePalette', () => {
  it('returns dark palette with 4 neon colors', () => {
    const p = getThemePalette('dark');
    expect(p.theme).toBe('dark');
    expect(p.colors).toHaveLength(4);
    expect(p.colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.dyeAlpha).toBeGreaterThan(0.7);
    expect(p.glowIntensity).toBeGreaterThan(0.5);
  });

  it('returns light palette with 4 desaturated colors', () => {
    const p = getThemePalette('light');
    expect(p.theme).toBe('light');
    expect(p.colors).toHaveLength(4);
    expect(p.dyeAlpha).toBeLessThan(0.5);
    expect(p.glowIntensity).toBeLessThan(0.6);
  });

  it('dark dye alpha is higher than light dye alpha', () => {
    expect(getThemePalette('dark').dyeAlpha)
      .toBeGreaterThan(getThemePalette('light').dyeAlpha);
  });

  it('dark bg is deep (#060B18), light bg is bright (#E8ECF1)', () => {
    expect(getThemePalette('dark').bgColor).toBe('#060B18');
    expect(getThemePalette('light').bgColor).toBe('#E8ECF1');
  });
});

describe('fluid-config: getSimResolution', () => {
  it('mobile (<640px) uses low resolution', () => {
    const r = getSimResolution(375);
    expect(r.simResolution).toBe(0.25);
    expect(r.dyeResolution).toBe(0.5);
  });

  it('tablet (640-1024) uses medium resolution', () => {
    const r = getSimResolution(768);
    expect(r.simResolution).toBe(0.35);
    expect(r.dyeResolution).toBe(0.7);
  });

  it('desktop (>1024) uses high resolution', () => {
    const r = getSimResolution(1440);
    expect(r.simResolution).toBe(0.5);
    expect(r.dyeResolution).toBe(1.0);
  });

  it('boundary values are handled correctly', () => {
    expect(getSimResolution(640).simResolution).toBe(0.35);
    expect(getSimResolution(639).simResolution).toBe(0.25);
    expect(getSimResolution(1024).simResolution).toBe(0.5);
    expect(getSimResolution(1023).simResolution).toBe(0.35);
  });
});

describe('fluid-config: shouldUseFallback', () => {
  it('falls back when WebGL unsupported', () => {
    expect(shouldUseFallback({ webglSupported: false, reducedMotion: false })).toBe(true);
  });

  it('falls back when reduced motion preferred', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: true })).toBe(true);
  });

  it('does NOT fall back when WebGL ok and motion allowed', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: false })).toBe(false);
  });

  it('falls back when both conditions are true', () => {
    expect(shouldUseFallback({ webglSupported: false, reducedMotion: true })).toBe(true);
  });
});

describe('fluid-config: pickAutoSplatterColor', () => {
  it('always returns a color from the palette', () => {
    const palette = getThemePalette('dark');
    for (let i = 0; i < 20; i++) {
      const c = pickAutoSplatterColor(palette, i);
      expect(palette.colors).toContain(c);
    }
  });

  it('cycles through colors deterministically', () => {
    const palette = getThemePalette('dark');
    expect(pickAutoSplatterColor(palette, 0)).toBe(palette.colors[0]);
    expect(pickAutoSplatterColor(palette, 1)).toBe(palette.colors[1]);
    expect(pickAutoSplatterColor(palette, 4)).toBe(palette.colors[0]); // wrap
  });
});

describe('fluid-config: hexToRGB', () => {
  it('converts hex to RGB components 0-1', () => {
    expect(hexToRGB('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(hexToRGB('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
    expect(hexToRGB('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
  });

  it('handles mid-range colors', () => {
    const rgb = hexToRGB('#3b82f6');
    expect(rgb.r).toBeCloseTo(0.231, 2);
    expect(rgb.g).toBeCloseTo(0.51, 2);
    expect(rgb.b).toBeCloseTo(0.965, 2);
  });
});

// ═══════════════════════════════════════════
// typewriter 状态机测试（已有）
// ═══════════════════════════════════════════

describe('typewriter: state machine', () => {
  const PHRASES = ['星河欲转千帆舞', '心有猛虎细嗅蔷薇'];

  it('initial state: typing, 0 chars shown, phrase index 0', () => {
    const s = createTypewriterState(PHRASES);
    expect(s.phase).toBe('typing');
    expect(s.shown).toBe(0);
    expect(s.phraseIndex).toBe(0);
    expect(s.phrases).toEqual(PHRASES);
  });

  it('typing tick increments shown until phrase length', () => {
    let s = createTypewriterState(PHRASES);
    s = typewriterTick(s);
    expect(s.shown).toBe(1);
    s = typewriterTick(s);
    expect(s.shown).toBe(2);
  });

  it('completes typing then enters pause phase', () => {
    let s = createTypewriterState(['AB']);
    s = typewriterTick(s);
    s = typewriterTick(s);
    expect(s.phase).toBe('pause');
    expect(s.shown).toBe(2);
  });

  it('after pause countdown, enters deleting phase', () => {
    let s = { phrases: ['AB'], phraseIndex: 0, shown: 2, phase: 'pause', pauseTicks: 0 };
    s = typewriterTick(s);
    expect(s.phase).toBe('pause');
    for (let i = 0; i < 150; i++) s = typewriterTick(s);
    expect(s.phase).toBe('deleting');
  });

  it('deleting decrements shown to 0 then advances to next phrase', () => {
    let s = { phrases: ['AB', 'CD'], phraseIndex: 0, shown: 2, phase: 'deleting', pauseTicks: 0 };
    s = typewriterTick(s);
    expect(s.shown).toBe(1);
    expect(s.phase).toBe('deleting');
    s = typewriterTick(s);
    expect(s.shown).toBe(0);
    expect(s.phase).toBe('typing');
    expect(s.phraseIndex).toBe(1);
  });

  it('wraps phrase index back to 0 after last phrase', () => {
    let s = { phrases: ['AB', 'CD'], phraseIndex: 1, shown: 2, phase: 'deleting', pauseTicks: 0 };
    s = typewriterTick(s);
    s = typewriterTick(s);
    expect(s.phraseIndex).toBe(0);
    expect(s.phase).toBe('typing');
  });
});
