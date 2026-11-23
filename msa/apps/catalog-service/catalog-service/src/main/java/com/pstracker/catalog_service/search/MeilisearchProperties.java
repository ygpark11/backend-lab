package com.pstracker.catalog_service.search;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "meilisearch")
public class MeilisearchProperties {

    private boolean enabled = false;
    private String url = "http://meilisearch:7700";
    private String masterKey = "";
    private String indexName = "games";
    private int searchConnectTimeoutMs = 200;
    private int searchReadTimeoutMs = 400;
    private int syncConnectTimeoutMs = 2000;
    private int syncReadTimeoutMs = 15000;
    private int maxSearchLimit = 500;
}
