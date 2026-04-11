package com.culcom.service;

import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ComplexClassService {

    private final ComplexClassRepository classRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository timeSlotRepository;
    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberClassMappingRepository mappingRepository;
    private final ApplicationEventPublisher eventPublisher;

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
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        oldStaff, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, cls.getName(), null));
            }
            if (newStaffSeq != null) {
                ComplexMember newStaff = memberRepository.getReferenceById(newStaffSeq);
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        newStaff, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, null, cls.getName()));
            }
        }

        return ComplexClassResponse.from(saved);
    }

    public void delete(Long seq) {
        classRepository.deleteById(seq);
    }

    @Transactional(readOnly = true)
    public List<ComplexMemberResponse> listMembers(Long classSeq) {
        return mappingRepository.findByComplexClassSeqWithMember(classSeq).stream()
                .map(m -> ComplexMemberResponse.from(m.getMember()))
                .toList();
    }

    @Transactional
    public void addMember(Long classSeq, Long memberSeq) {
        ComplexClass cls = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        // 자기 자신이 리더인 팀에는 멤버로 들어갈 수 없다.
        if (cls.getStaff() != null && cls.getStaff().getSeq().equals(memberSeq)) {
            throw new IllegalStateException("자기 자신이 리더인 팀에는 멤버로 등록할 수 없습니다.");
        }
        // 활성 멤버십이 없는 회원(환불/만료/정지/미구매)은 팀에 추가할 수 없다.
        if (!memberMembershipRepository.existsActiveByMemberSeq(memberSeq)) {
            throw new IllegalStateException("활성 멤버십이 없는 회원은 팀에 추가할 수 없습니다.");
        }
        if (mappingRepository.existsByComplexClassSeqAndMemberSeq(classSeq, memberSeq)) {
            return;
        }
        mappingRepository.save(ComplexMemberClassMapping.builder()
                .complexClass(cls)
                .member(member)
                .sortOrder(0)
                .build());
        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, null, cls.getName()));
    }

    @Transactional
    public void removeMember(Long classSeq, Long memberSeq) {
        ComplexClass cls = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        mappingRepository.deleteByComplexClassSeqAndMemberSeq(classSeq, memberSeq);
        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, cls.getName(), null));
    }

    @Transactional
    public ComplexClassResponse setLeader(Long classSeq, Long staffSeq) {
        ComplexClass cls = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));
        Long oldStaffSeq = cls.getStaff() != null ? cls.getStaff().getSeq() : null;

        if (staffSeq != null) {
            ComplexMember newStaff = memberRepository.findById(staffSeq)
                    .orElseThrow(() -> new EntityNotFoundException("스태프"));
            // 리더도 결국 회원이며, 스태프는 internal 멤버십을 통해 팀에 들어간다.
            // 휴직/퇴직/환불/만료로 활성 멤버십이 없는 회원은 리더로 배정할 수 없다.
            if (!memberMembershipRepository.existsActiveByMemberSeq(staffSeq)) {
                throw new IllegalStateException("활성 멤버십이 없는 회원은 리더로 배정할 수 없습니다.");
            }
            cls.setStaff(newStaff);
        } else {
            // 리더 해제(null)는 언제나 허용 — 멤버십 상태와 무관한 동작이다.
            cls.setStaff(null);
        }
        ComplexClass saved = classRepository.save(cls);

        if (!Objects.equals(oldStaffSeq, staffSeq)) {
            if (oldStaffSeq != null) {
                ComplexMember oldStaff = memberRepository.getReferenceById(oldStaffSeq);
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        oldStaff, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, cls.getName(), null));
            }
            if (staffSeq != null) {
                ComplexMember newStaff = memberRepository.getReferenceById(staffSeq);
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        newStaff, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, null, cls.getName()));
            }
        }
        return ComplexClassResponse.from(saved);
    }
}
