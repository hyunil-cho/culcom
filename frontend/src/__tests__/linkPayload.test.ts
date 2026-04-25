import { describe, it, expect } from 'vitest';
import { encodeLinkPayload, decodeLinkPayload } from '@/lib/linkPayload';

describe('linkPayload', () => {
  describe('encode/decode 왕복', () => {
    it('기본 객체가 그대로 복호화된다', () => {
      const obj = { memberSeq: 5, name: '조현일', phone: '01099321967', t: 1777072318884 };
      const encoded = encodeLinkPayload(obj);
      expect(decodeLinkPayload(encoded)).toEqual(obj);
    });

    it('한글/이모지/특수문자가 깨지지 않는다', () => {
      const obj = { name: '김🙂李 O\'Reilly', note: '연기신청 "특별"/테스트 +1' };
      expect(decodeLinkPayload(encodeLinkPayload(obj))).toEqual(obj);
    });

    it('인코딩 결과는 base64url 문자만 포함한다 (+, /, = 없음)', () => {
      const obj = { a: 1, b: '한글테스트', c: [1, 2, 3] };
      const encoded = encodeLinkPayload(obj);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('레거시 포맷 호환 (decodeLinkPayload)', () => {
    // 과거 encodeLinkPayload 구현: btoa(encodeURIComponent(json))
    // 이미 발송된 SMS 링크가 계속 동작해야 함.
    function legacyEncode(obj: unknown): string {
      return btoa(encodeURIComponent(JSON.stringify(obj)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    }

    it('레거시(base64url) 포맷을 복호화한다', () => {
      const obj = { memberSeq: 5, name: '조현일', phone: '821099321967', t: 1777072318884 };
      const legacy = legacyEncode(obj);
      expect(decodeLinkPayload(legacy)).toEqual(obj);
    });

    it('레거시(표준 base64, +/= 포함) 포맷도 복호화한다', () => {
      // `+`, `/`, `=` 이 나올 수 있는 더 오래된 링크 (치환 이전)
      const obj = { x: '??>>??' };
      const standardLegacy = btoa(encodeURIComponent(JSON.stringify(obj)));
      expect(decodeLinkPayload(standardLegacy)).toEqual(obj);
    });

    it('사용자가 실제로 받은 SMS의 레거시 페이로드가 복호화된다', () => {
      // 문자로 수신한 실제 링크의 d= 값 (비 기준으로 기록된 레거시 포맷)
      const actual =
        'JTdCJTIybWVtYmVyU2VxJTIyJTNBNSUyQyUyMm5hbWUlMjIlM0ElMjIlRUMlQTElQjAlRUQlOTglODQlRUMlOUQlQkMlMjIlMkMlMjJwaG9uZSUyMiUzQSUyMjgyMTA5OTMyMTk2NyUyMiUyQyUyMnQlMjIlM0ExNzc3MDcyMzE4ODg0JTdE';
      const decoded = decodeLinkPayload<{ memberSeq: number; name: string; phone: string; t: number }>(actual);
      expect(decoded.memberSeq).toBe(5);
      expect(decoded.name).toBe('조현일');
      expect(decoded.phone).toBe('821099321967');
      expect(decoded.t).toBe(1777072318884);
    });
  });

  describe('페이로드 길이 감소 (SMS 자동 링크 안정화 목적)', () => {
    it('신규 인코딩이 레거시보다 짧다 (한글 포함 시 유효)', () => {
      const obj = { memberSeq: 5, name: '조현일', phone: '821099321967', t: 1777072318884 };
      const legacy = btoa(encodeURIComponent(JSON.stringify(obj)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const current = encodeLinkPayload(obj);

      // 한글이 들어있는 페이로드에서 신규 포맷이 레거시 대비 최소 40% 이상 짧아야 한다
      expect(current.length).toBeLessThan(legacy.length * 0.6);
    });
  });
});
