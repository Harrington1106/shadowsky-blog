import { describe, it, expect } from 'vitest';
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
