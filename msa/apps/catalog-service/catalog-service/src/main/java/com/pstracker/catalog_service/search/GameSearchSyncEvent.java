package com.pstracker.catalog_service.search;

import java.util.List;

/**
 * 게임 검색 메타데이터 변경(생성·제목/별칭 수정·삭제) 시 발행되는 동기화 이벤트.
 * DB 트랜잭션 커밋 이후(AFTER_COMMIT) 비동기로 Meilisearch에 반영된다.
 */
public record GameSearchSyncEvent(Action action, List<Long> gameIds) {

    public enum Action {
        UPSERT,
        DELETE
    }

    public static GameSearchSyncEvent upsert(Long gameId) {
        return new GameSearchSyncEvent(Action.UPSERT, List.of(gameId));
    }

    public static GameSearchSyncEvent delete(Long gameId) {
        return new GameSearchSyncEvent(Action.DELETE, List.of(gameId));
    }

    public static GameSearchSyncEvent deleteAll(List<Long> gameIds) {
        return new GameSearchSyncEvent(Action.DELETE, List.copyOf(gameIds));
    }
}
