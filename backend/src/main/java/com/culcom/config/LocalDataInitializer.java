package com.culcom.config;

import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
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
    }
}
