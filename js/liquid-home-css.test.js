import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';

function readCss() {
  return readFileSync(path.join(ROOT, 'css/liquid-home.css'), 'utf8');
}

describe('liquid-home.css: required classes', () => {
  it('defines liquid-glass and liquid-glass-strong classes', () => {
    const css = readCss();
    expect(css).toContain('.liquid-glass');
    expect(css).toContain('.liquid-glass-strong');
  });

  it('uses backdrop-filter for glass effect', () => {
    const css = readCss();
    expect(css).toContain('backdrop-filter');
    expect(css).toContain('blur');
  });

  it('defines avatar ring', () => {
    const css = readCss();
    expect(css).toContain('.avatar-ring');
  });

  it('defines typewriter element', () => {
    const css = readCss();
    expect(css).toContain('.typewriter');
    expect(css).toContain('.cursor');
  });

  it('defines tag pills', () => {
    const css = readCss();
    expect(css).toContain('.tag-pill');
  });

  it('defines home footer with visit count', () => {
    const css = readCss();
    expect(css).toContain('.home-footer');
    expect(css).toContain('.visit-count');
  });

  it('defines single-screen layout (100dvh)', () => {
    const css = readCss();
    expect(css).toContain('100dvh');
  });

  it('defines responsive breakpoints', () => {
    const css = readCss();
    expect(css).toContain('max-width: 640px');
    expect(css).toContain('max-width: 1024px');
  });
});
