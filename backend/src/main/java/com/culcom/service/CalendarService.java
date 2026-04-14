package com.culcom.service;

import com.culcom.dto.calendar.CalendarEventRequest;
import com.culcom.dto.calendar.CalendarEventResponse;
import com.culcom.dto.calendar.CalendarReservationResponse;
import com.culcom.entity.calendar.CalendarEvent;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.CalendarEventRepository;
import com.culcom.repository.ReservationInfoRepository;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final ReservationInfoRepository reservationInfoRepository;
    private final CalendarEventRepository calendarEventRepository;

    public List<CalendarReservationResponse> getReservations(Long branchSeq, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.plusDays(1).atStartOfDay();

        List<ReservationInfo> reservations = reservationInfoRepository
                .findByBranchSeqAndInterviewDateBetweenOrderByInterviewDateAsc(branchSeq, start, end);

        return reservations.stream()
                .map(r -> CalendarReservationResponse.builder()
                        .seq(r.getSeq())
                        .customerSeq(r.getCustomer() != null ? r.getCustomer().getSeq() : null)
                        .interviewDate(DateTimeUtils.format(r.getInterviewDate()))
                        .customerName(r.getCustomer() != null ? r.getCustomer().getName() : "-")
                        .customerPhone(r.getCustomer() != null ? r.getCustomer().getPhoneNumber() : "-")
                        .caller(r.getCaller())
                        .status(r.getCustomer() != null ? r.getCustomer().getStatus().name() : "-")
                        .memo(r.getCustomer() != null ? r.getCustomer().getComment() : null)
                        .build())
                .toList();
    }

    @Transactional
    public CalendarReservationResponse updateReservationStatus(Long seq, String status) {
        ReservationInfo r = reservationInfoRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("예약"));

        if (r.getCustomer() == null) {
            throw new IllegalArgumentException("고객 정보가 없습니다.");
        }

        r.getCustomer().setStatus(CustomerStatus.valueOf(status));
        reservationInfoRepository.save(r);

        return CalendarReservationResponse.builder()
                .seq(r.getSeq())
                .customerSeq(r.getCustomer().getSeq())
                .interviewDate(DateTimeUtils.format(r.getInterviewDate()))
                .customerName(r.getCustomer().getName())
                .customerPhone(r.getCustomer().getPhoneNumber())
                .caller(r.getCaller())
                .status(r.getCustomer().getStatus().name())
                .memo(r.getCustomer().getComment())
                .build();
    }

    // ── 캘린더 일정 ──

    public List<CalendarEventResponse> getEvents(Long branchSeq, LocalDate startDate, LocalDate endDate) {
        return calendarEventRepository
                .findByBranchSeqAndEventDateBetweenOrderByStartTimeAsc(branchSeq, startDate, endDate)
                .stream()
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional
    public CalendarEventResponse createEvent(Long branchSeq, CalendarEventRequest request) {
        CalendarEvent event = CalendarEvent.builder()
                .branchSeq(branchSeq)
                .title(request.getTitle())
                .content(request.getContent())
                .author(request.getAuthor())
                .eventDate(request.getEventDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();
        calendarEventRepository.save(event);
        return toEventResponse(event);
    }

    @Transactional
    public void deleteEvent(Long seq, Long branchSeq) {
        CalendarEvent event = calendarEventRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("일정"));
        if (!event.getBranchSeq().equals(branchSeq)) {
            throw new IllegalArgumentException("해당 지점의 일정이 아닙니다.");
        }
        calendarEventRepository.delete(event);
    }

    private CalendarEventResponse toEventResponse(CalendarEvent e) {
        return CalendarEventResponse.builder()
                .seq(e.getSeq())
                .title(e.getTitle())
                .content(e.getContent())
                .author(e.getAuthor())
                .eventDate(e.getEventDate().toString())
                .startTime(e.getStartTime().toString())
                .endTime(e.getEndTime().toString())
                .createdDate(e.getCreatedDate() != null ? DateTimeUtils.format(e.getCreatedDate()) : null)
                .build();
    }
}
