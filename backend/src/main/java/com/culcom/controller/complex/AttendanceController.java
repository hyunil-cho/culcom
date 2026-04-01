package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexMemberAttendance;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final ComplexMemberAttendanceRepository attendanceRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplexMemberAttendance>>> listByClassAndDate(
            @RequestParam Long classSeq,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceRepository.findByClassAndDate(classSeq, date)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexMemberAttendance>> record(
            @RequestBody ComplexMemberAttendance attendance) {
        return ResponseEntity.ok(ApiResponse.ok("출석 기록 완료", attendanceRepository.save(attendance)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMemberAttendance>> update(
            @PathVariable Long seq, @RequestBody ComplexMemberAttendance request) {
        return attendanceRepository.findById(seq)
                .map(att -> {
                    att.setStatus(request.getStatus());
                    att.setNote(request.getNote());
                    return ResponseEntity.ok(ApiResponse.ok("출석 수정 완료", attendanceRepository.save(att)));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
