package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.AttendanceRequest;
import com.culcom.dto.complex.AttendanceResponse;
import com.culcom.entity.ComplexMemberAttendance;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
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
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> listByClassAndDate(
            @RequestParam Long classSeq,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<AttendanceResponse> result = attendanceRepository.findByClassAndDate(classSeq, date)
                .stream().map(AttendanceResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceResponse>> record(
            @RequestBody AttendanceRequest req) {
        ComplexMemberAttendance attendance = ComplexMemberAttendance.builder()
                .memberMembership(memberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()))
                .complexClass(req.getClassSeq() != null ? classRepository.getReferenceById(req.getClassSeq()) : null)
                .attendanceDate(req.getAttendanceDate())
                .status(req.getStatus())
                .note(req.getNote())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("출석 기록 완료", AttendanceResponse.from(attendanceRepository.save(attendance))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable Long seq, @RequestBody AttendanceRequest req) {
        return attendanceRepository.findById(seq)
                .map(att -> {
                    att.setStatus(req.getStatus());
                    att.setNote(req.getNote());
                    return ResponseEntity.ok(ApiResponse.ok("출석 수정 완료", AttendanceResponse.from(attendanceRepository.save(att))));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
