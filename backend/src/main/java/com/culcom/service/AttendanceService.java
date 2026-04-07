package com.culcom.service;

import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.logs.AttendanceDetail;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final ComplexMemberAttendanceRepository attendanceRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ApplicationEventPublisher eventPublisher;

    public List<AttendanceResponse> listByClassAndDate(Long classSeq, LocalDate date) {
        return attendanceRepository.findByClassAndDate(classSeq, date)
                .stream().map(AttendanceResponse::from).toList();
    }

    @Transactional
    public AttendanceResponse record(AttendanceRequest req) {
        ComplexMemberMembership mm = memberMembershipRepository.getReferenceById(req.getMemberMembershipSeq());
        ComplexMemberAttendance attendance = ComplexMemberAttendance.builder()
                .member(mm.getMember())
                .memberMembership(mm)
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

        // 모든 멤버 seq 추출
        List<Long> memberSeqs = req.getMembers().stream()
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
        Map<Long, ComplexMemberAttendance> existingAttendanceMap = new HashMap<>();
        attendanceRepository.findByClassSeqsAndDate(List.of(classSeq), today)
                .forEach(a -> existingAttendanceMap.put(a.getMember().getSeq(), a));

        List<BulkAttendanceResultResponse> results = new ArrayList<>();
        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            results.add(processMemberAttendance(bm, classSeq, today, postponedMap, activeMap, existingAttendanceMap));
        }
        return results;
    }

    private BulkAttendanceResultResponse processMemberAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today,
            Map<Long, ComplexMemberMembership> postponedMap,
            Map<Long, ComplexMemberMembership> activeMap,
            Map<Long, ComplexMemberAttendance> existingAttendanceMap) {

        // 연기 확인 (프리로드 맵)
        ComplexMemberMembership pmm = postponedMap.get(bm.getMemberSeq());
        if (pmm != null) {
            publishAttendance(bm.getMemberSeq(), classSeq, AttendanceStatus.연기, pmm, 0, "멤버십 연기 중 — 출석 불가");
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("연기").build();
        }

        // 활성 멤버십 확인 (프리로드 맵)
        ComplexMemberMembership mm = activeMap.get(bm.getMemberSeq());
        if (mm == null) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("").status("skip_no_membership").build();
        }

        AttendanceStatus newStatus = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
        ComplexMemberAttendance existing = existingAttendanceMap.get(bm.getMemberSeq());

        // 기존 기록이 있으면 상태 변경 처리
        if (existing != null) {
            AttendanceStatus oldStatus = existing.getStatus();
            if (oldStatus == newStatus) {
                return BulkAttendanceResultResponse.builder()
                        .memberSeq(bm.getMemberSeq()).name("").status("skip_already").build();
            }

            existing.setStatus(newStatus);
            attendanceRepository.save(existing);

            // usedCount 보정: 결석→출석 (+1), 출석→결석 (-1)
            int delta = 0;
            if (oldStatus == AttendanceStatus.결석 && newStatus == AttendanceStatus.출석) {
                delta = 1;
                mm.setUsedCount(mm.getUsedCount() + 1);
                memberMembershipRepository.save(mm);
            } else if (oldStatus == AttendanceStatus.출석 && newStatus == AttendanceStatus.결석) {
                delta = -1;
                mm.setUsedCount(Math.max(0, mm.getUsedCount() - 1));
                memberMembershipRepository.save(mm);
            }

            publishAttendance(bm.getMemberSeq(), classSeq, newStatus, mm, delta, null);

            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name("")
                    .status("변경: " + (newStatus == AttendanceStatus.출석 ? "출석" : "결석")).build();
        }

        // 신규 기록
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .member(ComplexMember.builder().seq(bm.getMemberSeq()).build())
                .memberMembership(mm)
                .complexClass(classRepository.getReferenceById(classSeq))
                .attendanceDate(today).status(newStatus).build());

        int delta = 0;
        if (bm.isAttended()) {
            delta = 1;
            mm.setUsedCount(mm.getUsedCount() + 1);
            memberMembershipRepository.save(mm);
        }

        publishAttendance(bm.getMemberSeq(), classSeq, newStatus, mm, delta, null);

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name("")
                .status(newStatus == AttendanceStatus.출석 ? "출석" : "결석").build();
    }

    private void publishAttendance(Long memberSeq, Long classSeq, AttendanceStatus status,
                                   ComplexMemberMembership mm, int delta, String note) {
        eventPublisher.publishEvent(ActivityEvent.withAttendance(
                ComplexMember.builder().seq(memberSeq).build(),
                AttendanceDetail.builder()
                        .complexClass(ComplexClass.builder().seq(classSeq).build())
                        .membership(mm).status(status)
                        .usedCountDelta(delta)
                        .usedCountAfter(mm != null ? mm.getUsedCount() : null)
                        .build(),
                note));
    }
}
