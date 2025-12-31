package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Entity
@Table(name = "game_genres")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameGenre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id")
    private Genre genre;

    // 생성자 (연결 생성)
    public GameGenre(Game game, Genre genre) {
        this.game = game;
        this.genre = genre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GameGenre that)) return false;
        // Game과 Genre가 같으면 같은 매핑으로 간주
        return Objects.equals(game, that.getGame()) &&
                Objects.equals(genre, that.getGenre());
    }

    @Override
    public int hashCode() {
        return Objects.hash(game, genre);
    }
}