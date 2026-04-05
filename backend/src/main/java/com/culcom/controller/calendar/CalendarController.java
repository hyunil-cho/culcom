package com.culcom.controller.calendar;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.calendar.CalendarReservationResponse;
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
}
