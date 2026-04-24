package com.culcom.service;

import com.culcom.dto.complex.classes.ClassTimeSlotRequest;
import com.culcom.dto.complex.classes.ClassTimeSlotResponse;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassTimeSlotService {

    private final ClassTimeSlotRepository timeSlotRepository;
    private final BranchRepository branchRepository;
    private final ComplexClassRepository classRepository;

    public List<ClassTimeSlotResponse> list(Long branchSeq) {
        return timeSlotRepository.findByBranchSeqAndDeletedFalse(branchSeq)
                .stream().map(ClassTimeSlotResponse::from).toList();
    }

    public ClassTimeSlotResponse create(ClassTimeSlotRequest request, Long branchSeq) {
        ClassTimeSlot timeSlot = ClassTimeSlot.builder()
                .name(request.getName())
                .daysOfWeek(request.getDaysOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();
        branchRepository.findById(branchSeq).ifPresent(timeSlot::setBranch);
        return ClassTimeSlotResponse.from(timeSlotRepository.save(timeSlot));
    }

    public ClassTimeSlotResponse update(Long seq, ClassTimeSlotRequest request) {
        ClassTimeSlot ts = timeSlotRepository.findBySeqAndDeletedFalse(seq)
                .orElseThrow(() -> new EntityNotFoundException("시간대"));
        ts.setName(request.getName());
        ts.setDaysOfWeek(request.getDaysOfWeek());
        ts.setStartTime(request.getStartTime());
        ts.setEndTime(request.getEndTime());
        return ClassTimeSlotResponse.from(timeSlotRepository.save(ts));
    }

    /**
     * Soft-delete. 이 시간대를 사용 중인 활성 팀이 하나라도 있으면 차단한다 — orphan 방지.
     */
    @Transactional
    public void delete(Long seq) {
        ClassTimeSlot slot = timeSlotRepository.findBySeqAndDeletedFalse(seq)
                .orElseThrow(() -> new EntityNotFoundException("시간대"));
        long usingCount = classRepository.countByTimeSlotSeqAndDeletedFalse(seq);
        if (usingCount > 0) {
            throw new IllegalStateException(
                    "이 시간대를 사용 중인 팀이 " + usingCount + "개 있어 삭제할 수 없습니다.");
        }
        slot.setDeleted(true);
        timeSlotRepository.save(slot);
    }
}
