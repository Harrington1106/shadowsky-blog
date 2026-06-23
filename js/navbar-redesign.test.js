import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'd:/Projects/shadowsky-blog';

function readCss() {
  return readFileSync(path.join(ROOT, 'css/unified.css'), 'utf8');
}

describe('navbar redesign: unified inline-groove style', () => {
  const css = readCss();

  it('nav-link has transparent background (no independent pill)', () => {
    // 新设计：默认背景透明，不再是独立玻璃药丸
    expect(css).toContain('background:transparent');
  });

  it('defines a hover groove highlight class', () => {
    expect(css).toContain('.nav-link:hover');
  });

  it('defines an active state with neon underline', () => {
    expect(css).toContain('.nav-link.active');
    // active 态有霓虹下划线（渐变）
    expect(css).toMatch(/linear-gradient.*--neon/);
  });

  it('brand and links are separated by a divider', () => {
    expect(css).toContain('.nav-divider');
  });
});
