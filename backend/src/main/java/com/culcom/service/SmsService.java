package com.culcom.service;

import com.culcom.config.SmsProperties;
import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.BranchThirdPartyMapping;
import com.culcom.entity.MymunjaConfigInfo;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final SmsProperties smsProperties;
    private final BranchThirdPartyMappingRepository mappingRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final Environment environment;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, String> RESPONSE_CODES = Map.ofEntries(
            Map.entry("0000", "전송성공"),
            Map.entry("0001", "접속에러"),
            Map.entry("0002", "인증에러"),
            Map.entry("0003", "잔여콜수 없음"),
            Map.entry("0004", "메시지 형식에러"),
            Map.entry("0005", "콜백번호 에러"),
            Map.entry("0006", "수신번호 개수 에러"),
            Map.entry("0007", "예약시간 에러"),
            Map.entry("0008", "잔여콜수 부족"),
            Map.entry("0009", "전송실패"),
            Map.entry("0010", "MMS NO IMG (이미지없음)"),
            Map.entry("0011", "MMS ERROR TRANSFER (이미지전송오류)"),
            Map.entry("0012", "메시지 길이오류(2000바이트초과)"),
            Map.entry("0030", "CALLBACK AUTH FAIL (발신번호 사전등록 미등록)"),
            Map.entry("0033", "CALLBACK TYPE FAIL (발신번호 형식에러)"),
            Map.entry("0080", "발송제한"),
            Map.entry("6666", "일시차단"),
            Map.entry("9999", "요금미납")
    );

    /**
     * SMS/LMS 발송.
     * 메시지 바이트 길이에 따라 SMS(≤90) 또는 LMS(91~2000) 자동 결정.
     */
    public SmsSendResponse send(String accountId, String password,
                                String senderPhone, String receiverPhone,
                                String message, String subject) {
        // local 프로필이면 Mock 모드
        if (isMockMode()) {
            log.info("[Mock Mode] 실제 SMS 발송 없이 성공 응답 반환");
            return SmsSendResponse.builder()
                    .success(true)
                    .message("테스트 메시지가 발송되었습니다 (Mock)")
                    .code("0000").nums("1").cols("9999").msgType("SMS")
                    .build();
        }

        senderPhone = normalizePhone(senderPhone);
        receiverPhone = normalizePhone(receiverPhone);

        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        int byteLength = messageBytes.length;
        boolean isLms = byteLength > smsProperties.getMaxSmsBytes();

        // 길이 검증
        if (isLms && byteLength > 2000) {
            return SmsSendResponse.builder()
                    .success(false)
                    .message("LMS 메시지가 너무 깁니다 (최대 2000바이트, 현재 " + byteLength + "바이트)")
                    .build();
        }
        if (!isLms && byteLength > 90) {
            return SmsSendResponse.builder()
                    .success(false)
                    .message("SMS 메시지가 너무 깁니다 (최대 90바이트, 현재 " + byteLength + "바이트)")
                    .build();
        }

        String endpoint = smsProperties.getApiBaseUrl()
                + (isLms ? smsProperties.getLmsEndpoint() : smsProperties.getSmsEndpoint());
        String msgType = isLms ? "LMS" : "SMS";

        log.info("{} 발송 - 수신: {}, 발신: {}, 메시지 길이: {}바이트", msgType, receiverPhone, senderPhone, byteLength);

        // 폼 파라미터 구성
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("remote_id", accountId);
        form.add("remote_pass", password);
        form.add("remote_num", "1");
        form.add("remote_phone", receiverPhone);
        form.add("remote_callback", senderPhone);
        form.add("remote_msg", message);

        if (isLms) {
            form.add("remote_subject", subject != null && !subject.isBlank() ? subject : "안내 메시지");
        }

        // API 호출
        String responseText = postForm(endpoint, form);
        return parseResponse(responseText, msgType);
    }

    /**
     * 지점 기준 SMS 발송. DB에서 계정 정보를 조회하여 발송.
     */
    public SmsSendResponse sendByBranch(Long branchSeq, String senderPhone,
                                         String receiverPhone, String message, String subject) {
        MymunjaConfigInfo config = findSmsConfig(branchSeq);
        if (config == null) {
            return SmsSendResponse.builder()
                    .success(false).message("SMS 연동 설정이 없습니다.").build();
        }
        return send(config.getMymunjaId(), config.getMymunjaPassword(),
                senderPhone, receiverPhone, message, subject);
    }

    /**
     * SMS/LMS 잔여건수 조회.
     */
    public int[] checkRemainingCount(String accountId, String password) {
        if (isMockMode()) {
            log.info("[Mock Mode] 잔여건수 조회 없이 테스트 값 반환");
            return new int[]{9999, 9999};
        }

        String endpoint = smsProperties.getApiBaseUrl() + smsProperties.getCheckEndpoint();
        int smsCount = checkRemainingByType(endpoint, accountId, password, "sms");
        int lmsCount = checkRemainingByType(endpoint, accountId, password, "lms");

        log.info("잔여건수 조회 완료 - SMS: {}, LMS: {}", smsCount, lmsCount);
        return new int[]{smsCount, lmsCount};
    }

    /**
     * 발송 후 잔여건수 DB 업데이트.
     */
    @Transactional
    public void updateRemainingCount(Long branchSeq, String cols, String msgType) {
        MymunjaConfigInfo config = findSmsConfig(branchSeq);
        if (config == null) return;

        try {
            int remaining = Integer.parseInt(cols);
            if ("LMS".equalsIgnoreCase(msgType)) {
                config.setRemainingCountLms(remaining);
            } else {
                config.setRemainingCountSms(remaining);
            }
            mymunjaConfigInfoRepository.save(config);
            log.info("잔여건수 업데이트 - Type: {}, Count: {}", msgType, remaining);
        } catch (NumberFormatException e) {
            log.warn("잔여건수 파싱 실패: {}", cols);
        }
    }

    // ── private ──

    private boolean isMockMode() {
        return Arrays.asList(environment.getActiveProfiles()).contains("local");
    }

    private MymunjaConfigInfo findSmsConfig(Long branchSeq) {
        return mappingRepository.findByBranchSeq(branchSeq).stream()
                .filter(m -> m.getThirdPartyService().getExternalServiceType() != null
                        && "SMS".equals(m.getThirdPartyService().getExternalServiceType().getCodeName()))
                .findFirst()
                .map(BranchThirdPartyMapping::getMappingSeq)
                .flatMap(mymunjaConfigInfoRepository::findByMappingMappingSeq)
                .orElse(null);
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        // 82로 시작하는 국제번호 → 0으로 변환 (예: 821012345678 → 01012345678)
        if (digits.startsWith("82") && digits.length() > 2) {
            digits = "0" + digits.substring(2);
        }
        return digits;
    }

    private String postForm(String endpoint, MultiValueMap<String, String> form) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint, HttpMethod.POST, request, String.class);
            log.info("SMS API 응답 (Status: {}): {}", response.getStatusCode(), response.getBody());
            return response.getBody() != null ? response.getBody().trim() : "";
        } catch (Exception e) {
            log.error("SMS API 요청 오류: {}", e.getMessage());
            return "";
        }
    }

    private SmsSendResponse parseResponse(String responseText, String msgType) {
        if (responseText.isBlank()) {
            return SmsSendResponse.builder()
                    .success(false).message("SMS API 응답 없음").msgType(msgType).build();
        }

        // 응답 형식: code|msg|cols|nums
        String[] parts = responseText.split("\\|");
        if (parts.length < 4) {
            log.warn("SMS API 응답 형식 오류: {}", responseText);
            return SmsSendResponse.builder()
                    .success(false).message("SMS 응답 형식 오류: " + responseText).msgType(msgType).build();
        }

        String code = parts[0];
        String nums = parts[3];
        String cols = parts[2];
        boolean success = "0000".equals(code);
        String message = RESPONSE_CODES.getOrDefault(code, "알 수 없는 오류");

        if (!success) {
            message = message + " (Code: " + code + ")";
        }

        return SmsSendResponse.builder()
                .success(success)
                .message(message)
                .code(code).nums(nums).cols(cols).msgType(msgType)
                .build();
    }

    private int checkRemainingByType(String endpoint, String accountId, String password, String type) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("remote_id", accountId);
        form.add("remote_pass", password);
        form.add("remote_request", type);

        String responseText = postForm(endpoint, form);
        if (responseText.isBlank()) return 0;

        // 응답 형식: 결과코드|결과메시지|잔여건수
        String[] parts = responseText.split("\\|");
        if (parts.length >= 3) {
            try {
                return Integer.parseInt(parts[2].trim());
            } catch (NumberFormatException e) {
                log.warn("{} 잔여건수 파싱 오류: {}", type.toUpperCase(), responseText);
            }
        }
        return 0;
    }
}
