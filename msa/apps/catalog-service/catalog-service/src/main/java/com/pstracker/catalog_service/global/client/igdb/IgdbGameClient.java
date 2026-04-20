package com.pstracker.catalog_service.global.client.igdb;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

import java.util.List;

@HttpExchange
public interface IgdbGameClient {

    @PostExchange(value = "/games", contentType = "text/plain")
    List<IgdbGameResponse> search(
            @RequestHeader("Client-ID") String clientId,
            @RequestHeader("Authorization") String authorization,
            @RequestBody String query
    );
}
