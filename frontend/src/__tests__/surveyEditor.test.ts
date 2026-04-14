import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ seq: '1' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/survey/1/options',
}));

function mockApiResponse(data: object) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ success: true, data }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('설문 편집기 API 검증', () => {

  // ========== 섹션 이름 변경 ==========

  describe('섹션 이름 변경', () => {
    it('섹션 수정 API가 올바른 경로와 body를 전송한다', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse({
        seq: 1, templateSeq: 10, title: '변경된 섹션명', sortOrder: 1,
      }));

      const { surveyApi } = await import('@/lib/api/survey');
      const result = await surveyApi.updateSection(10, 1, { title: '변경된 섹션명' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/complex/survey/templates/10/sections/1'),
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(result.data?.title).toBe('변경된 섹션명');
    });

    it('빈 제목으로 섹션 수정 시도 시에도 API 호출은 가능하다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ success: false, message: '섹션 제목을 입력해주세요.' }),
      });

      const { surveyApi } = await import('@/lib/api/survey');
      const result = await surveyApi.updateSection(10, 1, { title: '' });

      expect(result.success).toBe(false);
    });
  });

  // ========== 질문 이름 변경 ==========

  describe('질문 이름 변경', () => {
    it('질문 수정 API가 올바른 경로와 body를 전송한다', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse({
        seq: 1, templateSeq: 10, sectionSeq: 1,
        questionKey: 'q1', title: '수정된 질문', inputType: 'radio',
        required: false, sortOrder: 1,
      }));

      const { surveyApi } = await import('@/lib/api/survey');
      const result = await surveyApi.updateQuestion(10, 1, {
        sectionSeq: 1,
        questionKey: 'q1',
        title: '수정된 질문',
        inputType: 'radio',
        required: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/complex/survey/templates/10/questions/1'),
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(result.data?.title).toBe('수정된 질문');
    });

    it('필수여부만 토글할 때 올바르게 전송한다', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse({
        seq: 1, templateSeq: 10, sectionSeq: 1,
        questionKey: 'q1', title: '질문', inputType: 'radio',
        required: true, sortOrder: 1,
      }));

      const { surveyApi } = await import('@/lib/api/survey');
      await surveyApi.updateQuestion(10, 1, { required: true });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.required).toBe(true);
    });

    it('응답형식만 변경할 때 올바르게 전송한다', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse({
        seq: 1, templateSeq: 10, sectionSeq: 1,
        questionKey: 'q1', title: '질문', inputType: 'text',
        required: false, sortOrder: 1,
      }));

      const { surveyApi } = await import('@/lib/api/survey');
      await surveyApi.updateQuestion(10, 1, { inputType: 'text' });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.inputType).toBe('text');
    });
  });

  // ========== 선택지 순서 변경 ==========

  describe('선택지 순서 변경', () => {
    it('reorderOptions API가 올바른 경로와 items를 전송한다', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse([
        { seq: 3, label: 'C', sortOrder: 1 },
        { seq: 2, label: 'B', sortOrder: 2 },
        { seq: 1, label: 'A', sortOrder: 3 },
      ]));

      const { surveyApi } = await import('@/lib/api/survey');
      const result = await surveyApi.reorderOptions(10, [
        { seq: 3, sortOrder: 1 },
        { seq: 2, sortOrder: 2 },
        { seq: 1, sortOrder: 3 },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/complex/survey/templates/10/options/reorder'),
        expect.objectContaining({ method: 'PUT' }),
      );

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.items).toHaveLength(3);
      expect(body.items[0].seq).toBe(3);
      expect(body.items[0].sortOrder).toBe(1);
    });

    it('순서 변경 후 응답의 sortOrder가 반영된다', async () => {
      const reordered = [
        { seq: 2, label: '두번째', sortOrder: 1 },
        { seq: 1, label: '첫번째', sortOrder: 2 },
      ];
      mockFetch.mockResolvedValueOnce(mockApiResponse(reordered));

      const { surveyApi } = await import('@/lib/api/survey');
      const result = await surveyApi.reorderOptions(10, [
        { seq: 2, sortOrder: 1 },
        { seq: 1, sortOrder: 2 },
      ]);

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].sortOrder).toBe(1);
      expect(result.data?.[0].label).toBe('두번째');
    });
  });
});
