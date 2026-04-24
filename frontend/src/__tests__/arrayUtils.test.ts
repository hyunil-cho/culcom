import { describe, it, expect } from 'vitest';
import { swapInArray } from '@/lib/arrayUtils';

describe('swapInArray', () => {
  it('두 인덱스의 요소를 서로 교환한다', () => {
    expect(swapInArray([1, 2, 3, 4], 0, 3)).toEqual([4, 2, 3, 1]);
  });

  it('가운데 요소는 그대로 두고 양끝만 교환한다 (드래그 대상/드롭 대상만 위치 변경)', () => {
    const input = ['A', 'B', 'C'];
    const result = swapInArray(input, 0, 2);
    expect(result).toEqual(['C', 'B', 'A']);
    expect(result[1]).toBe('B');
  });

  it('원본 배열을 변경하지 않는다 (불변성)', () => {
    const input = [1, 2, 3];
    const result = swapInArray(input, 0, 2);
    expect(input).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
  });

  it('같은 인덱스를 지정하면 배열은 그대로이되 새 배열 인스턴스를 반환한다', () => {
    const input = [1, 2, 3];
    const result = swapInArray(input, 1, 1);
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
  });

  it('범위를 벗어나는 인덱스는 변경 없이 배열 복제만 반환', () => {
    expect(swapInArray([1, 2, 3], -1, 0)).toEqual([1, 2, 3]);
    expect(swapInArray([1, 2, 3], 0, 5)).toEqual([1, 2, 3]);
  });

  it('인접한 두 요소도 교환한다', () => {
    expect(swapInArray(['A', 'B', 'C'], 0, 1)).toEqual(['B', 'A', 'C']);
    expect(swapInArray(['A', 'B', 'C'], 1, 2)).toEqual(['A', 'C', 'B']);
  });
});
