package com.culcom.controller.calendar;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.calendar.CalendarReservationResponse;
import com.culcom.dto.calendar.ReservationStatusRequest;
import jakarta.validation.Valid;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.ReservationInfoRepository;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final ReservationInfoRepository reservationInfoRepository;

    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<List<CalendarReservationResponse>>> getReservations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserPrincipal principal) {

        Long branchSeq = principal.getSelectedBranchSeq();
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.plusDays(1).atStartOfDay();

        List<ReservationInfo> reservations = reservationInfoRepository
                .findByBranchSeqAndInterviewDateBetweenOrderByInterviewDateAsc(branchSeq, start, end);

        List<CalendarReservationResponse> result = reservations.stream()
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

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/reservations/{seq}/status")
    public ResponseEntity<ApiResponse<CalendarReservationResponse>> updateReservationStatus(
            @PathVariable Long seq, @Valid @RequestBody ReservationStatusRequest request) {
        return reservationInfoRepository.findById(seq).map(r -> {
            if (r.getCustomer() == null) {
                return ResponseEntity.ok(ApiResponse.<CalendarReservationResponse>error("고객 정보가 없습니다."));
            }
            r.getCustomer().setStatus(CustomerStatus.valueOf(request.getStatus()));

            reservationInfoRepository.save(r);

            CalendarReservationResponse response = CalendarReservationResponse.builder()
                    .seq(r.getSeq())
                    .customerSeq(r.getCustomer().getSeq())
                    .interviewDate(DateTimeUtils.format(r.getInterviewDate()))
                    .customerName(r.getCustomer().getName())
                    .customerPhone(r.getCustomer().getPhoneNumber())
                    .caller(r.getCaller())
                    .status(r.getCustomer().getStatus().name())
                    .memo(r.getCustomer().getComment())
                    .build();

            return ResponseEntity.ok(ApiResponse.ok("상태가 변경되었습니다.", response));
        }).orElse(ResponseEntity.notFound().build());
    }
}
