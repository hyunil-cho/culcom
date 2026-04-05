package com.culcom.controller.complex.attendance;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffAttendance;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffAttendanceStatus;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * 출석 CUD 컨트롤러 (CQRS Write Side).
 * 출석 기록, 일괄 출석, 수업 순서 변경 등 변경 작업 담당.
 */
@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final ComplexMemberAttendanceRepository attendanceRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexStaffAttendanceRepository staffAttendanceRepository;

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

    // ── 일괄 출석 저장 ──

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<BulkAttendanceResultResponse>>> bulkAttendance(
            @RequestBody BulkAttendanceRequest req) {
        LocalDate today = LocalDate.now();
        List<BulkAttendanceResultResponse> results = new ArrayList<>();

        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            if (bm.isStaff()) {
                Optional<ComplexStaffAttendance> existing = staffAttendanceRepository
                        .findByStaffSeqAndComplexClassSeqAndAttendanceDate(bm.getMemberSeq(), req.getClassSeq(), today);
                if (existing.isPresent()) {
                    results.add(BulkAttendanceResultResponse.builder()
                            .memberSeq(bm.getMemberSeq())
                            .name("")
                            .status("skip_already")
                            .build());
                    continue;
                }
                if (bm.isAttended()) {
                    ComplexStaffAttendance sa = ComplexStaffAttendance.builder()
                            .staff(ComplexStaff.builder().seq(bm.getMemberSeq()).build())
                            .complexClass(ComplexClass.builder().seq(req.getClassSeq()).build())
                            .attendanceDate(today)
                            .status(StaffAttendanceStatus.출석)
                            .build();
                    staffAttendanceRepository.save(sa);
                    results.add(BulkAttendanceResultResponse.builder()
                            .memberSeq(bm.getMemberSeq()).name("").status("출석").build());
                }
                continue;
            }

            List<ComplexMemberMembership> memberships = memberMembershipRepository
                    .findByMemberSeqAndStatus(bm.getMemberSeq(), MembershipStatus.활성);

            if (memberships.isEmpty()) {
                List<ComplexMemberMembership> postponedList = memberMembershipRepository
                        .findByMemberSeqAndStatus(bm.getMemberSeq(), MembershipStatus.연기);
                if (!postponedList.isEmpty()) {
                    results.add(BulkAttendanceResultResponse.builder()
                            .memberSeq(bm.getMemberSeq()).name("").status("연기").build());
                } else {
                    results.add(BulkAttendanceResultResponse.builder()
                            .memberSeq(bm.getMemberSeq()).name("").status("skip_no_membership").build());
                }
                continue;
            }

            ComplexMemberMembership mm = memberships.get(0);

            Optional<ComplexMemberAttendance> existing = attendanceRepository
                    .findByMembershipAndClassAndDate(mm.getSeq(), req.getClassSeq(), today);
            if (existing.isPresent()) {
                results.add(BulkAttendanceResultResponse.builder()
                        .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build());
                continue;
            }

            AttendanceStatus status = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
            ComplexMemberAttendance attendance = ComplexMemberAttendance.builder()
                    .memberMembership(mm)
                    .complexClass(classRepository.getReferenceById(req.getClassSeq()))
                    .attendanceDate(today)
                    .status(status)
                    .build();
            attendanceRepository.save(attendance);

            if (bm.isAttended()) {
                mm.setUsedCount(mm.getUsedCount() + 1);
                memberMembershipRepository.save(mm);
            }

            results.add(BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq())
                    .name("")
                    .status(status == AttendanceStatus.출석 ? "출석" : "결석")
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    // ── 수업 카드 순서 변경 ──

    @PostMapping("/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderClasses(@RequestBody ClassReorderRequest req) {
        for (ClassReorderRequest.ClassOrder order : req.getClassOrders()) {
            classRepository.findById(order.getId()).ifPresent(c -> {
                c.setSortOrder(order.getSortOrder());
                classRepository.save(c);
            });
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
