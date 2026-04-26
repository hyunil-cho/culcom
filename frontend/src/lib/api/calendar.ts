import { api } from './client';
import { API } from '@/lib/routes';

export interface CalendarReservation {
  seq: number; customerSeq: number | null; interviewDate: string;
  customerName: string; customerPhone: string; caller: string; status: string; memo?: string;
  createdDate?: string;
  lastUpdateDate?: string;
}

export interface CalendarEvent {
  seq: number;
  title: string;
  content?: string;
  author: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  createdDate?: string;
  lastUpdateDate?: string;
}

export interface CalendarEventRequest {
  title: string;
  content?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
}

export const calendarApi = {
  getReservations: (startDate: string, endDate: string) =>
    api.get<CalendarReservation[]>(`${API.CALENDAR_RESERVATIONS}?startDate=${startDate}&endDate=${endDate}`),
  updateReservationStatus: (seq: number, status: string) =>
    api.put<CalendarReservation>(API.CALENDAR_RESERVATION_STATUS(seq), { status }),
  updateReservationDate: (seq: number, interviewDate: string) =>
    api.put<CalendarReservation>(API.CALENDAR_RESERVATION_DATE(seq), { interviewDate }),
  getEvents: (startDate: string, endDate: string) =>
    api.get<CalendarEvent[]>(`${API.CALENDAR_EVENTS}?startDate=${startDate}&endDate=${endDate}`),
  createEvent: (data: CalendarEventRequest) =>
    api.post<CalendarEvent>(API.CALENDAR_EVENTS, data),
  updateEvent: (seq: number, data: CalendarEventRequest) =>
    api.put<CalendarEvent>(API.CALENDAR_EVENT(seq), data),
  deleteEvent: (seq: number) =>
    api.delete<void>(API.CALENDAR_EVENT(seq)),
};
