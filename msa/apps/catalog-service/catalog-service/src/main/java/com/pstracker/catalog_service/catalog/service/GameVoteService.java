package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GameVote;
import com.pstracker.catalog_service.catalog.domain.VoteType;
import com.pstracker.catalog_service.catalog.dto.GameVoteResponse;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.GameVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameVoteService {

    private final GameRepository gameRepository;
    private final GameVoteRepository gameVoteRepository;
    private final GameReadService gameReadService;

    @Transactional
    public GameVoteResponse toggleVote(Long gameId, Long memberId, VoteType requestedVoteType) {
        if(memberId == null) {
            throw new IllegalArgumentException("회원 ID는 필수입니다.");
        }

        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("게임을 찾을 수 없습니다."));

        Optional<GameVote> existingVoteOpt = gameVoteRepository.findByMemberIdAndGameId(memberId, gameId);
        VoteType finalUserVote = null;

        if (existingVoteOpt.isPresent()) {
            GameVote existingVote = existingVoteOpt.get();

            if (existingVote.getVoteType() == requestedVoteType) {
                // 동일한 버튼을 다시 누름 -> 투표 기록 삭제 (취소)
                gameVoteRepository.deleteByMemberIdAndGameId(memberId, gameId);
                switch (requestedVoteType) {
                    case LIKE    -> gameRepository.decrementLikeCount(gameId);
                    case DISLIKE -> gameRepository.decrementDislikeCount(gameId);
                }
            } else {
                // 반대 버튼을 누름 -> 기존 상태 변경
                gameVoteRepository.updateVoteType(memberId, gameId, requestedVoteType);
                switch (requestedVoteType) {
                    case LIKE    -> { gameRepository.decrementDislikeCount(gameId); gameRepository.incrementLikeCount(gameId); }
                    case DISLIKE -> { gameRepository.decrementLikeCount(gameId);    gameRepository.incrementDislikeCount(gameId); }
                }
                finalUserVote = requestedVoteType;
            }
        } else {
            // 투표 기록이 없음 -> 새로 생성
            GameVote newVote = GameVote.create(memberId, game, requestedVoteType);
            gameVoteRepository.save(newVote);

            switch (requestedVoteType) {
                case LIKE    -> gameRepository.incrementLikeCount(gameId);
                case DISLIKE -> gameRepository.incrementDislikeCount(gameId);
            }
            finalUserVote = requestedVoteType;
        }

        // likeCount/dislikeCount가 캐시에 포함되어 있으므로 투표 변경 후 무효화
        gameReadService.evictGameDetailCache(gameId);

        // clearAutomatically = true 로 PC 초기화됐으므로 DB에서 최신 카운트 재조회
        Game updatedGame = gameRepository.findById(gameId).orElseThrow();
        return new GameVoteResponse(updatedGame.getLikeCount(), updatedGame.getDislikeCount(), finalUserVote);
    }
}
