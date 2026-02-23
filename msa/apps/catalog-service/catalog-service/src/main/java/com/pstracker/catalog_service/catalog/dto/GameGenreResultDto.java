package com.pstracker.catalog_service.catalog.dto;

import com.querydsl.core.annotations.QueryProjection;
import lombok.Data;

import java.io.Serializable;

@Data
public class GameGenreResultDto implements Serializable {
    private Long gameId;
    private String genreName;

    @QueryProjection
    public GameGenreResultDto(Long gameId, String genreName) {
        this.gameId = gameId;
        this.genreName = genreName;
    }
}
