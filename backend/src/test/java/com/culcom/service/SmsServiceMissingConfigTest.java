package com.culcom.service;

import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.SmsEventConfigRepository;
import com.culcom.service.external.SmsClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.any;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * SmsService.sendEventSmsIfConfigured 의 "자동발송 설정 미등록" 분기 동작 검증.
 *
 * 처리는 정상 완료됐지만 SMS 가 안 나간 사실을 관리자에게 명시적으로 알리기 위해
 * 미설정 시에도 경고 문자열을 반환해야 한다.
 */
@ExtendWith(MockitoExtension.class)
class SmsServiceMissingConfigTest {

    @Mock BranchThirdPartyMappingRepository mappingRepository;
    @Mock MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    @Mock SmsEventConfigRepository smsEventConfigRepository;
    @Mock SmsClient smsClient;
    @Mock SmsMessageResolver messageResolver;

    @InjectMocks SmsService smsService;

    @Test
    void 자동발송_설정이_등록되지_않으면_경고를_반환한다() {
        given(smsEventConfigRepository.findByBranchSeqAndEventType(1L, SmsEventType.연기승인))
                .willReturn(Optional.empty());

        String warning = smsService.sendEventSmsIfConfigured(
                1L, SmsEventType.연기승인, "홍길동", "01012345678", Map.of());

        assertThat(warning)
                .as("미설정 시 처리는 완료됐으나 SMS 미발송 사실을 명시적으로 노출해야 한다")
                .isNotNull()
                .contains("등록되지 않");
    }

    @Test
    void 미설정시_외부_SMS_API는_호출되지_않는다() {
        given(smsEventConfigRepository.findByBranchSeqAndEventType(1L, SmsEventType.연기승인))
                .willReturn(Optional.empty());

        smsService.sendEventSmsIfConfigured(
                1L, SmsEventType.연기승인, "홍길동", "01012345678", Map.of());

        then(smsClient).should(never()).send(anyString(), anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void 추가_컨텍스트_없는_4인자_오버로드도_미설정시_경고를_반환한다() {
        given(smsEventConfigRepository.findByBranchSeqAndEventType(1L, SmsEventType.회원등록))
                .willReturn(Optional.empty());

        String warning = smsService.sendEventSmsIfConfigured(
                1L, SmsEventType.회원등록, "홍길동", "01012345678");

        assertThat(warning).isNotNull().contains("등록되지 않");
    }
}
