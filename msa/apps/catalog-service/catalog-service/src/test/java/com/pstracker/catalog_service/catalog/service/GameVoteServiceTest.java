package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GameVote;
import com.pstracker.catalog_service.catalog.domain.VoteType;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.GameVoteRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameVoteServiceTest {

    @Autowired
    private GameVoteService gameVoteService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GameVoteRepository gameVoteRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private IgdbApiClient igdbApiClient;

    @MockitoBean
    private AiService aiService;

    private Long gameId;

    @BeforeEach
    void setUp() {
        Game game = Game.create(
                "VOTE-TEST-001", "Vote Test Game", "Vote Test Game",
                "Publisher", "http://img.com", "Description",
                LocalDate.of(2024, 1, 1)
        );
        game.updatePriceSearchInfo(60000, 60000, 0, false, null, false);
        gameRepository.save(game);
        em.flush();
        em.clear();

        gameId = gameRepository.findByPsStoreId("VOTE-TEST-001").orElseThrow().getId();
    }

    @Test
    @DisplayName("최초 투표 시 GameVote의 createdAt, updatedAt이 설정되어야 한다.")
    void toggleVote_newVote_shouldSetTimestamps() {
        // when
        gameVoteService.toggleVote(gameId, 1L, VoteType.LIKE);
        em.flush();
        em.clear();

        // then
        GameVote vote = gameVoteRepository.findByMemberIdAndGameId(1L, gameId).orElseThrow();
        assertThat(vote.getCreatedAt()).isNotNull();
        assertThat(vote.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("투표 변경(LIKE → DISLIKE) 시 GameVote의 updatedAt이 갱신되어야 한다.")
    void toggleVote_changeVote_shouldUpdateUpdatedAt() throws InterruptedException {
        // given
        gameVoteService.toggleVote(gameId, 2L, VoteType.LIKE);
        em.flush();
        em.clear();

        LocalDateTime firstUpdatedAt = gameVoteRepository.findByMemberIdAndGameId(2L, gameId)
                .orElseThrow().getUpdatedAt();
        Thread.sleep(10);

        // when (LIKE → DISLIKE 로 변경)
        gameVoteService.toggleVote(gameId, 2L, VoteType.DISLIKE);
        em.flush();
        em.clear();

        // then
        GameVote vote = gameVoteRepository.findByMemberIdAndGameId(2L, gameId).orElseThrow();
        assertThat(vote.getUpdatedAt()).isAfterOrEqualTo(firstUpdatedAt);
    }
}
