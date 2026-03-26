import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy, Medal, Award, Crown, Settings, Gamepad2,
    Bell, Moon, Edit3, Pickaxe, Zap, Shield, CheckCircle2,
    Triangle, Circle, X as XIcon, Square, Loader2, Lock,
    Mail, Copy, MessageSquare
} from 'lucide-react';
import PSGameImage from '../components/common/PSGameImage';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MyPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('trophies');
    const [isLoading, setIsLoading] = useState(true);

    const [profile, setProfile] = useState(null);
    const [pioneeredGames, setPioneeredGames] = useState([]);
    const [settings, setSettings] = useState({ priceAlert: true, nightMode: false });

    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editNicknameValue, setEditNicknameValue] = useState('');

    const handleContactClick = useCallback((e) => {
        e.preventDefault();
        const email = 'pstracker.help@gmail.com';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(email).then(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            }).catch(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            });
        } else {
            toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
        }

        setTimeout(() => {
            window.location.href = `mailto:${email}`;
        }, 500);
    }, []);

    useEffect(() => {
        const fetchMyPageData = async () => {
            setIsLoading(true);
            try {
                const [profileRes, gamesRes, settingsRes] = await Promise.all([
                    client.get('/api/v1/members/me/profile'),
                    client.get('/api/v1/members/me/pioneered'),
                    client.get('/api/v1/members/me/settings')
                ]);

                setProfile(profileRes.data);
                setPioneeredGames(gamesRes.data);
                setSettings(settingsRes.data);
            } catch (error) {
                console.error("마이페이지 데이터 로딩 실패:", error);
                toast.error("데이터를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyPageData();
    }, []);

    const handleToggleSetting = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        try {
            await client.put('/api/v1/members/me/settings', newSettings);
            if (key === 'nightMode') {
                toast(newSettings.nightMode ? '🌙 야간 스텔스 모드 활성화' : '☀️ 야간 알림 무음 해제', {
                    style: { background: '#333', color: '#fff' }
                });
            }
        } catch (error) {
            setSettings(settings);
            toast.error("설정 변경에 실패했습니다.");
        }
    };

    const handleUpdateNickname = async () => {
        const newNickname = editNicknameValue.trim();
        if (!newNickname) return toast.error("닉네임을 입력해주세요.");
        if (newNickname === profile.nickname) return setIsEditingNickname(false);

        const toastId = toast.loading("닉네임 변경 중...");
        try {
            const res = await client.put('/api/v1/members/me/nickname', { nickname: newNickname });

            // 화면의 프로필 데이터 업데이트 (Optimistic Update)
            setProfile({ ...profile, nickname: res.data });
            setIsEditingNickname(false);
            toast.success("닉네임이 성공적으로 변경되었습니다!", { id: toastId });
        } catch (error) {
            toast.error(error.response?.data || "닉네임 변경에 실패했습니다.", { id: toastId });
        }
    };

    const getTrophyStyle = (tier) => {
        switch (tier) {
            case 'PLATINUM': return { icon: Crown, color: 'text-cyan-300', glow: 'shadow-[0_0_15px_rgba(103,232,249,0.3)]' };
            case 'GOLD': return { icon: Trophy, color: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.2)]' };
            case 'SILVER': return { icon: Medal, color: 'text-gray-300', glow: 'shadow-[0_0_15px_rgba(209,213,219,0.2)]' };
            case 'BRONZE': return { icon: Award, color: 'text-orange-500', glow: '' };
            default: return { icon: Lock, color: 'text-gray-600', glow: '' }; // 잠금 상태 아이콘!
        }
    };

    const getTrophyTitle = (type, currentValue) => {
        switch (type) {
            case 'PIONEER':
                return { title: '개척자의 증명', desc: `새로운 데이터를 수집한 횟수 (현재: ${currentValue}회)` };
            case 'VOTE':
                return { title: '네온시티 평론가', desc: `커뮤니티 평가에 참여한 횟수 (현재: ${currentValue}회)` };
            case 'TIME':
                return { title: '생존자', desc: `PS Tracker 합류 후 경과 일수 (현재: ${currentValue}일)` };
            default:
                return { title: '알 수 없음', desc: '' };
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-ps-black flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-ps-blue animate-spin mb-4" />
                <p className="text-gray-400 font-bold tracking-widest text-sm animate-pulse">SYNCING TERMINAL...</p>
            </div>
        );
    }

    const highestTrophy = profile?.trophies.find(t => t.unlocked && t.tier === 'PLATINUM') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'GOLD') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'SILVER') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'BRONZE');

    // 기본 아바타 복구
    const AvatarIcon = highestTrophy ? getTrophyStyle(highestTrophy.tier).icon : Gamepad2;
    const avatarColor = highestTrophy ? getTrophyStyle(highestTrophy.tier).color : 'text-gray-400';

    return (
        <div className="min-h-screen bg-ps-black text-white p-4 sm:p-8 pt-20 sm:pt-24 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-ps-blue/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[30%] h-[50%] bg-[#E8789C]/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="relative p-5 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl mb-6 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-ps-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none flex gap-4 rotate-12 scale-150">
                        <Triangle className="w-24 h-24 stroke-[2px]" />
                        <Circle className="w-24 h-24 stroke-[2px]" />
                        <XIcon className="w-24 h-24 stroke-[2px]" />
                        <Square className="w-24 h-24 stroke-[2px]" />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full bg-gradient-to-b from-gray-800 to-black p-1 border border-white/20 shadow-xl flex items-center justify-center relative">
                            <div className="absolute inset-1 rounded-full border border-dashed border-white/20 animate-spin-slow pointer-events-none"></div>
                            <AvatarIcon className={`w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg ${avatarColor}`} />
                            <div className="absolute -bottom-1 -right-1 bg-ps-blue text-[10px] font-black px-2.5 py-0.5 rounded-md border border-white/20 shadow-lg">
                                Lv.{profile.level}
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left w-full">
                            <h2 className="text-gray-400 text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-ps-blue" /> PS Tracker Operative
                            </h2>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                                {isEditingNickname ? (
                                    <div className="flex items-center gap-2 animate-fadeIn">
                                        <input
                                            type="text"
                                            value={editNicknameValue}
                                            onChange={(e) => setEditNicknameValue(e.target.value)}
                                            maxLength={10}
                                            className="bg-black/50 border border-ps-blue text-white px-3 py-1 rounded-lg outline-none focus:ring-2 focus:ring-ps-blue/50 text-xl sm:text-2xl font-black w-32 sm:w-48 transition-all"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateNickname()}
                                        />
                                        <button onClick={handleUpdateNickname} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/40 rounded-md transition-colors border border-green-500/30">
                                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                        <button onClick={() => setIsEditingNickname(false)} className="p-1.5 bg-[#FF3E3E]/20 text-[#FF3E3E] hover:bg-[#FF3E3E]/40 rounded-md transition-colors border border-[#FF3E3E]/30">
                                            <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                                            {profile.nickname}
                                        </h1>
                                        <button
                                            onClick={() => {
                                                setEditNicknameValue(profile.nickname);
                                                setIsEditingNickname(true);
                                            }}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10 group"
                                        >
                                            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 w-full">
                                <div className="bg-black/40 border border-white/5 p-2 sm:p-3 rounded-lg backdrop-blur-md flex flex-col items-center sm:items-start relative overflow-hidden group hover:border-[#00A39D]/30 transition-colors">
                                    <Triangle className="absolute -bottom-2 -right-2 w-10 h-10 text-[#00A39D]/10 stroke-[3px] group-hover:text-[#00A39D]/20 transition-colors" />
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] font-bold uppercase mb-1 whitespace-nowrap relative z-10">절약 대기</p>
                                    <p className="text-[#00A39D] text-sm sm:text-lg font-black tracking-tight flex items-baseline gap-0.5 relative z-10">
                                        <span className="text-[10px] font-normal">₩</span>{(profile.totalSavedAmount / 1000).toFixed(0)}K
                                    </p>
                                </div>

                                <div className="bg-black/40 border border-white/5 p-2 sm:p-3 rounded-lg backdrop-blur-md flex flex-col items-center sm:items-start relative overflow-hidden group hover:border-[#4E6CBB]/30 transition-colors">
                                    <XIcon className="absolute -bottom-2 -right-2 w-10 h-10 text-[#4E6CBB]/10 stroke-[4px] group-hover:text-[#4E6CBB]/20 transition-colors" />
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] font-bold uppercase mb-1 whitespace-nowrap relative z-10">발굴 데이터</p>
                                    <p className="text-[#4E6CBB] text-sm sm:text-lg font-black tracking-tight flex items-baseline gap-0.5 relative z-10">
                                        {profile.pioneeredCount}<span className="text-[10px] font-normal">EA</span>
                                    </p>
                                </div>

                                <div className="bg-black/40 border border-white/5 p-2 sm:p-3 rounded-lg backdrop-blur-md flex flex-col items-center sm:items-start relative overflow-hidden group hover:border-[#E8789C]/30 transition-colors">
                                    <Square className="absolute -bottom-2 -right-2 w-10 h-10 text-[#E8789C]/10 stroke-[3px] group-hover:text-[#E8789C]/20 transition-colors" />
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] font-bold uppercase mb-1 whitespace-nowrap relative z-10">합류 일자</p>
                                    <p className="text-[#E8789C] text-xs sm:text-base font-bold tracking-tight mt-auto sm:mt-0 relative z-10">
                                        {profile.joinDate.replace(/-/g, '.').substring(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 snap-x px-1 -mx-1 [&::-webkit-scrollbar]:hidden">
                    <button onClick={() => setActiveTab('trophies')} className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap snap-start shrink-0 ${activeTab === 'trophies' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>
                        <Trophy className="w-4 h-4" /> 나의 업적
                    </button>
                    <button onClick={() => setActiveTab('logs')} className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap snap-start shrink-0 ${activeTab === 'logs' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>
                        <Gamepad2 className="w-4 h-4" /> 발굴 일지
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap snap-start shrink-0 ${activeTab === 'settings' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>
                        <Settings className="w-4 h-4" /> 시스템 설정
                    </button>
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'trophies' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-fadeIn">
                            {profile.trophies.map((trophy, idx) => {
                                const style = getTrophyStyle(trophy.tier);
                                const meta = getTrophyTitle(trophy.type, trophy.currentValue);
                                const Icon = style.icon;

                                return (
                                    <div key={idx} className={`p-4 rounded-xl border transition-all duration-500 flex items-center gap-4 ${trophy.unlocked ? 'bg-white/[0.02] border-white/10 hover:bg-white/5' : 'bg-black/40 border-white/5 opacity-50 grayscale'}`}>
                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 bg-black/60 border border-white/10 shadow-inner ${trophy.unlocked ? style.glow : ''}`}>
                                            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${style.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{trophy.unlocked ? trophy.tier : 'LOCKED'}</span>
                                            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{meta.title}</h3>
                                            <p className="text-[10px] sm:text-xs text-gray-400 truncate">{meta.desc}</p>
                                        </div>
                                        {trophy.unlocked && <CheckCircle2 className="w-4 h-4 text-green-500/50 ml-auto shrink-0" />}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs sm:text-sm font-bold text-gray-300 flex items-center gap-1.5"><Pickaxe className="w-4 h-4 text-ps-blue"/> 내가 발굴한 데이터</h3>
                                <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded text-gray-300 border border-white/5">Total {pioneeredGames.length}</span>
                            </div>

                            {pioneeredGames.length === 0 ? (
                                <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <Pickaxe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400 font-bold">아직 발굴한 데이터가 없습니다.</p>
                                    <button onClick={() => navigate('/discover')} className="mt-3 text-xs text-ps-blue hover:text-blue-400 font-bold">신작 수집소로 이동하기 &rarr;</button>
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory px-1 -mx-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                                    {pioneeredGames.map(game => (
                                        <div
                                            key={game.id}
                                            onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })}
                                            className="w-[130px] sm:w-[160px] shrink-0 snap-start group cursor-pointer"
                                        >
                                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 shadow-md mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-ps-blue/50 bg-ps-card">
                                                <PSGameImage src={game.imageUrl} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                                <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm p-1 rounded-md border border-white/10">
                                                    <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-200 drop-shadow-[0_0_3px_rgba(191,219,254,0.8)]" />
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-[11px] sm:text-xs text-white truncate group-hover:text-ps-blue transition-colors">{game.title}</h4>
                                            <p className="text-[9px] text-gray-500 font-medium mt-0.5">발굴: {game.date}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-fadeIn max-w-xl mx-auto sm:mx-0">

                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 sm:p-5 backdrop-blur-md mb-6">
                                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-1.5 uppercase tracking-widest"><Zap className="w-3.5 h-3.5 text-yellow-500"/> 알림 제어판</h3>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer" onClick={() => handleToggleSetting('priceAlert')}>
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className={`p-1.5 rounded-md shrink-0 transition-colors ${settings.priceAlert ? 'bg-[#00A39D]/20 text-[#00A39D]' : 'bg-white/5 text-gray-500'}`}>
                                                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm text-white truncate">위시리스트 가격 하락 알림</h4>
                                                <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">찜한 게임이 할인하면 푸시 수신</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors duration-300 shrink-0 ${settings.priceAlert ? 'bg-[#00A39D]' : 'bg-gray-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings.priceAlert ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer" onClick={() => handleToggleSetting('nightMode')}>
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className={`p-1.5 rounded-md shrink-0 transition-colors ${settings.nightMode ? 'bg-[#E8789C]/20 text-[#E8789C]' : 'bg-white/5 text-gray-500'}`}>
                                                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm text-white truncate">야간 스텔스 모드</h4>
                                                <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">22시~08시 사이에는 알림 무음</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors duration-300 shrink-0 ${settings.nightMode ? 'bg-[#E8789C]' : 'bg-gray-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings.nightMode ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-[#FF3E3E]/30 transition-colors cursor-pointer group mt-4"
                                         onClick={async () => {
                                             try {
                                                 await client.post('/api/v1/auth/logout');
                                             } catch (error) {
                                                 console.error("서버 로그아웃 처리 실패:", error);
                                             } finally {
                                                 localStorage.clear();
                                                 window.location.href = '/';
                                             }
                                         }}
                                    >
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className="p-1.5 rounded-md shrink-0 bg-[#FF3E3E]/10 text-[#FF3E3E] group-hover:bg-[#FF3E3E]/20 transition-colors">
                                                <Circle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm text-[#FF3E3E] truncate">기기 로그아웃</h4>
                                                <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">현재 브라우저에서 안전하게 연결 해제</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#121212]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                                <div className="p-4 sm:p-5 border-b border-white/5 flex items-center gap-3 bg-black/20">
                                    <Mail className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide">고객센터 & 제휴 문의</h3>
                                </div>

                                <div className="p-4 sm:p-5 bg-gradient-to-b from-transparent to-[#0a0a0a]">
                                    <div
                                        onClick={handleContactClick}
                                        className="group flex flex-col gap-4 sm:gap-5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-300 relative overflow-hidden shadow-lg"
                                    >
                                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors duration-300 pointer-events-none"></div>

                                        <div className="relative z-10 w-full">
                                            <h4 className="font-bold text-gray-200 text-sm sm:text-base mb-2.5 group-hover:text-blue-300 transition-colors flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                                                개발자에게 메시지 보내기
                                            </h4>

                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md text-[11px] sm:text-xs font-bold text-gray-300 shadow-sm">버그 리포트</span>
                                                <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md text-[11px] sm:text-xs font-bold text-gray-300 shadow-sm">기능 건의</span>
                                                <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md text-[11px] sm:text-xs font-bold text-gray-300 shadow-sm">커피 챗</span>
                                                <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 rounded-md text-[11px] sm:text-xs font-bold text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]">비즈니스 제휴</span>
                                            </div>

                                            <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed break-keep tracking-tight max-w-[280px] sm:max-w-none">
                                                <strong className="text-gray-100 font-medium">작은 의견</strong>이라도 소중하게 듣고 있습니다. <br className="block sm:hidden" />
                                                PS Tracker에 전하고 싶은 <strong className="text-gray-100 font-medium">이야기</strong>가 있다면 <strong className="text-gray-100 font-medium">언제든 편하게 메시지</strong>를 남겨주세요!
                                            </p>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 bg-black/80 rounded-xl border border-white/10 group-hover:border-blue-400/50 group-hover:bg-blue-900/20 transition-all duration-300 shadow-inner w-full sm:w-max mt-1">
                                            <span className="text-blue-300 group-hover:text-blue-200 text-xs sm:text-sm font-mono font-bold tracking-wider drop-shadow-md">pstracker.help@gmail.com</span>
                                            <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors shadow-sm">
                                                <Copy className="w-4 h-4 text-gray-300 group-hover:text-blue-300 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}