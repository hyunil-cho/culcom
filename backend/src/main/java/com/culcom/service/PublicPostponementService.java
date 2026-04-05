package com.culcom.service;

import com.culcom.dto.publicapi.ClassInfo;
import com.culcom.dto.publicapi.MemberInfo;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.MembershipInfo;
import com.culcom.dto.publicapi.PostponementSubmitRequest;
import com.culcom.dto.publicapi.PostponementSubmitResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
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

    public MemberSearchResponse searchMember(String name, String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return new MemberSearchResponse(List.of());
        }

        List<MemberInfo> memberInfos = members.stream().map(m -> {
            List<ComplexMemberMembership> memberships = memberMembershipRepository.findByMemberSeq(m.getSeq());
            List<MembershipInfo> msInfos = memberships.stream()
                    .filter(ms -> ms.getStatus() == MembershipStatus.활성)
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

            List<ComplexClass> classes = classRepository.findByBranchSeqOrderBySortOrder(m.getBranch().getSeq());
            List<ClassInfo> classInfos = classes.stream()
                    .map(c -> new ClassInfo(
                            c.getName(),
                            c.getTimeSlot().getName(),
                            c.getTimeSlot().getStartTime().toString(),
                            c.getTimeSlot().getEndTime().toString()
                    ))
                    .collect(Collectors.toList());

            return new MemberInfo(
                    m.getSeq(),
                    m.getName(),
                    m.getPhoneNumber(),
                    m.getBranch().getSeq(),
                    m.getBranch().getBranchName(),
                    m.getLevel(),
                    msInfos,
                    classInfos
            );
        }).collect(Collectors.toList());

        return new MemberSearchResponse(memberInfos);
    }

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

        return new PostponementSubmitResponse(
                req.getName(), req.getPhone(), branch.getBranchName(),
                req.getTimeSlot(), req.getCurrentClass(),
                req.getStartDate(), req.getEndDate(), req.getReason()
        );
    }

    public List<String> reasons(Long branchSeq) {
        List<ComplexPostponementReason> reasons = reasonRepository.findByBranchSeq(branchSeq);
        return reasons.stream()
                .map(ComplexPostponementReason::getReason)
                .collect(Collectors.toList());
    }
}
