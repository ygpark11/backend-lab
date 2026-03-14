package com.pstracker.catalog_service.scraping.repository;

import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameCandidateRepository extends JpaRepository<GameCandidate, Long> {

    // 게임 후보군 목록 조회 (최근 발견된 순)
    List<GameCandidate> findAllByOrderByCreatedAtDesc();

    // 수집 요청 시 대상 검증용
    Optional<GameCandidate> findByPsStoreId(String psStoreId);

    // 누군가 수집을 요청하면 진열장에서 즉시 삭제 (중복 클릭 방어)
    void deleteByPsStoreId(String psStoreId);
}
