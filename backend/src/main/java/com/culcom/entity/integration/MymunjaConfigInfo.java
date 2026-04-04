package com.culcom.entity.integration;

import com.culcom.entity.branch.BranchThirdPartyMapping;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mymunja_config_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MymunjaConfigInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapping_id", nullable = false, unique = true)
    private BranchThirdPartyMapping mapping;

    @Column(name = "mymunja_id", nullable = false, length = 200)
    private String mymunjaId;

    @Column(name = "mymunja_password", nullable = false, length = 100)
    private String mymunjaPassword;

    @Column(name = "callback_number", length = 20)
    private String callbackNumber;

    @Column(name = "remaining_count_sms", columnDefinition = "int unsigned default 0")
    @Builder.Default
    private Integer remainingCountSms = 0;

    @Column(name = "remaining_count_lms", columnDefinition = "int unsigned default 0")
    @Builder.Default
    private Integer remainingCountLms = 0;
}
