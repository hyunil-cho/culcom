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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
        for (ClassReorderRequest.ClassOrder order : req.getClassOrders()) {
            classRepository.findById(order.getId()).ifPresent(c -> {
                c.setSortOrder(order.getSortOrder());
                classRepository.save(c);
            });
        }
    }

    @Transactional
    public List<BulkAttendanceResultResponse> processBulkAttendance(BulkAttendanceRequest req) {
        LocalDate today = LocalDate.now();
        List<BulkAttendanceResultResponse> results = new ArrayList<>();

        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            if (bm.isStaff()) {
                results.add(processStaffAttendance(bm, req.getClassSeq(), today));
            } else {
                results.add(processMemberAttendance(bm, req.getClassSeq(), today));
            }
        }
        return results;
    }

    private BulkAttendanceResultResponse processStaffAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today) {

        Optional<ComplexStaffAttendance> existing = staffAttendanceRepository
                .findByStaffSeqAndComplexClassSeqAndAttendanceDate(bm.getMemberSeq(), classSeq, today);
        if (existing.isPresent()) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build();
        }

        StaffAttendanceStatus saStatus = bm.isAttended() ? StaffAttendanceStatus.출석 : StaffAttendanceStatus.결석;
        staffAttendanceRepository.save(ComplexStaffAttendance.builder()
                .staff(ComplexStaff.builder().seq(bm.getMemberSeq()).build())
                .complexClass(ComplexClass.builder().seq(classSeq).build())
                .attendanceDate(today)
                .status(saStatus)
                .build());

        activityLogRepository.save(MembershipActivityLog.builder()
                .staff(ComplexStaff.builder().seq(bm.getMemberSeq()).build())
                .complexClass(ComplexClass.builder().seq(classSeq).build())
                .activityDate(today)
                .status(bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석)
                .usedCountDelta(0)
                .build());

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name("")
                .status(bm.isAttended() ? "출석" : "결석").build();
    }

    private BulkAttendanceResultResponse processMemberAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today) {

        // 연기 상태 확인
        List<ComplexMemberMembership> postponedList = memberMembershipRepository
                .findByMemberSeqAndStatus(bm.getMemberSeq(), MembershipStatus.연기);
        if (!postponedList.isEmpty()) {
            ComplexMemberMembership pmm = postponedList.get(0);
            activityLogRepository.save(MembershipActivityLog.builder()
                    .member(ComplexMember.builder().seq(bm.getMemberSeq()).build())
                    .membership(pmm)
                    .complexClass(ComplexClass.builder().seq(classSeq).build())
                    .activityDate(today)
                    .status(AttendanceStatus.연기)
                    .usedCountDelta(0)
                    .usedCountAfter(pmm.getUsedCount())
                    .note("멤버십 연기 중 — 출석 불가")
                    .build());
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("연기").build();
        }

        // 활성 멤버십 확인
        List<ComplexMemberMembership> memberships = memberMembershipRepository
                .findByMemberSeqAndStatus(bm.getMemberSeq(), MembershipStatus.활성);
        if (memberships.isEmpty()) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_no_membership").build();
        }

        ComplexMemberMembership mm = memberships.get(0);

        // 중복 출석 확인
        Optional<ComplexMemberAttendance> existing = attendanceRepository
                .findByMembershipAndClassAndDate(mm.getSeq(), classSeq, today);
        if (existing.isPresent()) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build();
        }

        // 출석/결석 기록
        AttendanceStatus status = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .memberMembership(mm)
                .complexClass(classRepository.getReferenceById(classSeq))
                .attendanceDate(today)
                .status(status)
                .build());

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
                .activityDate(today)
                .status(status)
                .usedCountDelta(delta)
                .usedCountAfter(mm.getUsedCount())
                .build());

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name("")
                .status(status == AttendanceStatus.출석 ? "출석" : "결석").build();
    }
}
