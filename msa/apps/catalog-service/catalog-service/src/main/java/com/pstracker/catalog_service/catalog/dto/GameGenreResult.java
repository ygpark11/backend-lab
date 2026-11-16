package com.pstracker.catalog_service.catalog.dto;

import com.querydsl.core.annotations.QueryProjection;

import java.io.Serializable;

public record GameGenreResult(
        Long gameId,
        String genreName
) implements Serializable {
    @QueryProjection
    public GameGenreResult {
    }
}
