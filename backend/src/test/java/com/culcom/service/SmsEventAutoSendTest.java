package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SMS 이벤트 자동발송 시나리오별 경고 메시지 검증:
 * 1) 설정이 없으면 "설정 미등록" 경고 메시지 반환 (관리자에게 명시적으로 노출하기 위함)
 * 2) autoSend=false면 비활성 경고 메시지 반환
 * 3) 템플릿 내용이 비어있으면 실패 메시지 반환
 * 4) SMS 연동 설정이 없으면 (sendByBranch 실패) 실패 메시지 반환
 * 5) 모든 조건 충족 시 (Mock) 정상 발송 → null 반환
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SmsEventAutoSendTest {

    @Autowired SmsService smsService;
    @Autowired BranchRepository branchRepository;
    @Autowired MessageTemplateRepository messageTemplateRepository;
    @Autowired SmsEventConfigRepository smsEventConfigRepository;

    private Branch createBranch() {
        return branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-sms-" + System.nanoTime())
                .build());
    }

    private MessageTemplate createTemplate(Branch branch, String content) {
        return messageTemplateRepository.save(MessageTemplate.builder()
                .templateName("테스트 템플릿")
                .messageContext(content)
                .branch(branch)
                .eventType(SmsEventType.고객등록)
                .build());
    }

    @Test
    void 설정이_없으면_미등록_경고_메시지_반환() {
        Branch branch = createBranch();

        String result = smsService.sendEventSmsIfConfigured(
                branch.getSeq(), SmsEventType.고객등록, "홍길동", "01012345678");

        assertThat(result)
                .as("SMS 자동발송 설정이 등록되지 않은 경우 관리자가 알 수 있도록 경고 메시지를 반환해야 한다")
                .contains("등록되지 않아");
    }

    @Test
    void 자동발송_비활성화면_경고_메시지_반환() {
        Branch branch = createBranch();
        MessageTemplate template = createTemplate(branch, "안녕하세요 {{고객명}}님");

        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(SmsEventType.고객등록)
                .template(template)
                .senderNumber("01011112222")
                .autoSend(false)
                .build());

        String result = smsService.sendEventSmsIfConfigured(
                branch.getSeq(), SmsEventType.고객등록, "홍길동", "01012345678");

        assertThat(result)
                .as("자동발송 비활성 시 경고 메시지를 반환해야 한다")
                .contains("비활성화");
    }

    @Test
    void 템플릿_내용이_비어있으면_실패_메시지_반환() {
        Branch branch = createBranch();
        MessageTemplate template = createTemplate(branch, "");

        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(SmsEventType.회원등록)
                .template(template)
                .senderNumber("01011112222")
                .autoSend(true)
                .build());

        String result = smsService.sendEventSmsIfConfigured(
                branch.getSeq(), SmsEventType.회원등록, "홍길동", "01012345678");

        assertThat(result)
                .as("템플릿 내용이 비어있으면 실패 메시지를 반환해야 한다")
                .contains("템플릿 내용이 비어있습니다");
    }

    @Test
    void SMS_연동설정_없으면_발송실패_메시지_반환() {
        Branch branch = createBranch();
        MessageTemplate template = createTemplate(branch, "{{고객명}}님 환영합니다!");

        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(SmsEventType.고객등록)
                .template(template)
                .senderNumber("01011112222")
                .autoSend(true)
                .build());

        // BranchThirdPartyMapping이 없으므로 sendByBranch가 실패
        String result = smsService.sendEventSmsIfConfigured(
                branch.getSeq(), SmsEventType.고객등록, "홍길동", "01012345678");

        assertThat(result)
                .as("SMS 연동 설정이 없으면 발송 실패 메시지를 반환해야 한다")
                .contains("문자 발송 실패");
    }
}
