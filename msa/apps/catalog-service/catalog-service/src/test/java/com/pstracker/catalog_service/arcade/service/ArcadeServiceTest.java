package com.pstracker.catalog_service.arcade.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.arcade.domain.ArcadeGameType;
import com.pstracker.catalog_service.arcade.domain.ArcadeRecord;
import com.pstracker.catalog_service.arcade.dto.LeaderboardResponse;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitRequest;
import com.pstracker.catalog_service.arcade.dto.ScoreSubmitResponse;
import com.pstracker.catalog_service.arcade.repository.ArcadeRecordRepository;
import com.pstracker.catalog_service.catalog.service.IgdbEnrichmentService;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArcadeServiceTest {

    @Autowired
    private ArcadeService arcadeService;

    @Autowired
    private ArcadeRecordRepository arcadeRecordRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private IgdbEnrichmentService igdbEnrichmentService;

    @MockitoBean
    private AiService aiService;

    private Member member1;
    private Member member2;
    private Member member3;

    @BeforeEach
    void setUp() {
        member1 = Member.builder()
                .email("user1@example.com")
                .password("encoded_pwd")
                .nickname("GamerOne")
                .role(Role.USER)
                .build();
        member2 = Member.builder()
                .email("user2@example.com")
                .password("encoded_pwd")
                .nickname("GamerTwo")
                .role(Role.USER)
                .build();
        member3 = Member.builder()
                .email("user3@example.com")
                .password("encoded_pwd")
                .nickname("GamerThree")
                .role(Role.USER)
                .build();

        memberRepository.save(member1);
        memberRepository.save(member2);
        memberRepository.save(member3);

        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("최초 점수 등록 시 새로운 기록이 생성되고 랭킹 1위여야 한다")
    void submitScore_newRecord() {
        // given
        ScoreSubmitRequest request = ScoreSubmitRequest.builder()
                .score(10000)
                .clearTimeSec(60)
                .build();

        // when
        ScoreSubmitResponse response = arcadeService.submitScore(member1.getId(), "sichuan", request);
        em.flush();
        em.clear();

        // then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.isNewHighScore()).isTrue();
        assertThat(response.getScore()).isEqualTo(10000);
        assertThat(response.getRank()).isEqualTo(1);

        Optional<ArcadeRecord> saved = arcadeRecordRepository.findByMemberIdAndGameType(member1.getId(), ArcadeGameType.SICHUAN);
        assertThat(saved).isPresent();
        assertThat(saved.get().getScore()).isEqualTo(10000);
        assertThat(saved.get().getClearTimeSec()).isEqualTo(60);
    }

    @Test
    @DisplayName("더 높은 점수를 달성하면 최고 기록이 갱신되어야 한다")
    void submitScore_higherScore_updates() {
        // given: 기존 기록 10,000점
        arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(10000)
                .clearTimeSec(80)
                .build());
        em.flush();
        em.clear();

        // when: 14,000점 신기록 달성
        ScoreSubmitResponse response = arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(14000)
                .clearTimeSec(70)
                .build());
        em.flush();
        em.clear();

        // then
        assertThat(response.isNewHighScore()).isTrue();
        assertThat(response.getScore()).isEqualTo(14000);

        ArcadeRecord updated = arcadeRecordRepository.findByMemberIdAndGameType(member1.getId(), ArcadeGameType.SICHUAN).orElseThrow();
        assertThat(updated.getScore()).isEqualTo(14000);
        assertThat(updated.getClearTimeSec()).isEqualTo(70);
    }

    @Test
    @DisplayName("이전 최고 기록보다 낮은 점수일 경우 기존 기록이 유지된다")
    void submitScore_lowerScore_doesNotUpdate() {
        // given: 기존 기록 15,000점
        arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(15000)
                .clearTimeSec(60)
                .build());
        em.flush();
        em.clear();

        // when: 9,000점 기록 제출
        ScoreSubmitResponse response = arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(9000)
                .clearTimeSec(50)
                .build());
        em.flush();
        em.clear();

        // then
        assertThat(response.isNewHighScore()).isFalse();
        assertThat(response.getScore()).isEqualTo(15000); // 여전히 15000점 유지

        ArcadeRecord record = arcadeRecordRepository.findByMemberIdAndGameType(member1.getId(), ArcadeGameType.SICHUAN).orElseThrow();
        assertThat(record.getScore()).isEqualTo(15000);
    }

    @Test
    @DisplayName("점수가 같더라도 클리어 시간이 더 빠르면 갱신된다")
    void submitScore_sameScoreFasterTime_updates() {
        // given: 12,000점 90초
        arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(12000)
                .clearTimeSec(90)
                .build());
        em.flush();
        em.clear();

        // when: 12,000점 65초
        ScoreSubmitResponse response = arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(12000)
                .clearTimeSec(65)
                .build());
        em.flush();
        em.clear();

        // then
        assertThat(response.isNewHighScore()).isTrue();

        ArcadeRecord record = arcadeRecordRepository.findByMemberIdAndGameType(member1.getId(), ArcadeGameType.SICHUAN).orElseThrow();
        assertThat(record.getClearTimeSec()).isEqualTo(65);
    }

    @Test
    @DisplayName("리더보드 조회 시 점수 내림차순 및 클리어 시간 오름차순으로 정렬되며 개인 순위가 계산된다")
    void getLeaderboard_sortingAndRankCalculation() {
        // given
        // member1: 15,000점 (1위 예상)
        arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(15000)
                .clearTimeSec(80)
                .build());

        // member2: 12,000점 (클리어 타임 70초) -> 2위
        arcadeService.submitScore(member2.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(12000)
                .clearTimeSec(70)
                .build());

        // member3: 12,000점 (클리어 타임 90초) -> 3위 (시간 차이)
        arcadeService.submitScore(member3.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(12000)
                .clearTimeSec(90)
                .build());

        em.flush();
        em.clear();

        // when (member2가 조회 시)
        LeaderboardResponse response = arcadeService.getLeaderboard("sichuan", member2.getId());

        // then
        assertThat(response.getGameType()).isEqualTo("sichuan");
        assertThat(response.getTopList()).hasSize(3);

        // 1위 확인
        assertThat(response.getTopList().get(0).getRank()).isEqualTo(1);
        assertThat(response.getTopList().get(0).getUsername()).isEqualTo("GamerOne");
        assertThat(response.getTopList().get(0).getScore()).isEqualTo(15000);

        // 2위 확인
        assertThat(response.getTopList().get(1).getRank()).isEqualTo(2);
        assertThat(response.getTopList().get(1).getUsername()).isEqualTo("GamerTwo");
        assertThat(response.getTopList().get(1).getScore()).isEqualTo(12000);

        // 3위 확인
        assertThat(response.getTopList().get(2).getRank()).isEqualTo(3);
        assertThat(response.getTopList().get(2).getUsername()).isEqualTo("GamerThree");
        assertThat(response.getTopList().get(2).getScore()).isEqualTo(12000);

        // member2의 myRank 검증
        assertThat(response.getMyRank()).isNotNull();
        assertThat(response.getMyRank().getRank()).isEqualTo(2);
        assertThat(response.getMyRank().getScore()).isEqualTo(12000);
    }

    @Test
    @DisplayName("비로그인 사용자가 리더보드 조회 시 myRank는 null이고 TOP 10만 반환된다")
    void getLeaderboard_unauthenticated() {
        // given
        arcadeService.submitScore(member1.getId(), "sichuan", ScoreSubmitRequest.builder()
                .score(10000)
                .clearTimeSec(60)
                .build());
        em.flush();
        em.clear();

        // when: currentMemberId가 null
        LeaderboardResponse response = arcadeService.getLeaderboard("sichuan", null);

        // then
        assertThat(response.getTopList()).hasSize(1);
        assertThat(response.getMyRank()).isNull();
    }
}
