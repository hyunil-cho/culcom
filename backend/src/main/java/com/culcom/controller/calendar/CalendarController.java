package com.culcom.controller.calendar;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.calendar.CalendarEventRequest;
import com.culcom.dto.calendar.CalendarEventResponse;
import com.culcom.dto.calendar.CalendarReservationResponse;
import com.culcom.dto.calendar.ReservationDateUpdateRequest;
import com.culcom.dto.calendar.ReservationStatusRequest;
import jakarta.validation.Valid;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<List<CalendarReservationResponse>>> getReservations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(
                calendarService.getReservations(principal.getSelectedBranchSeq(), startDate, endDate)));
    }

    @PutMapping("/reservations/{seq}/status")
    public ResponseEntity<ApiResponse<CalendarReservationResponse>> updateReservationStatus(
            @PathVariable Long seq, @Valid @RequestBody ReservationStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("상태가 변경되었습니다.",
                calendarService.updateReservationStatus(seq, request.getStatus())));
    }

    @PutMapping("/reservations/{seq}/interview-date")
    public ResponseEntity<ApiResponse<CalendarReservationResponse>> updateReservationDate(
            @PathVariable Long seq, @Valid @RequestBody ReservationDateUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("예약 일시가 변경되었습니다.",
                calendarService.updateReservationDate(seq, request.getInterviewDate())));
    }

    // ── 캘린더 일정 ──

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<CalendarEventResponse>>> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(
                calendarService.getEvents(principal.getSelectedBranchSeq(), startDate, endDate)));
    }

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<CalendarEventResponse>> createEvent(
            @Valid @RequestBody CalendarEventRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("일정이 등록되었습니다.",
                calendarService.createEvent(principal.getSelectedBranchSeq(), principal.getUserId(), request)));
    }

    @PutMapping("/events/{seq}")
    public ResponseEntity<ApiResponse<CalendarEventResponse>> updateEvent(
            @PathVariable Long seq,
            @Valid @RequestBody CalendarEventRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("일정이 수정되었습니다.",
                calendarService.updateEvent(seq, principal.getSelectedBranchSeq(), principal.getUserId(), request)));
    }

    @DeleteMapping("/events/{seq}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        calendarService.deleteEvent(seq, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
