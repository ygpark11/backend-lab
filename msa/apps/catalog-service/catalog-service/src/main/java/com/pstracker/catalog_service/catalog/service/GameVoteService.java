package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GameVote;
import com.pstracker.catalog_service.catalog.domain.VoteType;
import com.pstracker.catalog_service.catalog.dto.GameVoteResponseDto;
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

    @Transactional
    public GameVoteResponseDto toggleVote(Long gameId, Long memberId, VoteType requestedVoteType) {
        if(memberId == null) {;
            throw new IllegalArgumentException("회원 ID는 필수입니다.");
        }

        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("게임을 찾을 수 없습니다."));

        Optional<GameVote> existingVoteOpt = gameVoteRepository.findByMemberIdAndGameId(memberId, gameId);
        VoteType finalUserVote = null;

        if (existingVoteOpt.isPresent()) {
            GameVote existingVote = existingVoteOpt.get();

            if (existingVote.getVoteType() == requestedVoteType) {
                // 동일한 버튼을 다시 누름 -> 투표 기록 삭제
                gameVoteRepository.delete(existingVote);
                if (requestedVoteType == VoteType.LIKE) {
                    game.removeLike();
                } else {
                    game.removeDislike();
                }
            } else {
                // 반대 버튼을 누름 -> 기존 상태 변경
                existingVote.changeVote(requestedVoteType);
                if (requestedVoteType == VoteType.LIKE) {
                    game.removeDislike(); // 기존 싫어요 취소
                    game.addLike();       // 새로운 좋아요 추가
                } else {
                    game.removeLike();    // 기존 좋아요 취소
                    game.addDislike();    // 새로운 싫어요 추가
                }
                finalUserVote = requestedVoteType;
            }
        } else {
            // 투표 기록이 없음 -> 새로 생성
            GameVote newVote = GameVote.create(memberId, game, requestedVoteType);
            gameVoteRepository.save(newVote);

            if (requestedVoteType == VoteType.LIKE) {
                game.addLike();
            } else {
                game.addDislike();
            }
            finalUserVote = requestedVoteType;
        }

        // 역정규화된 게임 테이블의 카운트 최신 상태와 유저의 최종 상태를 반환
        return new GameVoteResponseDto(game.getLikeCount(), game.getDislikeCount(), finalUserVote);
    }
}
