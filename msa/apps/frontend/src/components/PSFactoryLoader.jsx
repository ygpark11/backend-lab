import React, { useState, useEffect } from 'react';
import { Circle, Triangle, Square, X as XIcon, Settings } from 'lucide-react';

const PSFactoryLoader = ({ isOpen, onClose, gameName }) => {
    const [step, setStep] = useState(0);
    const [isYellow, setIsYellow] = useState(false);

    const scenarios = [
        { time: 0, text: `진열장에서 [${gameName}]의 잠금을 해제했습니다! 공장으로 이송 중...` },
        { time: 8000, text: "추출된 데이터를 온전히 담아낼 투명 패키지 케이스를 성형하는 중..." },
        { time: 16000, text: "고해상도 아트워크와 원석 데이터를 블루레이 디스크에 정밀하게 굽는 중..." },
        { time: 24000, text: "컨트롤러 세모 버튼에 노란색 칠하는 중... 아차, 초록색이구나! 서둘러 덧칠하는 중..." },
        { time: 34000, text: "케이스를 닫고 플레이스테이션 공식 정품 인증 홀로그램 씰을 꾹꾹 눌러 붙이는 중..." },
        { time: 44000, text: "완벽하게 포장된 타이틀을 메인 진열장으로 보내기 위해 컨베이어 벨트에 올리는 중..." },
        { time: 54000, text: "최종 데이터 정합성 검증 중... 트래커가 열심히 일하고 있습니다!" }
    ];

    useEffect(() => {
        if (!isOpen) return;

        setStep(0);
        setIsYellow(false);

        const timers = scenarios.map((scenario, index) => {
            return setTimeout(() => {
                setStep(index);
                if (index === 3) {
                    setIsYellow(true);
                    setTimeout(() => setIsYellow(false), 2500);
                }
            }, scenario.time);
        });

        const fallbackTimer = setTimeout(() => {
            setStep(scenarios.length - 1);
        }, 60000);

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(fallbackTimer);
        };
    }, [isOpen, gameName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-base/95 backdrop-blur-sm animate-fadeIn p-4 sm:p-8 overflow-hidden transition-colors duration-500">

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes gpu-scan {
                    0% { transform: translateY(-150px); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(150px); opacity: 0; }
                }
            `}} />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-10">
                <Settings className="absolute w-96 h-96 text-ps-blue" style={{ animation: 'spin 20s linear infinite', top: '-10%', left: '-10%' }} />
                <Settings className="absolute w-64 h-64 text-purple-500" style={{ animation: 'spin 15s linear infinite reverse', bottom: '10%', right: '-5%' }} />
                <Settings className="absolute w-40 h-40 text-primary" style={{ animation: 'spin 10s linear infinite', bottom: '20%', left: '20%' }} />
            </div>

            <div className="absolute top-6 w-full text-center px-4 animate-slideDown z-50">
                <button
                    onClick={onClose}
                    className="bg-surface hover:bg-surface-hover border border-divider-strong text-primary px-6 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto shadow-md"
                >
                    <Settings className="w-4 h-4 text-ps-blue animate-spin-slow" /> 백그라운드에서 계속 진행하기 (닫기)
                </button>
                <div className="mt-4">
                    <span className="bg-surface border border-divider text-secondary px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-bold shadow-sm inline-block">
                        창을 닫아도 공장은 멈추지 않습니다. 조립 완료 시 알려드릴게요!
                    </span>
                </div>
            </div>

            {/* 공장 무대 */}
            <div className="relative w-full max-w-lg flex flex-col items-center justify-center min-h-[40vh] gap-10 mt-10">

                <div className={`flex items-center gap-5 sm:gap-8 relative z-10 p-6 sm:p-8 bg-surface rounded-3xl border border-divider shadow-xl transition-all duration-700 overflow-hidden
                    ${step >= 5 ? 'animate-bounce border-ps-blue/50 shadow-[0_15px_40px_rgba(59,130,246,0.2)]' : ''} 
                `}>

                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                        <div className="w-full h-[2px] bg-ps-blue shadow-[0_0_20px_rgba(59,130,246,1)]" style={{ animation: 'gpu-scan 2s linear infinite' }}></div>
                    </div>

                    {/* 네모 (비활성 상태: text-muted 로 뚜렷하게) */}
                    <div className="relative flex justify-center items-center w-12 h-12 z-10">
                        <Square className={`w-10 h-10 sm:w-12 sm:h-12 stroke-[3px] transition-all duration-700 
                            ${step >= 1 ? 'text-[#E8789C] drop-shadow-[0_0_15px_rgba(232,120,156,0.6)] scale-110 animate-pulse' : 'text-muted scale-90'}
                        `} />
                    </div>

                    {/* 동그라미 */}
                    <div className="relative flex justify-center items-center w-12 h-12 z-10">
                        <Circle className={`w-10 h-10 sm:w-12 sm:h-12 stroke-[3px] transition-all duration-700 
                            ${step >= 2 ? 'text-[#FF3E3E] drop-shadow-[0_0_15px_rgba(255,62,62,0.6)] scale-110' : 'text-muted scale-90'}
                        `} style={{ animation: step >= 2 ? 'spin 1.5s linear infinite' : 'none' }} />
                    </div>

                    {/* 세모 */}
                    <div className="relative flex justify-center items-center w-12 h-12 z-10">
                        <Triangle className={`w-10 h-10 sm:w-12 sm:h-12 stroke-[3px] transition-colors duration-300 
                            ${step >= 3 ? (isYellow ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-bounce' : 'text-[#00A39D] drop-shadow-[0_0_15px_rgba(0,163,157,0.6)] scale-110') : 'text-muted scale-90'}
                        `} style={{ animation: step >= 3 ? (isYellow ? 'none' : 'bounce 2.5s infinite') : 'none' }} />
                    </div>

                    {/* 엑스 */}
                    <div className="relative flex justify-center items-center w-12 h-12 z-10">
                        <XIcon className={`w-10 h-10 sm:w-12 sm:h-12 stroke-[4px] transition-all duration-700 
                            ${step >= 4 ? 'text-[#4E6CBB] drop-shadow-[0_0_20px_rgba(78,108,187,0.8)] scale-110' : 'text-muted scale-90'}
                        `} style={{ animation: step >= 4 ? 'spin 3s linear infinite reverse' : 'none' }} />
                    </div>
                </div>

                {/* 텍스트 & 무한 게이지 영역 */}
                <div className="w-full relative z-10 flex flex-col items-center px-4 text-center">
                    <p className={`
                        text-center text-sm sm:text-base font-bold h-12 sm:h-14 flex items-center justify-center px-4 transition-all duration-300
                        ${step === 6 ? 'text-blue-600 dark:text-blue-400 animate-pulse drop-shadow-sm' : 'text-primary'}
                    `}>
                        {scenarios[step].text}
                    </p>

                    <div className="w-full mt-6 flex flex-col items-center gap-2 max-w-md">
                        <div className="relative h-2 w-full bg-surface rounded-full overflow-hidden border border-divider shadow-inner">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(59,130,246,0.6)_10px,rgba(59,130,246,0.6)_20px)] animate-[progress_1s_linear_infinite]"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-base via-transparent to-base pointer-events-none"></div>
                        </div>

                        <div className="flex justify-between w-full text-[10px] sm:text-xs font-black tracking-widest px-1">
                            <span className="text-blue-600 dark:text-blue-400 animate-pulse">
                                FACTORY IN PROGRESS...
                            </span>
                            <span className="text-blue-600 dark:text-blue-400">
                                <Settings className="w-3.5 h-3.5 animate-spin" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PSFactoryLoader;