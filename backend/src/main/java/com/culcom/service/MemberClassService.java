package com.culcom.service;

import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberClassService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexClassRepository classRepository;
    private final ComplexMemberClassMappingRepository classMappingRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void assignClass(Long memberSeq, Long classSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexClass clazz = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member)
                .complexClass(clazz)
                .build());

        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, null, clazz.getName()));
    }

    @Transactional
    public void reassignClass(Long memberSeq, Long classSeq) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        ComplexClass clazz = classRepository.findById(classSeq)
                .orElseThrow(() -> new EntityNotFoundException("수업"));

        List<ComplexMemberClassMapping> oldMappings = classMappingRepository.findByMemberSeq(memberSeq);
        String oldClassName = oldMappings.isEmpty() ? null : oldMappings.get(0).getComplexClass().getName();

        classMappingRepository.deleteByMemberSeq(memberSeq);
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member)
                .complexClass(clazz)
                .build());

        eventPublisher.publishEvent(ActivityEvent.withChange(
                member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS, oldClassName, clazz.getName()));
    }

    @Transactional(readOnly = true)
    public List<ComplexMemberClassMapping> getClassMappings(Long memberSeq) {
        return classMappingRepository.findByMemberSeq(memberSeq);
    }

    /**
     * 회원의 모든 수업 매핑 및 리더 배정을 일괄 해제한다.
     * 멤버십이 정지/환불/만료되어 수업 자격을 잃었을 때 호출.
     *
     * 리더도 결국 {@link ComplexMember}이며, 두 개 이상의 팀에서 리더로 활동 중일 수 있다.
     * 자격을 잃으면 속한 모든 팀(일반 수강 + 리더 역할)에서 동시에 제외되어야 한다.
     */
    @Transactional
    public void detachMemberFromAllClasses(ComplexMember member, String reasonLabel) {
        // 1) 일반 수강 매핑 제거
        List<ComplexMemberClassMapping> mappings = classMappingRepository.findByMemberSeq(member.getSeq());
        int mappingCount = mappings.size();
        if (mappingCount > 0) {
            classMappingRepository.deleteByMemberSeq(member.getSeq());
        }

        // 2) 리더 역할(ComplexClass.staff) 해제 — 복수 팀에 걸쳐 있을 수 있으므로 전체 순회
        List<ComplexClass> leaderOf = classRepository.findByStaffSeq(member.getSeq());
        int leaderCount = leaderOf.size();
        if (leaderCount > 0) {
            for (ComplexClass c : leaderOf) {
                c.setStaff(null);
                eventPublisher.publishEvent(ActivityEvent.withChange(
                        member, ActivityEventType.CLASS_ASSIGN, ActivityFieldType.CLASS,
                        c.getName(), null));
            }
            classRepository.saveAll(leaderOf);
        }

        int totalCount = mappingCount + leaderCount;
        if (totalCount > 0) {
            eventPublisher.publishEvent(ActivityEvent.of(
                    member, ActivityEventType.CLASS_ASSIGN,
                    "멤버십 " + reasonLabel + "(으)로 인한 수업/팀 자동 제외 (" + totalCount + "건)"));
        }
    }
}
