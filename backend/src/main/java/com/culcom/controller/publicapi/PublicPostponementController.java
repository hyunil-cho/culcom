package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.PostponementSubmitRequest;
import com.culcom.dto.publicapi.PostponementSubmitResponse;
import com.culcom.service.PublicPostponementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/postponement")
@RequiredArgsConstructor
public class PublicPostponementController {

    private final PublicPostponementService publicPostponementService;

    @GetMapping("/search-member")
    public ResponseEntity<ApiResponse<MemberSearchResponse>> searchMember(
            @RequestParam String name, @RequestParam String phone) {
        MemberSearchResponse result = publicPostponementService.searchMember(name, phone);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<PostponementSubmitResponse>> submit(
            @RequestBody PostponementSubmitRequest req) {
        PostponementSubmitResponse result = publicPostponementService.submit(req);
        return ResponseEntity.ok(ApiResponse.ok("연기 요청이 접수되었습니다.", result));
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<String>>> reasons(@RequestParam Long branchSeq) {
        List<String> result = publicPostponementService.reasons(branchSeq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
