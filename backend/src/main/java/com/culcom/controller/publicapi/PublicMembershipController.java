package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/membership")
@RequiredArgsConstructor
public class PublicMembershipController {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberAttendanceRepository attendanceRepository;

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<MembershipCheckResponse>> check(
            @RequestParam String name, @RequestParam String phone) {

        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(new MembershipCheckResponse(null)));
        }

        ComplexMember member = members.get(0);
        List<ComplexMemberMembership> memberships = memberMembershipRepository.findByMemberSeqIn(List.of(member.getSeq()));

        List<MembershipCheckResponse.MembershipDetail> details = memberships.stream()
                .map(mm -> {
                    // 해당 멤버십의 출석 기록
                    List<ComplexMemberAttendance> attendances = attendanceRepository.findByMemberMembershipSeq(mm.getSeq());
                    long presentCount = attendances.stream().filter(a -> a.getStatus().name().equals("출석")).count();
                    long absentCount = attendances.stream().filter(a -> a.getStatus().name().equals("결석")).count();
                    int totalAttendance = attendances.size();
                    int attendanceRate = totalAttendance > 0 ? (int) Math.round((double) presentCount / totalAttendance * 100) : 0;

                    return new MembershipCheckResponse.MembershipDetail(
                            mm.getMembership().getName(),
                            mm.getStatus().name(),
                            mm.getStartDate() != null ? mm.getStartDate().toString() : "",
                            mm.getExpiryDate() != null ? mm.getExpiryDate().toString() : "",
                            mm.getTotalCount(), mm.getUsedCount(),
                            mm.getPostponeTotal(), mm.getPostponeUsed(),
                            (int) presentCount, (int) absentCount, totalAttendance, attendanceRate
                    );
                })
                .toList();

        MembershipCheckResponse.MemberSummary summary = new MembershipCheckResponse.MemberSummary(
                member.getName(), member.getPhoneNumber(),
                member.getBranch().getBranchName(), member.getMetaData() != null ? member.getMetaData().getLevel() : null, details
        );

        return ResponseEntity.ok(ApiResponse.ok(new MembershipCheckResponse(summary)));
    }

    @Getter @AllArgsConstructor
    public static class MembershipCheckResponse {
        private final MemberSummary member;

        @Getter @AllArgsConstructor
        public static class MemberSummary {
            private final String name;
            private final String phoneNumber;
            private final String branchName;
            private final String level;
            private final List<MembershipDetail> memberships;
        }

        @Getter @AllArgsConstructor
        public static class MembershipDetail {
            private final String membershipName;
            private final String status;
            private final String startDate;
            private final String expiryDate;
            private final int totalCount;
            private final int usedCount;
            private final int postponeTotal;
            private final int postponeUsed;
            private final int presentCount;
            private final int absentCount;
            private final int totalAttendance;
            private final int attendanceRate;
        }
    }
}
