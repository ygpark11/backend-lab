import React from 'react';
import {
    Bell,
    Circle,
    Gamepad2,
    Info,
    Pickaxe,
    Rocket,
    Siren,
    Sparkles,
    Square,
    Tag,
    Timer,
    Triangle,
    X
} from 'lucide-react';

const GuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-base border border-divider rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="shrink-0 bg-surface border-b border-divider p-6 relative overflow-hidden">
                    <div className="absolute -left-10 -top-10 w-32 h-32 bg-[var(--bento-blue-from)] rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-primary">PS Tracker 가이드</h2>
                        <p className="text-secondary text-sm mt-1">알아두면 쓸모있는 꿀기능 소개</p>
                        <button onClick={onClose} className="absolute top-0 right-0 text-secondary hover:text-primary transition-colors bg-base hover:bg-surface-hover border border-divider p-2 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 스크롤 콘텐츠 영역 */}
                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-base">

                    {/* 1. 앱 설치 및 알림 가이드 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-blue-from)] border border-[color:var(--bento-blue-border)] flex items-center justify-center text-blue-700 dark:text-ps-blue shadow-sm">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2 mb-2">
                                앱처럼 설치하고 알림 100% 받기
                            </h3>
                            <p className="text-sm text-secondary leading-relaxed mb-4">
                                PS Tracker는 웹 서비스라 브라우저를 끄면 알림이 오지 않을 수 있어요. <strong className="text-primary">[홈 화면에 추가]</strong>를 통해 앱처럼 설치하면 쾌적한 환경에서 실시간 할인 알림을 놓치지 않고 받을 수 있습니다!
                            </p>
                            <div className="space-y-3">
                                <div className="bg-surface p-3 rounded-xl border border-divider">
                                    <h4 className="text-green-600 dark:text-green-500 font-bold text-sm mb-1.5 flex items-center gap-1.5">갤럭시 (안드로이드)</h4>
                                    <p className="text-xs text-secondary leading-relaxed">
                                        크롬 접속 → 우측 상단 <strong className="text-primary">점 세 개(⋮)</strong> → <strong className="text-primary">[앱 설치]</strong> 또는 <strong className="text-primary">[홈 화면에 추가]</strong>
                                    </p>
                                </div>
                                <div className="bg-surface p-3 rounded-xl border border-divider">
                                    <h4 className="text-blue-700 dark:text-ps-blue font-bold text-sm mb-1.5 flex items-center gap-1.5">아이폰 (iOS)</h4>
                                    <p className="text-xs text-secondary leading-relaxed">
                                        <strong className="text-primary">Safari 접속 필수</strong> → 하단 <strong className="text-primary">공유(□↑)</strong> → <strong className="text-primary">[홈 화면에 추가]</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 2. 가격 신호등 (4개 100% 복구!) */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-green-from)] border border-[color:var(--bento-green-border)] flex items-center justify-center text-green-600 dark:text-green-500 shadow-sm">
                            <Siren className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                                가격 신호등 <Siren className="w-5 h-5 text-green-600 dark:text-green-500" />
                            </h3>
                            <p className="text-xs text-muted mb-3">PS 컨트롤러 버튼 모양으로 현재 가격 상태를 알려드려요.</p>
                            <ul className="text-sm text-secondary space-y-2.5">
                                <li className="flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-green-600 dark:text-green-500 fill-current" />
                                    <span><strong className="text-green-600 dark:text-green-500">BUY NOW:</strong> 역대 최저가 근접! (강력 추천)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Triangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 fill-current" />
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">GOOD OFFER:</strong> 꽤 괜찮은 타협점입니다.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <X className="w-4 h-4 text-red-600 dark:text-red-500 stroke-[3px]" />
                                    <span><strong className="text-red-600 dark:text-red-500">WAIT:</strong> 아직 비싸요. 방어선이 무너지길 기다리세요.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Square className="w-4 h-4 text-blue-700 dark:text-ps-blue fill-current" />
                                    <span><strong className="text-blue-700 dark:text-ps-blue">TRACKING:</strong> 아직 할인 데이터를 스캔 중입니다.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 3. 뱃지 설명 (개척자 뱃지 포함) */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-yellow-from)] border border-[color:var(--bento-yellow-border)] flex items-center justify-center text-yellow-600 dark:text-yellow-500 shadow-sm">
                            <Tag className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2 mb-3">
                                주요 뱃지 설명 <Tag className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                            </h3>
                            <ul className="text-sm text-secondary space-y-3">
                                <li className="flex items-center gap-2.5">
                                    <div className="shrink-0 bg-surface border-y border-r border-divider border-l-[4px] border-l-ps-blue py-0.5 pl-2 pr-3 rounded-r flex items-center gap-1.5 shadow-sm">
                                        <Pickaxe className="w-3 h-3 text-ps-blue" />
                                        <span className="text-[10px] font-black text-ps-blue uppercase">Pioneer</span>
                                    </div>
                                    <span><strong className="text-ps-blue">개척자:</strong> 신작 수집소에서 게임을 최초로 발굴한 요원의 닉네임이 새겨집니다.</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">플래티넘 딜:</strong> 평점 85점 이상 & 반값(50%) 이상 할인!</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-white dark:bg-black border border-yellow-500 text-yellow-600 dark:text-yellow-500 text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> EXTRA</span>
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">스페셜 카탈로그:</strong> 구독자 무료 플레이 가능</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-100 border border-gray-300 dark:border-gray-400/40 text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"><Sparkles className="w-3 h-3" /> PRO</span>
                                    <span><strong className="text-gray-600 dark:text-gray-300">PS5 Pro 향상:</strong> Pro 기기에서 그래픽/프레임 향상 적용</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Timer className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0" />
                                    <span><strong className="text-red-600 dark:text-red-500">마감 임박:</strong> 할인 종료가 3일 이내로 남았습니다.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 4. 숨겨진 꿀기능 모음 (컨텍스추얼 헬프 유도) */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-purple-from)] border border-[color:var(--bento-purple-border)] flex items-center justify-center text-purple-600 dark:text-purple-500 shadow-sm">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2 mb-2">
                                탐색 레벨업! 200% 활용 꿀팁
                            </h3>
                            <ul className="text-sm text-secondary space-y-3 list-disc list-inside ml-1 marker:text-primary">
                                <li><strong>타겟 프라이스 락온:</strong> 게임을 찜할 때 <span className="text-primary">원하는 목표가</span>를 설정하면 똑똑하게 알림을 보내드려요.</li>
                                <li><strong>방어력 스카우터:</strong> 할인 방어력 등급(S급 철벽 ~ C급 솜방패)을 보고 존버할지 말지 결정하세요!</li>
                                <li><strong>AI 감성 태그:</strong> 뻔한 장르 분류 대신 <span className="text-primary">"타격감 좋은", "힐링되는"</span> 같은 AI 분석 태그로 내 취향을 저격해 보세요.</li>
                                <li>상세 화면 곳곳에 있는 <Info className="w-4 h-4 inline-block text-muted mx-0.5" /> <strong className="text-primary">도움말 아이콘</strong>을 누르면 자세한 설명이 나와요!</li>
                            </ul>
                        </div>
                    </div>

                </div>

                {/* 푸터 */}
                <div className="shrink-0 p-4 border-t border-divider bg-surface text-center">
                    <button onClick={onClose} className="w-full bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                        확인 완료! 스토어 털러 가기 <Rocket className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideModal;