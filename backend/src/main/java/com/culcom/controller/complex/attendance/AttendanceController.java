package com.culcom.controller.complex.attendance;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.*;
import com.culcom.entity.*;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffAttendanceStatus;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complex/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final ComplexMemberAttendanceRepository attendanceRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository classMappingRepository;
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

    // ── 등록현황 (통합 뷰) ──

    @GetMapping("/view")
    public ResponseEntity<ApiResponse<List<AttendanceViewSlotResponse>>> attendanceView(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        LocalDate today = LocalDate.now();

        List<ComplexClass> classes = classRepository.findAllWithTimeSlotByBranch(branchSeq);
        if (classes.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        List<Long> classSeqs = classes.stream().map(ComplexClass::getSeq).toList();

        // 회원-수업 매핑 조회
        List<ComplexMemberClassMapping> mappings = classMappingRepository.findAllWithMemberByBranch(branchSeq);
        Map<Long, List<ComplexMemberClassMapping>> mappingsByClass = mappings.stream()
                .collect(Collectors.groupingBy(m -> m.getComplexClass().getSeq()));

        // 오늘 출석 기록 조회
        List<ComplexMemberAttendance> todayAttendances = attendanceRepository.findByClassSeqsAndDate(classSeqs, today);
        // key: classSeq-memberSeq -> status
        Map<String, String> attendanceMap = new HashMap<>();
        for (ComplexMemberAttendance a : todayAttendances) {
            String key = a.getComplexClass().getSeq() + "-" + a.getMemberMembership().getMember().getSeq();
            attendanceMap.put(key, a.getStatus().name());
        }

        // 스태프 오늘 출석 기록
        List<ComplexStaffAttendance> staffAttendances = staffAttendanceRepository.findByClassSeqsAndDate(classSeqs, today);
        Map<String, String> staffAttendanceMap = new HashMap<>();
        for (ComplexStaffAttendance a : staffAttendances) {
            String key = a.getComplexClass().getSeq() + "-" + a.getStaff().getSeq();
            staffAttendanceMap.put(key, a.getStatus().name());
        }

        // 회원 멤버십 상태 조회 (연기 체크용)
        Set<Long> allMemberSeqs = mappings.stream()
                .map(m -> m.getMember().getSeq()).collect(Collectors.toSet());
        Map<Long, ComplexMemberMembership> activeMembershipMap = new HashMap<>();
        if (!allMemberSeqs.isEmpty()) {
            List<ComplexMemberMembership> memberships = memberMembershipRepository
                    .findByMemberSeqsAndStatus(new ArrayList<>(allMemberSeqs), MembershipStatus.활성);
            for (ComplexMemberMembership mm : memberships) {
                activeMembershipMap.putIfAbsent(mm.getMember().getSeq(), mm);
            }
            // 연기 상태도 체크
            List<ComplexMemberMembership> postponed = memberMembershipRepository
                    .findByMemberSeqsAndStatus(new ArrayList<>(allMemberSeqs), MembershipStatus.연기);
            for (ComplexMemberMembership mm : postponed) {
                activeMembershipMap.putIfAbsent(mm.getMember().getSeq(), mm);
            }
        }

        // 시간대별 그룹핑
        LinkedHashMap<Long, List<ComplexClass>> classesBySlot = new LinkedHashMap<>();
        for (ComplexClass c : classes) {
            classesBySlot.computeIfAbsent(c.getTimeSlot().getSeq(), k -> new ArrayList<>()).add(c);
        }

        List<AttendanceViewSlotResponse> result = new ArrayList<>();
        for (var entry : classesBySlot.entrySet()) {
            List<ComplexClass> slotClasses = entry.getValue();
            ClassTimeSlot slot = slotClasses.get(0).getTimeSlot();
            String slotName = slot.getName() + " " + slot.getDaysOfWeek() +
                    " (" + slot.getStartTime() + " ~ " + slot.getEndTime() + ")";

            List<AttendanceViewClassResponse> classResponses = new ArrayList<>();
            for (ComplexClass c : slotClasses) {
                List<AttendanceViewMemberResponse> memberResponses = new ArrayList<>();

                // 스태프 먼저 추가
                if (c.getStaff() != null) {
                    ComplexStaff staff = c.getStaff();
                    String staffStatus = staffAttendanceMap.getOrDefault(
                            c.getSeq() + "-" + staff.getSeq(), "");
                    String displayStatus = "";
                    if ("출석".equals(staffStatus)) displayStatus = "O";
                    else if ("결석".equals(staffStatus)) displayStatus = "X";

                    memberResponses.add(AttendanceViewMemberResponse.builder()
                            .memberSeq(staff.getSeq())
                            .name(staff.getName())
                            .phoneNumber(staff.getPhoneNumber())
                            .staff(true)
                            .postponed(false)
                            .status(displayStatus)
                            .build());
                }

                // 회원 추가
                List<ComplexMemberClassMapping> classMappings = mappingsByClass.getOrDefault(c.getSeq(), List.of());
                for (ComplexMemberClassMapping mapping : classMappings) {
                    ComplexMember member = mapping.getMember();
                    ComplexMemberMembership membership = activeMembershipMap.get(member.getSeq());
                    boolean isPostponed = membership != null && membership.getStatus() == MembershipStatus.연기;

                    String memberStatus = "";
                    if (isPostponed) {
                        memberStatus = "△";
                    } else {
                        String rawStatus = attendanceMap.getOrDefault(
                                c.getSeq() + "-" + member.getSeq(), "");
                        if ("출석".equals(rawStatus)) memberStatus = "O";
                        else if ("결석".equals(rawStatus)) memberStatus = "X";
                    }

                    memberResponses.add(AttendanceViewMemberResponse.builder()
                            .memberSeq(member.getSeq())
                            .name(member.getName())
                            .phoneNumber(member.getPhoneNumber())
                            .staff(false)
                            .postponed(isPostponed)
                            .status(memberStatus)
                            .build());
                }

                classResponses.add(AttendanceViewClassResponse.builder()
                        .classSeq(c.getSeq())
                        .name(c.getName())
                        .capacity(c.getCapacity())
                        .members(memberResponses)
                        .build());
            }

            result.add(AttendanceViewSlotResponse.builder()
                    .timeSlotSeq(slot.getSeq())
                    .slotName(slotName)
                    .classes(classResponses)
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

        List<ComplexClass> classes = classRepository.findByTimeSlotAndBranch(branchSeq, slotSeq);
        if (classes.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        List<Long> classSeqs = classes.stream().map(ComplexClass::getSeq).toList();

        // 회원-수업 매핑 조회
        List<ComplexMemberClassMapping> mappings = classMappingRepository.findByTimeSlotAndBranch(branchSeq, slotSeq);
        Map<Long, List<ComplexMemberClassMapping>> mappingsByClass = mappings.stream()
                .collect(Collectors.groupingBy(m -> m.getComplexClass().getSeq()));

        // 멤버십 조회
        Set<Long> allMemberSeqs = mappings.stream()
                .map(m -> m.getMember().getSeq()).collect(Collectors.toSet());
        Map<Long, ComplexMemberMembership> activeMembershipMap = new HashMap<>();
        if (!allMemberSeqs.isEmpty()) {
            List<ComplexMemberMembership> memberships = memberMembershipRepository
                    .findByMemberSeqsAndStatus(new ArrayList<>(allMemberSeqs), MembershipStatus.활성);
            for (ComplexMemberMembership mm : memberships) {
                activeMembershipMap.putIfAbsent(mm.getMember().getSeq(), mm);
            }
            List<ComplexMemberMembership> postponed = memberMembershipRepository
                    .findByMemberSeqsAndStatus(new ArrayList<>(allMemberSeqs), MembershipStatus.연기);
            for (ComplexMemberMembership mm : postponed) {
                activeMembershipMap.putIfAbsent(mm.getMember().getSeq(), mm);
            }
        }

        // 최근 출석 기록 조회
        List<ComplexMemberAttendance> recentRecords = attendanceRepository.findRecentByClassSeqs(classSeqs);
        // key: classSeq-memberSeq -> recent statuses (최대 10개)
        Map<String, List<String>> historyMap = new LinkedHashMap<>();
        for (ComplexMemberAttendance a : recentRecords) {
            String key = a.getComplexClass().getSeq() + "-" + a.getMemberMembership().getMember().getSeq();
            historyMap.computeIfAbsent(key, k -> new ArrayList<>());
            List<String> list = historyMap.get(key);
            if (list.size() < 10) {
                list.add(a.getStatus() == AttendanceStatus.출석 ? "O" : "X");
            }
        }

        List<AttendanceViewClassResponse> result = new ArrayList<>();
        for (ComplexClass c : classes) {
            List<AttendanceViewMemberResponse> memberResponses = new ArrayList<>();

            // 스태프 먼저
            if (c.getStaff() != null) {
                ComplexStaff staff = c.getStaff();
                memberResponses.add(AttendanceViewMemberResponse.builder()
                        .memberSeq(staff.getSeq())
                        .name(staff.getName())
                        .phoneNumber(staff.getPhoneNumber())
                        .staff(true)
                        .postponed(false)
                        .attendanceHistory(List.of())
                        .build());
            }

            List<ComplexMemberClassMapping> classMappings = mappingsByClass.getOrDefault(c.getSeq(), List.of());
            for (ComplexMemberClassMapping mapping : classMappings) {
                ComplexMember member = mapping.getMember();
                ComplexMemberMembership membership = activeMembershipMap.get(member.getSeq());
                boolean isPostponed = membership != null && membership.getStatus() == MembershipStatus.연기;

                String histKey = c.getSeq() + "-" + member.getSeq();
                List<String> history = historyMap.getOrDefault(histKey, List.of());

                memberResponses.add(AttendanceViewMemberResponse.builder()
                        .memberSeq(member.getSeq())
                        .name(member.getName())
                        .phoneNumber(member.getPhoneNumber())
                        .level(member.getLevel())
                        .info(member.getInfo())
                        .joinDate(membership != null ? membership.getStartDate() : null)
                        .expiryDate(membership != null ? membership.getExpiryDate() : null)
                        .totalCount(membership != null ? membership.getTotalCount() : null)
                        .usedCount(membership != null ? membership.getUsedCount() : null)
                        .staff(false)
                        .postponed(isPostponed)
                        .status(isPostponed ? "△" : "")
                        .attendanceHistory(history)
                        .build());
            }

            result.add(AttendanceViewClassResponse.builder()
                    .classSeq(c.getSeq())
                    .name(c.getName())
                    .capacity(c.getCapacity())
                    .members(memberResponses)
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── 일괄 출석 저장 ──

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<BulkAttendanceResultResponse>>> bulkAttendance(
            @RequestBody BulkAttendanceRequest req) {
        LocalDate today = LocalDate.now();
        List<BulkAttendanceResultResponse> results = new ArrayList<>();

        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            if (bm.isStaff()) {
                // 스태프 출석 처리
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

            // 회원 출석 처리
            List<ComplexMemberMembership> memberships = memberMembershipRepository
                    .findByMemberSeqAndStatus(bm.getMemberSeq(), MembershipStatus.활성);

            if (memberships.isEmpty()) {
                // 연기 상태 체크
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
