package com.pstracker.catalog_service.search;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * DB 커밋 완료 후 비동기로 Meilisearch 문서를 증분 반영한다.
 * 크롤링·관리자 트랜잭션과 Meilisearch I/O를 완전히 분리한다.
 */
@Component
@RequiredArgsConstructor
public class GameSearchSyncListener {

    private final GameSearchIndexService indexService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSyncEvent(GameSearchSyncEvent event) {
        if (event == null || event.gameIds() == null || event.gameIds().isEmpty()) {
            return;
        }
        if (event.action() == GameSearchSyncEvent.Action.DELETE) {
            indexService.deleteByIds(event.gameIds());
        } else {
            indexService.syncByIds(event.gameIds());
        }
    }
}
