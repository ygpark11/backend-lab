package com.pstracker.catalog_service.catalog.dto.igdb;

import com.fasterxml.jackson.annotation.JsonProperty;

public record IgdbAuthResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("expires_in") Long expiresIn,
        @JsonProperty("token_type") String tokenType
) {}
