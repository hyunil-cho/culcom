import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userApi } from '@/lib/api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

function ok(body: object = { success: true, data: null }) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('userApi.changeMyPassword', () => {
  it('PUT /api/users/me/password 로 현재/새 비밀번호를 전송한다', async () => {
    mockFetch.mockResolvedValue(ok());

    await userApi.changeMyPassword({ currentPassword: 'old', newPassword: 'new' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/me/password',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'old', newPassword: 'new' }),
      }),
    );
  });
});

describe('userApi.create', () => {
  it('branchSeqs 를 포함해서 전송한다', async () => {
    mockFetch.mockResolvedValue(ok({ success: true, data: { seq: 10 } }));

    await userApi.create({
      userId: 'staff1',
      password: 'pw',
      name: '직원',
      phone: '01012345678',
      branchSeqs: [1, 3],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"branchSeqs":[1,3]'),
      }),
    );
  });
});

describe('userApi.update', () => {
  it('수정 시 branchSeqs 만 부분 갱신 가능', async () => {
    mockFetch.mockResolvedValue(ok());

    await userApi.update(7, { branchSeqs: [2] });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/7',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ branchSeqs: [2] }),
      }),
    );
  });
});

describe('userApi.get', () => {
  it('GET /api/users/{seq} 를 호출한다', async () => {
    mockFetch.mockResolvedValue(ok({ success: true, data: { seq: 5 } }));

    await userApi.get(5);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/5',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
