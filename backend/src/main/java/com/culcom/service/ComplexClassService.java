package com.culcom.service;

import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffClassLog;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexStaffClassLogRepository;
import com.culcom.repository.ComplexStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexClassService {

    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository timeSlotRepository;
    private final ComplexStaffRepository staffRepository;
    private final ComplexStaffClassLogRepository staffClassLogRepository;

    public ComplexClassResponse get(Long seq) {
        ComplexClass cls = classRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));
        return ComplexClassResponse.from(cls);
    }

    public ComplexClassResponse create(ComplexClassRequest req, Long branchSeq) {
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
        return ComplexClassResponse.from(result);
    }

    @Transactional
    public ComplexClassResponse update(Long seq, ComplexClassRequest req) {
        ComplexClass cls = classRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        Long oldStaffSeq = cls.getStaff() != null ? cls.getStaff().getSeq() : null;
        Long newStaffSeq = req.getStaffSeq();

        cls.setName(req.getName());
        cls.setDescription(req.getDescription());
        cls.setCapacity(req.getCapacity());
        cls.setSortOrder(req.getSortOrder());
        if (req.getTimeSlotSeq() != null) {
            timeSlotRepository.findById(req.getTimeSlotSeq()).ifPresent(cls::setTimeSlot);
        }
        if (newStaffSeq != null) {
            staffRepository.findById(newStaffSeq).ifPresent(cls::setStaff);
        } else {
            cls.setStaff(null);
        }

        ComplexClass saved = classRepository.save(cls);

        // 스태프 배정 변경 이력 기록
        if (!Objects.equals(oldStaffSeq, newStaffSeq)) {
            if (oldStaffSeq != null) {
                ComplexStaff oldStaff = staffRepository.getReferenceById(oldStaffSeq);
                staffClassLogRepository.save(ComplexStaffClassLog.builder()
                        .staff(oldStaff).complexClass(cls).action("UNASSIGN").build());
            }
            if (newStaffSeq != null) {
                ComplexStaff newStaff = staffRepository.getReferenceById(newStaffSeq);
                staffClassLogRepository.save(ComplexStaffClassLog.builder()
                        .staff(newStaff).complexClass(cls).action("ASSIGN").build());
            }
        }

        return ComplexClassResponse.from(saved);
    }

    public void delete(Long seq) {
        classRepository.deleteById(seq);
    }
}
