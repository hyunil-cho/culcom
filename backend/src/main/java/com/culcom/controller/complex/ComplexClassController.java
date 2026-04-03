package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.ComplexClassRequest;
import com.culcom.dto.complex.ComplexClassResponse;
import com.culcom.entity.ComplexClass;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexStaffRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@RestController
@RequestMapping("/api/complex/classes")
@RequiredArgsConstructor
public class ComplexClassController {

    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository timeSlotRepository;
    private final ComplexStaffRepository staffRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexClassResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {
        Long branchSeq = principal.getSelectedBranchSeq();
        var pageable = PageRequest.of(page, size);
        Page<ComplexClass> result = (keyword != null && !keyword.isBlank())
                ? classRepository.searchByBranchSeq(branchSeq, keyword, pageable)
                : classRepository.findByBranchSeqOrderBySortOrder(branchSeq, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.map(ComplexClassResponse::from)));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> get(@PathVariable Long seq) {
        return classRepository.findById(seq)
                .map(c -> ResponseEntity.ok(ApiResponse.ok(ComplexClassResponse.from(c))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexClassResponse>> create(
            @RequestBody ComplexClassRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        if (req.getTimeSlotSeq() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("시간대를 선택해주세요."));
        }
        ComplexClass entity = ComplexClass.builder()
                .name(req.getName())
                .description(req.getDescription())
                .capacity(req.getCapacity())
                .sortOrder(req.getSortOrder() != null ? req.getSortOrder() : classRepository.findMaxSortOrderByBranchSeq(branchSeq) + 1)
                .branch(branchRepository.getReferenceById(branchSeq))
                .timeSlot(timeSlotRepository.getReferenceById(req.getTimeSlotSeq()))
                .staff(req.getStaffSeq() != null ? staffRepository.getReferenceById(req.getStaffSeq()) : null)
                .build();
        ComplexClass result = classRepository.save(entity);
        return ResponseEntity.ok(ApiResponse.ok("수업 추가 완료", ComplexClassResponse.from(result)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexClassRequest req) {
        return classRepository.findById(seq)
                .map(cls -> {
                    cls.setName(req.getName());
                    cls.setDescription(req.getDescription());
                    cls.setCapacity(req.getCapacity());
                    cls.setSortOrder(req.getSortOrder());
                    if (req.getTimeSlotSeq() != null) {
                        timeSlotRepository.findById(req.getTimeSlotSeq()).ifPresent(cls::setTimeSlot);
                    }
                    if (req.getStaffSeq() != null) {
                        staffRepository.findById(req.getStaffSeq()).ifPresent(cls::setStaff);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("수업 수정 완료", ComplexClassResponse.from(classRepository.save(cls))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        classRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("수업 삭제 완료", null));
    }
}
