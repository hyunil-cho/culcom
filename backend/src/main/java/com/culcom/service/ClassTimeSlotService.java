package com.culcom.service;

import com.culcom.dto.complex.classes.ClassTimeSlotRequest;
import com.culcom.dto.complex.classes.ClassTimeSlotResponse;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassTimeSlotService {

    private final ClassTimeSlotRepository timeSlotRepository;
    private final BranchRepository branchRepository;

    public List<ClassTimeSlotResponse> list(Long branchSeq) {
        return timeSlotRepository.findByBranchSeq(branchSeq)
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
        ClassTimeSlot ts = timeSlotRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("시간대"));
        ts.setName(request.getName());
        ts.setDaysOfWeek(request.getDaysOfWeek());
        ts.setStartTime(request.getStartTime());
        ts.setEndTime(request.getEndTime());
        return ClassTimeSlotResponse.from(timeSlotRepository.save(ts));
    }

    public void delete(Long seq) {
        timeSlotRepository.deleteById(seq);
    }
}
