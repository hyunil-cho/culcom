package com.culcom.service;

import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipActivityLog;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffAttendance;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffAttendanceStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final ComplexMemberAttendanceRepository attendanceRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexStaffAttendanceRepository staffAttendanceRepository;
    private final MembershipActivityLogRepository activityLogRepository;

    public List<AttendanceResponse> listByClassAndDate(Long classSeq, LocalDate date) {
        return attendanceRepository.findByClassAndDate(classSeq, date)
                .stream().map(AttendanceResponse::from).toList();
    }

    @Transactional
    public AttendanceResponse record(AttendanceRequest req) {
        ComplexMemberAttendance attendance = ComplexMemberAttendance.builder()
                .memberMembership(memberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()))
                .complexClass(req.getClassSeq() != null ? classRepository.getReferenceById(req.getClassSeq()) : null)
                .attendanceDate(req.getAttendanceDate())
                .status(req.getStatus())
                .note(req.getNote())
                .build();
        return AttendanceResponse.from(attendanceRepository.save(attendance));
    }

    @Transactional
    public AttendanceResponse update(Long seq, AttendanceRequest req) {
        ComplexMemberAttendance att = attendanceRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("출석"));
        att.setStatus(req.getStatus());
        att.setNote(req.getNote());
        return AttendanceResponse.from(attendanceRepository.save(att));
    }

    @Transactional
    public void reorderClasses(ClassReorderRequest req) {
        List<Long> ids = req.getClassOrders().stream().map(ClassReorderRequest.ClassOrder::getId).toList();
        Map<Long, ComplexClass> classMap = new HashMap<>();
        classRepository.findAllById(ids).forEach(c -> classMap.put(c.getSeq(), c));

        for (ClassReorderRequest.ClassOrder order : req.getClassOrders()) {
            ComplexClass c = classMap.get(order.getId());
            if (c != null) c.setSortOrder(order.getSortOrder());
        }
        classRepository.saveAll(classMap.values());
    }

    @Transactional
    public List<BulkAttendanceResultResponse> processBulkAttendance(BulkAttendanceRequest req) {
        LocalDate today = LocalDate.now();
        Long classSeq = req.getClassSeq();

        // 회원 seq 추출 (스태프 제외)
        List<Long> memberSeqs = req.getMembers().stream()
                .filter(bm -> !bm.isStaff())
                .map(BulkAttendanceRequest.BulkMember::getMemberSeq).toList();

        // 배치 프리로드: 멤버십(연기+활성) + 오늘 출석 기록
        Map<Long, ComplexMemberMembership> postponedMap = new HashMap<>();
        Map<Long, ComplexMemberMembership> activeMap = new HashMap<>();
        if (!memberSeqs.isEmpty()) {
            memberMembershipRepository.findByMemberSeqsAndStatus(memberSeqs, MembershipStatus.연기)
                    .forEach(mm -> postponedMap.putIfAbsent(mm.getMember().getSeq(), mm));
            memberMembershipRepository.findByMemberSeqsAndStatus(memberSeqs, MembershipStatus.활성)
                    .forEach(mm -> activeMap.putIfAbsent(mm.getMember().getSeq(), mm));
        }
        Set<String> existingAttendanceKeys = attendanceRepository
                .findByClassSeqsAndDate(List.of(classSeq), today).stream()
                .map(a -> a.getMemberMembership().getMember().getSeq() + "-" + classSeq)
                .collect(Collectors.toSet());

        // 스태프 기존 출석 프리로드
        List<Long> staffSeqs = req.getMembers().stream()
                .filter(BulkAttendanceRequest.BulkMember::isStaff)
                .map(BulkAttendanceRequest.BulkMember::getMemberSeq).toList();
        Set<Long> existingStaffAttendance = staffAttendanceRepository
                .findByClassSeqsAndDate(List.of(classSeq), today).stream()
                .map(a -> a.getStaff().getSeq())
                .collect(Collectors.toSet());

        List<BulkAttendanceResultResponse> results = new ArrayList<>();
        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            if (bm.isStaff()) {
                results.add(processStaffAttendance(bm, classSeq, today, existingStaffAttendance));
            } else {
                results.add(processMemberAttendance(bm, classSeq, today, postponedMap, activeMap, existingAttendanceKeys));
            }
        }
        return results;
    }

    private BulkAttendanceResultResponse processStaffAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today,
            Set<Long> existingStaffAttendance) {

        if (existingStaffAttendance.contains(bm.getMemberSeq())) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build();
        }

        StaffAttendanceStatus saStatus = bm.isAttended() ? StaffAttendanceStatus.출석 : StaffAttendanceStatus.결석;
        staffAttendanceRepository.save(ComplexStaffAttendance.builder()
                .staff(ComplexStaff.builder().seq(bm.getMemberSeq()).build())
                .complexClass(ComplexClass.builder().seq(classSeq).build())
                .attendanceDate(today).status(saStatus).build());

        activityLogRepository.save(MembershipActivityLog.builder()
                .staff(ComplexStaff.builder().seq(bm.getMemberSeq()).build())
                .complexClass(ComplexClass.builder().seq(classSeq).build())
                .activityDate(today)
                .status(bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석)
                .usedCountDelta(0).build());

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name("")
                .status(bm.isAttended() ? "출석" : "결석").build();
    }

    private BulkAttendanceResultResponse processMemberAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today,
            Map<Long, ComplexMemberMembership> postponedMap,
            Map<Long, ComplexMemberMembership> activeMap,
            Set<String> existingAttendanceKeys) {

        // 연기 확인 (프리로드 맵)
        ComplexMemberMembership pmm = postponedMap.get(bm.getMemberSeq());
        if (pmm != null) {
            activityLogRepository.save(MembershipActivityLog.builder()
                    .member(ComplexMember.builder().seq(bm.getMemberSeq()).build())
                    .membership(pmm)
                    .complexClass(ComplexClass.builder().seq(classSeq).build())
                    .activityDate(today).status(AttendanceStatus.연기)
                    .usedCountDelta(0).usedCountAfter(pmm.getUsedCount())
                    .note("멤버십 연기 중 — 출석 불가").build());
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("연기").build();
        }

        // 활성 멤버십 확인 (프리로드 맵)
        ComplexMemberMembership mm = activeMap.get(bm.getMemberSeq());
        if (mm == null) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_no_membership").build();
        }

        // 중복 출석 확인 (프리로드 셋)
        if (existingAttendanceKeys.contains(bm.getMemberSeq() + "-" + classSeq)) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build();
        }

        AttendanceStatus status = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .memberMembership(mm)
                .complexClass(classRepository.getReferenceById(classSeq))
                .attendanceDate(today).status(status).build());

        int delta = 0;
        if (bm.isAttended()) {
            delta = 1;
            mm.setUsedCount(mm.getUsedCount() + 1);
            memberMembershipRepository.save(mm);
        }

        activityLogRepository.save(MembershipActivityLog.builder()
                .member(ComplexMember.builder().seq(bm.getMemberSeq()).build())
                .membership(mm)
                .complexClass(ComplexClass.builder().seq(classSeq).build())
                .activityDate(today).status(status)
                .usedCountDelta(delta).usedCountAfter(mm.getUsedCount()).build());

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name("")
                .status(status == AttendanceStatus.출석 ? "출석" : "결석").build();
    }
}
