package com.pstracker.catalog_service.global.client.collector;

import com.pstracker.catalog_service.global.client.collector.dto.CrawlTriggerRequest;
import com.pstracker.catalog_service.global.client.collector.dto.ScrapingQueueRequest;
import com.pstracker.catalog_service.global.client.collector.dto.SingleCrawlRequest;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange
public interface CollectorApiClient {

    @PostExchange("/run")
    String triggerBatchCrawl(@RequestBody CrawlTriggerRequest request);

    @PostExchange("/run-ranking")
    String triggerRankingCrawl(@RequestBody CrawlTriggerRequest request);

    @PostExchange("/crawl/single")
    String triggerSingleCrawl(@RequestBody SingleCrawlRequest request);

    @PostExchange("/api/crawler/trigger")
    String triggerScrapingQueue(@RequestBody ScrapingQueueRequest request);
}
