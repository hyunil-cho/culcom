import { describe, it, expect } from 'vitest';
import {
  getStatusStyle, formatDateKey, getWeekDates, getMonthDates,
  isSameDay, toReservationMap, toEventMap,
  STATUS_STYLES, DAY_LABELS,
} from '@/app/(main)/calendar/utils';
import type { CalendarReservation, CalendarEvent } from '@/lib/api';

describe('DAY_LABELS', () => {
  it('월~일 7개', () => {
    expect(DAY_LABELS).toEqual(['월', '화', '수', '목', '금', '토', '일']);
  });
});

describe('getStatusStyle', () => {
  it('정의된 상태는 해당 스타일 반환', () => {
    expect(getStatusStyle('예약확정')).toEqual({ bg: '#dbeafe', color: '#1e40af' });
    expect(getStatusStyle('방문')).toEqual({ bg: '#d1fae5', color: '#065f46' });
    expect(getStatusStyle('취소')).toEqual({ bg: '#fee2e2', color: '#991b1b' });
  });

  it('정의되지 않은 상태는 기본 스타일 반환', () => {
    expect(getStatusStyle('알 수 없음')).toEqual({ bg: '#f3f4f6', color: '#6b7280' });
  });

  it('빈 문자열도 기본 스타일', () => {
    expect(getStatusStyle('')).toEqual({ bg: '#f3f4f6', color: '#6b7280' });
  });
});

describe('formatDateKey', () => {
  it('Date를 yyyy-MM-dd 형식 문자열로 변환', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('월/일이 한 자리일 때 0 패딩', () => {
    expect(formatDateKey(new Date(2026, 2, 3))).toBe('2026-03-03');
  });

  it('12월 31일', () => {
    expect(formatDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('getWeekDates', () => {
  it('월요일~일요일 7일 배열 반환', () => {
    // 2026-04-14 (화요일)
    const base = new Date(2026, 3, 14);
    const week = getWeekDates(base);
    expect(week).toHaveLength(7);
    // 월요일 = 4/13
    expect(week[0].getDate()).toBe(13);
    expect(week[0].getDay()).toBe(1); // 월요일
    // 일요일 = 4/19
    expect(week[6].getDate()).toBe(19);
    expect(week[6].getDay()).toBe(0); // 일요일
  });

  it('일요일 기준으로도 해당 주의 월~일 반환', () => {
    // 2026-04-19 (일요일)
    const base = new Date(2026, 3, 19);
    const week = getWeekDates(base);
    expect(week[0].getDate()).toBe(13); // 같은 주 월요일
    expect(week[6].getDate()).toBe(19);
  });

  it('월요일 기준', () => {
    // 2026-04-13 (월요일)
    const base = new Date(2026, 3, 13);
    const week = getWeekDates(base);
    expect(week[0].getDate()).toBe(13);
  });
});

describe('getMonthDates', () => {
  it('2026년 4월의 주 배열 반환', () => {
    const weeks = getMonthDates(2026, 3); // 0-indexed month
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    // 각 주는 7일
    weeks.forEach(week => expect(week).toHaveLength(7));
  });

  it('첫 주의 첫 날은 월요일', () => {
    const weeks = getMonthDates(2026, 3);
    expect(weeks[0][0].getDay()).toBe(1); // 월요일
  });

  it('2월도 정상 처리', () => {
    const weeks = getMonthDates(2026, 1); // 2월
    expect(weeks.length).toBeGreaterThanOrEqual(4);
  });
});

describe('isSameDay', () => {
  it('같은 날짜는 true', () => {
    expect(isSameDay(new Date(2026, 3, 14), new Date(2026, 3, 14))).toBe(true);
  });

  it('시간이 달라도 같은 날이면 true', () => {
    expect(isSameDay(new Date(2026, 3, 14, 9, 0), new Date(2026, 3, 14, 23, 59))).toBe(true);
  });

  it('다른 날짜는 false', () => {
    expect(isSameDay(new Date(2026, 3, 14), new Date(2026, 3, 15))).toBe(false);
  });

  it('다른 월은 false', () => {
    expect(isSameDay(new Date(2026, 3, 14), new Date(2026, 4, 14))).toBe(false);
  });

  it('다른 연도는 false', () => {
    expect(isSameDay(new Date(2026, 3, 14), new Date(2027, 3, 14))).toBe(false);
  });
});

describe('toReservationMap', () => {
  it('예약 목록을 날짜별 맵으로 변환', () => {
    const items: CalendarReservation[] = [
      { seq: 1, interviewDate: '2026-04-14 10:00', customerName: '홍길동', customerPhone: '01012345678', caller: 'IN', status: '예약확정', memo: null },
      { seq: 2, interviewDate: '2026-04-14 09:00', customerName: '김철수', customerPhone: '01099998888', caller: 'OUT', status: '신규', memo: '메모' },
      { seq: 3, interviewDate: '2026-04-15 14:00', customerName: '이영희', customerPhone: '01055556666', caller: 'IN', status: '방문', memo: null },
    ];

    const map = toReservationMap(items);

    expect(Object.keys(map)).toHaveLength(2);
    expect(map['2026-04-14']).toHaveLength(2);
    expect(map['2026-04-15']).toHaveLength(1);
  });

  it('같은 날짜 내에서 시간 순 정렬', () => {
    const items: CalendarReservation[] = [
      { seq: 1, interviewDate: '2026-04-14 14:00', customerName: 'B', customerPhone: '010', caller: 'IN', status: '신규', memo: null },
      { seq: 2, interviewDate: '2026-04-14 09:00', customerName: 'A', customerPhone: '010', caller: 'IN', status: '신규', memo: null },
    ];

    const map = toReservationMap(items);
    expect(map['2026-04-14'][0].time).toBe('09:00');
    expect(map['2026-04-14'][1].time).toBe('14:00');
  });

  it('빈 배열이면 빈 맵 반환', () => {
    expect(toReservationMap([])).toEqual({});
  });

  it('memo가 null이면 undefined으로 변환', () => {
    const items: CalendarReservation[] = [
      { seq: 1, interviewDate: '2026-04-14 10:00', customerName: '홍', customerPhone: '010', caller: 'IN', status: '신규', memo: null },
    ];
    const map = toReservationMap(items);
    expect(map['2026-04-14'][0].memo).toBeUndefined();
  });
});

describe('toEventMap', () => {
  it('이벤트 목록을 날짜별 맵으로 변환', () => {
    const items: CalendarEvent[] = [
      { seq: 1, eventDate: '2026-04-14', title: '미팅', content: '내용', author: '관리자', startTime: '10:00:00', endTime: '11:00:00' },
      { seq: 2, eventDate: '2026-04-14', title: '점심', content: null, author: '관리자', startTime: '12:00:00', endTime: '13:00:00' },
    ];

    const map = toEventMap(items);
    expect(map['2026-04-14']).toHaveLength(2);
    expect(map['2026-04-14'][0].startTime).toBe('10:00');
    expect(map['2026-04-14'][0].endTime).toBe('11:00');
  });

  it('시간 순 정렬', () => {
    const items: CalendarEvent[] = [
      { seq: 1, eventDate: '2026-04-14', title: 'B', content: null, author: 'a', startTime: '15:00:00', endTime: '16:00:00' },
      { seq: 2, eventDate: '2026-04-14', title: 'A', content: null, author: 'a', startTime: '09:00:00', endTime: '10:00:00' },
    ];

    const map = toEventMap(items);
    expect(map['2026-04-14'][0].title).toBe('A');
    expect(map['2026-04-14'][1].title).toBe('B');
  });

  it('content가 null이면 undefined', () => {
    const items: CalendarEvent[] = [
      { seq: 1, eventDate: '2026-04-14', title: '제목', content: null, author: 'a', startTime: '10:00:00', endTime: '11:00:00' },
    ];
    const map = toEventMap(items);
    expect(map['2026-04-14'][0].content).toBeUndefined();
  });

  it('빈 배열이면 빈 맵', () => {
    expect(toEventMap([])).toEqual({});
  });
});
