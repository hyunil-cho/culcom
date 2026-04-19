package com.culcom.service;

import com.culcom.entity.product.Membership;
import com.culcom.repository.MembershipRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Membership 엔티티의 (name, deleted) 복합 유니크 제약 검증.
 *
 * 기대 동작:
 *   1) (같은 name, deleted=false)가 동시에 둘 이상이면 거부
 *   2) 기존 행을 soft delete(deleted=true) 한 뒤 동일 name으로 새로 만드는 것은 허용
 *      — soft-deleted 행(deleted=true)과 신규 행(deleted=false) 조합이라 (name, deleted) 쌍이 겹치지 않음
 *   3) name이 서로 다르면 deleted 상태가 같아도 공존 가능
 *   4) (같은 name, deleted=true)가 동시에 둘 이상이면 거부
 *      — "삭제된 같은 이름 멤버십"은 한 개만 존재 가능
 *
 * 제약 위반은 DB 플러시 시점에 터지므로 각 테스트는 명시적으로 saveAndFlush를 호출한다.
 * @Transactional로 테스트 간 데이터를 격리한다 (이름 충돌 방지).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MembershipNameUniqueConstraintTest {

    @Autowired MembershipRepository membershipRepository;
    @PersistenceContext EntityManager em;

    private Membership build(String name, boolean deleted) {
        return Membership.builder()
                .name(name)
                .duration(90).count(30).price(300_000)
                .transferable(true)
                .deleted(deleted)
                .build();
    }

    @Test
    void C1_같은_이름의_활성_멤버십을_두_개_만들면_유니크_제약에_걸린다() {
        String name = "uniq-C1-" + System.nanoTime();
        membershipRepository.saveAndFlush(build(name, false));

        // 같은 이름 + deleted=false → (name, deleted) 충돌
        assertThatThrownBy(() -> membershipRepository.saveAndFlush(build(name, false)))
                .as("동일 name으로 활성 멤버십이 두 개 이상 생기는 것은 제약으로 차단되어야 한다")
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void C2_soft_delete된_이름과_동일한_이름의_활성_멤버십은_생성할_수_있다() {
        String name = "uniq-C2-" + System.nanoTime();

        Membership old = membershipRepository.saveAndFlush(build(name, false));
        // 기존 상품 soft delete
        old.setDeleted(true);
        membershipRepository.saveAndFlush(old);

        // (name, deleted=true) 하나 + (name, deleted=false) 하나 → 쌍이 겹치지 않음
        assertThatCode(() -> membershipRepository.saveAndFlush(build(name, false)))
                .as("삭제된 이름 재사용은 허용되어야 한다")
                .doesNotThrowAnyException();

        // sanity: 같은 이름으로 2개 row가 공존 (상태 다름)
        em.clear();
        long total = membershipRepository.findAll().stream()
                .filter(m -> name.equals(m.getName())).count();
        assertThat(total).isEqualTo(2);
    }

    @Test
    void C3_이름이_다르면_deleted가_같아도_공존할_수_있다() {
        long nonce = System.nanoTime();
        assertThatCode(() -> {
            membershipRepository.saveAndFlush(build("uniq-C3-a-" + nonce, false));
            membershipRepository.saveAndFlush(build("uniq-C3-b-" + nonce, false));
        })
                .as("제약은 (name, deleted) 쌍에만 적용 — 이름이 다르면 충돌 없음")
                .doesNotThrowAnyException();
    }

    @Test
    void C4_같은_이름의_삭제된_멤버십이_두_개_이상_되면_제약에_걸린다() {
        // (name, deleted=true) 쌍도 복합 유니크의 일부이므로 2개 이상이 되면 안 된다.
        String name = "uniq-C4-" + System.nanoTime();

        // 첫 번째 상품 생성 후 soft delete → (name, true) 한 개
        Membership first = membershipRepository.saveAndFlush(build(name, false));
        first.setDeleted(true);
        membershipRepository.saveAndFlush(first);

        // 같은 이름으로 새 활성 상품 생성 (여기까지는 C2 시나리오와 동일)
        Membership second = membershipRepository.saveAndFlush(build(name, false));

        // 두 번째도 soft delete 시도 → (name, true) 행이 2개가 되어 충돌
        second.setDeleted(true);
        assertThatThrownBy(() -> membershipRepository.saveAndFlush(second))
                .as("같은 이름으로 soft-deleted 행이 2개 이상 생기는 것은 거부되어야 한다")
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
