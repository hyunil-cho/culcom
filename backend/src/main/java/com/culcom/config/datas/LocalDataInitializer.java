package com.culcom.config.datas;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.enums.UserRole;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.MembershipRepository;
import com.culcom.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

@Slf4j
@Component
@DependsOn("dataInitializer")
@Profile("test")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final ClassTimeSlotRepository classTimeSlotRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        UserInfo root = userInfoRepository.findByUserId("root").orElse(null);
        if (root == null) {
            log.warn("root 계정이 존재하지 않아 local 초기 데이터를 생성하지 않습니다.");
            return;
        }

        if (userInfoRepository.findByUserId("manager").isPresent()) {
            log.info("local 초기 데이터가 이미 존재합니다. 스킵합니다.");
            return;
        }

        // 지점장 생성
        UserInfo manager = userInfoRepository.save(UserInfo.builder()
                .userId("manager")
                .userPassword(passwordEncoder.encode("manager"))
                .role(UserRole.BRANCH_MANAGER)
                .name("테스트 지점장")
                .phone("010-1234-5678")
                .createdBy(root)
                .build());
        log.info("local 지점장 생성: manager/manager (BRANCH_MANAGER)");

        // 지점 생성
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트 지점")
                .alias("test-branch")
                .branchManager("테스트 지점장")
                .address("서울시 강남구 테헤란로 123")
                .directions("2호선 강남역 3번 출구 도보 5분")
                .createdBy(manager)
                .build());
        log.info("local 지점 생성: 테스트 지점 (alias: test-branch)");

        // 타임슬롯 생성
        classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch)
                .name("오전반")
                .daysOfWeek("월,수,금")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 30))
                .build());

        classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch)
                .name("오후반")
                .daysOfWeek("월,수,금")
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(15, 30))
                .build());

        classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch)
                .name("저녁반")
                .daysOfWeek("화,목")
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(20, 30))
                .build());

        log.info("local 타임슬롯 3건 생성 완료 (오전반, 오후반, 저녁반)");

        // 멤버십 상품 생성
        membershipRepository.save(Membership.builder()
                .name("1개월 기본반")
                .duration(30)
                .count(12)
                .price(150000)
                .build());

        membershipRepository.save(Membership.builder()
                .name("3개월 정규반")
                .duration(90)
                .count(36)
                .price(400000)
                .build());

        membershipRepository.save(Membership.builder()
                .name("6개월 집중반")
                .duration(180)
                .count(72)
                .price(700000)
                .build());

        membershipRepository.save(Membership.builder()
                .name("1개월 주말반")
                .duration(30)
                .count(8)
                .price(100000)
                .build());

        log.info("local 멤버십 상품 4건 생성 완료");
    }
}