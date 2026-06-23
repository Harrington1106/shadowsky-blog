import { describe, it, expect } from 'vitest';
import {
  getThemePalette,
  getSimResolution,
  shouldUseFallback,
  pickAutoSplatterColor
} from './fluid-config.js';

describe('fluid-config: getThemePalette', () => {
  it('returns dark palette with 4 neon colors for dark theme', () => {
    const palette = getThemePalette('dark');
    expect(palette.theme).toBe('dark');
    expect(palette.colors).toHaveLength(4);
    expect(palette.colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns light palette with desaturated colors for light theme', () => {
    const palette = getThemePalette('light');
    expect(palette.theme).toBe('light');
    expect(palette.colors).toHaveLength(4);
  });

  it('dark dye alpha is high (glowing), light dye alpha is low (soft)', () => {
    expect(getThemePalette('dark').dyeAlpha).toBeGreaterThan(getThemePalette('light').dyeAlpha);
  });
});

describe('fluid-config: getSimResolution', () => {
  it('mobile (<640px) uses low resolution 0.25/0.5', () => {
    const r = getSimResolution(375);
    expect(r.simResolution).toBe(0.25);
    expect(r.dyeResolution).toBe(0.5);
  });
  it('tablet (640-1024) uses medium resolution 0.35/0.7', () => {
    const r = getSimResolution(768);
    expect(r.simResolution).toBe(0.35);
    expect(r.dyeResolution).toBe(0.7);
  });
  it('desktop (>1024) uses high resolution 0.5/1.0', () => {
    const r = getSimResolution(1440);
    expect(r.simResolution).toBe(0.5);
    expect(r.dyeResolution).toBe(1.0);
  });
});

describe('fluid-config: shouldUseFallback', () => {
  it('falls back when WebGL is unsupported', () => {
    expect(shouldUseFallback({ webglSupported: false, reducedMotion: false })).toBe(true);
  });
  it('falls back when user prefers reduced motion', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: true })).toBe(true);
  });
  it('does NOT fall back when WebGL ok and motion allowed', () => {
    expect(shouldUseFallback({ webglSupported: true, reducedMotion: false })).toBe(false);
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
});

import { createTypewriterState, typewriterTick } from './typewriter.js';

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
