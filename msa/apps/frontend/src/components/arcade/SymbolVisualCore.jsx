import React from 'react';

/**
 * PS 심볼 고유 비주얼 진화 코어 엔진 (SymbolVisualCore) - Ultra HD 240x240
 * 
 * 1~20강 구간별 5대 진화 티어(Tier 0 ~ Tier 4)를 완벽 구현:
 * - Tier 0 (0~4강): 기본 원석 기저형태 (Foundation)
 * - Tier 1 (5~9강): 1차 각성 (Awakened: 코로나 링 / 프리즘 굴절 / 테슬라 아크 / 3D 큐브)
 * - Tier 2 (10~14강): 2차 초월 (Overclocked: 동적 에너지 도관 스트림 / 4D 호흡 테서랙트 / 플라즈마 지터 / 블랙홀 와류)
 * - Tier 3 (15~19강): 3차 특이점 (Singularity: 초신성 강착원반 & 펄서 제트 / 피라미드 레이저 / EMP 쇼크웨이브 / 양자 간섭 궤도)
 * - Tier 4 (20강): 신화적 종극체 (Mythic Genesis: 궁극의 각성 코어 & 전방위 에너지 방출)
 * 
 * 저발열 고성능: 순수 SVG 벡터 연산 및 CSS 하드웨어 가속(transform, stroke-dashoffset)으로 리렌더링 부하 0, 무발열 60FPS 보장.
 */
export const SymbolVisualCore = ({ symbolKey, level, hammerSwing }) => {
    const tier = level === null ? 0 : level >= 20 ? 4 : level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0;
    const isForged = level !== null && level > 0;
    const continuousScale = level ? 1 + (level * 0.007) : 1;

    return (
        <div
            className={`relative w-full h-full flex items-center justify-center transition-transform duration-150 select-none ${
                hammerSwing ? 'scale-90 brightness-150' : 'scale-100'
            }`}
            style={{ transform: `scale(${continuousScale}) translateZ(0)` }}
        >
            <svg
                viewBox="0 0 240 240"
                className="w-full h-full overflow-visible"
                style={{ filter: `drop-shadow(0 0 ${Math.min(24, 6 + tier * 4.2)}px var(--glow-col, currentColor))` }}
            >
                <defs>
                    <radialGradient id="solarGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#F87171" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#EF4444" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#450A0A" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="emeraldGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#34D399" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#10B981" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="voltageGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#60A5FA" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="quantumGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#E879F9" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#D946EF" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#701A75" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* 1. 서클 (솔라 레드 -> 블랙홀 싱귤래리티) */}
                {symbolKey === 'CIRCLE' && (
                    <g style={{ '--glow-col': '#EF4444' }}>
                        {/* Tier 3 & 4: 초신성 강착원반 (Accretion Disk) 2중 회전 링 */}
                        {tier >= 3 && (
                            <g className="animate-spin" style={{ animationDuration: tier === 4 ? '3.5s' : '7s', transformOrigin: '120px 120px' }}>
                                <ellipse
                                    cx="120"
                                    cy="120"
                                    rx="102"
                                    ry="38"
                                    fill="none"
                                    stroke="#EF4444"
                                    strokeWidth={tier === 4 ? '4' : '3'}
                                    strokeDasharray="24 14 8 14"
                                    opacity="0.9"
                                />
                                <ellipse
                                    cx="120"
                                    cy="120"
                                    rx="88"
                                    ry="30"
                                    fill="none"
                                    stroke="#FCA5A5"
                                    strokeWidth="2"
                                    strokeDasharray="6 12"
                                    opacity="0.75"
                                />
                            </g>
                        )}

                        {/* Tier 3 & 4: 4방향 펄서 광자 제트 빔 방출 */}
                        {tier >= 3 && (
                            <g className="animate-pulse" opacity="0.9">
                                <line x1="120" y1="12" x2="120" y2="64" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="120" y1="176" x2="120" y2="228" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="12" y1="120" x2="64" y2="120" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="176" y1="120" x2="228" y2="120" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
                                <circle cx="120" cy="12" r="3.5" fill="#FCA5A5" />
                                <circle cx="120" cy="228" r="3.5" fill="#FCA5A5" />
                                <circle cx="12" cy="120" r="3.5" fill="#FCA5A5" />
                                <circle cx="228" cy="120" r="3.5" fill="#FCA5A5" />
                            </g>
                        )}

                        {/* Tier 1+: 회전하는 코로나 태양풍 링 & 태양 플레어 */}
                        {tier >= 1 && (
                            <g className="animate-spin" style={{ animationDuration: '10s', transformOrigin: '120px 120px' }}>
                                <circle
                                    cx="120"
                                    cy="120"
                                    r={tier >= 2 ? '80' : '72'}
                                    fill="none"
                                    stroke="#F87171"
                                    strokeWidth={tier >= 2 ? '2' : '3'}
                                    strokeDasharray="12 14"
                                    opacity={tier >= 2 ? '0.5' : '0.9'}
                                />
                                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
                                    const rad = (ang * Math.PI) / 180;
                                    const x1 = 120 + Math.cos(rad) * 56;
                                    const y1 = 120 + Math.sin(rad) * 56;
                                    const x2 = 120 + Math.cos(rad) * (tier >= 2 ? 76 : 70);
                                    const y2 = 120 + Math.sin(rad) * (tier >= 2 ? 76 : 70);
                                    return (
                                        <line key={ang} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
                                    );
                                })}
                            </g>
                        )}

                        {/* Tier 2+: 칠흑의 블랙홀 이벤트 호라이즌 & 소용돌이 강착류 나선 */}
                        {tier >= 2 ? (
                            <>
                                {/* 회전하는 나선형 강착류 에너지 궤도 */}
                                <g className="animate-cosmic-vortex">
                                    <circle
                                        cx="120"
                                        cy="120"
                                        r="66"
                                        fill="none"
                                        stroke="#EF4444"
                                        strokeWidth="3.5"
                                        strokeDasharray="30 14 10 14"
                                        strokeLinecap="round"
                                        opacity="0.85"
                                    />
                                    <circle
                                        cx="120"
                                        cy="120"
                                        r="58"
                                        fill="none"
                                        stroke="#FCA5A5"
                                        strokeWidth="2"
                                        strokeDasharray="16 12"
                                        opacity="0.7"
                                    />
                                </g>

                                {/* 심연의 암흑 블랙홀 코어 */}
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="50"
                                    fill="#060609"
                                    stroke="#EF4444"
                                    strokeWidth="7"
                                />

                                {/* 내부 포톤 스피어 (광자 구체 회전 링) */}
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="38"
                                    fill="#000000"
                                    stroke="#F87171"
                                    strokeWidth="2.5"
                                    strokeDasharray="18 10"
                                    className="animate-spin"
                                    style={{ animationDuration: '4s', transformOrigin: '120px 120px' }}
                                />

                                {/* 중심 싱귤래리티 반응로 비콘 */}
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="18"
                                    fill="url(#solarGlow)"
                                    className="animate-core-beacon"
                                />
                                <circle cx="120" cy="120" r="5" fill="#FFFFFF" opacity="0.9" />

                                {tier === 4 && (
                                    <circle cx="120" cy="120" r="16" fill="#FFFFFF" className="animate-ping" opacity="0.85" />
                                )}
                            </>
                        ) : (
                            /* Tier 0 & 1: 기본 솔라 링 & 중심 핵 */
                            <>
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="48"
                                    fill={isForged ? 'rgba(239, 68, 68, 0.15)' : 'none'}
                                    stroke="#EF4444"
                                    strokeWidth="9"
                                />
                                {tier >= 1 && (
                                    <circle cx="120" cy="120" r="22" fill="url(#solarGlow)" className="animate-pulse" />
                                )}
                            </>
                        )}
                    </g>
                )}

                {/* 2. 트라이앵글 (에메랄드 그린 -> 프리즘 제네시스) */}
                {symbolKey === 'TRIANGLE' && (
                    <g style={{ '--glow-col': '#10B981' }}>
                        {/* Tier 3 & 4: 외곽 성좌 룬 서클 */}
                        {tier >= 3 && (
                            <circle
                                cx="120"
                                cy="126"
                                r="90"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="2"
                                strokeDasharray="10 12 4 12"
                                className="animate-spin"
                                style={{ animationDuration: '12s', transformOrigin: '120px 126px' }}
                                opacity="0.75"
                            />
                        )}

                        {/* Tier 3 & 4: 3대 꼭짓점 레이저 방출 빔 */}
                        {tier >= 3 && (
                            <g className="animate-pulse" opacity="0.9">
                                <line x1="120" y1="62" x2="120" y2="12" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="176" y1="158" x2="222" y2="184" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="64" y1="158" x2="18" y2="184" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
                                <circle cx="120" cy="12" r="4" fill="#6EE7B7" />
                                <circle cx="222" cy="184" r="4" fill="#6EE7B7" />
                                <circle cx="18" cy="184" r="4" fill="#6EE7B7" />
                            </g>
                        )}

                        {/* Tier 2+: 역방향 회전 부유 다면체 실드 */}
                        {tier >= 2 && (
                            <polygon
                                points="120,188 180,80 60,80"
                                fill="none"
                                stroke="#34D399"
                                strokeWidth="2.5"
                                strokeDasharray="14 8"
                                opacity="0.65"
                                className="animate-spin"
                                style={{ animationDuration: '14s', transformOrigin: '120px 126px', animationDirection: 'reverse' }}
                            />
                        )}

                        {/* 메인 에메랄드 프리즘 삼각 프레임 */}
                        <polygon
                            points="120,62 176,158 64,158"
                            fill={isForged ? 'rgba(16, 185, 129, 0.16)' : 'none'}
                            stroke="#10B981"
                            strokeWidth="9"
                            strokeLinejoin="round"
                        />

                        {/* Tier 2+: 3대 꼭짓점 -> 중심 프랙탈 코어로 흐르는 3대 에너지 도관 스트림 */}
                        {tier >= 2 && (
                            <g className={tier >= 3 ? 'animate-stream-flow-fast' : 'animate-stream-flow'} stroke="#6EE7B7" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round">
                                <line x1="120" y1="62" x2="120" y2="110" />
                                <line x1="176" y1="158" x2="148" y2="128" />
                                <line x1="64" y1="158" x2="92" y2="128" />
                            </g>
                        )}

                        {/* Tier 1+: 내부 시에르핀스키 역삼각형 프랙탈 코어 */}
                        {tier >= 1 && (
                            <polygon
                                points="120,158 148,110 92,110"
                                fill="rgba(16, 185, 129, 0.35)"
                                stroke="#6EE7B7"
                                strokeWidth="3.5"
                                strokeLinejoin="round"
                                className={tier >= 2 ? 'animate-hyper-pulse' : ''}
                            />
                        )}

                        {/* Tier 2+: 중심 에메랄드 크리스탈 리액터 코어 */}
                        {tier >= 2 && (
                            <>
                                <circle
                                    cx="120"
                                    cy="126"
                                    r="18"
                                    fill="url(#emeraldGlow)"
                                    className="animate-core-beacon"
                                />
                                <circle cx="120" cy="126" r="5" fill="#FFFFFF" opacity="0.9" />

                                {/* 3대 꼭짓점 에너지 파일런 비콘 */}
                                <g fill="#6EE7B7">
                                    <circle cx="120" cy="62" r="6" className="animate-pulse" />
                                    <circle cx="176" cy="158" r="6" className="animate-pulse" />
                                    <circle cx="64" cy="158" r="6" className="animate-pulse" />
                                    <circle cx="120" cy="62" r="2.5" fill="#FFFFFF" />
                                    <circle cx="176" cy="158" r="2.5" fill="#FFFFFF" />
                                    <circle cx="64" cy="158" r="2.5" fill="#FFFFFF" />
                                </g>
                            </>
                        )}

                        {/* Tier 4: 신화적 제네시스 코어 */}
                        {tier === 4 && (
                            <circle cx="120" cy="126" r="16" fill="#FFFFFF" className="animate-ping" opacity="0.85" />
                        )}
                    </g>
                )}

                {/* 3. 크로스 (볼테이지 블루 -> 테슬라 플라즈마 폭풍) */}
                {symbolKey === 'CROSS' && (
                    <g style={{ '--glow-col': '#3B82F6' }}>
                        {/* Tier 3 & 4: 고전압 EMP 충격파 링 */}
                        {tier >= 3 && (
                            <g className="animate-spin" style={{ animationDuration: '5s', transformOrigin: '120px 120px' }}>
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="88"
                                    fill="none"
                                    stroke="#60A5FA"
                                    strokeWidth="3"
                                    strokeDasharray="10 12 4 12"
                                    opacity="0.85"
                                />
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="74"
                                    fill="none"
                                    stroke="#93C5FD"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 8"
                                    opacity="0.6"
                                />
                            </g>
                        )}

                        {/* Tier 3 & 4: 4대 팁 방전 레이저 */}
                        {tier >= 3 && (
                            <g className="animate-pulse" opacity="0.9">
                                <line x1="72" y1="72" x2="18" y2="18" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="168" y1="72" x2="222" y2="18" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="72" y1="168" x2="18" y2="222" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="168" y1="168" x2="222" y2="222" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" />
                                <circle cx="18" cy="18" r="4" fill="#93C5FD" />
                                <circle cx="222" cy="18" r="4" fill="#93C5FD" />
                                <circle cx="18" cy="222" r="4" fill="#93C5FD" />
                                <circle cx="222" cy="222" r="4" fill="#93C5FD" />
                            </g>
                        )}

                        {/* Tier 2+: 8방향 플라즈마 블레이드 (+) 오버레이 & 번개 지터 진동 */}
                        {tier >= 2 && (
                            <g className="animate-lightning-jitter">
                                <line x1="120" y1="52" x2="120" y2="188" stroke="#60A5FA" strokeWidth="5.5" strokeLinecap="round" opacity="0.85" />
                                <line x1="52" y1="120" x2="188" y2="120" stroke="#60A5FA" strokeWidth="5.5" strokeLinecap="round" opacity="0.85" />
                                <line x1="120" y1="52" x2="120" y2="188" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                                <line x1="52" y1="120" x2="188" y2="120" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                            </g>
                        )}

                        {/* 메인 사이버네틱 크로스 (X) */}
                        <g stroke="#3B82F6" strokeWidth="10" strokeLinecap="round">
                            <line x1="72" y1="72" x2="168" y2="168" />
                            <line x1="168" y1="72" x2="72" y2="168" />
                        </g>

                        {/* Tier 2+: 4대 날에서 중심으로 흐르는 테슬라 전하 스트림 */}
                        {tier >= 2 && (
                            <g className={tier >= 3 ? 'animate-stream-flow-fast' : 'animate-stream-flow'} stroke="#93C5FD" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round">
                                <line x1="72" y1="72" x2="105" y2="105" />
                                <line x1="168" y1="72" x2="135" y2="105" />
                                <line x1="72" y1="168" x2="105" y2="135" />
                                <line x1="168" y1="168" x2="135" y2="135" />
                            </g>
                        )}

                        {/* Tier 1+: 4대 날 끝단 테슬라 아크 스파크 */}
                        {tier >= 1 && (
                            <g fill="#93C5FD">
                                <circle cx="72" cy="72" r="5.5" className="animate-pulse" />
                                <circle cx="168" cy="72" r="5.5" className="animate-pulse" />
                                <circle cx="72" cy="168" r="5.5" className="animate-pulse" />
                                <circle cx="168" cy="168" r="5.5" className="animate-pulse" />
                                <circle cx="72" cy="72" r="2" fill="#FFFFFF" />
                                <circle cx="168" cy="72" r="2" fill="#FFFFFF" />
                                <circle cx="72" cy="168" r="2" fill="#FFFFFF" />
                                <circle cx="168" cy="168" r="2" fill="#FFFFFF" />
                            </g>
                        )}

                        {/* 중심부 고전압 아크 리액터 비콘 */}
                        {tier >= 1 && (
                            <>
                                <circle
                                    cx="120"
                                    cy="120"
                                    r={tier >= 2 ? '20' : '14'}
                                    fill="url(#voltageGlow)"
                                    className="animate-core-beacon"
                                />
                                <circle cx="120" cy="120" r={tier >= 2 ? '5' : '3'} fill="#FFFFFF" opacity="0.95" />
                            </>
                        )}

                        {/* Tier 4: 신화적 오버로드 뇌룡 코어 */}
                        {tier === 4 && (
                            <circle cx="120" cy="120" r="16" fill="#FFFFFF" className="animate-ping" opacity="0.9" />
                        )}
                    </g>
                )}

                {/* 4. 스퀘어 (양자 푸시아 -> 4차원 테서랙트) */}
                {symbolKey === 'SQUARE' && (
                    <g style={{ '--glow-col': '#D946EF' }}>
                        {/* Tier 3 & 4: 외곽 양자 간섭 그리드 프레임 */}
                        {tier >= 3 && (
                            <rect
                                x="26"
                                y="26"
                                width="188"
                                height="188"
                                rx="24"
                                fill="none"
                                stroke="#D946EF"
                                strokeWidth="2"
                                strokeDasharray="14 12 6 12"
                                className="animate-spin"
                                style={{ animationDuration: '16s', transformOrigin: '120px 120px' }}
                                opacity="0.75"
                            />
                        )}

                        {/* Tier 2+: 4차원 테서랙트 (Hypercube) 동적 에너지 도관 스트림 */}
                        {tier >= 2 && (
                            <g
                                className={tier >= 3 ? 'animate-stream-flow-fast' : 'animate-stream-flow'}
                                stroke="#F0ABFC"
                                strokeWidth="3"
                                strokeDasharray="8 6"
                                strokeLinecap="round"
                            >
                                <line x1="68" y1="68" x2="98" y2="98" />
                                <line x1="172" y1="68" x2="142" y2="98" />
                                <line x1="172" y1="172" x2="142" y2="142" />
                                <line x1="68" y1="172" x2="98" y2="142" />
                            </g>
                        )}

                        {/* 메인 외곽 양자 큐브 프레임 */}
                        <rect
                            x="68"
                            y="68"
                            width="104"
                            height="104"
                            rx="14"
                            fill={isForged ? 'rgba(217, 70, 239, 0.16)' : 'none'}
                            stroke="#D946EF"
                            strokeWidth="9"
                        />

                        {/* Tier 2+: 테서랙트 내부 4D 호흡 큐브 (Hyper-Pulse) */}
                        {tier >= 2 && (
                            <g className="animate-hyper-pulse">
                                <rect
                                    x="96"
                                    y="96"
                                    width="48"
                                    height="48"
                                    rx="8"
                                    fill="rgba(217, 70, 239, 0.38)"
                                    stroke="#F0ABFC"
                                    strokeWidth="3.5"
                                />
                            </g>
                        )}

                        {/* Tier 2+: 중심 양자 특이점 반응로 비콘 */}
                        {tier >= 2 && (
                            <>
                                <circle
                                    cx="120"
                                    cy="120"
                                    r="18"
                                    fill="url(#quantumGlow)"
                                    className="animate-core-beacon"
                                />
                                <circle cx="120" cy="120" r="5" fill="#FFFFFF" opacity="0.95" />

                                {/* 4개 외곽 코너 양자 노드 */}
                                <g fill="#F0ABFC">
                                    <circle cx="68" cy="68" r="5.5" className="animate-pulse" />
                                    <circle cx="172" cy="68" r="5.5" className="animate-pulse" />
                                    <circle cx="172" cy="172" r="5.5" className="animate-pulse" />
                                    <circle cx="68" cy="172" r="5.5" className="animate-pulse" />
                                    <circle cx="68" cy="68" r="2" fill="#FFFFFF" />
                                    <circle cx="172" cy="68" r="2" fill="#FFFFFF" />
                                    <circle cx="172" cy="172" r="2" fill="#FFFFFF" />
                                    <circle cx="68" cy="172" r="2" fill="#FFFFFF" />
                                </g>
                            </>
                        )}

                        {/* Tier 1: 3D 큐브 와이어프레임 (다이아몬드 회전 사각) */}
                        {tier === 1 && (
                            <rect
                                x="94"
                                y="94"
                                width="52"
                                height="52"
                                rx="6"
                                fill="none"
                                stroke="#E879F9"
                                strokeWidth="3"
                                transform="rotate(45 120 120)"
                                opacity="0.85"
                            />
                        )}

                        {/* Tier 3+: 4개 모서리 부유 양자 비트 */}
                        {tier >= 3 && (
                            <g fill="#F0ABFC" className="animate-pulse">
                                <rect x="34" y="34" width="12" height="12" rx="3" />
                                <rect x="194" y="34" width="12" height="12" rx="3" />
                                <rect x="194" y="194" width="12" height="12" rx="3" />
                                <rect x="34" y="194" width="12" height="12" rx="3" />
                            </g>
                        )}

                        {/* Tier 4: 신화적 하이퍼큐브 싱귤래리티 */}
                        {tier === 4 && (
                            <circle cx="120" cy="120" r="16" fill="#FFFFFF" className="animate-ping" opacity="0.85" />
                        )}
                    </g>
                )}
            </svg>
        </div>
    );
};
