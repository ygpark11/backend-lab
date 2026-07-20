package com.pstracker.catalog_service.member.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_filter_presets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserFilterPreset extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "filters_json", nullable = false, columnDefinition = "JSON")
    private String filtersJson;

    public static UserFilterPreset create(Member member, String name, String filtersJson) {
        UserFilterPreset preset = new UserFilterPreset();
        preset.member = member;
        preset.name = name;
        preset.filtersJson = filtersJson;
        return preset;
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void updateFilters(String filtersJson) {
        this.filtersJson = filtersJson;
    }
}
