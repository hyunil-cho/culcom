package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "placeholders")
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

    @Column(length = 30)
    private String value;
}
