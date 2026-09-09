package com.pstracker.catalog_service.arcade.service;

import com.pstracker.catalog_service.arcade.domain.ArcadeGameType;
import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import com.pstracker.catalog_service.arcade.dto.LeaderboardEntryDto;
import com.pstracker.catalog_service.arcade.dto.LeaderboardResponse;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitRequest;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitResponse;
import com.pstracker.catalog_service.arcade.repository.ArcadeRecordRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArcadeService {

    private final ArcadeRecordRepository arcadeRecordRepository;
    private final MemberRepository memberRepository;

    /**
     * 점수 등록 (회원 전용)
     * 기존 최고 기록보다 우수할 경우에만 갱신
     */
    @Transactional
    public ScoreSubmitResponse submitScore(Long memberId, String gameTypeCode, ScoreSubmitRequest request) {
        ArcadeGameType gameType = ArcadeGameType.fromCode(gameTypeCode);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id=" + memberId));

        int newScore = request.getScore();
        int newClearTime = request.getClearTimeSec();

        Optional<ArcadeRecord> recordOpt = arcadeRecordRepository.findByMemberIdAndGameType(memberId, gameType);

        ArcadeRecord record;
        boolean isNewHighScore;

        if (recordOpt.isEmpty()) {
            record = ArcadeRecord.builder()
                    .member(member)
                    .gameType(gameType)
                    .score(newScore)
                    .clearTimeSec(newClearTime)
                    .build();
            record = arcadeRecordRepository.save(record);
            isNewHighScore = true;
            log.info("새로운 아케이드 기록 생성: member={}, game={}, score={}", member.getNickname(), gameType, newScore);
        } else {
            record = recordOpt.get();
            isNewHighScore = record.updateIfBetter(newScore, newClearTime);
            if (isNewHighScore) {
                log.info("아케이드 신기록 갱신: member={}, game={}, score={}", member.getNickname(), gameType, newScore);
            }
        }

        long rank = arcadeRecordRepository.calculateRank(
                gameType,
                record.getScore(),
                record.getClearTimeSec(),
                record.getId()
        );

        return ScoreSubmitResponse.builder()
                .success(true)
                .isNewHighScore(isNewHighScore)
                .rank(rank)
                .score(record.getScore())
                .message(isNewHighScore ? "최고 기록이 경신되었습니다!" : "기록이 등록되었습니다.")
                .build();
    }

    /**
     * 리더보드 TOP 10 및 (로그인 시) 내 순위 조회
     */
    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(String gameTypeCode, Long currentMemberId) {
        ArcadeGameType gameType = ArcadeGameType.fromCode(gameTypeCode);

        // TOP 10 조회
        List<ArcadeRecord> topRecords = arcadeRecordRepository.findTopRanksByGameType(gameType, PageRequest.of(0, 10));

        List<LeaderboardEntryDto> topList = new ArrayList<>(topRecords.size());
        for (int i = 0; i < topRecords.size(); i++) {
            topList.add(LeaderboardEntryDto.from(topRecords.get(i), i + 1));
        }

        // 로그인된 경우 내 순위 확인
        LeaderboardEntryDto myRank = null;
        if (currentMemberId != null) {
            Optional<ArcadeRecord> myRecordOpt = arcadeRecordRepository.findByMemberIdAndGameType(currentMemberId, gameType);

            if (myRecordOpt.isPresent()) {
                ArcadeRecord myRecord = myRecordOpt.get();
                // TOP 10 목록에 포함되어 있는지 확인
                long rank = 0;
                for (int i = 0; i < topRecords.size(); i++) {
                    if (topRecords.get(i).getId().equals(myRecord.getId())) {
                        rank = i + 1;
                        break;
                    }
                }
                // TOP 10 밖이면 랭크 계산
                if (rank == 0) {
                    rank = arcadeRecordRepository.calculateRank(
                            gameType,
                            myRecord.getScore(),
                            myRecord.getClearTimeSec(),
                            myRecord.getId()
                    );
                }
                myRank = LeaderboardEntryDto.from(myRecord, rank);
            } else {
                // 기록이 없는 경우
                Member member = memberRepository.findById(currentMemberId).orElse(null);
                myRank = LeaderboardEntryDto.builder()
                        .rank(0)
                        .username(member != null ? member.getNickname() : "플레이어")
                        .score(0)
                        .build();
            }
        }

        return LeaderboardResponse.builder()
                .gameType(gameType.getCode())
                .topList(topList)
                .myRank(myRank)
                .build();
    }
}
