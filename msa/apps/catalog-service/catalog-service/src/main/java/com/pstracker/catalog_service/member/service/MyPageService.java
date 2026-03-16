package com.pstracker.catalog_service.member.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.repository.GameVoteRepository;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.dto.MyPagePioneeredGameDto;
import com.pstracker.catalog_service.member.dto.MyPageProfileDto;
import com.pstracker.catalog_service.member.dto.MyPageSettingsDto;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {

    private final MemberRepository memberRepository;
    private final GameRepository gameRepository;
    private final WishlistRepository wishlistRepository;
    private final GameVoteRepository gameVoteRepository;

    public MyPageProfileDto getMyProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        // 1-1. 스탯 계산
        int totalSavedAmount = wishlistRepository.sumSavedAmountByMemberId(memberId);
        int pioneeredCount = (int) gameRepository.countByPioneerMemberId(memberId);
        int voteCount = gameVoteRepository.countByMemberId(memberId);
        long daysSinceJoin = ChronoUnit.DAYS.between(member.getCreatedAt().toLocalDate(), LocalDate.now());

        // [레벨 공식 적용] 기본 1 + (개척x2) + (투표x1) + (가입일/10)
        int level = (int) (1 + (pioneeredCount * 2) + (voteCount * 1) + (daysSinceJoin / 10));

        // 1-2. 트로피 티어 산정 (조건에 따라 해금 여부와 티어 결정)
        List<MyPageProfileDto.TrophyDto> trophies = new ArrayList<>();

        // ① 개척자 트로피 (PIONEER) - 1, 5, 20, 50
        String pioneerTier = "LOCKED";
        boolean pioneerUnlocked = pioneeredCount > 0;
        if (pioneeredCount >= 50) pioneerTier = "PLATINUM";
        else if (pioneeredCount >= 20) pioneerTier = "GOLD";
        else if (pioneeredCount >= 5) pioneerTier = "SILVER";
        else if (pioneeredCount >= 1) pioneerTier = "BRONZE";
        trophies.add(new MyPageProfileDto.TrophyDto("PIONEER", pioneerTier, pioneerUnlocked, pioneeredCount));

        // ② 투표 트로피 (VOTE) - 1, 10, 50
        String voteTier = "LOCKED";
        boolean voteUnlocked = voteCount > 0;
        if (voteCount >= 50) voteTier = "GOLD";
        else if (voteCount >= 10) voteTier = "SILVER";
        else if (voteCount >= 1) voteTier = "BRONZE";
        trophies.add(new MyPageProfileDto.TrophyDto("VOTE", voteTier, voteUnlocked, voteCount));

        // ③ 고인물 트로피 (TIME) - 7, 30, 100, 365
        String timeTier = "LOCKED";
        boolean timeUnlocked = daysSinceJoin >= 7;
        if (daysSinceJoin >= 365) timeTier = "PLATINUM"; // 1년 생존은 플래티넘 줍시다!
        else if (daysSinceJoin >= 100) timeTier = "GOLD";
        else if (daysSinceJoin >= 30) timeTier = "SILVER";
        else if (daysSinceJoin >= 7) timeTier = "BRONZE";
        trophies.add(new MyPageProfileDto.TrophyDto("TIME", timeTier, timeUnlocked, (int)daysSinceJoin));

        return new MyPageProfileDto(
                member.getNickname(),
                level,
                totalSavedAmount,
                pioneeredCount,
                member.getCreatedAt().toLocalDate(),
                trophies
        );
    }

    public List<MyPagePioneeredGameDto> getMyPioneeredGames(Long memberId) {
        List<Game> myGames = gameRepository.findAllByPioneerMemberIdOrderByCreatedAtDesc(memberId);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd");

        return myGames.stream()
                .map(g -> new MyPagePioneeredGameDto(
                        g.getId(),
                        g.getName(),
                        g.getImageUrl(),
                        g.getCreatedAt().format(formatter)
                )).toList();
    }

    public MyPageSettingsDto getMySettings(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));
        return new MyPageSettingsDto(member.isPriceAlertEnabled(), member.isNightModeEnabled());
    }

    @Transactional
    public MyPageSettingsDto updateMySettings(Long memberId, MyPageSettingsDto settingsDto) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        member.updateSettings(settingsDto.isPriceAlert(), settingsDto.isNightMode());
        return new MyPageSettingsDto(member.isPriceAlertEnabled(), member.isNightModeEnabled());
    }

    @Transactional
    public String updateNickname(Long memberId, String newNickname) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보가 없습니다."));

        String trimmedNickname = newNickname.trim();

        if (trimmedNickname.length() < 2 || trimmedNickname.length() > 10) {
            throw new IllegalArgumentException("닉네임은 2자 이상 10자 이하로 입력해주세요.");
        }

        if (member.getNickname().equals(trimmedNickname)) {
            return member.getNickname();
        }

        if (memberRepository.existsByNickname(trimmedNickname)) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
        }

        member.updateNickname(trimmedNickname);

        memberRepository.saveAndFlush(member);

        gameRepository.updatePioneerNameByMemberId(memberId, trimmedNickname);

        return member.getNickname();
    }
}
