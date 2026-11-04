import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { ContactEmail, LegalList, LegalSection } from '../components/legal/LegalPageLayout';

const EFFECTIVE_DATE = '2026년 11월 4일';

const TermsPage = () => (
    <LegalPageLayout
        title="이용약관"
        description="PS Tracker 게임 가격 추적 서비스 이용 조건, 면책, 금지 행위 안내"
        url="https://ps-signal.com/terms"
        effectiveDate={EFFECTIVE_DATE}
    >
        <LegalSection title="제1조 (목적)">
            <p>이 약관은 <strong className="text-primary">PS Tracker</strong>(이하 "서비스")가 제공하는 PlayStation 게임 가격 추적 및 정보 제공 서비스의 이용 조건과 절차를 정하는 것을 목적으로 합니다.</p>
        </LegalSection>

        <LegalSection title="제2조 (회원 가입 및 탈퇴)">
            <LegalList items={[
                '회원 가입은 Google 계정 로그인으로 이루어지며, 로그인하지 않아도 가격 조회 등 기본 기능을 이용할 수 있습니다.',
                <>회원 탈퇴 및 개인정보 삭제는 <ContactEmail />로 요청할 수 있습니다.</>,
                '개인정보 처리에 관한 사항은 개인정보처리방침을 따릅니다.',
            ]} />
        </LegalSection>

        <LegalSection title="제3조 (정보의 제공 및 면책)">
            <LegalList items={[
                '서비스는 PlayStation Store의 공개된 데이터를 기반으로 가격 정보와 분석 결과를 제공합니다.',
                <>가격 정보는 실시간으로 변동될 수 있으며, 서비스는 <strong className="text-primary">정보의 정확성이나 완전성을 보장하지 않습니다.</strong> 구매 전 반드시 공식 스토어에서 최종 가격을 확인해 주세요.</>,
                '가격 신호등 등 분석 결과는 구매 판단을 돕기 위한 참고 정보이며, 서비스는 운영자의 고의 또는 중대한 과실이 없는 한 이용자의 구매 결정에 따른 손해에 대해 책임을 지지 않습니다.',
            ]} />
        </LegalSection>

        <LegalSection title="제4조 (지적재산권)">
            <LegalList items={[
                <>서비스는 <strong className="text-primary">Sony Interactive Entertainment(SIE)</strong>와 제휴하거나 승인받지 않았습니다.</>,
                '서비스에 표시되는 게임 타이틀, 이미지, 로고 등의 지적재산권은 각 권리자에게 있으며, 서비스는 이를 정보 제공 목적으로만 인용합니다.',
                '서비스가 직접 가공한 데이터(가격 변동 그래프, 할인율 분석, 가격 신호등 등)의 무단 전재 및 재배포를 금지합니다. 단, 원 권리자가 소유한 원천 데이터는 이 조항의 적용을 받지 않습니다.',
            ]} />
        </LegalSection>

        <LegalSection title="제5조 (광고 및 외부 링크)">
            <LegalList items={[
                <>서비스는 안정적인 운영을 위해 화면 일부에 광고(Google AdSense 등)를 게재합니다. 광고 쿠키에 관한 사항은 <Link to="/privacy" className="font-bold text-ps-blue underline underline-offset-2">개인정보처리방침</Link>을 확인해 주세요.</>,
                '서비스는 PS Store 등 외부 사이트로 연결되는 링크를 제공합니다. 외부 사이트에서의 활동과 결제에는 해당 사이트의 정책이 적용됩니다.',
            ]} />
        </LegalSection>

        <LegalSection title="제6조 (금지 행위)">
            <p>이용자는 서비스 이용 시 다음 행위를 해서는 안 됩니다.</p>
            <LegalList items={[
                <><strong className="text-primary">데이터 스크래핑:</strong> 운영자의 사전 동의 없이 로봇, 스파이더, 스크래퍼 등 자동화된 도구로 데이터를 수집하는 행위. 단, robots.txt를 준수하는 검색 엔진의 수집은 허용합니다.</>,
                <><strong className="text-primary">서비스 방해:</strong> 비정상적으로 과도한 요청을 보내 서비스 운영을 방해하는 행위</>,
                <><strong className="text-primary">역공학:</strong> 서비스의 소스 코드를 복제, 분해, 모방하거나 변형하는 행위</>,
                <><strong className="text-primary">부적절한 닉네임:</strong> 타인을 사칭하거나 욕설, 혐오 표현이 포함된 닉네임을 사용하는 행위</>,
            ]} />
            <p className="text-xs text-muted">위반 행위가 확인되면 이용 제한, IP 차단, 닉네임 변경 등의 조치가 이루어질 수 있으며, 필요한 경우 법적 조치를 취할 수 있습니다.</p>
        </LegalSection>

        <LegalSection title="제7조 (서비스의 변경 및 중단)">
            <p>서비스는 운영상 필요에 따라 기능을 변경하거나 중단할 수 있으며, 가능한 경우 공지사항을 통해 사전에 안내합니다.</p>
        </LegalSection>

        <LegalSection title="제8조 (약관의 변경)">
            <p>이 약관은 {EFFECTIVE_DATE}부터 적용됩니다. 약관이 변경되는 경우 시행 7일 전부터 서비스 공지사항을 통해 안내합니다.</p>
        </LegalSection>

        <LegalSection title="제9조 (문의)">
            <p>서비스 이용에 관한 문의는 <ContactEmail />로 보내주세요.</p>
        </LegalSection>
    </LegalPageLayout>
);

export default TermsPage;
