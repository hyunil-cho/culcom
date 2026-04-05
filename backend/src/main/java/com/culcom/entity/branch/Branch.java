package com.culcom.entity.branch;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.auth.UserInfo;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branches")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Branch extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "branchName", nullable = false, length = 50)
    private String branchName;

    @Column(nullable = false, length = 50, unique = true)
    private String alias;

    @Column(name = "branch_manager", length = 50)
    private String branchManager;

    @Column(length = 200)
    private String address;

    @Column(columnDefinition = "text")
    private String directions;

    @JoinColumn(name = "created_by")
    @ManyToOne
    private UserInfo createdBy;

}
