package com.pstracker.catalog_service.global.security;

import com.pstracker.catalog_service.member.domain.Member;
import lombok.Getter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collections;

@Getter
public class MemberPrincipal extends User {

    private final Long memberId;

    public MemberPrincipal(Member member) {
        super(member.getEmail(), member.getPassword(),
                Collections.singleton(new SimpleGrantedAuthority("ROLE_" + member.getRole().name())));
        this.memberId = member.getId();
    }

    public MemberPrincipal(Long id, String email, String role) {
        super(email, "",
                Collections.singleton(new SimpleGrantedAuthority("ROLE_" + role)));
        this.memberId = id;
    }
}
