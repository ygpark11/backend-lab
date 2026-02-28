import React from 'react';
import { X, Flame, Circle, Triangle, Square, Timer, Sparkles, Tag, Siren, Rocket, Search, Gamepad2 } from 'lucide-react';

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

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                가성비 전투력 <Flame className="w-5 h-5 text-orange-500" />
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                <span className="text-orange-400 font-bold">IGDB 평점(재미)</span>와 <span className="text-green-400 font-bold">가격(저렴함)</span>을 조합해 계산한 수치입니다. 점수가 높을수록 무조건 사야 하는 "갓성비" 게임입니다!
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            <Siren className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                가격 신호등 <Siren className="w-5 h-5 text-green-500" />
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">PS 컨트롤러 버튼 모양으로 현재 가격 상태를 알려드려요.</p>
                            <ul className="text-sm text-gray-400 space-y-2.5">
                                <li className="flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-green-500 fill-current" />
                                    <span><strong className="text-green-400">BUY NOW:</strong> 역대 최저가 근접! (강력 추천)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Triangle className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span><strong className="text-yellow-400">GOOD OFFER:</strong> 꽤 괜찮은 가격입니다.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <X className="w-4 h-4 text-red-500 stroke-[3px]" />
                                    <span><strong className="text-red-400">WAIT:</strong> 비싸요. 다음 할인을 기다리세요.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Square className="w-4 h-4 text-blue-500 fill-current" />
                                    <span><strong className="text-blue-400">TRACKING:</strong> 아직 데이터를 모으고 있어요.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                            <Tag className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-3">
                                주요 뱃지 설명 <Tag className="w-5 h-5 text-yellow-400" />
                            </h3>
                            <ul className="text-sm text-gray-400 space-y-3">
                                <li className="flex items-center gap-2.5">
                                    <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                                    <span><strong className="text-yellow-400">플래티넘 딜:</strong> 평점 85점 이상 & 반값(50%) 이상 할인!</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">NEW</span>
                                    <span><strong className="text-green-400">신규 업데이트:</strong> 최근 3일 내에 새롭게 할인하거나 갱신된 게임</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Timer className="w-4 h-4 text-red-400 shrink-0" />
                                    <span><strong className="text-red-400">막차 탑승:</strong> 할인 종료가 24시간도 안 남았습니다!</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">마감임박</span>
                                    <span><strong className="text-red-400">마감 임박:</strong> 할인 종료가 3일 이내로 남았습니다.</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"><Gamepad2 className="w-3 h-3 fill-black" /> EXTRA</span>
                                    <span><strong className="text-yellow-400">스페셜 카탈로그:</strong> 스페셜/디럭스 회원 무료 플레이 가능</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">PLUS</span>
                                    <span><strong className="text-yellow-400">구독자 혜택:</strong> 에센셜 회원 이상 전용 추가 할인 적용</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2 border-t border-white/5">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-2">
                                200% 활용 꿀팁 💡
                            </h3>
                            <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside ml-1">
                                <li>화면 아래 둥둥 떠 있는 <strong>돋보기 버튼</strong>을 누르면 언제든 즉시 <strong>빠른 검색과 필터링</strong>이 가능해요.</li>
                                <li><strong>찜 목록(Wishlist)</strong>에 게임을 담아두면, 할인 알림도 받고 내가 이 사이트를 통해 <strong>총 얼마를 절약했는지</strong> 볼 수 있어요!</li>
                            </ul>
                        </div>
                    </div>

                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                    <button onClick={onClose} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        확인했습니다! <Rocket className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideModal;