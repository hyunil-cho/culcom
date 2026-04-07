package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.service.PublicMembershipService;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/membership")
@RequiredArgsConstructor
public class PublicMembershipController {

    private final PublicMembershipService publicMembershipService;

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<MembershipCheckResponse>> check(
            @RequestParam String name, @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(publicMembershipService.check(name, phone)));
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
