package com.pstracker.catalog_service.member.repository;

import com.pstracker.catalog_service.member.domain.UserFilterPreset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFilterPresetRepository extends JpaRepository<UserFilterPreset, Long> {

    List<UserFilterPreset> findAllByMemberIdOrderByCreatedAtAsc(Long memberId);

    long countByMemberId(Long memberId);

    Optional<UserFilterPreset> findByIdAndMemberId(Long id, Long memberId);
}
