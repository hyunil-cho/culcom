package com.culcom.service;

import com.culcom.dto.message.MessageTemplateCreateRequest;
import com.culcom.dto.message.MessageTemplateResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.SmsEventConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MessageTemplate 삭제 시 참조하는 SmsEventConfig도 함께 삭제되는지 검증
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MessageTemplateCascadeDeleteTest {

    @Autowired MessageTemplateService messageTemplateService;
    @Autowired MessageTemplateRepository messageTemplateRepository;
    @Autowired SmsEventConfigRepository smsEventConfigRepository;
    @Autowired BranchRepository branchRepository;

    private Branch branch;
    private MessageTemplateResponse template;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("msg-cascade-" + System.nanoTime())
                .build());

        MessageTemplateCreateRequest req = new MessageTemplateCreateRequest();
        req.setTemplateName("테스트 메시지 템플릿");
        req.setDescription("삭제 테스트용");
        req.setMessageContext("안녕하세요 {고객명}님");
        req.setEventType(SmsEventType.예약확정);
        template = messageTemplateService.create(req, branch.getSeq());
    }

    @Test
    void SmsEventConfig가_없으면_템플릿_삭제_성공() {
        messageTemplateService.delete(template.getSeq());

        assertThat(messageTemplateRepository.findById(template.getSeq())).isEmpty();
    }

    @Test
    void SmsEventConfig가_참조해도_템플릿과_함께_삭제된다() {
        MessageTemplate entity = messageTemplateRepository.findById(template.getSeq()).orElseThrow();
        SmsEventConfig config = SmsEventConfig.builder()
                .branch(branch)
                .eventType(SmsEventType.예약확정)
                .template(entity)
                .senderNumber("01012345678")
                .autoSend(true)
                .build();
        SmsEventConfig saved = smsEventConfigRepository.save(config);

        messageTemplateService.delete(template.getSeq());
        messageTemplateRepository.flush();

        assertThat(messageTemplateRepository.findById(template.getSeq())).isEmpty();
        assertThat(smsEventConfigRepository.findById(saved.getSeq())).isEmpty();
    }

    @Test
    void 여러_이벤트설정이_참조해도_모두_함께_삭제된다() {
        MessageTemplate entity = messageTemplateRepository.findById(template.getSeq()).orElseThrow();

        SmsEventConfig config1 = smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch).eventType(SmsEventType.예약확정)
                .template(entity).senderNumber("01012345678").autoSend(true).build());
        SmsEventConfig config2 = smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch).eventType(SmsEventType.고객등록)
                .template(entity).senderNumber("01012345678").autoSend(true).build());

        messageTemplateService.delete(template.getSeq());
        messageTemplateRepository.flush();

        assertThat(messageTemplateRepository.findById(template.getSeq())).isEmpty();
        assertThat(smsEventConfigRepository.findById(config1.getSeq())).isEmpty();
        assertThat(smsEventConfigRepository.findById(config2.getSeq())).isEmpty();
    }

    @Test
    void 다른_템플릿의_이벤트설정은_영향받지_않는다() {
        // 두 번째 템플릿 생성
        MessageTemplateCreateRequest req2 = new MessageTemplateCreateRequest();
        req2.setTemplateName("다른 템플릿");
        req2.setMessageContext("다른 내용");
        req2.setEventType(SmsEventType.고객등록);
        MessageTemplateResponse template2 = messageTemplateService.create(req2, branch.getSeq());

        MessageTemplate entity1 = messageTemplateRepository.findById(template.getSeq()).orElseThrow();
        MessageTemplate entity2 = messageTemplateRepository.findById(template2.getSeq()).orElseThrow();

        // 각 템플릿에 이벤트설정 연결
        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch).eventType(SmsEventType.예약확정)
                .template(entity1).senderNumber("01012345678").autoSend(true).build());
        SmsEventConfig otherConfig = smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch).eventType(SmsEventType.고객등록)
                .template(entity2).senderNumber("01012345678").autoSend(true).build());

        // 첫 번째 템플릿만 삭제
        messageTemplateService.delete(template.getSeq());
        messageTemplateRepository.flush();

        assertThat(messageTemplateRepository.findById(template.getSeq())).isEmpty();
        // 다른 템플릿과 그 설정은 유지
        assertThat(messageTemplateRepository.findById(template2.getSeq())).isPresent();
        assertThat(smsEventConfigRepository.findById(otherConfig.getSeq())).isPresent();
    }
}
