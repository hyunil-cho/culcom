package com.culcom.service;

import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.logs.ChangeDetail;
import com.culcom.entity.complex.member.logs.MemberActivityLog;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MemberActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexClassService {

    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository timeSlotRepository;
    private final ComplexMemberRepository memberRepository;
    private final MemberActivityLogRepository activityLogRepository;

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
                .staff(req.getStaffSeq() != null ? memberRepository.getReferenceById(req.getStaffSeq()) : null)
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
            memberRepository.findById(newStaffSeq).ifPresent(cls::setStaff);
        } else {
            cls.setStaff(null);
        }

        ComplexClass saved = classRepository.save(cls);

        if (!Objects.equals(oldStaffSeq, newStaffSeq)) {
            if (oldStaffSeq != null) {
                ComplexMember oldStaff = memberRepository.getReferenceById(oldStaffSeq);
                activityLogRepository.save(MemberActivityLog.builder()
                        .member(oldStaff).eventType(ActivityEventType.CLASS_ASSIGN).eventDate(LocalDate.now())
                        .changeDetail(ChangeDetail.builder().fieldName(ActivityFieldType.CLASS).oldValue(cls.getName()).newValue("해제").build())
                        .build());
            }
            if (newStaffSeq != null) {
                ComplexMember newStaff = memberRepository.getReferenceById(newStaffSeq);
                activityLogRepository.save(MemberActivityLog.builder()
                        .member(newStaff).eventType(ActivityEventType.CLASS_ASSIGN).eventDate(LocalDate.now())
                        .changeDetail(ChangeDetail.builder().fieldName(ActivityFieldType.CLASS).oldValue(null).newValue("배정").build())
                        .build());
            }
        }

        return ComplexClassResponse.from(saved);
    }

    public void delete(Long seq) {
        classRepository.deleteById(seq);
    }
}
