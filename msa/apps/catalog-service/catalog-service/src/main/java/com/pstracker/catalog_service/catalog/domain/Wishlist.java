package com.pstracker.catalog_service.catalog.domain;

import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "wishlists",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_wishlist_member_game", // 한 유저가 같은 게임을 중복 찜 불가
                        columnNames = {"member_id", "game_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wishlist {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Wishlist create(Member member, Game game) {
        Wishlist wishlist = new Wishlist();
        wishlist.member = member;
        wishlist.game = game;
        wishlist.createdAt = LocalDateTime.now();
        return wishlist;
    }
}
