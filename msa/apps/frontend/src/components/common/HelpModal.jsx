import React from 'react';
import {Bell, Database, Globe, Pickaxe, Radio, ShieldAlert, Sparkles, Star, Trophy, X} from 'lucide-react';

const HELP_CONTENT = {
    DEFENSE: {
        title: "할인 방어력 스카우터",
        content: (
            <ul className="text-sm text-secondary space-y-3">
                <li><strong className="text-red-500">S급 철벽 ~ A급 단단함:</strong> 할인을 거의 하지 않거나 폭이 좁습니다. 30%만 할인해도 구매를 고려해 보세요.</li>
                <li><strong className="text-yellow-500">B급 보통:</strong> 주기적으로 평균적인 할인을 진행합니다.</li>
                <li><strong className="text-green-500">C급 솜방패 ~ D급 허벌:</strong> 할인을 밥 먹듯이 하며 반값 이하로 자주 떨어집니다. 정가 구매는 피하세요!</li>
            </ul>
        ),
        icon: <ShieldAlert className="w-5 h-5 text-red-500" />
    },
    VIBE: {
        title: "AI 감성 태그 (Vibe Tags)",
        content: (
            <p className="text-sm text-secondary leading-relaxed">
                수많은 리뷰 데이터를 <b>AI가 분석하여 추출한 이 게임만의 분위기(Vibe)와 특징</b>입니다. 뻔한 장르 분류를 넘어 내 취향에 딱 맞는 게임을 찾아보세요!
            </p>
        ),
        icon: <Sparkles className="w-5 h-5 text-purple-500" />
    },
    SCORE: {
        title: "전문가 및 커뮤니티 평가",
        content: (
            <ul className="text-sm text-secondary space-y-3">
                <li><strong className="text-primary bg-black dark:bg-white dark:text-black px-1.5 py-0.5 rounded text-[10px]">M</strong> <b>Metacritic:</b> 전 세계 비평가 리뷰를 종합한 점수입니다.</li>
                <li><strong className="text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded text-[10px]">IGDB</strong> <b>Community:</b> 글로벌 유저들의 플레이 평가입니다.</li>
                <li>두 평가 간에 <span className="text-red-500 font-bold">15점 이상 격차</span>가 나면 호불호가 갈릴 수 있습니다.</li>
            </ul>
        ),
        icon: <Star className="w-5 h-5 text-yellow-500" />
    },
    PIONEER: {
        title: "개척자(Pioneer) 시스템",
        content: (
            <p className="text-sm text-secondary leading-relaxed">
                아무도 발견하지 못한 신작을 <b>최초로 발굴(찜)</b>하면 해당 게임에 유저님의 닉네임이 영구 박제됩니다! 명예로운 개척자 훈장을 수집해보세요.
            </p>
        ),
        icon: <Pickaxe className="w-5 h-5 text-ps-blue" />
    },
    WISH_NOTI: {
        title: "알림 및 목표가 안내",
        content: (
            <div className="space-y-3">
                <p className="text-sm text-secondary leading-relaxed">
                    목표가를 설정하면 해당 가격 이하 도달 시 <b>푸시 알림</b>을 드립니다.
                </p>
                <div className="bg-surface p-3 rounded-lg border border-divider text-xs text-secondary">
                    ※ 알림이 안 온다면? 기기 알림 권한 허용 및 '홈 화면에 추가(앱 설치)' 여부를 확인해주세요!
                </div>
            </div>
        ),
        icon: <Bell className="w-5 h-5 text-ps-blue" />
    },
    RADAR: {
        title: "마켓 레이더 (Market Radar)",
        content: (
            <ul className="text-sm text-secondary space-y-3">
                <li><strong className="text-red-500">역대 최저가:</strong> 출시 이후 가장 저렴한 가격으로 할인 중인 게임들입니다.</li>
                <li><strong className="text-orange-500">마감 임박:</strong> 할인 종료가 3일 이내로 남은 게임들입니다. 서두르세요!</li>
                <li><strong className="text-blue-500">신규 할인:</strong> 최근 3일 이내에 새롭게 할인을 시작한 따끈한 게임들입니다.</li>
            </ul>
        ),
        icon: <Radio className="w-5 h-5 text-ps-blue" />
    },
    CHARTS: {
        title: "플레이스테이션 차트",
        content: (
            <ul className="text-sm text-secondary space-y-3">
                <li><strong className="text-purple-500">Must Play 갓겜:</strong> 평점 85점 이상이면서 동시에 50% 이상 파격 할인 중인 '플래티넘 딜' 게임들입니다.</li>
                <li><strong className="text-amber-500">베스트셀러 & 최다 다운로드:</strong> 현재 PS Store 공식 랭킹 기반으로 가장 인기 있는 게임들을 보여줍니다.</li>
            </ul>
        ),
        icon: <Trophy className="w-5 h-5 text-ps-blue" />
    },
    ECOSYSTEM: {
        title: "생태계 지표 (Ecosystem)",
        content: (
            <ul className="text-sm text-secondary space-y-3">
                <li><strong className="text-primary">Pro 향상 꿀딜:</strong> PS5 Pro 기기 성능 업데이트가 지원되는 타이틀 중 현재 할인 중인 게임 수입니다.</li>
                <li><strong className="text-yellow-500">구독자 무료 혜택:</strong> PS Plus 스페셜/디럭스 카탈로그에 포함되어 구독자라면 즉시 무료 플레이가 가능한 게임 수입니다.</li>
                <li><strong className="text-yellow-500">PLUS 전용 혜택:</strong> 일반 유저보다 더 높은 할인율이 적용되는 구독자 전용 세일 게임 수입니다.</li>
            </ul>
        ),
        icon: <Globe className="w-5 h-5 text-ps-blue" />
    },
    MATRIX: {
        title: "시스템 현황 (System Matrix)",
        content: (
            <div className="space-y-3">
                <p className="text-sm text-secondary leading-relaxed">
                    PS Tracker가 실시간으로 수집하고 관리 중인 스토어 데이터의 현황입니다.
                </p>
                <div className="bg-surface p-3 rounded-lg border border-divider text-xs text-secondary">
                    <strong className="text-primary">※ Tracked Titles:</strong> 현재 데이터베이스에 등록되어 가격 변동을 추적 중인 전체 게임의 수량입니다.
                </div>
            </div>
        ),
        icon: <Database className="w-5 h-5 text-ps-blue" />
    }
};

const HelpModal = ({ isOpen, type, onClose }) => {
    if (!isOpen || !HELP_CONTENT[type]) return null;

    const { title, content, icon } = HELP_CONTENT[type];

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
                e.stopPropagation(); // 부모 모달 닫힘 방지
                onClose();
            }}
        >
            <div
                className="bg-base border border-divider rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-surface border-b border-divider p-5 flex items-center justify-between">
                    <h3 className="font-black text-primary text-lg flex items-center gap-2">
                        {icon} {title}
                    </h3>
                    <button onClick={onClose} className="text-secondary hover:text-primary bg-base hover:bg-surface-hover p-1.5 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 bg-base">
                    {content}
                </div>
                <div className="p-4 border-t border-divider bg-surface">
                    <button onClick={onClose} className="w-full bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 font-bold py-2.5 rounded-xl transition-colors">
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;