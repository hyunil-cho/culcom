package com.culcom.config;

import com.culcom.entity.*;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final ExternalServiceTypeRepository externalServiceTypeRepository;
    private final ThirdPartyServiceRepository thirdPartyServiceRepository;
    private final BranchThirdPartyMappingRepository mappingRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userInfoRepository.findByUserId("root").isEmpty()) {
            UserInfo root = UserInfo.builder()
                    .userId("root")
                    .userPassword("root")
                    .role(UserRole.ROOT)
                    .build();
            userInfoRepository.save(root);
            log.info("초기 계정 생성: root/root (ROOT)");
        }

        if (userInfoRepository.findByUserId("user").isEmpty()) {
            UserInfo manager = UserInfo.builder()
                    .userId("user")
                    .userPassword("user")
                    .role(UserRole.BRANCH_MANAGER)
                    .name("조현일")
                    .phone("01099321967")
                    .build();
            userInfoRepository.save(manager);
            log.info("초기 계정 생성: user/user (BRANCH_MANAGER, 조현일)");

            if (branchRepository.findByAlias("gangnam").isEmpty()) {
                Branch branch = Branch.builder()
                        .branchName("강남점")
                        .alias("gangnam")
                        .branchManager("조현일")
                        .address("서울특별시 강남구 테헤란로 123")
                        .createdBy(manager)
                        .build();
                branchRepository.save(branch);
                log.info("초기 지점 생성: 강남점 (생성자: user)");
            }
        }

        initThirdPartyServices();
    }

    private void initThirdPartyServices() {
        ExternalServiceType smsType = externalServiceTypeRepository.findByCodeName("SMS")
                .orElseGet(() -> {
                    ExternalServiceType type = ExternalServiceType.builder()
                            .codeName("SMS")
                            .build();
                    externalServiceTypeRepository.save(type);
                    log.info("초기 외부 서비스 타입 생성: SMS");
                    return type;
                });

        ThirdPartyService mymunja = thirdPartyServiceRepository.findByName("마이문자")
                .orElseGet(() -> {
                    ThirdPartyService service = ThirdPartyService.builder()
                            .name("마이문자")
                            .description("마이문자 연동 서비스")
                            .externalServiceType(smsType)
                            .build();
                    thirdPartyServiceRepository.save(service);
                    log.info("초기 서드파티 서비스 생성: 마이문자");
                    return service;
                });

        // 강남점에 마이문자 매핑 생성
        branchRepository.findByAlias("gangnam").ifPresent(branch -> {
            if (mappingRepository.findByBranchSeqAndThirdPartyServiceSeq(
                    branch.getSeq(), mymunja.getSeq()).isEmpty()) {
                BranchThirdPartyMapping mapping = BranchThirdPartyMapping.builder()
                        .branch(branch)
                        .thirdPartyService(mymunja)
                        .isActive(false)
                        .build();
                mappingRepository.save(mapping);
                log.info("초기 매핑 생성: 강남점 - 마이문자");
            }
        });
    }
}
