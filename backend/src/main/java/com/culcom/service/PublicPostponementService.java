package com.culcom.service;

import com.culcom.dto.publicapi.*;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicPostponementService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MemberSearchResponse searchMember(String name, String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return new MemberSearchResponse(List.of());
        }

        // 배치 프리로드: 회원 seq 목록으로 한 번에 조회
        List<Long> memberSeqs = members.stream().map(ComplexMember::getSeq).toList();
        List<ComplexMemberMembership> allMemberships = memberMembershipRepository.findWithMembershipByMemberSeqIn(memberSeqs);

        // 멤버십을 memberSeq 기준으로 그룹핑
        Map<Long, List<ComplexMemberMembership>> membershipMap = allMemberships.stream()
                .collect(Collectors.groupingBy(mm -> mm.getMember().getSeq()));

        // 지점별 수업 캐싱 (같은 지점 회원이 여러 명일 수 있음)
        Map<Long, List<ComplexClass>> classCache = new HashMap<>();

        List<MemberInfo> memberInfos = members.stream().map(m -> {
            // 멤버십: 맵에서 조회 (추가 쿼리 없음)
            List<MembershipInfo> msInfos = membershipMap.getOrDefault(m.getSeq(), List.of()).stream()
                    .filter(ComplexMemberMembership::isUsable)
                    .map(ms -> new MembershipInfo(
                            ms.getSeq(),
                            ms.getMembership().getName(),
                            ms.getStartDate().toString(),
                            ms.getExpiryDate().toString(),
                            ms.getTotalCount(),
                            ms.getUsedCount(),
                            ms.getPostponeTotal(),
                            ms.getPostponeUsed()
                    ))
                    .collect(Collectors.toList());

            // 수업: 지점별 캐싱 (같은 지점이면 쿼리 1회)
            Long branchSeq = m.getBranch().getSeq();
            List<ComplexClass> classes = classCache.computeIfAbsent(branchSeq,
                    bSeq -> classRepository.findAllWithTimeSlotByBranch(bSeq));
            List<ClassInfo> classInfos = classes.stream()
                    .map(c -> new ClassInfo(
                            c.getName(),
                            c.getTimeSlot().getName(),
                            c.getTimeSlot().getStartTime().toString(),
                            c.getTimeSlot().getEndTime().toString()
                    ))
                    .collect(Collectors.toList());

            return new MemberInfo(
                    m.getSeq(), m.getName(), m.getPhoneNumber(),
                    branchSeq, m.getBranch().getBranchName(),
                    m.getMetaData() != null ? m.getMetaData().getLevel() : null, msInfos, classInfos
            );
        }).collect(Collectors.toList());

        return new MemberSearchResponse(memberInfos);
    }

    @Transactional
    public PostponementSubmitResponse submit(PostponementSubmitRequest req) {
        Branch branch = branchRepository.findById(req.getBranchSeq())
                .orElseThrow(() -> new EntityNotFoundException("지점"));

        ComplexMember member = memberRepository.findById(req.getMemberSeq()).orElse(null);
        ComplexMemberMembership membership = req.getMemberMembershipSeq() != null
                ? memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElse(null)
                : null;

        ComplexPostponementRequest postponement = ComplexPostponementRequest.builder()
                .branch(branch)
                .member(member)
                .memberMembership(membership)
                .memberName(req.getName())
                .phoneNumber(req.getPhone())
                .timeSlot(req.getTimeSlot())
                .currentClass(req.getCurrentClass())
                .startDate(DateTimeUtils.parseDate(req.getStartDate()))
                .endDate(DateTimeUtils.parseDate(req.getEndDate()))
                .reason(req.getReason())
                .status(RequestStatus.대기)
                .build();

        postponementRepository.save(postponement);

        if (member != null) {
            eventPublisher.publishEvent(ActivityEvent.of(member,
                    ActivityEventType.POSTPONEMENT_REQUEST,
                    "연기 요청 (공개): " + req.getStartDate() + " ~ " + req.getEndDate() + " / " + req.getReason()));
        }

        return new PostponementSubmitResponse(
                req.getName(), req.getPhone(), branch.getBranchName(),
                req.getTimeSlot(), req.getCurrentClass(),
                req.getStartDate(), req.getEndDate(), req.getReason()
        );
    }

    public List<String> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ComplexPostponementReason::getReason)
                .collect(Collectors.toList());
    }
}
