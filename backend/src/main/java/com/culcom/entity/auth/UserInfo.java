package com.culcom.entity.auth;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserInfo extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserInfo createdBy;

    @Column(name = "user_id", nullable = false, unique = true, length = 100)
    private String userId;

    @Column(name = "user_password", nullable = false, length = 200)
    private String userPassword;

    @Column(name = "name", length = 50)
    private String name;

    @Column(name = "phone", length = 20)
    private String phone;

    public boolean isManager() {
        return this.role.equals(UserRole.BRANCH_MANAGER);
    }
}
