package com.culcom.entity.message;

import com.culcom.entity.enums.PlaceholderCategory;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "message_placeholders")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Placeholder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(length = 100)
    private String comment;

    @Column(length = 50)
    private String examples;

    @Column(name = "placeholder_value", length = 100)
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlaceholderCategory category;
}
