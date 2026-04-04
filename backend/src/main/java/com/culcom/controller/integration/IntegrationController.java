package com.culcom.controller.integration;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.integration.IntegrationServiceResponse;
import com.culcom.dto.integration.SmsConfigResponse;
import com.culcom.dto.integration.SmsConfigSaveRequest;
import com.culcom.entity.branch.BranchThirdPartyMapping;
import com.culcom.entity.integration.MymunjaConfigInfo;
import com.culcom.entity.integration.ThirdPartyService;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.ThirdPartyServiceRepository;
import com.culcom.service.SmsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final BranchThirdPartyMappingRepository mappingRepository;
    private final ThirdPartyServiceRepository thirdPartyServiceRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final SmsService smsService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IntegrationServiceResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long sessionBranchSeq = principal.getSelectedBranchSeq();

        List<BranchThirdPartyMapping> mappings = mappingRepository.findByBranchSeq(sessionBranchSeq);

        List<ThirdPartyService> allServices = thirdPartyServiceRepository.findAll();

        List<IntegrationServiceResponse> results = new ArrayList<>();

        for (ThirdPartyService service : allServices) {

            String codeName = service.getExternalServiceType() != null
                    ? service.getExternalServiceType().getCodeName() : "기타";

            BranchThirdPartyMapping mapping = mappings.stream()
                    .filter(m -> Objects.equals(m.getThirdPartyService().getSeq(), service.getSeq()))
                    .findFirst().orElse(null);

            String status;
            if (mapping != null && Boolean.TRUE.equals(mapping.getIsActive())) {
                status = "active";
            } else if (mapping != null) {
                status = "inactive";
            } else {
                status = "not-configured";
            }

            String icon = switch (codeName) {
                case "SMS" -> "💬";
                case "EMAIL" -> "📧";
                case "STORAGE" -> "☁️";
                case "PAYMENT" -> "💳";
                default -> "🔗";
            };

            results.add(IntegrationServiceResponse.builder()
                    .id(service.getSeq())
                    .name(service.getName())
                    .description(service.getDescription())
                    .icon(icon)
                    .category(codeName)
                    .status(status)
                    .connected("active".equals(status))
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/sms-config")
    public ResponseEntity<ApiResponse<SmsConfigResponse>> getSmsConfig(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        List<BranchThirdPartyMapping> mappings = mappingRepository.findByBranchSeq(branchSeq);
        BranchThirdPartyMapping smsMapping = mappings.stream()
                .filter(m -> m.getThirdPartyService().getExternalServiceType() != null
                        && "SMS".equals(m.getThirdPartyService().getExternalServiceType().getCodeName()))
                .findFirst()
                .orElse(null);

        if (smsMapping == null) {
            return ResponseEntity.ok(ApiResponse.ok(null));
        }

        MymunjaConfigInfo config = mymunjaConfigInfoRepository
                .findByMappingMappingSeq(smsMapping.getMappingSeq())
                .orElse(null);

        if (config == null) {
            return ResponseEntity.ok(ApiResponse.ok(SmsConfigResponse.builder()
                    .serviceId(smsMapping.getThirdPartyService().getSeq())
                    .serviceName(smsMapping.getThirdPartyService().getName())
                    .active(Boolean.TRUE.equals(smsMapping.getIsActive()))
                    .senderPhones(List.of())
                    .build()));
        }

        List<String> phones = new ArrayList<>();
        if (config.getCallbackNumber() != null && !config.getCallbackNumber().isBlank()) {
            phones.add(config.getCallbackNumber());
        }

        return ResponseEntity.ok(ApiResponse.ok(SmsConfigResponse.builder()
                .serviceId(smsMapping.getThirdPartyService().getSeq())
                .serviceName(smsMapping.getThirdPartyService().getName())
                .accountId(config.getMymunjaId())
                .senderPhones(phones)
                .active(Boolean.TRUE.equals(smsMapping.getIsActive()))
                .updatedAt(smsMapping.getLastUpdateDate() != null
                        ? smsMapping.getLastUpdateDate().toString() : null)
                .build()));
    }

    @PostMapping("/sms-config")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> saveSmsConfig(
            @Valid @RequestBody SmsConfigSaveRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        BranchThirdPartyMapping mapping = mappingRepository
                .findByBranchSeqAndThirdPartyServiceSeq(branchSeq, request.getServiceId())
                .orElse(null);

        if (mapping == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("SMS 매핑 정보를 찾을 수 없습니다."));
        }

        // 저장 전 잔여건수 조회로 계정 유효성 검증
        int[] remainingCounts;
        try {
            remainingCounts = smsService.checkRemainingCount(request.getAccountId(), request.getPassword());
        } catch (Exception e) {
            log.error("마이문자 잔여건수 조회 실패: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.error("마이문자 계정 인증에 실패했습니다. 계정 ID와 비밀번호를 확인해주세요."));
        }

        mapping.setIsActive(request.isActive());
        mappingRepository.save(mapping);

        MymunjaConfigInfo config = mymunjaConfigInfoRepository
                .findByMappingMappingSeq(mapping.getMappingSeq())
                .orElseGet(() -> MymunjaConfigInfo.builder()
                        .mapping(mapping)
                        .build());

        config.setMymunjaId(request.getAccountId());
        config.setMymunjaPassword(request.getPassword());
        config.setCallbackNumber(request.getSenderPhone());
        config.setRemainingCountSms(remainingCounts[0]);
        config.setRemainingCountLms(remainingCounts[1]);
        mymunjaConfigInfoRepository.save(config);

        log.info("SMS 설정 저장 완료 - 잔여건수 SMS: {}, LMS: {}", remainingCounts[0], remainingCounts[1]);
        return ResponseEntity.ok(ApiResponse.ok("SMS 설정이 저장되었습니다.", null));
    }
}
