package com.culcom.entity.auth;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "user_branch",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_branch", columnNames = {"user_seq", "branch_seq"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserBranch extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_seq", nullable = false)
    private UserInfo user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;
}
