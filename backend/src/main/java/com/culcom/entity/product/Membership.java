package com.culcom.entity.product;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "memberships", uniqueConstraints = {
        @UniqueConstraint(name = "uk_name_delete", columnNames = {"name","deleted"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Membership extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer duration;

    @Column(nullable = false)
    private Integer count;

    @Column(nullable = false)
    private Integer price;

    private boolean isInternal = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean transferable = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    /**
     * 금액이 더 크면 상위 등급. 멤버십 변경 시 업/다운그레이드 판정에 사용.
     * <p>주의: {@code other}는 보통 {@code ComplexMemberMembership#getMembership()}을 통해 들어오는
     * Hibernate LAZY 프록시다. 필드 직접 접근({@code other.price})은 프록시를 초기화하지 않아 null로 읽히므로
     * 반드시 getter({@code other.getPrice()})로 호출해야 한다.
     */
    public boolean isHigherGradeThan(Membership other) {
        return this.getPrice() > other.getPrice();
    }

}
