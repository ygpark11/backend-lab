package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameGenreResult;
import com.pstracker.catalog_service.catalog.dto.QGameGenreResult;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

import java.util.List;

import static com.pstracker.catalog_service.catalog.domain.QGameGenre.gameGenre;
import static com.pstracker.catalog_service.catalog.domain.QGenre.genre;

@RequiredArgsConstructor
public class GameGenreRepositoryCustomImpl implements GameGenreRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<GameGenreResult> findGameGenres(List<Long> gameIds) {
        return queryFactory
                .select(new QGameGenreResult(
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
