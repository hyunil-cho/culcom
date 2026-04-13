package com.culcom.service;

import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.dto.complex.classes.MemberReorderRequest;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.logs.AttendanceDetail;
import com.culcom.entity.enums.ActivityEventType;
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
    private final ComplexMemberClassMappingRepository memberClassMappingRepository;
    private final ComplexMemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;

    public List<AttendanceResponse> listByClassAndDate(Long classSeq, LocalDate date) {
        return attendanceRepository.findByClassAndDate(classSeq, date)
                .stream().map(AttendanceResponse::from).toList();
    }

    @Transactional
    public AttendanceResponse record(AttendanceRequest req) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(req.getMemberMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        ComplexMemberAttendance attendance = ComplexMemberAttendance.builder()
                .member(mm.getMember())
                .memberMembership(mm)
                .complexClass(req.getClassSeq() != null ? classRepository.findById(req.getClassSeq())
                        .orElseThrow(() -> new EntityNotFoundException("수업")) : null)
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
    public void reorderMembers(MemberReorderRequest req) {
        Long classSeq = req.getClassSeq();
        List<Long> memberSeqs = req.getMemberOrders().stream()
                .map(MemberReorderRequest.MemberOrder::getMemberSeq).toList();
        if (memberSeqs.isEmpty()) return;

        Map<Long, ComplexMemberClassMapping> mappingMap = new HashMap<>();
        memberClassMappingRepository.findByComplexClassSeqAndMemberSeqIn(classSeq, memberSeqs)
                .forEach(m -> mappingMap.put(m.getMember().getSeq(), m));

        for (MemberReorderRequest.MemberOrder order : req.getMemberOrders()) {
            ComplexMemberClassMapping m = mappingMap.get(order.getMemberSeq());
            if (m != null) m.setSortOrder(order.getSortOrder());
        }
        memberClassMappingRepository.saveAll(mappingMap.values());
    }

    @Transactional
    public List<BulkAttendanceResultResponse> processBulkAttendance(BulkAttendanceRequest req) {
        LocalDate today = LocalDate.now();
        Long classSeq = req.getClassSeq();

        // 모든 멤버 seq 추출
        List<Long> memberSeqs = req.getMembers().stream()
                .map(BulkAttendanceRequest.BulkMember::getMemberSeq).toList();

        // 배치 프리로드: 사용 가능 멤버십 + 오늘 출석 기록 (회원-멤버십은 1:1)
        Map<Long, ComplexMemberMembership> usableMap = new HashMap<>();
        if (!memberSeqs.isEmpty()) {
            memberMembershipRepository.findActiveByMemberSeqIn(memberSeqs)
                    .forEach(mm -> usableMap.putIfAbsent(mm.getMember().getSeq(), mm));
        }
        Map<Long, ComplexMemberAttendance> existingAttendanceMap = new HashMap<>();
        attendanceRepository.findByClassSeqsAndDate(List.of(classSeq), today)
                .forEach(a -> existingAttendanceMap.put(a.getMember().getSeq(), a));

        Map<Long, String> nameMap = new HashMap<>();
        if (!memberSeqs.isEmpty()) {
            memberRepository.findAllById(memberSeqs)
                    .forEach(m -> nameMap.put(m.getSeq(), m.getName()));
        }

        List<BulkAttendanceResultResponse> results = new ArrayList<>();
        for (BulkAttendanceRequest.BulkMember bm : req.getMembers()) {
            results.add(processMemberAttendance(bm, classSeq, today, usableMap, existingAttendanceMap, nameMap));
        }
        return results;
    }

    private BulkAttendanceResultResponse processMemberAttendance(
            BulkAttendanceRequest.BulkMember bm, Long classSeq, LocalDate today,
            Map<Long, ComplexMemberMembership> usableMap,
            Map<Long, ComplexMemberAttendance> existingAttendanceMap,
            Map<Long, String> nameMap) {

        String name = nameMap.getOrDefault(bm.getMemberSeq(), "");

        // 사용 가능 멤버십 확인
        ComplexMemberMembership mm = usableMap.get(bm.getMemberSeq());
        if (mm == null) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq())
                    .name(name)
                    .status("skip_no_membership")
                    .build();
        }

        AttendanceStatus newStatus = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
        ComplexMemberAttendance existing = existingAttendanceMap.get(bm.getMemberSeq());

        // 멤버십 사용 횟수는 출석/결석 무관하게 "수업이 진행됐다는 사실 자체"로 1회 차감된다.
        // → 신규 기록일 때만 차감 (출석↔결석 상태 변경은 추가 차감하지 않음)
        boolean willConsume = (existing == null);
        if (willConsume && mm.getUsedCount() >= mm.getTotalCount()) {
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq())
                    .name(name)
                    .status("skip_quota_exceeded")
                    .build();
        }

        // 기존 기록이 있으면 상태만 변경 — usedCount는 건드리지 않는다.
        if (existing != null) {
            AttendanceStatus oldStatus = existing.getStatus();
            if (oldStatus == newStatus) {
                return BulkAttendanceResultResponse.builder()
                        .memberSeq(bm.getMemberSeq()).name(name).status("skip_already").build();
            }

            existing.setStatus(newStatus);
            attendanceRepository.save(existing);

            publishAttendance(bm.getMemberSeq(), classSeq, newStatus, mm, 0, null);

            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name(name)
                    .status("변경: " + (newStatus == AttendanceStatus.출석 ? "출석" : "결석")).build();
        }

        // 신규 기록 — 출석/결석 모두 usedCount +1
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .member(ComplexMember.builder().seq(bm.getMemberSeq()).build())
                .memberMembership(mm)
                .complexClass(classRepository.findById(classSeq)
                        .orElseThrow(() -> new EntityNotFoundException("수업")))
                .attendanceDate(today).status(newStatus).build());

        mm.setUsedCount(mm.getUsedCount() + 1);
        checkAndExpireIfExhausted(mm, bm.getMemberSeq());
        memberMembershipRepository.save(mm);

        publishAttendance(bm.getMemberSeq(), classSeq, newStatus, mm, 1, null);

        return BulkAttendanceResultResponse.builder()
                .memberSeq(bm.getMemberSeq()).name(name)
                .status(newStatus == AttendanceStatus.출석 ? "출석" : "결석").build();
    }

    /**
     * 출석 처리 후 호출 — 멤버십 횟수가 모두 소진됐다면 status를 만료로 전환하고
     * MemberActivityLog에 만료 사유를 기록한다.
     * 이미 정지/만료/환불 상태이거나 totalCount가 null이면 아무 일도 하지 않는다.
     * 호출부에서 mm을 별도로 save하므로 여기선 save하지 않는다.
     */
    private void checkAndExpireIfExhausted(ComplexMemberMembership mm, Long memberSeq) {
        if (mm.getStatus() != MembershipStatus.활성) return;
        if (mm.getTotalCount() == null || mm.getUsedCount() == null) return;
        if (mm.getUsedCount() < mm.getTotalCount()) return;

        mm.setStatus(MembershipStatus.만료);
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                ComplexMember.builder().seq(memberSeq).build(),
                ActivityEventType.MEMBERSHIP_UPDATE,
                mm.getSeq(),
                "횟수 소진으로 자동 만료 (사용 " + mm.getUsedCount() + "/" + mm.getTotalCount() + ")"));
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
