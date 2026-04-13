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
     * 회원의 모든 수업 매핑을 일괄 삭제한다.
     * 멤버십이 정지/환불/만료되어 수업 자격이 없을 때 호출.
     */
    @Transactional
    public void detachMemberFromAllClasses(ComplexMember member, String reasonLabel) {
        List<ComplexMemberClassMapping> mappings = classMappingRepository.findByMemberSeq(member.getSeq());
        if (mappings.isEmpty()) return;
        int count = mappings.size();
        classMappingRepository.deleteByMemberSeq(member.getSeq());
        eventPublisher.publishEvent(ActivityEvent.of(
                member, ActivityEventType.CLASS_ASSIGN,
                "멤버십 " + reasonLabel + "(으)로 인한 수업/팀 자동 제외 (" + count + "건)"));
    }
}
