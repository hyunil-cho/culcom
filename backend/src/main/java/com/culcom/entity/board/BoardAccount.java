package com.culcom.entity.board;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.customer.Customer;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "board_accounts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_board_accounts_email", columnNames = "email")
        })
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BoardAccount extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(name = "password_hash", length = 200)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "login_type", nullable = false, length = 20)
    private BoardLoginType loginType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_seq")
    private Customer customer;
}
