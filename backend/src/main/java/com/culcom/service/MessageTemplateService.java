package com.culcom.service;

import com.culcom.dto.message.*;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.PlaceholderCategory;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.PlaceholderRepository;
import com.culcom.repository.SmsEventConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MessageTemplateService {

    private final MessageTemplateRepository templateRepository;
    private final BranchRepository branchRepository;
    private final PlaceholderRepository placeholderRepository;
    private final SmsMessageResolver messageResolver;
    private final SmsEventConfigRepository smsEventConfigRepository;

    public List<MessageTemplateResponse> list(Long branchSeq) {
        return templateRepository
                .findByBranchSeqOrderByIsDefaultDescLastUpdateDateDesc(branchSeq)
                .stream()
                .map(MessageTemplateResponse::from)
                .toList();
    }

    public MessageTemplateResponse get(Long seq) {
        MessageTemplate t = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("메시지 템플릿"));
        return MessageTemplateResponse.from(t);
    }

    @Transactional
    public MessageTemplateResponse create(MessageTemplateCreateRequest request, Long branchSeq) {
        MessageTemplate template = MessageTemplate.builder()
                .templateName(request.getTemplateName())
                .description(request.getDescription())
                .messageContext(request.getMessageContext())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .eventType(request.getEventType())
                .build();
        branchRepository.findById(branchSeq).ifPresent(template::setBranch);
        return MessageTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public MessageTemplateResponse update(Long seq, MessageTemplateUpdateRequest request) {
        MessageTemplate t = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("메시지 템플릿"));
        t.setTemplateName(request.getTemplateName());
        t.setDescription(request.getDescription());
        t.setMessageContext(request.getMessageContext());
        if (request.getIsActive() != null) {
            t.setIsActive(request.getIsActive());
        }
        if (request.getEventType() != null) {
            t.setEventType(request.getEventType());
        }
        return MessageTemplateResponse.from(templateRepository.save(t));
    }

    @Transactional
    public void delete(Long seq) {
        smsEventConfigRepository.deleteByTemplateSeq(seq);
        templateRepository.deleteById(seq);
    }

    public String resolve(Long seq, Long branchSeq, MessageTemplateResolveRequest request) {
        MessageTemplate template = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("메시지 템플릿"));

        Branch branch = branchSeq != null
                ? branchRepository.findById(branchSeq).orElse(null)
                : null;

        return messageResolver.resolveWithContext(
                template.getMessageContext(),
                branch,
                request.getCustomerName(),
                request.getCustomerPhone(),
                request.getInterviewDate()
        );
    }

    public List<PlaceholderResponse> getPlaceholders(SmsEventType eventType) {
        List<com.culcom.entity.message.Placeholder> entities;
        if (eventType == null) {
            entities = placeholderRepository.findAll();
        } else {
            Set<PlaceholderCategory> allowed = PlaceholderCategory.allowedFor(eventType);
            entities = placeholderRepository.findByCategoryIn(allowed);
        }
        return entities.stream().map(PlaceholderResponse::from).toList();
    }

    @Transactional
    public void setDefault(Long templateSeq, Long branchSeq) {
        // 해당 지점의 기존 기본 템플릿 해제
        templateRepository.findByBranchSeqOrderBySeqDesc(branchSeq).forEach(t -> {
            if (t.getIsDefault()) {
                t.setIsDefault(false);
                templateRepository.save(t);
            }
        });

        // 새 기본 템플릿 설정
        MessageTemplate template = templateRepository.findById(templateSeq)
                .orElseThrow(() -> new EntityNotFoundException("메시지 템플릿"));
        template.setIsDefault(true);
        templateRepository.save(template);
    }
}
