import React from 'react';

/**
 * PS 심볼별 차별화된 고유 위성 오브 엔진 (SymbolSatellites)
 * 
 * 4대 도형마다 단순 원형 점이 아닌, 완전히 다른 형태/궤도/이펙트를 적용:
 * 1. CIRCLE (서클): 타오르는 혜성 꼬리를 가진 태양 홍염 불씨 (Solar Flare Embers)
 * 2. TRIANGLE (트라이앵글): 자전하며 프리즘 광채를 뿜는 에메랄드 크리스탈 다면체 (Prism Shards)
 * 3. CROSS (크로스): 4방향 고전압 아크 방전 스파크 (Tesla Electric Sparks)
 * 4. SQUARE (스퀘어): 차원 축을 순환하는 양자 데이터 큐브 복셀 (Quantum Data Cubes)
 */
export const SymbolSatellites = ({ symbolKey, orbitCount, spinSpeed, color, level }) => {
    if (!orbitCount || orbitCount <= 0) return null;

    // 대형 앤빌 카드 외곽을 알맞게 감싸는 공전 반경 (165px)
    const radius = 165;

    return (
        <div
            className="absolute inset-0 pointer-events-none animate-spin"
            style={{
                animationDuration: `${spinSpeed * 4}s`,
                willChange: 'transform'
            }}
        >
            {Array.from({ length: orbitCount }).map((_, idx) => {
                const angle = (idx / orbitCount) * 2 * Math.PI;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const deg = (angle * 180) / Math.PI;

                return (
                    <div
                        key={idx}
                        className="absolute flex items-center justify-center"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(${x}px, ${y}px) translate(-50%, -50%) translateZ(0)`
                        }}
                    >
                        {/* 1. 서클: 태양 홍염 불씨 & 혜성 꼬리 */}
                        {symbolKey === 'CIRCLE' && (
                            <div
                                className="relative flex items-center"
                                style={{
                                    transform: `rotate(${deg + 90}deg)`
                                }}
                            >
                                {/* 혜성 꼬리 스트림 */}
                                <div
                                    className="w-5 h-1.5 rounded-full opacity-60"
                                    style={{
                                        background: `linear-gradient(to left, ${color}, transparent)`
                                    }}
                                />
                                {/* 타오르는 코어 불씨 */}
                                <div
                                    className="w-3.5 h-3.5 rounded-full -ml-1 shadow-lg"
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        boxShadow: `0 0 10px ${color}, 0 0 4px #FFFFFF`
                                    }}
                                />
                            </div>
                        )}

                        {/* 2. 트라이앵글: 자전하는 에메랄드 프리즘 크리스탈 */}
                        {symbolKey === 'TRIANGLE' && (
                            <div
                                className="animate-spin"
                                style={{
                                    animationDuration: '3s'
                                }}
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    className="w-5 h-5 drop-shadow-md overflow-visible"
                                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                                >
                                    {/* 에메랄드 다면체 삼각 파편 */}
                                    <polygon
                                        points="10,2 18,17 2,17"
                                        fill="rgba(16, 185, 129, 0.45)"
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                    {/* 중심 굴절 코어 */}
                                    <polygon
                                        points="10,6 14,14 6,14"
                                        fill="#6EE7B7"
                                        opacity="0.8"
                                    />
                                </svg>
                            </div>
                        )}

                        {/* 3. 크로스: 전자기 스파크 & 번개 방전체 */}
                        {symbolKey === 'CROSS' && (
                            <div className="relative flex items-center justify-center">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 overflow-visible animate-pulse"
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${color})`,
                                        animationDuration: '0.8s'
                                    }}
                                >
                                    {/* 4방향 전격 스타버스트 */}
                                    <path
                                        d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
                                        fill="#FFFFFF"
                                        stroke={color}
                                        strokeWidth="1.5"
                                    />
                                    <circle cx="12" cy="12" r="3" fill="#93C5FD" />
                                </svg>
                            </div>
                        )}

                        {/* 4. 스퀘어: 양자 데이터 큐브 & 홀로그램 비트 복셀 */}
                        {symbolKey === 'SQUARE' && (
                            <div
                                className="animate-spin"
                                style={{
                                    animationDuration: '6s',
                                    animationDirection: 'reverse'
                                }}
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    className="w-5 h-5 drop-shadow-md overflow-visible"
                                    style={{ filter: `drop-shadow(0 0 7px ${color})` }}
                                >
                                    {/* 외곽 양자 큐브 */}
                                    <rect
                                        x="3"
                                        y="3"
                                        width="14"
                                        height="14"
                                        rx="3"
                                        fill="rgba(217, 70, 239, 0.35)"
                                        stroke={color}
                                        strokeWidth="2"
                                    />
                                    {/* 내부 홀로그램 비트 코어 */}
                                    <rect
                                        x="7"
                                        y="7"
                                        width="6"
                                        height="6"
                                        rx="1"
                                        fill="#FFFFFF"
                                        opacity="0.85"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
