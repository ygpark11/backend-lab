package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Entity
@Table(name = "genres")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Genre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    public Genre(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;

        // 프록시 객체도 Genre 타입으로 인정하기 위해 instanceof 사용
        if (!(o instanceof Genre genre)) return false;

        return Objects.equals(this.getName(), genre.getName());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getName());
    }
}