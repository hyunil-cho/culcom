import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReservationStatusModal from '@/app/(main)/calendar/components/ReservationStatusModal';
import type { Reservation } from '@/app/(main)/calendar/utils';

// ── mocks ──

const mockUpdateReservationDate = vi.fn();
const mockUpdateReservationStatus = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    calendarApi: {
      ...actual.calendarApi,
      updateReservationDate: (...args: unknown[]) => mockUpdateReservationDate(...args),
      updateReservationStatus: (...args: unknown[]) => mockUpdateReservationStatus(...args),
    },
    surveyApi: {
      ...actual.surveyApi,
      listTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
  };
});

// ── helpers ──

const makeReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  seq: 42,
  date: '2026-04-26',
  time: '14:30',
  name: '홍길동',
  phone: '01012345678',
  caller: 'A',
  status: '예약확정',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateReservationDate.mockResolvedValue({ success: true, data: null });
  mockUpdateReservationStatus.mockResolvedValue({ success: true, data: null });
});

// ── tests ──

describe('ReservationStatusModal — 예약 일시 변경', () => {
  it('상태 선택 단계에 "날짜 변경" 옵션이 노출된다', () => {
    render(
      <ReservationStatusModal
        reservation={makeReservation()}
        onClose={vi.fn()}
        onStatusChanged={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /날짜 변경/ })).toBeInTheDocument();
  });

  it('"날짜 변경" 클릭 시 날짜·시간 입력 단계로 진입하며 기존 일시가 기본값으로 채워진다', () => {
    render(
      <ReservationStatusModal
        reservation={makeReservation({ date: '2026-04-26', time: '14:30' })}
        onClose={vi.fn()}
        onStatusChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /날짜 변경/ }));

    expect(screen.getByText('예약 일시 변경')).toBeInTheDocument();
    expect((screen.getByLabelText('날짜') as HTMLInputElement).value).toBe('2026-04-26');
    expect((screen.getByLabelText('시간') as HTMLInputElement).value).toBe('14:30');
  });

  it('저장 시 ISO LocalDateTime 포맷(YYYY-MM-DDTHH:mm:ss)으로 API 가 호출된다', async () => {
    render(
      <ReservationStatusModal
        reservation={makeReservation({ seq: 7 })}
        onClose={vi.fn()}
        onStatusChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /날짜 변경/ }));
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-05-10' } });
    fireEvent.change(screen.getByLabelText('시간'), { target: { value: '09:15' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockUpdateReservationDate).toHaveBeenCalledWith(7, '2026-05-10T09:15:00');
    });
  });

  it('저장 성공 시 onStatusChanged 가 즉시 호출되어 예약 목록이 갱신된다 — 변경 사항 즉시 반영', async () => {
    const onStatusChanged = vi.fn();
    const onClose = vi.fn();
    render(
      <ReservationStatusModal
        reservation={makeReservation()}
        onClose={onClose}
        onStatusChanged={onStatusChanged}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /날짜 변경/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(onStatusChanged).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('저장 실패 시 onStatusChanged/onClose 가 호출되지 않는다', async () => {
    mockUpdateReservationDate.mockResolvedValueOnce({ success: false, message: '에러' });
    const onStatusChanged = vi.fn();
    const onClose = vi.fn();
    render(
      <ReservationStatusModal
        reservation={makeReservation()}
        onClose={onClose}
        onStatusChanged={onStatusChanged}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /날짜 변경/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockUpdateReservationDate).toHaveBeenCalled();
    });
    expect(onStatusChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"뒤로" 버튼 클릭 시 상태 선택 단계로 돌아간다', () => {
    render(
      <ReservationStatusModal
        reservation={makeReservation()}
        onClose={vi.fn()}
        onStatusChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /날짜 변경/ }));
    expect(screen.getByText('예약 일시 변경')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByText('예약 상태 변경')).toBeInTheDocument();
  });
});
