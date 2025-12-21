import React from 'react';
import { X, Flame, CheckCircle, Info, XCircle, Timer, Sparkles } from 'lucide-react';

const GuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-ps-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-ps-blue to-blue-900 p-6">
                    <h2 className="text-2xl font-black text-white">PS Tracker 가이드 📘</h2>
                    <p className="text-blue-200 text-sm">알아두면 쓸모있는 꿀기능 소개</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* 1. 전투력 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">가성비 전투력 🔥</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                <span className="text-orange-400 font-bold">메타스코어(재미)</span>와 <span className="text-green-400 font-bold">가격(저렴함)</span>을 조합해 계산한 수치입니다. 점수가 높을수록 "갓성비" 게임입니다!
                            </p>
                        </div>
                    </div>

                    {/* 2. 신호등 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">가격 신호등 🚦</h3>
                            <ul className="text-sm text-gray-400 space-y-1 mt-1">
                                <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> <span className="text-green-400">초록불:</span> 역대 최저가 근접! 지르세요.</li>
                                <li className="flex items-center gap-2"><Info className="w-3 h-3 text-yellow-500" /> <span className="text-yellow-400">노란불:</span> 나쁘지 않은 가격입니다.</li>
                                <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-500" /> <span className="text-red-400">빨간불:</span> 비싸요. 할인을 기다리세요.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 3. 플래티넘 & 막차 */}
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">뱃지 설명 🏷️</h3>
                            <ul className="text-sm text-gray-400 space-y-1 mt-1">
                                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-yellow-400" /> <strong className="text-yellow-400">플래티넘 딜:</strong> 평점 85점+ & 반값 할인! 검증된 명작.</li>
                                <li className="flex items-center gap-2"><Timer className="w-3 h-3 text-red-400" /> <strong className="text-red-400">막차 탑승:</strong> 할인 종료가 24시간도 안 남았습니다!</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                    <button onClick={onClose} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                        알겠습니다! 🚀
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideModal;