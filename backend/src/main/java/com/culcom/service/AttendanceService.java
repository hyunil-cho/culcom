package com.culcom.service;

import com.culcom.dto.complex.attendance.*;
import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.dto.complex.classes.MemberReorderRequest;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.track.AttendanceDetail;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.BulkAttendanceResultStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.exception.ForbiddenException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final ComplexMemberAttendanceRepository attendanceRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository memberClassMappingRepository;
    private final ComplexMemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void reorderClasses(ClassReorderRequest req, Long branchSeq) {
        List<ClassReorderRequest.ClassOrder> orders = req.getClassOrders();
        if (orders == null || orders.isEmpty()) return;

        Set<Long> idSet = validateOrders(
                orders, ClassReorderRequest.ClassOrder::getId,
                ClassReorderRequest.ClassOrder::getSortOrder, "id");

        Map<Long, ComplexClass> classMap = classRepository.findAllById(idSet).stream()
                .collect(Collectors.toMap(ComplexClass::getSeq, Function.identity()));
        assertAllClassesInBranch(idSet, classMap, branchSeq);

        for (ClassReorderRequest.ClassOrder order : orders) {
            classMap.get(order.getId()).setSortOrder(order.getSortOrder());
        }
    }

    @Transactional
    public void reorderMembers(MemberReorderRequest req, Long branchSeq) {
        Long classSeq = req.getClassSeq();
        if (classSeq == null) {
            throw new IllegalArgumentException("classSeq는 필수입니다.");
        }
        List<MemberReorderRequest.MemberOrder> orders = req.getMemberOrders();
        if (orders == null || orders.isEmpty()) return;

        Set<Long> memberSeqSet = validateOrders(
                orders, MemberReorderRequest.MemberOrder::getMemberSeq,
                MemberReorderRequest.MemberOrder::getSortOrder, "memberSeq");

        // 권한 검증: 대상 수업이 현재 세션 지점 소속이어야 한다.
        ComplexClass cls = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));
        if (!cls.getBranch().getSeq().equals(branchSeq)) {
            throw new ForbiddenException("다른 지점의 수업은 변경할 수 없습니다.");
        }

        Map<Long, ComplexMemberClassMapping> mappingMap = memberClassMappingRepository
                .findByComplexClassSeqAndMemberSeqIn(classSeq, new ArrayList<>(memberSeqSet))
                .stream().collect(Collectors.toMap(m -> m.getMember().getSeq(), Function.identity()));
        if (mappingMap.size() != memberSeqSet.size()) {
            List<Long> missing = memberSeqSet.stream()
                    .filter(seq -> !mappingMap.containsKey(seq)).toList();
            throw new IllegalArgumentException("해당 수업에 속하지 않은 회원이 있습니다: " + missing);
        }

        for (MemberReorderRequest.MemberOrder order : orders) {
            mappingMap.get(order.getMemberSeq()).setSortOrder(order.getSortOrder());
        }
    }

    /**
     * 재정렬 요청의 공통 입력 검증. id/sortOrder null·음수 금지, id·sortOrder 각각 중복 금지.
     * 호출측에서 바로 사용할 수 있도록 중복 제거된 id 집합을 반환한다 (입력 순서 유지).
     */
    private <T> Set<Long> validateOrders(
            List<T> orders,
            Function<T, Long> idGetter,
            Function<T, Integer> sortOrderGetter,
            String idFieldName) {
        Set<Long> idSet = new LinkedHashSet<>();
        Set<Integer> sortOrderSet = new HashSet<>();
        for (T o : orders) {
            Long id = idGetter.apply(o);
            Integer sortOrder = sortOrderGetter.apply(o);
            if (id == null || sortOrder == null) {
                throw new IllegalArgumentException(idFieldName + "와 sortOrder는 필수입니다.");
            }
            if (sortOrder < 0) {
                throw new IllegalArgumentException("sortOrder는 0 이상이어야 합니다.");
            }
            if (!idSet.add(id)) {
                throw new IllegalArgumentException("중복된 " + idFieldName + "가 있습니다: " + id);
            }
            if (!sortOrderSet.add(sortOrder)) {
                throw new IllegalArgumentException("중복된 sortOrder가 있습니다: " + sortOrder);
            }
        }
        return idSet;
    }

    private void assertAllClassesInBranch(Set<Long> requestedIds,
                                          Map<Long, ComplexClass> found, Long branchSeq) {
        if (found.size() != requestedIds.size()) {
            List<Long> missing = requestedIds.stream()
                    .filter(id -> !found.containsKey(id)).toList();
            throw new EntityNotFoundException("수업: " + missing);
        }
        for (ComplexClass c : found.values()) {
            if (!c.getBranch().getSeq().equals(branchSeq)) {
                throw new ForbiddenException("다른 지점의 수업은 변경할 수 없습니다.");
            }
        }
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
                    .status(BulkAttendanceResultStatus.멤버십없음)
                    .build();
        }

        AttendanceStatus newStatus = bm.isAttended() ? AttendanceStatus.출석 : AttendanceStatus.결석;
        ComplexMemberAttendance existing = existingAttendanceMap.get(bm.getMemberSeq());

        // 멤버십 사용 횟수는 출석/결석 무관하게 "수업이 진행됐다는 사실 자체"로 1회 차감된다.
        // → 신규 기록일 때만 차감 (출석↔결석 상태 변경은 추가 차감하지 않음)
        boolean willConsume = (existing == null);
        if (willConsume && mm.getUsedCount() >= mm.getTotalCount()){
            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq())
                    .name(name)
                    .status(BulkAttendanceResultStatus.횟수소진)
                    .build();
        }

        // 기존 기록이 있으면 상태만 변경 — usedCount는 건드리지 않는다.
        if (existing != null) {
            AttendanceStatus oldStatus = existing.getStatus();
            if (oldStatus == newStatus) {
                return BulkAttendanceResultResponse.builder()
                        .memberSeq(bm.getMemberSeq())
                        .name(name)
                        .status(BulkAttendanceResultStatus.이미처리됨)
                        .build();
            }

            existing.setStatus(newStatus);
            attendanceRepository.save(existing);

            publishAttendance(bm.getMemberSeq(), classSeq, newStatus, mm, 0, null);

            return BulkAttendanceResultResponse.builder()
                    .memberSeq(bm.getMemberSeq()).name(name)
                    .status(newStatus == AttendanceStatus.출석
                            ? BulkAttendanceResultStatus.출석변경
                            : BulkAttendanceResultStatus.결석변경)
                    .build();
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
                .status(newStatus == AttendanceStatus.출석
                        ? BulkAttendanceResultStatus.출석
                        : BulkAttendanceResultStatus.결석)
                .build();
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
