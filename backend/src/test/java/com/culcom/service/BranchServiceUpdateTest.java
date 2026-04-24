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
 * BranchService.update 통합 테스트.
 *
 * 검증 범위:
 *  1) 정상 수정 — 모든 필드가 새 값으로 갱신
 *  2) 수정 시 createdBy(생성자) 는 보존 (update 는 createdBy 를 변경하지 않아야 함)
 *  3) 존재하지 않는 seq → EntityNotFoundException("지점")
 *  4) branchName 이 다른 지점과 충돌 → DataIntegrityViolationException
 *  5) alias 가 다른 지점과 충돌 → DataIntegrityViolationException
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BranchServiceUpdateTest {

    @Autowired BranchService branchService;
    @Autowired BranchRepository branchRepository;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @PersistenceContext EntityManager entityManager;

    private UserInfo newManager(String prefix) {
        return userInfoRepository.save(UserInfo.builder()
                .userId(prefix + "-" + System.nanoTime())
                .userPassword(passwordEncoder.encode("pw"))
                .role(UserRole.BRANCH_MANAGER)
                .requirePasswordChange(false)
                .build());
    }

    private Branch insertBranch(String name, String alias, UserInfo createdBy) {
        Branch saved = branchRepository.save(Branch.builder()
                .branchName(name).alias(alias).createdBy(createdBy).build());
        entityManager.flush();
        return saved;
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
    void 정상_수정_시_모든_필드가_새_값으로_갱신된다() {
        UserInfo creator = newManager("creator");
        String unique = String.valueOf(System.nanoTime());
        Branch original = insertBranch("원래이름-" + unique, "orig-" + unique, creator);
        original.setBranchManager("원래매니저");
        original.setAddress("원래주소");
        original.setDirections("원래경로");
        branchRepository.save(original);
        entityManager.flush();

        BranchDetailResponse resp = branchService.update(original.getSeq(), req(
                "수정이름-" + unique, "updated-" + unique,
                "신규매니저", "신규주소", "신규경로"));

        assertThat(resp.getSeq()).isEqualTo(original.getSeq());

        Branch reloaded = branchRepository.findById(original.getSeq()).orElseThrow();
        assertThat(reloaded.getBranchName()).isEqualTo("수정이름-" + unique);
        assertThat(reloaded.getAlias()).isEqualTo("updated-" + unique);
        assertThat(reloaded.getBranchManager()).isEqualTo("신규매니저");
        assertThat(reloaded.getAddress()).isEqualTo("신규주소");
        assertThat(reloaded.getDirections()).isEqualTo("신규경로");
    }

    @Test
    void 수정해도_createdBy는_보존된다() {
        UserInfo creator = newManager("creator");
        String unique = String.valueOf(System.nanoTime());
        Branch original = insertBranch("이름-" + unique, "alias-" + unique, creator);

        branchService.update(original.getSeq(), req(
                "변경-" + unique, "changed-" + unique, null, null, null));

        Branch reloaded = branchRepository.findById(original.getSeq()).orElseThrow();
        assertThat(reloaded.getCreatedBy())
                .as("update 는 createdBy(생성자) 를 변경해서는 안 된다")
                .isNotNull();
        assertThat(reloaded.getCreatedBy().getSeq()).isEqualTo(creator.getSeq());
    }

    @Test
    void 존재하지_않는_seq면_EntityNotFoundException() {
        long nonExistentSeq = 999_999_999L;

        assertThatThrownBy(() -> branchService.update(nonExistentSeq, req(
                "x-" + System.nanoTime(), "x-" + System.nanoTime(), null, null, null)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("지점");
    }

    @Test
    void branchName이_다른_지점과_충돌하면_DataIntegrityViolationException() {
        UserInfo creator = newManager("creator");
        String unique = String.valueOf(System.nanoTime());
        Branch other = insertBranch("선점이름-" + unique, "other-" + unique, creator);
        Branch target = insertBranch("타겟이름-" + unique, "target-" + unique, creator);

        // target 을 other 와 같은 branchName 으로 변경 시도.
        // UPDATE 는 flush 시점에야 실행되며, Spring 의 예외 번역을 받기 위해
        // EntityManager 가 아닌 Repository.flush() 를 사용해야 한다.
        assertThatThrownBy(() -> {
            branchService.update(target.getSeq(), req(
                    other.getBranchName(), target.getAlias(), null, null, null));
            branchRepository.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void alias가_다른_지점과_충돌하면_DataIntegrityViolationException() {
        UserInfo creator = newManager("creator");
        String unique = String.valueOf(System.nanoTime());
        Branch other = insertBranch("선점이름-" + unique, "other-" + unique, creator);
        Branch target = insertBranch("타겟이름-" + unique, "target-" + unique, creator);

        assertThatThrownBy(() -> {
            branchService.update(target.getSeq(), req(
                    target.getBranchName(), other.getAlias(), null, null, null));
            branchRepository.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }
}
