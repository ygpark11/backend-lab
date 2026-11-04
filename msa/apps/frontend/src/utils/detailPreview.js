// 게임 상세 모달을 데이터 도착 전에 먼저 그리기 위한 미리보기 정보.
// 진입 경로마다 필드명이 달라(name/title, price/currentPrice) 한곳에서 맞춤
export const buildDetailPreview = (game) => {
    if (!game) return null;
    const id = game.gameId ?? game.id;
    if (id == null) return null;
    return {
        id,
        title: game.title ?? game.name ?? '',
        imageUrl: game.imageUrl ?? null,
        price: game.price ?? game.currentPrice ?? null,
        discountRate: game.discountRate ?? 0,
    };
};
