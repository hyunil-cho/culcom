package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.ClassTimeSlotRequest;
import com.culcom.dto.complex.ClassTimeSlotResponse;
import com.culcom.entity.ClassTimeSlot;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/timeslots")
@RequiredArgsConstructor
public class ClassTimeSlotController {

    private final ClassTimeSlotRepository timeSlotRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassTimeSlotResponse>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        List<ClassTimeSlotResponse> result = timeSlotRepository.findByBranchSeq(branchSeq)
                .stream().map(ClassTimeSlotResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClassTimeSlotResponse>> create(
            @RequestBody ClassTimeSlotRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        ClassTimeSlot timeSlot = ClassTimeSlot.builder()
                .name(request.getName())
                .daysOfWeek(request.getDaysOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();
        branchRepository.findById(branchSeq).ifPresent(timeSlot::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("시간대 추가 완료", ClassTimeSlotResponse.from(timeSlotRepository.save(timeSlot))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ClassTimeSlotResponse>> update(
            @PathVariable Long seq, @RequestBody ClassTimeSlotRequest request) {
        return timeSlotRepository.findById(seq)
                .map(ts -> {
                    ts.setName(request.getName());
                    ts.setDaysOfWeek(request.getDaysOfWeek());
                    ts.setStartTime(request.getStartTime());
                    ts.setEndTime(request.getEndTime());
                    return ResponseEntity.ok(ApiResponse.ok("시간대 수정 완료", ClassTimeSlotResponse.from(timeSlotRepository.save(ts))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        timeSlotRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("시간대 삭제 완료", null));
    }
}