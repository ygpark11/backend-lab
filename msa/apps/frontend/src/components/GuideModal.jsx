import React from 'react';
import { X, Circle, Triangle, Square, Timer, Sparkles, Tag, Siren, Rocket, Search, Gamepad2, Bell, ShieldAlert, Crosshair } from 'lucide-react';

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

                    {/* 앱 설치 및 알림 가이드 */}
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
                                        크롬 브라우저 접속 → 우측 상단 <strong className="text-primary">점 세 개(⋮)</strong> 메뉴 → <strong className="text-primary">[앱 설치]</strong> 또는 <strong className="text-primary">[홈 화면에 추가]</strong> 클릭
                                    </p>
                                </div>
                                <div className="bg-surface p-3 rounded-xl border border-divider">
                                    <h4 className="text-blue-700 dark:text-ps-blue font-bold text-sm mb-1.5 flex items-center gap-1.5">아이폰 (iOS)</h4>
                                    <p className="text-xs text-secondary leading-relaxed">
                                        <strong className="text-primary">Safari(사파리) 브라우저 접속 필수</strong> → 하단 중앙 <strong className="text-primary">공유 버튼(□↑)</strong> → <strong className="text-primary">[홈 화면에 추가]</strong> 클릭
                                    </p>
                                </div>
                            </div>
                            <p className="text-[11px] text-secondary mt-3 font-bold bg-surface border border-divider inline-block px-2 py-1 rounded">
                                ※ 설치 후 바탕화면에 생긴 아이콘으로 접속해서 로그인해야 알림이 활성화됩니다!
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 할인 방어력 티어 설명 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-red-from)] border border-[color:var(--bento-red-border)] flex items-center justify-center text-red-600 dark:text-red-500 shadow-sm">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                                할인 방어력 스카우터 <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-500" />
                            </h3>
                            <p className="text-secondary text-sm leading-relaxed mt-1">
                                게임의 과거 할인 빈도와 역대 최저가를 분석해 가격 방어력을 측정합니다. <strong className="text-red-600 dark:text-red-500">S급 철벽</strong>은 할인을 거의 안 하니 무리한 존버는 피하고, <strong className="text-green-600 dark:text-green-500">C급 솜방패</strong>는 혜자 게임이니 반값 이하를 넉넉히 노려보세요!
                            </p>
                        </div>
                    </div>

                    {/* 목표가 락온 기능 설명 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-purple-from)] border border-[color:var(--bento-purple-border)] flex items-center justify-center text-purple-600 dark:text-purple-500 shadow-sm">
                            <Crosshair className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                                타겟 프라이스 락온 (지능형 알림) <Crosshair className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                            </h3>
                            <p className="text-secondary text-sm leading-relaxed mt-1">
                                단순한 찜하기를 넘어 <strong className="text-primary">내가 원하는 목표 가격을 락온</strong>해 보세요. 락온한 가격에 도달했을 때는 물론(존버 승리!), 할인이 시작될 때도 상황에 맞는 스마트한 브리핑 푸시 알림을 보내드립니다.
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 가격 신호등 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-green-from)] border border-[color:var(--bento-green-border)] flex items-center justify-center text-green-600 dark:text-green-500 shadow-sm">
                            <Siren className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                                가격 신호등 <Siren className="w-5 h-5 text-green-600 dark:text-green-500" />
                            </h3>
                            <p className="text-xs text-muted mb-3">PS 컨트롤러 버튼 모양으로 현재 가격 상태를 직관적으로 알려드려요.</p>
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

                    {/* 뱃지 설명 */}
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
                                    <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">플래티넘 딜:</strong> 평점 85점 이상 & 반값(50%) 이상 할인!</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    {/* 고정된 배경색 뱃지는 대비가 유지되므로 그대로 둡니다 */}
                                    <span className="bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">NEW</span>
                                    <span><strong className="text-green-600 dark:text-green-500">신규 업데이트:</strong> 최근 3일 내에 새롭게 할인하거나 갱신된 게임</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Timer className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0" />
                                    <span><strong className="text-red-600 dark:text-red-500">막차 탑승:</strong> 할인 종료가 24시간도 안 남았습니다!</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">마감임박</span>
                                    <span><strong className="text-red-600 dark:text-red-500">마감 임박:</strong> 할인 종료가 3일 이내로 남았습니다.</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"><Gamepad2 className="w-3 h-3 fill-black" /> EXTRA</span>
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">스페셜 카탈로그:</strong> 스페셜/디럭스 회원 무료 플레이 가능</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">PLUS</span>
                                    <span><strong className="text-yellow-600 dark:text-yellow-500">구독자 혜택:</strong> 에센셜 회원 이상 전용 추가 할인 적용</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-full h-px bg-divider my-6"></div>

                    {/* 빠른 검색 꿀팁 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--bento-cyan-from)] border border-[color:var(--bento-cyan-border)] flex items-center justify-center text-cyan-600 dark:text-cyan-500 shadow-sm">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg flex items-center gap-2 mb-2">
                                200% 활용 꿀팁
                            </h3>
                            <ul className="text-sm text-secondary space-y-2 list-disc list-inside ml-1">
                                <li>화면 아래 둥둥 떠 있는 <strong className="text-primary">돋보기 버튼</strong>을 누르면 언제든 즉시 <strong className="text-primary">빠른 검색과 필터링</strong>이 가능해요.</li>
                                <li>마이페이지에서 나만의 닉네임을 설정하고 다른 요원들에게 내 발굴 업적을 뽐내보세요!</li>
                            </ul>
                        </div>
                    </div>

                </div>

                {/* 푸터 */}
                <div className="shrink-0 p-4 border-t border-divider bg-surface text-center">
                    <button onClick={onClose} className="w-full bg-primary text-[color:var(--color-bg-base)] hover:opacity-80 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                        확인했습니다! <Rocket className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideModal;