package com.culcom.controller.complex.attendance;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.dto.complex.classes.MemberReorderRequest;
import com.culcom.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 출석 CUD 컨트롤러 (CQRS Write Side).
 */
@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

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

    @PostMapping("/reorder/members")
    public ResponseEntity<ApiResponse<Void>> reorderMembers(@RequestBody MemberReorderRequest req) {
        attendanceService.reorderMembers(req);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
