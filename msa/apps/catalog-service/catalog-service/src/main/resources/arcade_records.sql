-- 아케이드 게임 최고 기록 및 리더보드 테이블 DDL
CREATE TABLE IF NOT EXISTS arcade_records (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '아케이드 기록 고유 식별자',
    member_id       BIGINT          NOT NULL COMMENT '회원 식별자 (members.id FK)',
    game_type       VARCHAR(30)     NOT NULL COMMENT '게임 종류 (SICHUAN, REFLEX 등)',
    score           INT             NOT NULL DEFAULT 0 COMMENT '개인 최고 점수',
    clear_time_sec  INT             NOT NULL DEFAULT 0 COMMENT '클리어 소요 시간(초)',
    created_at      DATETIME(6)     NULL COMMENT '최초 등록 일시',
    updated_at      DATETIME(6)     NULL COMMENT '기록 갱신 일시',

    -- [외래키 제약조건: 회원 삭제 시 관련 기록 일괄 자동 삭제 (CASCADE)]
    CONSTRAINT fk_arcade_records_member
        FOREIGN KEY (member_id) REFERENCES members (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- [복합 유니크 키: 회원 1인당 게임별 단 1개의 최고 기록만 유지]
    CONSTRAINT uq_arcade_member_game
        UNIQUE (member_id, game_type),

    -- [랭킹 집계 최적화 복합 인덱스: TOP 10 및 순위 계산 인덱스 스캔]
    INDEX idx_arcade_rank (game_type, score DESC, clear_time_sec ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아케이드 게임 개인별 최고 기록 및 랭킹';
