package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameGenreResult;

import java.util.List;

public interface GameGenreRepositoryCustom {
    List<GameGenreResult> findGameGenres(List<Long> genreIds);
}
