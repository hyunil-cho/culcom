import { api } from './client';
import { API } from '@/lib/routes';

export interface CalendarReservation {
  seq: number; customerSeq: number | null; interviewDate: string;
  customerName: string; customerPhone: string; caller: string; status: string; memo?: string;
}

export const calendarApi = {
  getReservations: (startDate: string, endDate: string) =>
    api.get<CalendarReservation[]>(`${API.CALENDAR_RESERVATIONS}?startDate=${startDate}&endDate=${endDate}`),
  updateReservationStatus: (seq: number, status: string) =>
    api.put<CalendarReservation>(API.CALENDAR_RESERVATION_STATUS(seq), { status }),
};
