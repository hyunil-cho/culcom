import { describe, it, expect } from 'vitest';
import { toServerDateTime, formatDateTime } from '@/lib/dateUtils';

describe('toServerDateTime', () => {
  it('"T"를 공백으로 변환', () => {
    expect(toServerDateTime('2026-04-15T23:12')).toBe('2026-04-15 23:12');
  });

  it('T가 없으면 그대로 반환', () => {
    expect(toServerDateTime('2026-04-15 23:12')).toBe('2026-04-15 23:12');
  });

  it('빈 문자열', () => {
    expect(toServerDateTime('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('ISO 날짜를 "yyyy-MM-dd HH:mm" 형식으로 변환', () => {
    expect(formatDateTime('2026-04-15T23:12:00')).toBe('2026-04-15 23:12');
  });

  it('초 이하를 잘라낸다', () => {
    expect(formatDateTime('2026-04-15T23:12:34.567')).toBe('2026-04-15 23:12');
  });

  it('null이면 "-" 반환', () => {
    expect(formatDateTime(null)).toBe('-');
  });

  it('undefined이면 "-" 반환', () => {
    expect(formatDateTime(undefined)).toBe('-');
  });

  it('빈 문자열이면 "-" 반환', () => {
    expect(formatDateTime('')).toBe('-');
  });
});
