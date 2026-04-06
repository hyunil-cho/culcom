package com.culcom.controller.complex.member;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.dto.complex.member.MemberActivityTimelineItem;
import com.culcom.mapper.ComplexMemberQueryMapper;
import com.culcom.mapper.MemberActivityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complex/members")
@RequiredArgsConstructor
public class ComplexMemberQueryController {

    private final ComplexMemberQueryMapper complexMemberQueryMapper;
    private final MemberActivityMapper memberActivityMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexMemberResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;

        List<ComplexMemberResponse> list = complexMemberQueryMapper.search(branchSeq, keyword, offset, size);
        int total = complexMemberQueryMapper.count(branchSeq, keyword);

        // 출석 기록 조회 및 매핑
        if (!list.isEmpty()) {
            List<Long> memberSeqs = list.stream().map(ComplexMemberResponse::getSeq).toList();
            List<Map<String, Object>> historyRows = complexMemberQueryMapper.selectAttendanceHistory(memberSeqs);
            Map<Long, List<String>> historyMap = new HashMap<>();
            for (Map<String, Object> row : historyRows) {
                Long memberSeq = ((Number) row.get("memberSeq")).longValue();
                String status = (String) row.get("status");
                historyMap.computeIfAbsent(memberSeq, k -> new ArrayList<>()).add(status);
            }
            for (ComplexMemberResponse m : list) {
                m.setAttendanceHistory(historyMap.getOrDefault(m.getSeq(), List.of()));
            }
        }

        Page<ComplexMemberResponse> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{memberSeq}/timeline")
    public ResponseEntity<ApiResponse<Page<MemberActivityTimelineItem>>> timeline(
            @PathVariable Long memberSeq,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int offset = page * size;
        List<MemberActivityTimelineItem> items = memberActivityMapper.selectTimeline(memberSeq, offset, size);
        int total = memberActivityMapper.countTimeline(memberSeq);

        Page<MemberActivityTimelineItem> result = new PageImpl<>(items, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
