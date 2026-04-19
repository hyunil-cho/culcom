package com.culcom.entity.complex.member.track;

import com.culcom.entity.enums.ActivityFieldType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ChangeDetail {

    @Enumerated(EnumType.STRING)
    @Column(name = "field_name", length = 50)
    private ActivityFieldType fieldName;

    @Column(name = "old_value", length = 500)
    private String oldValue;

    @Column(name = "new_value", length = 500)
    private String newValue;
}
