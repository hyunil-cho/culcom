package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.ClassInfo;
import com.culcom.dto.publicapi.MemberInfo;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.MembershipInfo;
import com.culcom.dto.publicapi.PostponementSubmitRequest;
import com.culcom.dto.publicapi.PostponementSubmitResponse;
import com.culcom.entity.*;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.culcom.util.DateTimeUtils;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/postponement")
@RequiredArgsConstructor
public class PublicPostponementController {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;

    @GetMapping("/search-member")
    public ResponseEntity<ApiResponse<MemberSearchResponse>> searchMember(
            @RequestParam String name, @RequestParam String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(new MemberSearchResponse(List.of())));
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

        return ResponseEntity.ok(ApiResponse.ok(new MemberSearchResponse(memberInfos)));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<PostponementSubmitResponse>> submit(
            @RequestBody PostponementSubmitRequest req) {
        Branch branch = branchRepository.findById(req.getBranchSeq()).orElse(null);
        if (branch == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("지점을 찾을 수 없습니다."));
        }

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

        return ResponseEntity.ok(ApiResponse.ok("연기 요청이 접수되었습니다.",
                new PostponementSubmitResponse(
                        req.getName(), req.getPhone(), branch.getBranchName(),
                        req.getTimeSlot(), req.getCurrentClass(),
                        req.getStartDate(), req.getEndDate(), req.getReason()
                )));
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<String>>> reasons(@RequestParam Long branchSeq) {
        List<ComplexPostponementReason> reasons = reasonRepository.findByBranchSeq(branchSeq);
        List<String> result = reasons.stream()
                .map(ComplexPostponementReason::getReason)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
