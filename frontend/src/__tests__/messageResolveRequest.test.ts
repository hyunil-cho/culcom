import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import type { MessageTemplateResolveRequest, PlaceholderItem } from '@/lib/api/message';
import { messageTemplateApi } from '@/lib/api/message';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
});

function mockResponse(status: number, body: object) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('MessageTemplateResolveRequest - reason 필드', () => {

  it('reason 필드가 포함된 resolve 요청을 전송한다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, {
      success: true,
      data: '홍길동님의 환불이 반려되었습니다. 사유: 서류 미비',
    }));

    const request: MessageTemplateResolveRequest = {
      customerName: '홍길동',
      customerPhone: '01012345678',
      reason: '서류 미비',
    };

    await messageTemplateApi.resolve(1, request);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      customerName: '홍길동',
      customerPhone: '01012345678',
      reason: '서류 미비',
    });
  });

  it('reason 없이도 기존처럼 동작한다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, {
      success: true,
      data: '홍길동님 환영합니다',
    }));

    const request: MessageTemplateResolveRequest = {
      customerName: '홍길동',
    };

    await messageTemplateApi.resolve(1, request);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({ customerName: '홍길동' });
    expect(body.reason).toBeUndefined();
  });
});

describe('PlaceholderItem - 사유 항목', () => {

  it('플레이스홀더 목록에 사유 항목이 포함될 수 있다', async () => {
    const placeholders: PlaceholderItem[] = [
      { seq: 1, name: '{{고객명}}', comment: '고객의 이름', examples: '홍길동', value: '{customer.name}' },
      { seq: 12, name: '{{사유}}', comment: '관리자 반려 사유', examples: '서류 미비로 인한 반려', value: '{action.reason}' },
    ];

    mockFetch.mockResolvedValue(mockResponse(200, {
      success: true,
      data: placeholders,
    }));

    const result = await messageTemplateApi.placeholders();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);

    const reasonPlaceholder = result.data.find((p: PlaceholderItem) => p.name === '{{사유}}');
    expect(reasonPlaceholder).toBeDefined();
    expect(reasonPlaceholder!.value).toBe('{action.reason}');
    expect(reasonPlaceholder!.comment).toBe('관리자 반려 사유');
  });
});
