package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.GameGenre;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameGenreRepository extends JpaRepository<GameGenre, Long>, GameGenreRepositoryCustom {
}
