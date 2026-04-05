package com.culcom.controller.complex.attendance;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.attendance.*;
import com.culcom.mapper.AttendanceViewQueryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * 등록현황 조회 전용 컨트롤러 (CQRS Read Side).
 * MyBatis 쿼리로 데이터를 조회하고 계층 구조로 조립만 수행.
 */
@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceViewController {

    private final AttendanceViewQueryMapper attendanceViewQueryMapper;

    // ── 등록현황 통합 뷰 ──

    @GetMapping("/view")
    public ResponseEntity<ApiResponse<List<AttendanceViewSlotResponse>>> attendanceView(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<AttendanceViewRow> rows = attendanceViewQueryMapper.selectAttendanceView(branchSeq, LocalDate.now());

        LinkedHashMap<Long, AttendanceViewSlotResponse.AttendanceViewSlotResponseBuilder> slotMap = new LinkedHashMap<>();
        LinkedHashMap<String, List<AttendanceViewMemberResponse>> classMembersMap = new LinkedHashMap<>();
        LinkedHashMap<String, AttendanceViewRow> classInfoMap = new LinkedHashMap<>();

        for (AttendanceViewRow row : rows) {
            String slotClassKey = row.getTimeSlotSeq() + "-" + row.getClassSeq();

            slotMap.computeIfAbsent(row.getTimeSlotSeq(), k ->
                    AttendanceViewSlotResponse.builder()
                            .timeSlotSeq(row.getTimeSlotSeq())
                            .slotName(row.getSlotName()));

            classInfoMap.putIfAbsent(slotClassKey, row);
            classMembersMap.computeIfAbsent(slotClassKey, k -> new ArrayList<>())
                    .add(AttendanceViewMemberResponse.builder()
                            .memberSeq(row.getMemberSeq())
                            .name(row.getName())
                            .phoneNumber(row.getPhoneNumber())
                            .staff(row.isStaff())
                            .postponed(row.isPostponed())
                            .status(row.getStatus())
                            .build());
        }

        List<AttendanceViewSlotResponse> result = new ArrayList<>();
        LinkedHashMap<Long, List<AttendanceViewClassResponse>> slotClassesMap = new LinkedHashMap<>();
        for (var entry : classInfoMap.entrySet()) {
            AttendanceViewRow info = entry.getValue();
            slotClassesMap.computeIfAbsent(info.getTimeSlotSeq(), k -> new ArrayList<>())
                    .add(AttendanceViewClassResponse.builder()
                            .classSeq(info.getClassSeq())
                            .name(info.getClassName())
                            .capacity(info.getCapacity())
                            .members(classMembersMap.getOrDefault(entry.getKey(), List.of()))
                            .build());
        }
        for (var entry : slotMap.entrySet()) {
            result.add(entry.getValue()
                    .classes(slotClassesMap.getOrDefault(entry.getKey(), List.of()))
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── 등록현황 상세 (시간대별) ──

    @GetMapping("/view/detail")
    public ResponseEntity<ApiResponse<List<AttendanceViewClassResponse>>> attendanceDetail(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam Long slotSeq) {
        Long branchSeq = principal.getSelectedBranchSeq();

        List<AttendanceViewRow> rows = attendanceViewQueryMapper.selectAttendanceDetail(branchSeq, slotSeq);
        List<AttendanceHistoryRow> historyRows = attendanceViewQueryMapper.selectRecentHistory(branchSeq, slotSeq);

        Map<String, List<String>> historyMap = new LinkedHashMap<>();
        for (AttendanceHistoryRow h : historyRows) {
            historyMap.computeIfAbsent(h.getClassSeq() + "-" + h.getMemberSeq(), k -> new ArrayList<>())
                    .add(h.getStatus());
        }

        LinkedHashMap<Long, AttendanceViewRow> classInfoMap = new LinkedHashMap<>();
        LinkedHashMap<Long, List<AttendanceViewMemberResponse>> classMembersMap = new LinkedHashMap<>();

        for (AttendanceViewRow row : rows) {
            classInfoMap.putIfAbsent(row.getClassSeq(), row);

            String histKey = row.getClassSeq() + "-" + row.getMemberSeq();
            List<String> history = row.isStaff() ? List.of() : historyMap.getOrDefault(histKey, List.of());

            classMembersMap.computeIfAbsent(row.getClassSeq(), k -> new ArrayList<>())
                    .add(AttendanceViewMemberResponse.builder()
                            .memberSeq(row.getMemberSeq())
                            .name(row.getName())
                            .phoneNumber(row.getPhoneNumber())
                            .level(row.getLevel())
                            .info(row.getInfo())
                            .joinDate(row.getJoinDate())
                            .expiryDate(row.getExpiryDate())
                            .totalCount(row.getTotalCount())
                            .usedCount(row.getUsedCount())
                            .grade(row.getGrade())
                            .staff(row.isStaff())
                            .postponed(row.isPostponed())
                            .status(row.getStatus())
                            .attendanceHistory(history)
                            .build());
        }

        List<AttendanceViewClassResponse> result = new ArrayList<>();
        for (var entry : classInfoMap.entrySet()) {
            AttendanceViewRow info = entry.getValue();
            result.add(AttendanceViewClassResponse.builder()
                    .classSeq(info.getClassSeq())
                    .name(info.getClassName())
                    .capacity(info.getCapacity())
                    .members(classMembersMap.getOrDefault(entry.getKey(), List.of()))
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
