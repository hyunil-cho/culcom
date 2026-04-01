package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexClass;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/classes")
@RequiredArgsConstructor
public class ComplexClassController {

    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository timeSlotRepository;
    private final ComplexStaffRepository staffRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplexClass>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(classRepository.findByBranchSeqOrderBySortOrder(branchSeq)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClass>> get(@PathVariable Long seq) {
        return classRepository.findById(seq)
                .map(c -> ResponseEntity.ok(ApiResponse.ok(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexClass>> create(
            @RequestBody ComplexClass request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(request::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("수업 추가 완료", classRepository.save(request)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClass>> update(
            @PathVariable Long seq, @RequestBody ComplexClass request) {
        return classRepository.findById(seq)
                .map(cls -> {
                    cls.setName(request.getName());
                    cls.setDescription(request.getDescription());
                    cls.setCapacity(request.getCapacity());
                    cls.setSortOrder(request.getSortOrder());
                    if (request.getTimeSlot() != null && request.getTimeSlot().getSeq() != null) {
                        timeSlotRepository.findById(request.getTimeSlot().getSeq()).ifPresent(cls::setTimeSlot);
                    }
                    if (request.getStaff() != null && request.getStaff().getSeq() != null) {
                        staffRepository.findById(request.getStaff().getSeq()).ifPresent(cls::setStaff);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("수업 수정 완료", classRepository.save(cls)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        classRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("수업 삭제 완료", null));
    }
}
