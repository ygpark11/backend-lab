package com.pstracker.catalog_service.member.repository;

import com.pstracker.catalog_service.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    // 로그인 시 사용
    Optional<Member> findByEmail(String email);

    // 중복 가입 방지용
    boolean existsByEmail(String email);
}
