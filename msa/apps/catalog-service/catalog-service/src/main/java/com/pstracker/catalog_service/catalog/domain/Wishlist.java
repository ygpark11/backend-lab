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
                        name = "uk_wishlist_member_game",
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

    @Column(name = "target_price")
    private Integer targetPrice;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static Wishlist create(Member member, Game game) {
        return createWithTargetPrice(member, game, null);
    }

    public static Wishlist createWithTargetPrice(Member member, Game game, Integer targetPrice) {
        Wishlist wishlist = new Wishlist();
        wishlist.member = member;
        wishlist.game = game;
        wishlist.targetPrice = targetPrice;
        wishlist.createdAt = LocalDateTime.now();
        return wishlist;
    }

    public void updateTargetPrice(Integer targetPrice) {
        this.targetPrice = targetPrice;
    }

}
