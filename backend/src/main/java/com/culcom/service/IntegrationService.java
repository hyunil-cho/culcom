package com.culcom.service;

import com.culcom.dto.integration.IntegrationServiceResponse;
import com.culcom.dto.integration.SmsConfigResponse;
import com.culcom.dto.integration.SmsConfigSaveRequest;
import com.culcom.entity.branch.BranchThirdPartyMapping;
import com.culcom.entity.integration.MymunjaConfigInfo;
import com.culcom.entity.integration.ThirdPartyService;
import com.culcom.repository.BranchThirdPartyMappingRepository;
import com.culcom.repository.MymunjaConfigInfoRepository;
import com.culcom.repository.ThirdPartyServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.culcom.repository.BranchRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final BranchThirdPartyMappingRepository mappingRepository;
    private final ThirdPartyServiceRepository thirdPartyServiceRepository;
    private final MymunjaConfigInfoRepository mymunjaConfigInfoRepository;
    private final BranchRepository branchRepository;
    private final SmsService smsService;

    public List<IntegrationServiceResponse> list(Long branchSeq) {
        List<BranchThirdPartyMapping> mappings = mappingRepository.findByBranchSeq(branchSeq);
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
                case "SMS" -> "\uD83D\uDCAC";
                case "EMAIL" -> "\uD83D\uDCE7";
                case "STORAGE" -> "\u2601\uFE0F";
                case "PAYMENT" -> "\uD83D\uDCB3";
                default -> "\uD83D\uDD17";
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

        return results;
    }

    public SmsConfigResponse getSmsConfig(Long branchSeq) {
        List<BranchThirdPartyMapping> mappings = mappingRepository.findByBranchSeq(branchSeq);
        BranchThirdPartyMapping smsMapping = mappings.stream()
                .filter(m -> m.getThirdPartyService().getExternalServiceType() != null
                        && "SMS".equals(m.getThirdPartyService().getExternalServiceType().getCodeName()))
                .findFirst()
                .orElse(null);

        if (smsMapping == null) {
            return null;
        }

        MymunjaConfigInfo config = mymunjaConfigInfoRepository
                .findByMappingMappingSeq(smsMapping.getMappingSeq())
                .orElse(null);

        if (config == null) {
            return SmsConfigResponse.builder()
                    .serviceId(smsMapping.getThirdPartyService().getSeq())
                    .serviceName(smsMapping.getThirdPartyService().getName())
                    .active(Boolean.TRUE.equals(smsMapping.getIsActive()))
                    .senderPhones(List.of())
                    .build();
        }

        List<String> phones = new ArrayList<>();
        if (config.getCallbackNumber() != null && !config.getCallbackNumber().isBlank()) {
            phones.add(config.getCallbackNumber());
        }

        return SmsConfigResponse.builder()
                .serviceId(smsMapping.getThirdPartyService().getSeq())
                .serviceName(smsMapping.getThirdPartyService().getName())
                .accountId(config.getMymunjaId())
                .senderPhones(phones)
                .active(Boolean.TRUE.equals(smsMapping.getIsActive()))
                .updatedAt(smsMapping.getLastUpdateDate() != null
                        ? smsMapping.getLastUpdateDate().toString() : null)
                .build();
    }

    @Transactional
    public void saveSmsConfig(SmsConfigSaveRequest request, Long branchSeq) {
        // 저장 전 잔여건수 조회로 계정 유효성 검증
        int[] remainingCounts;
        try {
            remainingCounts = smsService.checkRemainingCount(request.getAccountId(), request.getPassword());
        } catch (Exception e) {
            log.error("마이문자 잔여건수 조회 실패: {}", e.getMessage());
            throw new IllegalArgumentException("마이문자 계정 인증에 실패했습니다. 계정 ID와 비밀번호를 확인해주세요.");
        }

        BranchThirdPartyMapping mapping = mappingRepository
                .findByBranchSeqAndThirdPartyServiceSeq(branchSeq, request.getServiceId())
                .orElseGet(() -> {
                    var branch = branchRepository.findById(branchSeq)
                            .orElseThrow(() -> new IllegalArgumentException("지점 정보를 찾을 수 없습니다."));
                    var service = thirdPartyServiceRepository.findById(request.getServiceId())
                            .orElseThrow(() -> new IllegalArgumentException("서비스 정보를 찾을 수 없습니다."));
                    return mappingRepository.save(BranchThirdPartyMapping.builder()
                            .branch(branch)
                            .thirdPartyService(service)
                            .isActive(request.isActive())
                            .build());
                });

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
    }
}
