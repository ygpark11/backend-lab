import React from 'react';
import LegalPageLayout, { ContactEmail, LegalList, LegalSection } from '../components/legal/LegalPageLayout';

const EFFECTIVE_DATE = '2026년 11월 4일';

// 개인정보 처리 위탁 업체 (country: 처리 국가)
const VENDORS = [
    { name: 'Oracle Corporation', purpose: '서버 및 데이터베이스 운영(Oracle Cloud)', items: '서비스 이용 중 처리되는 모든 정보', country: '대한민국(춘천)' },
    { name: 'Google LLC', purpose: 'Google 계정 로그인(OAuth)', items: '이메일 주소, 이름, 프로필 이미지 URL', country: '미국' },
    { name: 'Google LLC', purpose: '방문 통계 분석(Google Analytics 4)', items: '쿠키 식별자, 기기·브라우저 정보, 방문 기록', country: '미국' },
    { name: 'Google LLC', purpose: '광고 게재(Google AdSense)', items: '쿠키 식별자, 기기·브라우저 정보, 방문 기록', country: '미국' },
    { name: 'Google LLC', purpose: '푸시 알림 발송(Firebase Cloud Messaging)', items: '브라우저 알림 토큰', country: '미국' },
    { name: 'Functional Software, Inc. (Sentry)', purpose: '오류 추적 및 일부 세션 화면 재현', items: '오류 정보, 기기·브라우저 정보, 접속 경로, 화면 조작 기록', country: '미국' },
    { name: 'Cloudflare, Inc.', purpose: '콘텐츠 전송(CDN) 및 보안(봇·공격 차단)', items: '접속 IP, 기기·브라우저 정보, 요청 기록', country: '미국' },
];

const PrivacyPage = () => (
    <LegalPageLayout
        title="개인정보처리방침"
        description="PS Tracker가 수집하는 개인정보 항목, 이용 목적, 광고 쿠키 사용 및 거부 방법 안내"
        url="https://ps-signal.com/privacy"
        effectiveDate={EFFECTIVE_DATE}
    >
        <p className="p-4 rounded-2xl bg-surface border border-divider">
            PS Tracker(이하 "서비스")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 관련 문의를 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 공개합니다.
        </p>

        <LegalSection title="1. 개인정보의 처리 목적">
            <LegalList items={[
                '회원 식별 및 로그인 상태 유지',
                '찜 목록, 가격 알림, 필터 프리셋, 미니게임 순위 등 회원 전용 기능 제공',
                '찜한 게임의 할인·가격 변동 푸시 알림 발송',
                '서비스 이용 통계 분석, 오류 수정 및 품질 개선',
                '광고 게재',
                '부정 이용 및 비정상적인 접근 차단',
            ]} />
        </LegalSection>

        <LegalSection title="2. 처리하는 개인정보 항목">
            <LegalList items={[
                <><strong className="text-primary">Google 로그인 시:</strong> 이메일 주소, 이름(Google 프로필 이름), 프로필 이미지 URL</>,
                <><strong className="text-primary">서비스 이용 중 생성:</strong> 닉네임, 찜 목록, 필터 프리셋, 미니게임 점수, 알림 내역</>,
                <><strong className="text-primary">알림 수신에 동의한 경우:</strong> 브라우저 알림 토큰(FCM)</>,
                <><strong className="text-primary">자동으로 수집:</strong> 접속 IP, 기기·브라우저 정보, 방문 기록, 쿠키, 오류 정보</>,
            ]} />
            <p>로그인 없이도 게임 가격 조회 등 기본 기능은 이용할 수 있으며, 필수 정보 제공에 동의하지 않으면 회원 전용 기능 이용이 제한됩니다.</p>
        </LegalSection>

        <LegalSection title="3. 개인정보의 보유 기간 및 파기">
            <p>
                개인정보는 <strong className="text-primary">회원 탈퇴(삭제 요청) 시 또는 서비스 종료 시까지</strong> 보유하며, 목적이 달성되면 지체 없이 파기합니다. 다른 법령에 따라 보존해야 하는 경우에는 해당 기간 동안만 보관합니다.
            </p>
            <p>전자적 파일은 복구할 수 없는 방법으로 삭제하며, 종이 문서로 보관하는 개인정보는 없습니다. 장애 복구를 위한 데이터베이스 백업본은 생성일로부터 7일이 지나면 자동으로 삭제되므로, 삭제 요청 후 최대 7일간 백업본에 남아 있을 수 있습니다.</p>
            <p className="p-4 rounded-2xl bg-surface border border-divider">
                현재 서비스 내 회원 탈퇴 기능은 제공되지 않습니다. 계정 및 개인정보 삭제를 원하시면 <ContactEmail />로 요청해 주세요. 확인 후 지체 없이 처리합니다.
            </p>
        </LegalSection>

        <LegalSection title="4. 개인정보의 제3자 제공">
            <p>서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관이 법령에 정한 절차에 따라 요청하는 경우는 예외로 합니다.</p>
        </LegalSection>

        <LegalSection title="5. 개인정보 처리 위탁 및 국외 이전">
            <p>
                서비스는 원활한 운영을 위해 아래 업체에 개인정보 처리를 위탁하고 있습니다. 서버와 데이터베이스는 국내(춘천)에 있으며, 처리 국가가 <strong className="text-primary">미국</strong>인 업체에는 서비스 이용 시점에 네트워크를 통해 정보가 국외로 전송됩니다. 각 업체는 위탁 목적 달성 또는 해당 업체의 보존 정책에 따른 기간까지 정보를 보관합니다.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
                {VENDORS.map(v => (
                    <li key={v.purpose} className="p-4 rounded-2xl bg-surface border border-divider">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-primary">{v.name}</p>
                            <span className="shrink-0 px-2 py-0.5 rounded-full border border-divider text-[11px] font-bold text-muted">{v.country}</span>
                        </div>
                        <p className="mt-1">{v.purpose}</p>
                        <p className="mt-2 text-xs text-muted">{v.items}</p>
                    </li>
                ))}
            </ul>
            <p>국외 이전을 원하지 않으시면 로그인·알림 기능을 이용하지 않거나, 아래 6항의 방법으로 쿠키를 거부할 수 있습니다. 이 경우 일부 기능 이용이 제한될 수 있습니다.</p>
        </LegalSection>

        <LegalSection title="6. 쿠키 등 자동 수집 장치의 설치·운영 및 거부">
            <LegalList items={[
                <><strong className="text-primary">로그인 쿠키:</strong> 로그인 상태 유지를 위해 사용하며, 외부 스크립트가 읽을 수 없도록 HttpOnly 방식으로 관리합니다.</>,
                <><strong className="text-primary">브라우저 저장소:</strong> 화면 테마, 최근 본 게임 등 편의 설정은 이용자의 브라우저에만 저장되며 서버로 전송되지 않습니다.</>,
                <><strong className="text-primary">분석 쿠키:</strong> Google Analytics가 방문 통계를 위해 쿠키를 사용합니다.</>,
            ]} />
            <div className="p-4 rounded-2xl bg-surface border border-divider space-y-2">
                <p className="font-bold text-primary">광고 쿠키 안내</p>
                <LegalList items={[
                    'Google을 포함한 제3자 공급업체는 쿠키를 사용하여 이용자가 이 웹사이트 또는 다른 웹사이트를 이전에 방문한 기록을 기반으로 광고를 게재합니다.',
                    'Google은 광고 쿠키를 사용하여 이용자의 이 사이트 및 인터넷상의 다른 사이트 방문 기록을 바탕으로 Google과 파트너가 이용자에게 광고를 게재할 수 있도록 합니다.',
                    <>이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="font-bold text-ps-blue underline underline-offset-2">Google 광고 설정</a>에서 맞춤 광고를 거부할 수 있으며, <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="font-bold text-ps-blue underline underline-offset-2">www.aboutads.info</a>에서 제3자 공급업체의 맞춤 광고용 쿠키 사용을 거부할 수 있습니다.</>,
                ]} />
            </div>
            <p>브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 등 일부 기능을 이용할 수 없습니다.</p>
        </LegalSection>

        <LegalSection title="7. 이용자의 권리와 행사 방법">
            <p>이용자는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 닉네임은 마이페이지에서 직접 수정할 수 있으며, 그 밖의 요청은 <ContactEmail />로 보내주시면 지체 없이 조치합니다.</p>
        </LegalSection>

        <LegalSection title="8. 개인정보의 안전성 확보 조치">
            <LegalList items={[
                '모든 통신 구간 HTTPS 암호화',
                '인증 정보의 HttpOnly 쿠키 관리',
                '관리자 기능 접근 권한 제한',
            ]} />
        </LegalSection>

        <LegalSection title="9. 만 14세 미만 아동의 개인정보">
            <p>서비스는 만 14세 미만 아동의 개인정보를 수집하지 않는 것을 원칙으로 하며, 수집된 사실을 확인하면 지체 없이 파기합니다.</p>
        </LegalSection>

        <LegalSection title="10. 개인정보 보호책임자">
            <p>개인정보 관련 문의, 불만 처리, 피해 구제는 아래로 연락해 주세요.</p>
            <p className="p-4 rounded-2xl bg-surface border border-divider">
                <strong className="text-primary">PS Tracker 운영자</strong><br />
                이메일: <ContactEmail />
            </p>
        </LegalSection>

        <LegalSection title="11. 권익침해 구제 방법">
            <p>개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수 있습니다.</p>
            <LegalList items={[
                '개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr',
                '개인정보분쟁조정위원회: 1833-6972 / www.kopico.go.kr',
                '대검찰청: (국번없이) 1301 / www.spo.go.kr',
                '경찰청: (국번없이) 182 / ecrm.police.go.kr',
            ]} />
        </LegalSection>

        <LegalSection title="12. 개인정보처리방침의 변경">
            <p>이 방침은 {EFFECTIVE_DATE}부터 적용됩니다. 내용이 변경되는 경우 시행 7일 전부터 서비스 공지사항을 통해 안내합니다.</p>
        </LegalSection>
    </LegalPageLayout>
);

export default PrivacyPage;
