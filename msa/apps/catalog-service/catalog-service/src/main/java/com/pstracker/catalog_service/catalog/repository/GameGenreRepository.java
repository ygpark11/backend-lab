package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.GameGenre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GameGenreRepository extends JpaRepository<GameGenre, Long>, GameGenreRepositoryCustom {

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM GameGenre gg WHERE gg.game.id IN :gameIds")
    void deleteByGameIds(@Param("gameIds") List<Long> gameIds);
}
