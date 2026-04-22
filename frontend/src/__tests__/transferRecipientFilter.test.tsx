import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MembershipFormSection from '@/app/complex/members/components/MembershipFormSection';
import type { TransferRequestItem } from '@/lib/api';
import type { MembershipFormData } from '@/app/complex/members/memberFormTypes';

// 서버의 /transfer-requests/selectable 가 status=확인 + mm.활성 + 미사용 필터를 이미 수행한다.
// 이 컴포넌트는 받은 리스트를 그대로 표시만 하는지(클라이언트 필터 없음) 검증한다.

const makeTransfer = (o: Partial<TransferRequestItem> = {}): TransferRequestItem => ({
  seq: 1, memberMembershipSeq: 100, membershipSeq: 10, membershipName: '10회권',
  expiryDate: '2026-07-01',
  fromMemberSeq: 50, fromMemberName: '양도자A', fromMemberPhone: '01011111111',
  status: '확인',
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

function renderSection(transfers: TransferRequestItem[]) {
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
      transfers={transfers}
      selectedTransfer={null}
      onSelectTransfer={vi.fn()}
    />,
  );
}

describe('MembershipFormSection — 양도 요청 리스트 표시', () => {
  it('서버에서 받은 양도 요청 리스트를 그대로 보여준다', () => {
    renderSection([makeTransfer()]);
    expect(screen.getByText('양도자A')).toBeInTheDocument();
    expect(screen.getByText('양수자B')).toBeInTheDocument();
    expect(screen.queryByText(/선택 가능한 양도 요청이 없습니다/)).toBeNull();
  });

  it('리스트가 비면 안내 문구가 뜬다', () => {
    renderSection([]);
    expect(screen.getByText(/선택 가능한 양도 요청이 없습니다/)).toBeInTheDocument();
  });

  it('여러 건이면 모두 표시한다 (클라이언트 필터 없음)', () => {
    renderSection([
      makeTransfer({ seq: 1, fromMemberName: '양도자A' }),
      makeTransfer({ seq: 2, fromMemberName: '양도자B' }),
    ]);
    expect(screen.getByText('양도자A')).toBeInTheDocument();
    expect(screen.getByText('양도자B')).toBeInTheDocument();
  });
});
