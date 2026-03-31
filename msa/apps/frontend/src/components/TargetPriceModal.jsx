import React, { useState } from 'react';
import { X, Target, TrendingDown, ShieldAlert, Crosshair, Edit2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TargetPriceModal = ({ isOpen, onClose, game, defenseTier, onSubmit }) => {
    const [manualPrice, setManualPrice] = useState('');

    if (!isOpen || !game) return null;

    const bestPrice = (game.lowestPrice && game.lowestPrice > 0)
        ? Math.min(game.lowestPrice, game.currentPrice)
        : game.currentPrice;

    const isDiscounted = bestPrice < game.originalPrice;
    const isCurrentBest = game.currentPrice <= bestPrice;

    const target1Price = isDiscounted
        ? (isCurrentBest ? Math.floor((bestPrice * 0.9) / 100) * 100 : bestPrice)
        : Math.floor((game.originalPrice * 0.8) / 100) * 100;
    const target1Title = isDiscounted
        ? (isCurrentBest ? "최저가 갱신 대기 (-10%)" : "역대 최저가 맞춤")
        : "첫 세일 대기 (20%)";
    const target1Desc = isDiscounted
        ? (isCurrentBest ? "현재 최저가에서 10% 추가 하락" : "가장 현실적인 존버 라인")
        : "무난한 첫 할인 목표";

    const target2Price = isDiscounted
        ? Math.floor((bestPrice * 0.8) / 100) * 100
        : Math.floor((game.originalPrice * 0.7) / 100) * 100;
    const target2Title = isDiscounted ? "존버 모드 (-20%)" : "본격 세일 대기 (30%)";
    const target2Desc = isDiscounted ? "최저가에서 20% 추가 하락" : "인내심이 필요한 라인";

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

    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm animate-fadeIn" onClick={handleBackgroundClick}>
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none overflow-hidden text-primary flex justify-center items-center">
                <TriangleShape className="absolute top-[15%] left-[10%] w-32 h-32 rotate-12 animate-[pulse_6s_ease-in-out_infinite]" />
                <CircleShape className="absolute top-[25%] right-[15%] w-40 h-40 -rotate-12 animate-[pulse_8s_ease-in-out_infinite]" />
                <XShape className="absolute bottom-[20%] left-[20%] w-36 h-36 rotate-45 animate-[pulse_7s_ease-in-out_infinite]" />
                <SquareShape className="absolute bottom-[10%] right-[10%] w-28 h-28 -rotate-6 animate-[pulse_9s_ease-in-out_infinite]" />
            </div>

            <div className="bg-base border border-divider rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative shadow-glow animate-in zoom-in-95 duration-200">

                <div className="flex justify-between items-center p-5 border-b border-divider bg-surface">
                    <div className="flex items-center gap-2">
                        <Crosshair className="w-5 h-5 text-ps-blue" />
                        <h3 className="text-primary font-bold text-lg">목표 가격 설정</h3>
                    </div>
                    <button onClick={onClose} className="text-secondary hover:text-primary transition-colors bg-base hover:bg-surface-hover p-1 rounded-md border border-divider">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <div className="bg-surface rounded-xl p-4 border border-divider shadow-sm flex flex-col items-center justify-center text-center gap-2 relative z-10">
                        <ShieldAlert className={`w-8 h-8 ${defenseTier?.includes('S') || defenseTier?.includes('A') ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`} />
                        <div>
                            <span className="text-xs font-bold text-secondary block mb-1">현재 할인 방어력</span>
                            <span className="text-primary font-black">{defenseTier || '데이터 수집 중'}</span>
                        </div>
                    </div>

                    <div className="space-y-2.5 relative z-10">
                        <button onClick={() => handleQuickSelect(target1Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-surface hover:bg-ps-blue/10 border border-divider hover:border-ps-blue text-left transition-all group shadow-sm">
                            <div className="relative z-10">
                                <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                                    {isDiscounted ? <TrendingDown className="w-4 h-4 text-ps-blue"/> : <Target className="w-4 h-4 text-ps-blue"/>}
                                    {target1Title}
                                </div>
                                <div className="text-secondary text-xs mt-0.5">{target1Desc}</div>
                            </div>
                            <span className="text-ps-blue font-black relative z-10">{target1Price.toLocaleString()}원</span>
                            <TriangleShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-ps-blue opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>

                        <button onClick={() => handleQuickSelect(target2Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-surface hover:bg-purple-500/10 border border-divider hover:border-purple-500 text-left transition-all group shadow-sm">
                            <div className="relative z-10">
                                <div className="text-primary font-bold text-sm flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-600 dark:text-purple-500"/> {target2Title}</div>
                                <div className="text-secondary text-xs mt-0.5">{target2Desc}</div>
                            </div>
                            <span className="text-purple-700 dark:text-purple-500 font-black relative z-10">{target2Price.toLocaleString()}원</span>
                            <CircleShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-purple-600 dark:text-purple-500 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>

                        <button onClick={() => handleQuickSelect(target3Price)} className="relative overflow-hidden w-full flex justify-between items-center p-4 rounded-xl bg-surface hover:bg-red-500/10 border border-divider hover:border-red-500 text-left transition-all group shadow-sm">
                            <div className="relative z-10">
                                <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                                    {isDiscounted ? <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-500"/> : <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-500"/>}
                                    {target3Title}
                                </div>
                                <div className="text-secondary text-xs mt-0.5">{target3Desc}</div>
                            </div>
                            <span className="text-red-700 dark:text-red-500 font-black relative z-10">{target3Price.toLocaleString()}원</span>
                            <XShape className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 text-red-600 dark:text-red-500 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition-all duration-500 pointer-events-none" />
                        </button>
                    </div>

                    <div className="pt-4 border-t border-divider relative z-10">
                        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Edit2 className="w-4 h-4 text-secondary" />
                                </div>
                                <input
                                    type="text"
                                    value={manualPrice}
                                    onChange={handleInputChange}
                                    placeholder="직접 입력 (예: 25,000)"
                                    className="w-full bg-surface border border-divider rounded-xl py-2.5 pl-9 pr-8 text-sm text-primary placeholder-secondary focus:outline-none focus:border-ps-blue focus:ring-1 focus:ring-ps-blue transition-all"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary text-sm pointer-events-none">원</span>
                            </div>
                            <button
                                type="submit"
                                disabled={!manualPrice}
                                className="px-4 py-2.5 bg-ps-blue hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-ps-blue whitespace-nowrap shadow-sm"
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