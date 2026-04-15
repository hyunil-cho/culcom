package com.culcom.service;

import com.culcom.dto.complex.member.CardPaymentDetailDto;
import com.culcom.dto.complex.member.ComplexMemberMembershipRequest;
import com.culcom.dto.complex.member.MembershipPaymentRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 카드 결제 시 카드 상세 정보(카드사/카드번호/승인날짜/승인번호) 필수 검증 테스트.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CardPaymentDetailValidationTest {

    @Autowired MemberMembershipService memberMembershipService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private ComplexMember member;
    private Membership product;

    @BeforeEach
    void setUp() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("card-test-" + System.nanoTime())
                .build());
        product = membershipRepository.save(Membership.builder()
                .name("테스트멤버십").duration(30).count(10).price(100000).build());
        member = memberRepository.save(ComplexMember.builder()
                .branch(branch).name("홍길동").phoneNumber("01012345678").build());
    }

    private CardPaymentDetailDto validCardDetail() {
        return CardPaymentDetailDto.builder()
                .cardCompany("삼성")
                .cardNumber("12345678")
                .cardApprovalDate(LocalDate.of(2026, 1, 1))
                .cardApprovalNumber("A12345")
                .build();
    }

    private ComplexMemberMembershipRequest buildAssignRequest(String paymentMethod, CardPaymentDetailDto cardDetail) {
        ComplexMemberMembershipRequest req = new ComplexMemberMembershipRequest();
        ReflectionTestUtils.setField(req, "membershipSeq", product.getSeq());
        ReflectionTestUtils.setField(req, "price", "100000");
        ReflectionTestUtils.setField(req, "depositAmount", "50000");
        ReflectionTestUtils.setField(req, "paymentMethod", paymentMethod);
        ReflectionTestUtils.setField(req, "paymentDate", LocalDateTime.now());
        ReflectionTestUtils.setField(req, "status", MembershipStatus.활성);
        ReflectionTestUtils.setField(req, "cardDetail", cardDetail);
        return req;
    }

    // ── assignMembership 검증 ──

    @Nested
    class AssignMembership {

        @Test
        void 카드_결제_상세정보_모두_입력하면_성공() {
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", validCardDetail());
            assertThatCode(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .doesNotThrowAnyException();
        }

        @Test
        void 카드_결제인데_상세정보_null이면_실패() {
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", null);
            assertThatThrownBy(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카드 상세 정보는 필수");
        }

        @Test
        void 카드_결제인데_카드사_누락이면_실패() {
            CardPaymentDetailDto card = CardPaymentDetailDto.builder()
                    .cardCompany("").cardNumber("12345678")
                    .cardApprovalDate(LocalDate.of(2026, 1, 1)).cardApprovalNumber("A12345").build();
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", card);
            assertThatThrownBy(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카드사");
        }

        @Test
        void 카드_결제인데_카드번호_8자리_미만이면_실패() {
            CardPaymentDetailDto card = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("1234")
                    .cardApprovalDate(LocalDate.of(2026, 1, 1)).cardApprovalNumber("A12345").build();
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", card);
            assertThatThrownBy(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카드번호");
        }

        @Test
        void 카드_결제인데_승인날짜_누락이면_실패() {
            CardPaymentDetailDto card = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("12345678")
                    .cardApprovalDate(null).cardApprovalNumber("A12345").build();
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", card);
            assertThatThrownBy(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("승인 날짜");
        }

        @Test
        void 카드_결제인데_승인번호_누락이면_실패() {
            CardPaymentDetailDto card = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("12345678")
                    .cardApprovalDate(LocalDate.of(2026, 1, 1)).cardApprovalNumber("").build();
            ComplexMemberMembershipRequest req = buildAssignRequest("카드", card);
            assertThatThrownBy(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("승인번호");
        }

        @Test
        void 카드_외_결제방법은_상세정보_없어도_성공() {
            ComplexMemberMembershipRequest req = buildAssignRequest("현금", null);
            assertThatCode(() -> memberMembershipService.assignMembership(member.getSeq(), req))
                    .doesNotThrowAnyException();
        }
    }

    // ── addPayment 검증 ──

    @Nested
    class AddPayment {

        private Long mmSeq;

        @BeforeEach
        void assignMembership() {
            ComplexMemberMembershipRequest req = buildAssignRequest("현금", null);
            // 가격을 넉넉하게 설정
            ReflectionTestUtils.setField(req, "price", "1000000");
            ReflectionTestUtils.setField(req, "depositAmount", "100000");
            var resp = memberMembershipService.assignMembership(member.getSeq(), req);
            mmSeq = resp.getSeq();
        }

        private MembershipPaymentRequest buildPaymentRequest(String method, CardPaymentDetailDto cardDetail) {
            MembershipPaymentRequest req = new MembershipPaymentRequest();
            ReflectionTestUtils.setField(req, "amount", 50000L);
            ReflectionTestUtils.setField(req, "kind", PaymentKind.BALANCE);
            ReflectionTestUtils.setField(req, "method", method);
            ReflectionTestUtils.setField(req, "paidDate", LocalDateTime.now());
            ReflectionTestUtils.setField(req, "cardDetail", cardDetail);
            return req;
        }

        @Test
        void 카드_납부_상세정보_모두_입력하면_성공() {
            MembershipPaymentRequest req = buildPaymentRequest("카드", validCardDetail());
            assertThatCode(() -> memberMembershipService.addPayment(member.getSeq(), mmSeq, req))
                    .doesNotThrowAnyException();
        }

        @Test
        void 카드_납부인데_상세정보_null이면_실패() {
            MembershipPaymentRequest req = buildPaymentRequest("카드", null);
            assertThatThrownBy(() -> memberMembershipService.addPayment(member.getSeq(), mmSeq, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카드 상세 정보는 필수");
        }

        @Test
        void 카드_납부인데_카드사_누락이면_실패() {
            CardPaymentDetailDto card = CardPaymentDetailDto.builder()
                    .cardCompany("").cardNumber("12345678")
                    .cardApprovalDate(LocalDate.of(2026, 1, 1)).cardApprovalNumber("A12345").build();
            MembershipPaymentRequest req = buildPaymentRequest("카드", card);
            assertThatThrownBy(() -> memberMembershipService.addPayment(member.getSeq(), mmSeq, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("카드사");
        }

        @Test
        void 카드_외_납부는_상세정보_없어도_성공() {
            MembershipPaymentRequest req = buildPaymentRequest("현금", null);
            assertThatCode(() -> memberMembershipService.addPayment(member.getSeq(), mmSeq, req))
                    .doesNotThrowAnyException();
        }
    }

    // ── CardPaymentDetailDto.validate() 단위 테스트 ──

    @Nested
    class DtoValidation {

        @Test
        void 유효한_상세정보는_예외_없음() {
            assertThatCode(() -> validCardDetail().validate()).doesNotThrowAnyException();
        }

        @Test
        void 카드사_null이면_실패() {
            CardPaymentDetailDto dto = CardPaymentDetailDto.builder()
                    .cardCompany(null).cardNumber("12345678")
                    .cardApprovalDate(LocalDate.now()).cardApprovalNumber("A1").build();
            assertThatThrownBy(dto::validate).hasMessageContaining("카드사");
        }

        @Test
        void 카드번호_숫자가_아니면_실패() {
            CardPaymentDetailDto dto = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("1234ABCD")
                    .cardApprovalDate(LocalDate.now()).cardApprovalNumber("A1").build();
            assertThatThrownBy(dto::validate).hasMessageContaining("카드번호");
        }

        @Test
        void 승인날짜_null이면_실패() {
            CardPaymentDetailDto dto = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("12345678")
                    .cardApprovalDate(null).cardApprovalNumber("A1").build();
            assertThatThrownBy(dto::validate).hasMessageContaining("승인 날짜");
        }

        @Test
        void 승인번호_공백이면_실패() {
            CardPaymentDetailDto dto = CardPaymentDetailDto.builder()
                    .cardCompany("삼성").cardNumber("12345678")
                    .cardApprovalDate(LocalDate.now()).cardApprovalNumber("  ").build();
            assertThatThrownBy(dto::validate).hasMessageContaining("승인번호");
        }
    }
}
