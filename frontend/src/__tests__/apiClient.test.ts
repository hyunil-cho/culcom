import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';

// fetch 모킹
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// window.location 모킹
const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, href: '' },
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

describe('api.get', () => {
  it('성공 응답을 반환한다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { success: true, data: { id: 1 } }));

    const result = await api.get('/test');

    expect(result).toEqual({ success: true, data: { id: 1 } });
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('401 응답 시 로그인 페이지로 리다이렉트', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, {}));

    await expect(api.get('/test')).rejects.toThrow('Unauthorized');
    expect(window.location.href).toBe('/login');
  });

  it('401이지만 auth 경로면 리다이렉트하지 않음', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, {}));

    await expect(api.get('/auth/me')).rejects.toThrow('Unauthorized');
    expect(window.location.href).toBe('');
  });

  it('서버 에러 시 에러 메시지 포함 응답 반환', async () => {
    mockFetch.mockResolvedValue(mockResponse(400, { success: false, message: '잘못된 요청' }));

    const result = await api.get('/test');

    expect(result.success).toBe(false);
    expect(result.message).toBe('잘못된 요청');
  });

  it('서버 에러 body 파싱 실패 시 기본 메시지', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    });

    const result = await api.get('/test');
    expect(result.success).toBe(false);
    expect(result.message).toBe('요청 실패 (HTTP 500)');
  });
});

describe('api.post', () => {
  it('POST 요청을 보낸다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { success: true, data: null }));

    await api.post('/test', { name: '홍길동' });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: '홍길동' }),
    }));
  });

  it('body 없이도 호출 가능', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { success: true, data: null }));

    await api.post('/test');

    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: undefined,
    }));
  });
});

describe('api.put', () => {
  it('PUT 요청을 보낸다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { success: true, data: null }));

    await api.put('/test/1', { name: '김철수' });

    expect(mockFetch).toHaveBeenCalledWith('/api/test/1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ name: '김철수' }),
    }));
  });
});

describe('api.delete', () => {
  it('DELETE 요청을 보낸다', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { success: true, data: null }));

    await api.delete('/test/1');

    expect(mockFetch).toHaveBeenCalledWith('/api/test/1', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});
