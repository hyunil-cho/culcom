package com.culcom.service;

import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse;
import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse.MembershipDetail;
import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse.MemberSummary;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicMembershipService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberAttendanceRepository attendanceRepository;

    public MembershipCheckResponse check(String name, String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return new MembershipCheckResponse(null);
        }

        ComplexMember member = members.get(0);
        List<ComplexMemberMembership> memberships =
                memberMembershipRepository.findWithMembershipByMemberSeqIn(List.of(member.getSeq()));

        List<MembershipDetail> details = memberships.stream()
                .map(this::toDetail)
                .toList();

        MemberSummary summary = new MemberSummary(
                member.getName(),
                member.getPhoneNumber(),
                member.getBranch().getBranchName(),
                member.getMetaData() != null ? member.getMetaData().getLevel() : null,
                details);

        return new MembershipCheckResponse(summary);
    }

    private MembershipDetail toDetail(ComplexMemberMembership mm) {
        List<ComplexMemberAttendance> attendances =
                attendanceRepository.findByMemberMembershipSeq(mm.getSeq());
        long presentCount = attendances.stream().filter(a -> a.getStatus().name().equals("출석")).count();
        long absentCount = attendances.stream().filter(a -> a.getStatus().name().equals("결석")).count();
        int totalAttendance = attendances.size();
        int attendanceRate = totalAttendance > 0
                ? (int) Math.round((double) presentCount / totalAttendance * 100) : 0;

        return new MembershipDetail(
                mm.getMembership().getName(),
                Boolean.TRUE.equals(mm.getIsActive()) ? "사용가능" : "사용불가",
                mm.getStartDate() != null ? mm.getStartDate().toString() : "",
                mm.getExpiryDate() != null ? mm.getExpiryDate().toString() : "",
                mm.getTotalCount(), mm.getUsedCount(),
                mm.getPostponeTotal(), mm.getPostponeUsed(),
                (int) presentCount, (int) absentCount, totalAttendance, attendanceRate);
    }
}
