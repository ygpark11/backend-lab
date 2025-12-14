package com.pstracker.catalog_service.global.security;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. DB에서 email로 회원 조회
        return memberRepository.findByEmail(email)
                .map(this::createUserDetails)
                .orElseThrow(() -> new UsernameNotFoundException("해당하는 유저를 찾을 수 없습니다."));
    }

    // 2. 조회한 Member 엔티티를 Security가 이해하는 UserDetails 객체로 변환
    private UserDetails createUserDetails(Member member) {
        return User.builder()
                .username(member.getEmail())
                .password(member.getPassword()) // DB에 저장된 암호화된 비밀번호
                .roles(member.getRole().name()) // Enum 이름 그대로 ("USER", "ADMIN")
                .build();
    }
}
