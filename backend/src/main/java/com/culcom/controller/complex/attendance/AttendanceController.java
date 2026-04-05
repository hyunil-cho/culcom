package com.culcom.controller.complex.attendance;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * 출석 CUD 컨트롤러 (CQRS Write Side).
 */
@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> listByClassAndDate(
            @RequestParam Long classSeq,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.listByClassAndDate(classSeq, date)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceResponse>> record(@RequestBody AttendanceRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("출석 기록 완료", attendanceService.record(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable Long seq, @RequestBody AttendanceRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("출석 수정 완료", attendanceService.update(seq, req)));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<BulkAttendanceResultResponse>>> bulkAttendance(
            @RequestBody BulkAttendanceRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.processBulkAttendance(req)));
    }

    @PostMapping("/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderClasses(@RequestBody ClassReorderRequest req) {
        attendanceService.reorderClasses(req);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
