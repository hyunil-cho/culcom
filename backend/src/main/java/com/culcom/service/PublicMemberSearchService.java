package com.culcom.service;

import com.culcom.dto.publicapi.*;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicMemberSearchService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;

    /**
     * 이름+전화번호로 회원을 검색하여 멤버십/수업 정보와 함께 반환.
     *
     * @param membershipFilter 멤버십 필터 (예: isUsable, isActive)
     * @param includeClasses   수업 정보 포함 여부
     */
    public MemberSearchResponse search(String name, String phone,
                                        Predicate<ComplexMemberMembership> membershipFilter,
                                        boolean includeClasses) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return new MemberSearchResponse(List.of());
        }

        List<Long> memberSeqs = members.stream().map(ComplexMember::getSeq).toList();
        List<ComplexMemberMembership> allMemberships = memberMembershipRepository.findWithMembershipByMemberSeqIn(memberSeqs);
        Map<Long, List<ComplexMemberMembership>> membershipMap = allMemberships.stream()
                .collect(Collectors.groupingBy(mm -> mm.getMember().getSeq()));

        Map<Long, List<ComplexClass>> classCache = includeClasses ? new HashMap<>() : Map.of();

        List<MemberInfo> memberInfos = members.stream().map(m -> {
            List<MembershipInfo> msInfos = membershipMap.getOrDefault(m.getSeq(), List.of()).stream()
                    .filter(membershipFilter)
                    .map(mm -> new MembershipInfo(
                            mm.getSeq(),
                            mm.getMembership().getName(),
                            mm.getStartDate() != null ? mm.getStartDate().toString() : "",
                            mm.getExpiryDate() != null ? mm.getExpiryDate().toString() : "",
                            mm.getTotalCount(),
                            mm.getUsedCount(),
                            mm.getPostponeTotal(),
                            mm.getPostponeUsed()))
                    .toList();

            List<ClassInfo> classInfos;
            if (includeClasses) {
                Long branchSeq = m.getBranch().getSeq();
                List<ComplexClass> classes = classCache.computeIfAbsent(branchSeq,
                        bSeq -> classRepository.findAllWithTimeSlotByBranch(bSeq));
                classInfos = classes.stream()
                        .map(c -> new ClassInfo(
                                c.getSeq(),
                                c.getName(),
                                c.getTimeSlot().getName(),
                                c.getTimeSlot().getStartTime().toString(),
                                c.getTimeSlot().getEndTime().toString()))
                        .toList();
            } else {
                classInfos = List.of();
            }

            return new MemberInfo(
                    m.getSeq(), m.getName(), m.getPhoneNumber(),
                    m.getBranch().getSeq(), m.getBranch().getBranchName(),
                    m.getMetaData() != null ? m.getMetaData().getLevel() : null,
                    msInfos, classInfos);
        }).toList();

        return new MemberSearchResponse(memberInfos);
    }
}
