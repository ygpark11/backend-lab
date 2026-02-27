import React, { useState, useEffect } from 'react';
import { X, Shield, FileText } from 'lucide-react';

const LegalModal = ({ isOpen, onClose, defaultTab = 'terms' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">

                {/* 헤더 */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/40">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {activeTab === 'terms' ? <FileText className="w-5 h-5 text-blue-400"/> : <Shield className="w-5 h-5 text-green-400"/>}
                        {activeTab === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 탭 버튼 */}
                <div className="flex border-b border-white/10 bg-black/20">
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${
                            activeTab === 'terms'
                                ? 'text-white border-b-2 border-blue-500 bg-white/5'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                        이용약관
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${
                            activeTab === 'privacy'
                                ? 'text-white border-b-2 border-green-500 bg-white/5'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                        개인정보 처리방침
                    </button>
                </div>

                {/* 내용 (스크롤 영역) */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-sm text-gray-300 leading-7 space-y-8 bg-[#1a1a1a]">
                    {activeTab === 'terms' ? (
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-white font-bold mb-2 flex items-center gap-2">제1조 (목적)</h3>
                                <p className="text-gray-400">
                                    본 약관은 <strong>PS Tracker</strong>(이하 "서비스")가 제공하는 PlayStation 게임 가격 추적 및 정보 제공 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2">제2조 (정보의 제공 및 면책)</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li>본 서비스는 PlayStation Store의 공개된 데이터를 기반으로 가격 정보를 제공합니다.</li>
                                    <li>서비스 내의 가격 정보는 실시간 변동이 있을 수 있으며, <strong>정보의 정확성이나 완전성을 보장하지 않습니다.</strong></li>
                                    <li>사용자의 구매 결정에 따른 결과 및 손해에 대해 서비스 제공자는 법적 책임을 지지 않습니다. 구매 전 반드시 공식 스토어에서 최종 가격을 확인하시기 바랍니다.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2">제3조 (지적재산권)</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li>본 서비스는 <strong>Sony Interactive Entertainment(SIE)</strong>와 제휴되거나 승인받지 않았습니다.</li>
                                    <li>서비스 내 표시되는 게임의 타이틀, 이미지, 로고 등의 지적재산권은 해당 저작권자에게 있으며, 본 서비스는 이를 정보 제공의 목적으로만 인용합니다.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-yellow-500">제4조 (광고 및 외부 링크)</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li>본 서비스는 안정적인 서버 운영 및 유지 보수를 위해 <strong>화면 일부에 광고(Google AdSense 등)를 게재할 수 있습니다.</strong></li>
                                    <li>본 서비스는 편의를 위해 PS Store 등 외부 사이트로 연결되는 링크를 제공합니다. 외부 사이트에서의 활동이나 결제 등은 해당 사이트의 정책이 적용되오니 이용에 참고해 주시기 바랍니다.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-red-400">제5조 (이용 제한 및 금지행위)</h3>
                                <p className="text-gray-400 mb-2">사용자는 본 서비스 이용 시 다음 각 호의 행위를 하여서는 안 됩니다.</p>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li><strong>데이터 스크래핑:</strong> 운영자의 사전 동의 없이 로봇, 스파이더, 스크래퍼 등 자동화된 도구를 사용하여 데이터를 수집하는 행위</li>
                                    <li><strong>서버 공격:</strong> 비정상적으로 과도한 트래픽을 유발하여 서비스의 안정적인 운영을 방해하는 행위 (DDoS 등)</li>
                                    <li><strong>역공학:</strong> 서비스의 소스 코드를 복제, 분해, 모방하거나 변형하는 행위</li>
                                </ul>
                                <p className="text-gray-400 mt-2 text-xs">
                                    ※ 위반 행위 적발 시 IP 차단 및 법적 조치가 취해질 수 있습니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2">제6조 (데이터 권리 및 재사용)</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li>본 서비스가 가공한 데이터(가격 변동 그래프, 할인율 분석 등)의 무단 전재 및 재배포를 금지합니다.</li>
                                    <li>단, 원저작권자(SIE)가 소유한 원천 데이터(게임 이미지, 타이틀 등)는 본 조항의 적용을 받지 않습니다.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2">제7조 (서비스 중단)</h3>
                                <p className="text-gray-400">
                                    운영자의 사정으로 인해 사전 고지 없이 서비스가 변경되거나 종료될 수 있습니다.
                                </p>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-xs text-gray-400">
                                PS Tracker는 사용자의 개인정보를 소중히 보호하며, 서비스 제공에 꼭 필요한 최소한의 정보만 수집합니다.
                            </div>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-green-400">1. 개인정보의 수집 항목 및 이용 목적</h3>
                                <p className="mb-2 text-gray-300">
                                    Google OAuth 연동 시 필수 정보 수집에 동의하지 않으실 수 있으나, 이 경우 로그인이 필요한 서비스(찜하기, 알림 수신 등) 이용이 제한됩니다.
                                </p>
                                <ul className="list-disc pl-4 space-y-2 text-gray-400 bg-black/20 p-3 rounded border border-white/5">
                                    <li><strong>수집 항목:</strong> 이메일 주소, 이름(Google 프로필 이름), 프로필 이미지 URL</li>
                                    <li><strong>이용 목적:</strong> 사용자 식별, 맞춤형 기능(찜 목록 관리, 가격 알림 등) 제공, 서비스 부정이용 방지</li>
                                    <li><strong>수집 방법:</strong> 최초 Google 로그인 시 자동 수집</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-green-400">2. 서비스 이용 과정에서 수집되는 정보</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li><strong>서비스 분석(GA4):</strong> 사용자 환경 최적화 및 통계 분석을 위해 Google Analytics를 사용하며, 이 과정에서 익명화된 기기 정보, 방문 기록 등이 수집될 수 있습니다.</li>
                                    <li><strong>푸시 알림:</strong> 찜한 게임의 할인 알림 서비스 제공을 위해, 알림 수신에 동의한 사용자에 한하여 <strong>브라우저 알림 토큰(FCM)</strong>이 수집됩니다.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-green-400">3. 개인정보의 보유 및 파기</h3>
                                <p className="text-gray-400 mb-2">
                                    수집된 개인정보는 <strong>서비스 종료 시 또는 사용자의 개인정보 파기 요청 시까지</strong> 안전하게 보관되며, 목적 달성 시 복구할 수 없는 방법으로 지체 없이 파기됩니다.
                                </p>
                                {/* 🚀 서비스 이메일 적용 완료! */}
                                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-gray-400">
                                    ※ 현재 서비스 내에 자동 회원탈퇴 기능이 제공되지 않습니다. 계정 삭제 및 개인정보 파기를 원하시는 경우, 아래 이메일로 요청해 주시면 지체 없이 처리해 드립니다.<br/>
                                    <strong className="text-gray-300 mt-2 inline-block">
                                        📧 문의 및 탈퇴 요청: pstracker.help@gmail.com
                                    </strong>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-green-400">4. 로그인 상태 유지 및 쿠키(Cookie) 활용</h3>
                                <ul className="list-disc pl-4 space-y-1 text-gray-400">
                                    <li>본 서비스는 사용자의 로그인 상태를 안전하게 유지하기 위해 브라우저의 <strong>쿠키(Cookie) 기술</strong>을 활용합니다.</li>
                                    <li>인증 정보는 외부의 비정상적인 접근으로부터 보호하기 위해 암호화 및 <strong>보안이 강화된 방식(HttpOnly 등)</strong>으로 관리됩니다.</li>
                                    <li>사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 및 개인화 서비스 이용에 제한이 있을 수 있습니다.</li>
                                </ul>
                            </section>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-white/10 bg-black/40 text-center">
                    <button
                        onClick={onClose}
                        className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg text-sm"
                    >
                        확인했습니다
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalModal;