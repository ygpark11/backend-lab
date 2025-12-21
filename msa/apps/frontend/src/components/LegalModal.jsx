import React, { useState } from 'react';
import { X, Shield, FileText } from 'lucide-react';

const LegalModal = ({ isOpen, onClose, defaultTab = 'terms' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab); // 'terms' or 'privacy'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-ps-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[80vh]">

                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {activeTab === 'terms' ? <FileText className="text-blue-400"/> : <Shield className="text-green-400"/>}
                        {activeTab === 'terms' ? '이용약관' : '개인정보 처리방침'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X /></button>
                </div>

                {/* 탭 버튼 */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'terms' ? 'bg-white/10 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        이용약관 (Terms)
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'privacy' ? 'bg-white/10 text-white border-b-2 border-green-500' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        개인정보처리방침 (Privacy)
                    </button>
                </div>

                {/* 내용 (스크롤 영역) */}
                <div className="p-6 overflow-y-auto text-sm text-gray-400 leading-relaxed space-y-6 custom-scrollbar">
                    {activeTab === 'terms' ? (
                        <>
                            <p><strong>제1조 (목적)</strong><br/>본 약관은 PS Tracker(이하 "서비스")가 제공하는 게임 가격 추적 서비스의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>

                            <p><strong>제2조 (서비스의 제공)</strong><br/>
                                1. 본 서비스는 PlayStation Store의 공개된 가격 정보를 수집하여 제공하는 포트폴리오용 비영리 프로젝트입니다.<br/>
                                2. 서비스는 "있는 그대로(As-Is)" 제공되며, 정보의 완전성이나 정확성을 보장하지 않습니다.</p>

                            <p><strong>제3조 (면책 조항)</strong><br/>
                                1. 본 서비스는 Sony Interactive Entertainment와 무관하며, 모든 게임 이미지와 상표권은 원저작자에게 있습니다.<br/>
                                2. 본 서비스의 정보를 이용해 발생한 구매 결정 및 결과에 대한 책임은 사용자 본인에게 있습니다.</p>
                        </>
                    ) : (
                        <>
                            <p><strong>1. 수집하는 개인정보 항목</strong><br/>
                                서비스는 회원가입 및 원활한 서비스 이용을 위해 구글 OAuth 로그인을 통해 아래의 정보를 수집합니다.<br/>
                                - 필수항목: 이메일 주소, 이름(닉네임), 프로필 사진 URL</p>

                            <p><strong>2. 개인정보의 수집 및 이용 목적</strong><br/>
                                - 서비스 이용에 따른 본인 식별 및 부정 이용 방지<br/>
                                - 찜 목록(Wishlist) 저장 및 관리 기능 제공</p>

                            <p><strong>3. 개인정보의 보유 및 이용 기간</strong><br/>
                                - 이용자가 회원 탈퇴를 요청하거나, 서비스 종료 시까지 보유합니다.<br/>
                                - 탈퇴 시 해당 사용자의 개인정보는 지체 없이 파기됩니다.</p>

                            <p><strong>4. 쿠키(Cookie)의 운용</strong><br/>
                                - 로그인 세션 유지를 위해 쿠키 또는 로컬 스토리지(LocalStorage)를 사용합니다.</p>
                        </>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default LegalModal;