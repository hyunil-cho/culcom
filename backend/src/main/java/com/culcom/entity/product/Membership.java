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

    /** 금액이 더 크면 상위 등급. 멤버십 변경 시 업/다운그레이드 판정에 사용. */
    public boolean isHigherGradeThan(Membership other) {
        return this.price > other.price;
    }

}
