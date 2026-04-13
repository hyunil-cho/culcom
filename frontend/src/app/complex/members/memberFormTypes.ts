import type { MembershipStatus } from '@/lib/api/members';

export interface MemberFormData {
  name: string;
  phoneNumber: string;
  level: string;
  language: string;
  info: string;
  signupChannel: string;
  comment: string;
}

export interface StaffFormData {
  isStaff: boolean;
  status: string;
  refund: RefundFormData;
}

export interface RefundFormData {
  depositAmount: string;
  refundableDeposit: string;
  nonRefundableDeposit: string;
  refundBank: string;
  refundAccount: string;
  refundAmount: string;
  paymentMethod: string;
}

export interface MembershipFormData {
  membershipSeq: string;
  startDate: string;
  expiryDate: string;
  price: string;
  paymentDate: string;
  depositAmount: string;
  paymentMethod: string;
  status: MembershipStatus;
}

export interface ClassAssignData {
  timeSlotSeq: string;
  classSeq: string;
}

export const emptyMemberForm: MemberFormData = {
  name: '', phoneNumber: '', level: '', language: '', info: '',
  signupChannel: '', comment: '',
};

export function nowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const emptyMembershipForm: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: nowDateTimeLocal(), depositAmount: '', paymentMethod: '',
  status: '활성',
};

export const emptyClassAssign: ClassAssignData = { timeSlotSeq: '', classSeq: '' };

export const emptyRefundForm: RefundFormData = {
  depositAmount: '', refundableDeposit: '', nonRefundableDeposit: '',
  refundBank: '', refundAccount: '', refundAmount: '', paymentMethod: '',
};

export const emptyStaffForm: StaffFormData = {
  isStaff: false, status: '재직', refund: emptyRefundForm,
};

export function validateMemberForm(form: MemberFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

export function validateMembershipForm(ms: MembershipFormData, isEdit: boolean, isTransfer?: boolean): string | null {
  if (!ms.membershipSeq) return '멤버십 등급을 선택하세요.';
  if (!ms.status) return '멤버십 상태를 선택하세요.';
  if (isTransfer) {
    if (!ms.paymentDate) return '양수금 납부일을 입력하세요.';
    if (!ms.paymentMethod) return '양수금 결제방법을 선택하세요.';
    return null;
  }
  if (!ms.price?.trim()) return '멤버십 금액을 입력하세요.';
  if (!ms.paymentDate) return '납부일을 입력하세요.';
  if (!ms.paymentMethod) return '결제방법을 선택하세요.';
  if (!isEdit && !ms.depositAmount?.trim()) return '첫 납부 금액을 입력하세요.';
  return null;
}
