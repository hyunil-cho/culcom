package com.culcom.entity.product;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "memberships")
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

}
