import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserForm, { emptyUserForm, validateUserForm, type UserFormData } from '@/app/(main)/users/UserForm';
import type { Branch } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/users',
}));

const branches: Branch[] = [
  { seq: 1, branchName: 'A지점', alias: 'a' },
  { seq: 2, branchName: 'B지점', alias: 'b' },
  { seq: 3, branchName: 'C지점', alias: 'c' },
];

describe('validateUserForm', () => {
  it('신규 생성 시 아이디/비밀번호/이름이 비어있으면 에러 메시지를 반환한다', () => {
    expect(validateUserForm(emptyUserForm, false)).toBe('아이디를 입력하세요.');

    const withId: UserFormData = { ...emptyUserForm, userId: 'u' };
    expect(validateUserForm(withId, false)).toBe('비밀번호를 입력하세요.');

    const withPw: UserFormData = { ...withId, password: 'pw' };
    expect(validateUserForm(withPw, false)).toBe('이름을 입력하세요.');
  });

  it('수정 모드에서는 비밀번호 비어있어도 통과', () => {
    const form: UserFormData = { userId: 'u', password: '', name: '이름', phone: '', branchSeqs: [] };
    expect(validateUserForm(form, true)).toBeNull();
  });

  it('requireBranches=true 일 때 branchSeqs 가 비어있으면 에러', () => {
    const form: UserFormData = { userId: 'u', password: 'pw', name: '이름', phone: '', branchSeqs: [] };
    expect(validateUserForm(form, false, { requireBranches: true }))
        .toBe('담당 지점을 하나 이상 선택하세요.');
  });

  it('requireBranches=true 이더라도 branchSeqs 가 있으면 통과', () => {
    const form: UserFormData = { userId: 'u', password: 'pw', name: '이름', phone: '', branchSeqs: [1] };
    expect(validateUserForm(form, false, { requireBranches: true })).toBeNull();
  });
});

describe('UserForm 지점 선택 UI', () => {
  it('showBranchSelector=true 일 때 지점 체크박스가 렌더된다', () => {
    render(
      <UserForm
        form={emptyUserForm}
        onChange={() => {}}
        onSubmit={() => {}}
        backHref="/users"
        submitLabel="생성"
        showBranchSelector
        branches={branches}
      />,
    );

    expect(screen.getByText('담당 지점')).toBeInTheDocument();
    expect(screen.getByLabelText('A지점')).toBeInTheDocument();
    expect(screen.getByLabelText('B지점')).toBeInTheDocument();
    expect(screen.getByLabelText('C지점')).toBeInTheDocument();
  });

  it('showBranchSelector=false 이면 지점 UI 가 숨겨진다', () => {
    render(
      <UserForm
        form={emptyUserForm}
        onChange={() => {}}
        onSubmit={() => {}}
        backHref="/users"
        submitLabel="생성"
        branches={branches}
      />,
    );
    expect(screen.queryByText('담당 지점')).not.toBeInTheDocument();
  });

  it('체크박스 토글 시 onChange 가 branchSeqs 를 갱신한다', () => {
    const handleChange = vi.fn();
    const form: UserFormData = { ...emptyUserForm, branchSeqs: [1] };
    render(
      <UserForm
        form={form}
        onChange={handleChange}
        onSubmit={() => {}}
        backHref="/users"
        submitLabel="생성"
        showBranchSelector
        branches={branches}
      />,
    );

    fireEvent.click(screen.getByLabelText('B지점'));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ branchSeqs: [1, 2] }),
    );

    fireEvent.click(screen.getByLabelText('A지점'));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ branchSeqs: [] }),
    );
  });

  it('현재 선택된 branchSeqs 가 체크된 상태로 표시된다', () => {
    const form: UserFormData = { ...emptyUserForm, branchSeqs: [2, 3] };
    render(
      <UserForm
        form={form}
        onChange={() => {}}
        onSubmit={() => {}}
        backHref="/users"
        submitLabel="수정"
        showBranchSelector
        branches={branches}
      />,
    );

    expect((screen.getByLabelText('A지점') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('B지점') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('C지점') as HTMLInputElement).checked).toBe(true);
  });

  it('선택 가능한 지점이 없을 때 안내 문구를 보여준다', () => {
    render(
      <UserForm
        form={emptyUserForm}
        onChange={() => {}}
        onSubmit={() => {}}
        backHref="/users"
        submitLabel="생성"
        showBranchSelector
        branches={[]}
      />,
    );
    expect(screen.getByText('선택할 수 있는 지점이 없습니다.')).toBeInTheDocument();
  });
});
