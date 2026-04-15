import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { PublicMemberInfo } from '@/lib/api';

// ── mocks ──

const mockPush = vi.fn();
const mockGet = vi.fn<(key: string) => string | null>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

const mockSearchMember = vi.fn();
const mockSubmit = vi.fn();
const mockReasons = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    publicRefundApi: {
      searchMember: (...args: unknown[]) => mockSearchMember(...args),
      submit: (...args: unknown[]) => mockSubmit(...args),
      reasons: (...args: unknown[]) => mockReasons(...args),
    },
  };
});

// ── helpers ──

const fakeMember: PublicMemberInfo = {
  seq: 10, name: '홍길동', phoneNumber: '01012345678',
  branchSeq: 1, branchName: '강남점', level: null,
  memberships: [
    { seq: 100, membershipName: '3개월 정기권', startDate: '2026-01-01', expiryDate: '2026-04-01', totalCount: 30, usedCount: 5, postponeTotal: 3, postponeUsed: 0 },
    { seq: 101, membershipName: '1개월 체험권', startDate: '2026-03-01', expiryDate: '2026-04-01', totalCount: 10, usedCount: 2, postponeTotal: 1, postponeUsed: 0 },
  ],
  classes: [],
};

function encodeParam(data: object) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

const validParam = encodeParam({ memberSeq: 10, name: '홍길동', phone: '01012345678' });

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      {/* 직접 Inner 컴포넌트를 렌더링하기 위해 dynamic import 대신 default export 사용 */}
      <TestPage />
    </QueryClientProvider>,
  );
}

// Suspense 내부 컴포넌트를 직접 import하면 useSearchParams 문제가 있으므로
// default export(Suspense 래퍼)를 사용
let TestPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  mockSearchMember.mockResolvedValue({ success: true, data: { members: [fakeMember] } });
  mockReasons.mockResolvedValue({ success: true, data: ['개인사정', '이사', '불만족'] });
  mockGet.mockReturnValue(validParam);

  const mod = await import('@/app/public/refund/page');
  TestPage = mod.default;
});

// ── tests ──

describe('PublicRefundPage', () => {
  describe('링크 파라미터 검증', () => {
    it('d 파라미터가 없으면 에러 메시지 표시', async () => {
      mockGet.mockReturnValue(null);
      renderPage();
      expect(await screen.findByText('유효하지 않은 링크입니다. 관리자에게 문의해주세요.')).toBeInTheDocument();
    });

    it('d 파라미터가 잘못된 형식이면 에러 메시지 표시', async () => {
      mockGet.mockReturnValue('invalid-base64!!!');
      renderPage();
      expect(await screen.findByText('유효하지 않은 링크입니다. 관리자에게 문의해주세요.')).toBeInTheDocument();
    });
  });

  describe('회원 정보 표시', () => {
    it('회원 검색 성공 시 이름/연락처/지점 표시', async () => {
      renderPage();
      expect(await screen.findByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('01012345678')).toBeInTheDocument();
      expect(screen.getByText('강남점')).toBeInTheDocument();
    });

    it('회원 검색 실패 시 에러 메시지', async () => {
      mockSearchMember.mockResolvedValue({ success: false, message: '검색 실패' });
      renderPage();
      expect(await screen.findByText('회원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.')).toBeInTheDocument();
    });

    it('멤버십 목록 표시', async () => {
      renderPage();
      expect(await screen.findByText('3개월 정기권')).toBeInTheDocument();
      expect(screen.getByText('1개월 체험권')).toBeInTheDocument();
    });

    it('활성 멤버십이 없으면 안내 메시지', async () => {
      mockSearchMember.mockResolvedValue({
        success: true,
        data: { members: [{ ...fakeMember, memberships: [] }] },
      });
      renderPage();
      expect(await screen.findByText('활성 멤버십이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('환불 사유 폼', () => {
    it('멤버십 선택 전에는 환불 사유 폼이 보이지 않는다', async () => {
      renderPage();
      await screen.findByText('3개월 정기권');
      expect(screen.queryByText('환불 요청 제출')).not.toBeInTheDocument();
    });

    it('멤버십 선택 후 환불 사유 폼이 표시된다', async () => {
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      expect(await screen.findByText('환불 요청 제출')).toBeInTheDocument();
    });

    it('서버에서 받은 환불 사유 목록이 select에 표시된다', async () => {
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      const select = await screen.findByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts).toContain('개인사정');
      expect(optionTexts).toContain('이사');
      expect(optionTexts).toContain('불만족');
      expect(optionTexts).toContain('기타 (직접 입력)');
    });

    it('"기타" 선택 시 직접 입력 textarea가 나타난다', async () => {
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: '기타' } });
      expect(screen.getByPlaceholderText('환불 사유를 직접 입력해주세요.')).toBeInTheDocument();
    });

    it('사유 미선택 시 제출하면 에러 배너 표시', async () => {
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      // fireEvent.submit으로 네이티브 required 검증을 우회하여 handleSubmit 진입
      const form = screen.getByText('환불 요청 제출').closest('form')!;
      fireEvent.submit(form);
      expect(await screen.findByText('환불 사유를 선택해 주세요.')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('제출', () => {
    it('정상 제출 시 올바른 데이터로 API 호출', async () => {
      mockSubmit.mockResolvedValue({ success: true, data: 42 });
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: '개인사정' } });
      fireEvent.click(screen.getByText('환불 요청 제출'));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          branchSeq: 1, memberSeq: 10, memberMembershipSeq: 100,
          memberName: '홍길동', phoneNumber: '01012345678',
          membershipName: '3개월 정기권',
          price: '', reason: '개인사정',
        });
      });
    });

    it('기타 사유로 제출', async () => {
      mockSubmit.mockResolvedValue({ success: true, data: 42 });
      renderPage();
      fireEvent.click(await screen.findByText('1개월 체험권'));
      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: '기타' } });
      const textarea = screen.getByPlaceholderText('환불 사유를 직접 입력해주세요.');
      fireEvent.change(textarea, { target: { value: '개인적인 이유로 환불 요청합니다.' } });
      fireEvent.click(screen.getByText('환불 요청 제출'));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ reason: '개인적인 이유로 환불 요청합니다.' }),
        );
      });
    });

    it('제출 성공 시 설문 페이지로 이동', async () => {
      mockSubmit.mockResolvedValue({ success: true, data: 42 });
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: '개인사정' } });
      fireEvent.click(screen.getByText('환불 요청 제출'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(1);
        const pushArg = mockPush.mock.calls[0][0] as string;
        expect(pushArg).toContain('from=refund');
      });
    });

    it('제출 실패 시 에러 메시지 표시', async () => {
      mockSubmit.mockResolvedValue({ success: false, message: '필수 항목을 모두 입력해주세요.' });
      renderPage();
      fireEvent.click(await screen.findByText('3개월 정기권'));
      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: '개인사정' } });
      fireEvent.click(screen.getByText('환불 요청 제출'));

      expect(await screen.findByText('필수 항목을 모두 입력해주세요.')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('안내사항', () => {
    it('하단 안내사항이 항상 표시된다', async () => {
      renderPage();
      expect(await screen.findByText('안내사항')).toBeInTheDocument();
      expect(screen.getByText('환불 요청은 관리자 확인 후 처리됩니다.')).toBeInTheDocument();
    });
  });
});
