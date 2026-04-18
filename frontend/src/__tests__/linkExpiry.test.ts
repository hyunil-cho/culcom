import { describe, it, expect, vi, afterEach } from 'vitest';
import { isLinkExpired, LINK_VALID_MS, INVALID_LINK_MESSAGE } from '@/lib/linkExpiry';

describe('linkExpiry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('LINK_VALID_MS', () => {
    it('7일(ms)로 정의되어 있다', () => {
      expect(LINK_VALID_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('INVALID_LINK_MESSAGE', () => {
    it('만료 안내 문구가 정의되어 있다', () => {
      expect(INVALID_LINK_MESSAGE).toContain('유효하지 않은 링크');
    });
  });

  describe('isLinkExpired', () => {
    it('숫자가 아닌 값(undefined)은 만료 아님으로 처리 (하위 호환)', () => {
      expect(isLinkExpired(undefined)).toBe(false);
    });

    it('문자열/객체 등 비정상 값도 만료 아님으로 처리', () => {
      expect(isLinkExpired('abc')).toBe(false);
      expect(isLinkExpired({})).toBe(false);
      expect(isLinkExpired(null)).toBe(false);
      expect(isLinkExpired(Number.NaN)).toBe(false);
    });

    it('방금 발급된 링크는 만료되지 않는다', () => {
      expect(isLinkExpired(Date.now())).toBe(false);
    });

    it('7일 이내는 만료되지 않는다 (1시간 전)', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      expect(isLinkExpired(oneHourAgo)).toBe(false);
    });

    it('정확히 7일 경과 시점은 경계 조건으로 만료 아님', () => {
      const exactlySevenDaysAgo = Date.now() - LINK_VALID_MS;
      expect(isLinkExpired(exactlySevenDaysAgo)).toBe(false);
    });

    it('7일 + 1ms 초과 시점은 만료된 것으로 판단', () => {
      const justOverSevenDays = Date.now() - LINK_VALID_MS - 1;
      expect(isLinkExpired(justOverSevenDays)).toBe(true);
    });

    it('30일 전 링크는 만료된 것으로 판단', () => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(isLinkExpired(thirtyDaysAgo)).toBe(true);
    });

    it('고정된 시각에서 경계를 정확히 검증 (fake timers)', () => {
      const base = new Date('2026-04-18T12:00:00Z').getTime();
      vi.useFakeTimers();
      vi.setSystemTime(base);

      const sevenDaysEarlier = base - LINK_VALID_MS;
      const overSevenDays = base - LINK_VALID_MS - 1;

      expect(isLinkExpired(sevenDaysEarlier)).toBe(false);
      expect(isLinkExpired(overSevenDays)).toBe(true);
    });
  });
});
