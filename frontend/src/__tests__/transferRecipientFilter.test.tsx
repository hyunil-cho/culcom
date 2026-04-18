import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MembershipFormSection from '@/app/complex/members/components/MembershipFormSection';
import type { TransferRequestItem } from '@/lib/api';
import type { MembershipFormData } from '@/app/complex/members/memberFormTypes';

// ── helpers ──

const makeTransfer = (o: Partial<TransferRequestItem> = {}): TransferRequestItem => ({
  seq: 1, memberMembershipSeq: 100, membershipSeq: 10, membershipName: '10회권',
  expiryDate: '2026-07-01',
  fromMemberSeq: 50, fromMemberName: '양도자A', fromMemberPhone: '01011111111',
  status: '접수',
  transferFee: 30000, remainingCount: 26,
  token: 'tok', inviteToken: null,
  toCustomerSeq: 77, toCustomerName: '양수자B', toCustomerPhone: '01022222222',
  adminMessage: null,
  referenced: false,
  createdDate: '2026-04-18T10:00:00',
  ...o,
});

const emptyForm: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: '', depositAmount: '', paymentMethod: '',
  status: '활성',
  cardDetail: { cardCompany: '', cardNumber: '', cardApprovalDate: '', cardApprovalNumber: '' },
};

function renderSection(opts: {
  memberName: string; memberPhone: string;
  transfers: TransferRequestItem[];
}) {
  return render(
    <MembershipFormSection
      form={emptyForm}
      setForm={vi.fn()}
      enabled={true}
      onToggle={vi.fn()}
      toggleLocked={false}
      isExisting={false}
      memberships={[]}
      paymentMethods={[]}
      onSelect={vi.fn()}
      transferMode={true}
      onTransferModeChange={vi.fn()}
      transfers={opts.transfers}
      selectedTransfer={null}
      onSelectTransfer={vi.fn()}
      memberName={opts.memberName}
      memberPhone={opts.memberPhone}
    />,
  );
}

// ── tests ──

describe('MembershipFormSection — 양도 요청 필터링 (양수자 이름/전화로 매칭)', () => {
  it('양수자 이름으로 접수 상태의 양도 요청을 찾아낸다', () => {
    renderSection({
      memberName: '양수자B',
      memberPhone: '',
      transfers: [makeTransfer()],
    });
    // 양도 요청 카드에는 양도자 정보가 표시됨 (fromMemberName)
    expect(screen.getByText('양도자A')).toBeInTheDocument();
    expect(screen.queryByText(/선택 가능한 양도 요청이 없습니다/)).toBeNull();
  });

  it('양수자 전화번호로 접수 상태의 양도 요청을 찾아낸다', () => {
    renderSection({
      memberName: '',
      memberPhone: '01022222222',
      transfers: [makeTransfer()],
    });
    expect(screen.getByText('양도자A')).toBeInTheDocument();
  });

  it('양도자 이름만 입력하면 매칭되지 않는다 (양수자 기준으로만 검색)', () => {
    renderSection({
      memberName: '양도자A',
      memberPhone: '',
      transfers: [makeTransfer()],
    });
    expect(screen.getByText(/선택 가능한 양도 요청이 없습니다/)).toBeInTheDocument();
  });

  it('전혀 관련 없는 이름이면 리스트가 비어있다', () => {
    renderSection({
      memberName: '무관한이름',
      memberPhone: '01099999999',
      transfers: [makeTransfer()],
    });
    expect(screen.getByText(/선택 가능한 양도 요청이 없습니다/)).toBeInTheDocument();
  });

  it('확인/거절 상태는 필터에서 자동 제외된다', () => {
    renderSection({
      memberName: '양수자B',
      memberPhone: '',
      transfers: [
        makeTransfer({ seq: 1, status: '확인' }),
        makeTransfer({ seq: 2, status: '거절' }),
      ],
    });
    expect(screen.getByText(/선택 가능한 양도 요청이 없습니다/)).toBeInTheDocument();
  });

  it('toCustomer가 세팅되지 않은 생성 상태 요청은 이름/전화 검색에서 제외된다', () => {
    renderSection({
      memberName: '양수자B',
      memberPhone: '',
      transfers: [makeTransfer({
        status: '생성', toCustomerSeq: null, toCustomerName: null, toCustomerPhone: null,
      })],
    });
    expect(screen.getByText(/선택 가능한 양도 요청이 없습니다/)).toBeInTheDocument();
  });

  it('이름/전화 필터가 없으면 생성 상태 요청도 그대로 노출된다', () => {
    renderSection({
      memberName: '',
      memberPhone: '',
      transfers: [makeTransfer({
        status: '생성', toCustomerSeq: null, toCustomerName: null, toCustomerPhone: null,
      })],
    });
    expect(screen.getByText('양도자A')).toBeInTheDocument();
  });
});
