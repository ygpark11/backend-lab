import React, { useState } from 'react';
import { X, Target, TrendingDown, ShieldAlert, Crosshair, Edit2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TargetPriceModal = ({ isOpen, onClose, game, defenseTier, onSubmit }) => {
    const [manualPrice, setManualPrice] = useState('');

    if (!isOpen || !game) return null;

    // [추가/수정] 현재 가장 싼 가격 (역대 최저가와 현재가 중 더 싼 것 찾기)
    const bestPrice = (game.lowestPrice && game.lowestPrice > 0)
        ? Math.min(game.lowestPrice, game.currentPrice)
        : game.currentPrice;

    // 할인을 한 번이라도 한 적이 있는지?
    const isDiscounted = bestPrice < game.originalPrice;
    // 현재 가격이 역대 최저가(또는 그 이하)인지?
    const isCurrentBest = game.currentPrice <= bestPrice;

    // 목표 1: (할인 없음: 정가 -20%) | (현재 최저가: 최저가 -10%) | (과거 최저가: 최저가 맞춤)
    const target1Price = isDiscounted
        ? (isCurrentBest ? Math.floor((bestPrice * 0.9) / 100) * 100 : bestPrice)
        : Math.floor((game.originalPrice * 0.8) / 100) * 100;
    const target1Title = isDiscounted
        ? (isCurrentBest ? "최저가 갱신 대기 (-10%)" : "역대 최저가 맞춤")
        : "첫 세일 대기 (20%)";
    const target1Desc = isDiscounted
        ? (isCurrentBest ? "현재 최저가에서 10% 추가 하락" : "가장 현실적인 존버 라인")
        : "무난한 첫 할인 목표";

    // 목표 2: (할인 없음: 정가 -30%) | (할인 중: 최저가 -20%)
    const target2Price = isDiscounted
        ? Math.floor((bestPrice * 0.8) / 100) * 100
        : Math.floor((game.originalPrice * 0.7) / 100) * 100;
    const target2Title = isDiscounted ? "존버 모드 (-20%)" : "본격 세일 대기 (30%)";
    const target2Desc = isDiscounted ? "최저가에서 20% 추가 하락" : "인내심이 필요한 라인";

    // 목표 3: (할인 없음: 정가 -50%) | (할인 중: 최저가 -30%)
    const target3Price = isDiscounted
        ? Math.floor((bestPrice * 0.7) / 100) * 100
        : Math.floor((game.originalPrice * 0.5) / 100) * 100;
    const target3Title = isDiscounted ? "극강의 존버 (-30%)" : "반값 타협 (50%)";
    const target3Desc = isDiscounted ? "최저가에서 30% 추가 하락" : "언젠가는 오겠지 마인드";

    const handleQuickSelect = (price) => {
        if (price >= game.currentPrice) {
            toast.error("현재 가격보다 낮은 목표가를 설정해주세요!");
            return;
        }
        onSubmit(price);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const price = parseInt(manualPrice.replace(/[^0-9]/g, ''), 10);
        if (price >= game.currentPrice) {
            toast.error("현재 가격보다 낮은 금액을 입력해주세요!");
            return;
        }
        if (price > 0 && price < game.currentPrice) {
            onSubmit(price);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setManualPrice(value ? Number(value).toLocaleString() : '');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden text-white flex justify-center items-center">
                <TriangleShape className="absolute top-[15%] left-[10%] w-32 h-32 rotate-12 animate-[pulse_6s_ease-in-out_infinite]" />
                <CircleShape className="absolute top-[25%] right-[15%] w-40 h-40 -rotate-12 animate-[pulse_8s_ease-in-out_infinite]" />
                <XShape className="absolute bottom-[20%] left-[20%] w-36 h-36 rotate-45 animate-[pulse_7s_ease-in-out_infinite]" />
                <SquareShape className="absolute bottom-[10%] right-[10%] w-28 h-28 -rotate-6 animate-[pulse_9s_ease-in-out_infinite]" />
            </div>

            <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
                <div className="flex justify-between items-center p-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Crosshair className="w-5 h-5 text-ps-blue" />
                        <h3 className="text-white font-bold text-lg">목표 가격 설정</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-2 relative z-10">
                        <ShieldAlert className={`w-8 h-8 ${defenseTier?.includes('S') || defenseTier?.includes('A') ? 'text-red-400' : 'text-green-400'}`} />
                        <div>
                            <span className="text-xs font-bold text-gray-400 block mb-1">현재 할인 방어력</span>
                            <span className="text-white font-black">{defenseTier || '데이터 수집 중'}</span>
                        </div>
                    </div>

                    <div className="space-y-2.5 relative z-10">
                        {/* 1번 버튼 */}
                        <button onClick={() => handleQuickSelect(target1Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-white/5 hover:bg-ps-blue/20 border border-white/10 hover:border-ps-blue/50 text-left transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            <div className="relative z-10">
                                <div className="text-white font-bold text-sm flex items-center gap-1.5">
                                    {isDiscounted ? <TrendingDown className="w-4 h-4 text-ps-blue"/> : <Target className="w-4 h-4 text-ps-blue"/>}
                                    {target1Title}
                                </div>
                                <div className="text-gray-400 text-xs mt-0.5">{target1Desc}</div>
                            </div>
                            <span className="text-ps-blue font-black relative z-10">{target1Price.toLocaleString()}원</span>
                            <TriangleShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-ps-blue opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>

                        {/* 2번 버튼 */}
                        <button onClick={() => handleQuickSelect(target2Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 text-left transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            <div className="relative z-10">
                                <div className="text-white font-bold text-sm flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-400"/> {target2Title}</div>
                                <div className="text-gray-400 text-xs mt-0.5">{target2Desc}</div>
                            </div>
                            <span className="text-purple-400 font-black relative z-10">{target2Price.toLocaleString()}원</span>
                            <CircleShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-purple-400 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>

                        {/* 3번 버튼 */}
                        <button onClick={() => handleQuickSelect(target3Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-left transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                            <div className="relative z-10">
                                <div className="text-white font-bold text-sm flex items-center gap-1.5">
                                    {isDiscounted ? <ShieldAlert className="w-4 h-4 text-red-400"/> : <AlertTriangle className="w-4 h-4 text-red-400"/>}
                                    {target3Title}
                                </div>
                                <div className="text-gray-400 text-xs mt-0.5">{target3Desc}</div>
                            </div>
                            <span className="text-red-400 font-black relative z-10">{target3Price.toLocaleString()}원</span>
                            <XShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-red-400 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>
                    </div>

                    <div className="pt-4 border-t border-white/10 relative z-10">
                        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Edit2 className="w-4 h-4 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    value={manualPrice}
                                    onChange={handleInputChange}
                                    placeholder="직접 입력 (예: 25,000)"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm pointer-events-none">원</span>
                            </div>
                            <button
                                type="submit"
                                disabled={!manualPrice}
                                className="px-4 py-2.5 bg-white/10 hover:bg-ps-blue text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-white/10 whitespace-nowrap"
                            >
                                설정
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

// SVG 도형들
const TriangleShape = (props) => <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L22 20H2L12 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
const CircleShape = (props) => <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5"/></svg>
const XShape = (props) => <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
const SquareShape = (props) => <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5"/></svg>

export default TargetPriceModal;