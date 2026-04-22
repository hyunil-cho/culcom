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
        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> rows = attendanceViewQueryMapper.selectAttendanceView(branchSeq, today, today.minusDays(7));

        LinkedHashMap<Long, AttendanceViewSlotResponse.AttendanceViewSlotResponseBuilder> slotMap = new LinkedHashMap<>();
        LinkedHashMap<String, List<AttendanceViewMemberResponse>> classMembersMap = new LinkedHashMap<>();
        LinkedHashMap<String, AttendanceViewRow> classInfoMap = new LinkedHashMap<>();

        for (AttendanceViewRow row : rows) {
            slotMap.computeIfAbsent(row.getTimeSlotSeq(), k ->
                    AttendanceViewSlotResponse.builder()
                            .timeSlotSeq(row.getTimeSlotSeq())
                            .slotName(formatSlotName(row)));

            if (row.getClassSeq() == null) continue;

            String slotClassKey = row.getTimeSlotSeq() + "-" + row.getClassSeq();
            classInfoMap.putIfAbsent(slotClassKey, row);
            if (row.getMemberSeq() != null) {
                classMembersMap.computeIfAbsent(slotClassKey, k -> new ArrayList<>())
                        .add(AttendanceViewMemberResponse.builder()
                                .memberSeq(row.getMemberSeq())
                                .name(row.getName())
                                .phoneNumber(row.getPhoneNumber())
                                .staff(row.isStaff())
                                .postponed(row.isPostponed())
                                .noMembership(row.isNoMembership())
                                .status(row.getStatus())
                                .attendanceDate(row.getAttendanceDate())
                                .build());
            }
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

        List<AttendanceViewRow> rows = attendanceViewQueryMapper.selectAttendanceDetail(branchSeq, slotSeq, LocalDate.now());
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

            if (row.getMemberSeq() != null) {
                String histKey = row.getClassSeq() + "-" + row.getMemberSeq();
                List<String> history = historyMap.getOrDefault(histKey, List.of());

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
                                .membershipName(row.getMembershipName())
                                .staff(row.isStaff())
                                .postponed(row.isPostponed())
                                .noMembership(row.isNoMembership())
                                .status(row.getStatus())
                                .attendanceHistory(history)
                                .build());
            }
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

    // ── 전체 스태프 출석율 요약 ──

    @GetMapping("/history/staff-rates")
    public ResponseEntity<ApiResponse<List<StaffAttendanceRateSummary>>> staffAttendanceRates(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "3") int months) {
        Long branchSeq = principal.getSelectedBranchSeq();
        LocalDate fromDate = LocalDate.now().minusMonths(months);
        List<StaffAttendanceRateSummary> rates = attendanceViewQueryMapper.selectAllStaffAttendanceRates(branchSeq, fromDate);
        return ResponseEntity.ok(ApiResponse.ok(rates));
    }

    private String formatSlotName(AttendanceViewRow row) {
        String start = row.getStartTime() != null ? row.getStartTime().toString().substring(0, 5) : "";
        String end = row.getEndTime() != null ? row.getEndTime().toString().substring(0, 5) : "";
        return row.getSlotName() + " " + row.getDaysOfWeek() + " (" + start + " ~ " + end + ")";
    }
}
