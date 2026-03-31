import React from 'react';
import { Check, Copy, Server, X, Heart } from 'lucide-react';
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
        toast.success("계좌번호가 복사되었습니다!", {
            icon: <Check className="w-5 h-5 text-green-600 dark:text-green-500" />,
            style: {
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-default)'
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-backdrop backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-base border border-[color:var(--bento-yellow-border)] w-full max-w-md rounded-2xl p-8 shadow-2xl shadow-[var(--bento-yellow-shadow)] animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="bg-[var(--bento-yellow-from)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-[color:var(--bento-yellow-border)]">
                        <Server className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <h2 className="text-xl font-black text-primary mb-2">
                        열일하는 <span className="text-yellow-700 dark:text-yellow-500">감자 서버</span> 밥 주기
                    </h2>
                    <p className="text-sm text-secondary leading-relaxed">
                        보내주신 소중한 후원금은 <span className="text-primary font-bold">서버 유지비</span>와<br/>
                        <span className="text-primary font-bold">새로운 기능 개발</span>에 전액 사용됩니다.
                    </p>
                </div>

                <div className="bg-surface rounded-xl p-5 border border-divider mb-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">{BANK_INFO.bankName}</span>
                        <span className="text-[11px] text-secondary">예금주: {BANK_INFO.holder}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-mono font-bold text-primary tracking-wider">{BANK_INFO.accountNumber}</span>
                        <button onClick={handleCopy} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg transition-colors active:scale-95 flex items-center gap-1.5 font-bold text-xs shadow-lg shadow-yellow-500/20">
                            <Copy className="w-3.5 h-3.5" /> 복사
                        </button>
                    </div>
                </div>

                <button onClick={onClose} className="w-full bg-surface hover:bg-surface-hover text-secondary hover:text-primary font-bold py-3 rounded-xl transition-all border border-divider text-xs">
                    마음만 받을게요 (닫기)
                </button>

                <div className="mt-4 flex justify-center gap-1 text-[10px] text-muted">
                    <Heart className="w-3 h-3 text-red-600 dark:text-red-500 opacity-50 fill-current" />
                    <span>Always Thank You</span>
                </div>
            </div>
        </div>
    );
};

export default DonationModal;