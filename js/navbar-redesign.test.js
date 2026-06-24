import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';

function readCss() {
  return readFileSync(path.join(ROOT, 'css/unified.css'), 'utf8');
}

describe('navbar redesign: unified inline-groove style', () => {
  const css = readCss();

  it('navbar uses floating pill design (border-radius:full)', () => {
    expect(css).toContain('border-radius:var(--radius-full)');
  });

  it('navbar is centered (left:50%;transform:translateX)', () => {
    expect(css).toContain('left:50%');
    expect(css).toContain('translateX(-50%)');
  });

  it('nav-link has transparent background by default', () => {
    expect(css).toContain('background:transparent');
  });

  it('nav-link active uses only color change (no background/border/box)', () => {
    expect(css).toContain('.nav-link.active');
    expect(css).toContain('background:transparent;border:none');
  });

  it('defines nav-divider between brand and links', () => {
    expect(css).toContain('.nav-divider');
  });
});
