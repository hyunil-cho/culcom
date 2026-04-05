package com.culcom.controller.complex.timeslot;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.classes.ClassTimeSlotRequest;
import com.culcom.dto.complex.classes.ClassTimeSlotResponse;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.ClassTimeSlotService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/timeslots")
@RequiredArgsConstructor
public class ClassTimeSlotController {

    private final ClassTimeSlotService classTimeSlotService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassTimeSlotResponse>>> list(@AuthenticationPrincipal CustomUserPrincipal principal) {
        List<ClassTimeSlotResponse> result = classTimeSlotService.list(principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClassTimeSlotResponse>> create(
            @RequestBody ClassTimeSlotRequest request, @AuthenticationPrincipal CustomUserPrincipal principal) {
        ClassTimeSlotResponse result = classTimeSlotService.create(request, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("시간대 추가 완료", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ClassTimeSlotResponse>> update(
            @PathVariable Long seq, @RequestBody ClassTimeSlotRequest request) {
        ClassTimeSlotResponse result = classTimeSlotService.update(seq, request);
        return ResponseEntity.ok(ApiResponse.ok("시간대 수정 완료", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        classTimeSlotService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("시간대 삭제 완료", null));
    }
}
