package com.culcom.entity.reservation;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.message.MessageTemplate;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservation_sms_config")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReservationSmsConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false, unique = true)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_seq", nullable = false)
    private MessageTemplate template;

    @Column(name = "sender_number", nullable = false, length = 20)
    private String senderNumber;

    @Column(name = "auto_send", nullable = false)
    @Builder.Default
    private Boolean autoSend = false;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "lastUpdateDate")
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
