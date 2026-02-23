package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameGenreResultDto;

import java.util.List;

public interface GameGenreRepositoryCustom {
    List<GameGenreResultDto> findGameGenres(List<Long> genreIds);
}
