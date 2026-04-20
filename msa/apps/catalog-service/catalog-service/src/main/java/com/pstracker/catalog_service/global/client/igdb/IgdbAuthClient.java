package com.pstracker.catalog_service.global.client.igdb;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbAuthResponse;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange
public interface IgdbAuthClient {

    @PostExchange
    IgdbAuthResponse getAccessToken(
            @RequestParam("client_id") String clientId,
            @RequestParam("client_secret") String clientSecret,
            @RequestParam("grant_type") String grantType
    );
}
