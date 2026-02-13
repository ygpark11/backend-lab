import React from 'react';
import { Check, Copy, Coffee, X, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const DonationModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    // 환경 변수에서 계좌 정보 불러오기
    const BANK_INFO = {
        bankName: import.meta.env.VITE_BANK_NAME || "은행명 미설정",
        accountNumber: import.meta.env.VITE_BANK_ACCOUNT || "계좌번호 미설정",
        holder: import.meta.env.VITE_BANK_HOLDER || "예금주 미설정"
    };

    const handleCopy = () => {
        const text = `${BANK_INFO.bankName} ${BANK_INFO.accountNumber}`;
        navigator.clipboard.writeText(text);
        toast.success("계좌번호가 복사되었습니다! ☕", {
            icon: <Check className="w-5 h-5 text-green-500" />,
            style: { background: '#333', color: '#fff' }
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            {/* 배경 클릭 시 닫기 */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* 모달 본문 */}
            <div className="relative bg-[#1a1a1a] border border-yellow-500/30 w-full max-w-md rounded-2xl p-8 shadow-2xl shadow-yellow-500/10 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <Coffee className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">
                        개발자에게 <span className="text-yellow-400">커피 한 잔</span> 쏘기
                    </h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        보내주신 후원금은 <span className="text-white font-bold">서버 유지비</span>와<br/>
                        <span className="text-white font-bold">새로운 기능 개발</span>에 소중하게 사용됩니다.
                    </p>
                </div>

                {/* 계좌 정보 카드 */}
                <div className="bg-black/40 rounded-xl p-5 border border-white/10 mb-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            {BANK_INFO.bankName}
                        </span>
                        <span className="text-[11px] text-gray-500">예금주: {BANK_INFO.holder}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-mono font-bold text-yellow-100 tracking-wider">
                            {BANK_INFO.accountNumber}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg transition-colors active:scale-95 flex items-center gap-1.5 font-bold text-xs shadow-lg shadow-yellow-500/20"
                        >
                            <Copy className="w-3.5 h-3.5" /> 복사
                        </button>
                    </div>
                </div>

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold py-3 rounded-xl transition-all border border-white/5 text-xs"
                >
                    마음만 받을게요 (닫기)
                </button>

                <div className="mt-4 flex justify-center gap-1 text-[10px] text-gray-600">
                    <Heart className="w-3 h-3 text-red-900/40 fill-current" />
                    <span>Always Thank You</span>
                </div>
            </div>
        </div>
    );
};

export default DonationModal;