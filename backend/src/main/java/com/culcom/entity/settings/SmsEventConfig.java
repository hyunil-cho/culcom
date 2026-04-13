package com.culcom.entity.settings;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sms_event_config",
        uniqueConstraints = @UniqueConstraint(columnNames = {"branch_seq", "event_type"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SmsEventConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private SmsEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_seq", nullable = false)
    private MessageTemplate template;

    @Column(name = "sender_number", nullable = false, length = 20)
    private String senderNumber;

    @Column(name = "auto_send", nullable = false)
    @Builder.Default
    private Boolean autoSend = true;
}
