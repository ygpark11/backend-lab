package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameGenreResultDto;
import com.pstracker.catalog_service.catalog.dto.QGameGenreResultDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGameGenre.gameGenre;
import static com.pstracker.catalog_service.catalog.domain.QGenre.genre;

@RequiredArgsConstructor
public class GameGenreRepositoryCustomImpl implements GameGenreRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<GameGenreResultDto> findGameGenres(List<Long> gameIds) {
        return queryFactory
                .select(new QGameGenreResultDto(
                        gameGenre.game.id,
                        genre.name
                ))
                .from(gameGenre)
                .join(gameGenre.genre, genre)
                .where(
                        gameGenre.game.id.in(gameIds)
                )
                .fetch();
    }
}
