package com.culcom.service;

import com.culcom.dto.branch.BranchCreateRequest;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * BranchService.create 통합 테스트.
 *
 * 컨트롤러 레벨(@WebMvcTest) 테스트만 있고 서비스 통합 테스트가 없어
 * 실제 DB 저장 경로의 회귀가 잡히지 않던 갭을 메운다.
 *
 * 검증 범위:
 *  1) 정상 저장 + 모든 필드 + createdBy(생성자 매니저) 매핑
 *  2) branchName unique 충돌 → DataIntegrityViolationException
 *  3) alias unique 충돌 → DataIntegrityViolationException
 *  4) 존재하지 않는 userSeq → EntityNotFoundException("사용자")
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BranchServiceCreateTest {

    @Autowired BranchService branchService;
    @Autowired BranchRepository branchRepository;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @PersistenceContext EntityManager entityManager;

    private UserInfo newManager() {
        return userInfoRepository.save(UserInfo.builder()
                .userId("mgr-" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .role(UserRole.BRANCH_MANAGER)
                .requirePasswordChange(false)
                .build());
    }

    private BranchCreateRequest req(String name, String alias, String manager,
                                    String address, String directions) {
        BranchCreateRequest r = new BranchCreateRequest();
        r.setBranchName(name);
        r.setAlias(alias);
        r.setBranchManager(manager);
        r.setAddress(address);
        r.setDirections(directions);
        return r;
    }

    @Test
    void 정상_저장_시_모든_필드와_createdBy가_매핑된다() {
        UserInfo manager = newManager();
        String unique = String.valueOf(System.nanoTime());

        BranchDetailResponse resp = branchService.create(
                req("강남점-" + unique, "gangnam-" + unique,
                        "김매니저", "서울시 강남구", "2번 출구"),
                manager.getSeq());

        assertThat(resp.getSeq()).isNotNull();

        Branch saved = branchRepository.findById(resp.getSeq()).orElseThrow();
        assertThat(saved.getBranchName()).isEqualTo("강남점-" + unique);
        assertThat(saved.getAlias()).isEqualTo("gangnam-" + unique);
        assertThat(saved.getBranchManager()).isEqualTo("김매니저");
        assertThat(saved.getAddress()).isEqualTo("서울시 강남구");
        assertThat(saved.getDirections()).isEqualTo("2번 출구");
        assertThat(saved.getCreatedBy())
                .as("생성자(현재 로그인 사용자)가 createdBy 로 매핑되어야 한다")
                .isNotNull();
        assertThat(saved.getCreatedBy().getSeq()).isEqualTo(manager.getSeq());
    }

    @Test
    void branchName이_중복이면_DataIntegrityViolationException() {
        UserInfo manager = newManager();
        String unique = String.valueOf(System.nanoTime());
        String dupName = "중복지점-" + unique;

        // 선행 저장 — flush 로 INSERT 강제
        branchRepository.save(Branch.builder()
                .branchName(dupName)
                .alias("first-" + unique)
                .createdBy(manager)
                .build());
        entityManager.flush();

        // 같은 branchName, 다른 alias 로 시도
        BranchCreateRequest req = req(dupName, "second-" + unique, null, null, null);

        assertThatThrownBy(() -> {
            branchService.create(req, manager.getSeq());
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void alias가_중복이면_DataIntegrityViolationException() {
        UserInfo manager = newManager();
        String unique = String.valueOf(System.nanoTime());
        String dupAlias = "dup-alias-" + unique;

        branchRepository.save(Branch.builder()
                .branchName("first-name-" + unique)
                .alias(dupAlias)
                .createdBy(manager)
                .build());
        entityManager.flush();

        BranchCreateRequest req = req("second-name-" + unique, dupAlias, null, null, null);

        assertThatThrownBy(() -> {
            branchService.create(req, manager.getSeq());
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void 존재하지_않는_userSeq면_EntityNotFoundException() {
        long nonExistentUserSeq = 999_999_999L;
        BranchCreateRequest req = req(
                "잘못된요청-" + System.nanoTime(),
                "bad-" + System.nanoTime(),
                null, null, null);

        assertThatThrownBy(() -> branchService.create(req, nonExistentUserSeq))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("사용자");
    }
}
