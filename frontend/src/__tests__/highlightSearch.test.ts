import { describe, it, expect } from 'vitest';
import { rateBadgeClass } from '@/lib/useHighlightSearch';

describe('rateBadgeClass', () => {
  it('80% 이상이면 rate-high', () => {
    expect(rateBadgeClass(80)).toBe('rate-high');
    expect(rateBadgeClass(100)).toBe('rate-high');
    expect(rateBadgeClass(95)).toBe('rate-high');
  });

  it('60~79%는 rate-mid', () => {
    expect(rateBadgeClass(60)).toBe('rate-mid');
    expect(rateBadgeClass(79)).toBe('rate-mid');
    expect(rateBadgeClass(70)).toBe('rate-mid');
  });

  it('60% 미만은 rate-low', () => {
    expect(rateBadgeClass(59)).toBe('rate-low');
    expect(rateBadgeClass(0)).toBe('rate-low');
    expect(rateBadgeClass(30)).toBe('rate-low');
  });
});
