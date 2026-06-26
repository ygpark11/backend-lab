from playwright.sync_api import sync_playwright
import time
import re

# 제자님이 주신 타겟 URL (몬스터 헌터 와일즈)
TARGET_URL = "https://store.playstation.com/ko-kr/product/UP0102-PPSA07862_00-MHWILDSPREMIUMDX"

def run():
    print("🚀 POC 시작: 브라우저를 띄웁니다...")

    with sync_playwright() as p:
        # [핵심] headless=False -> 브라우저가 화면에 뜹니다! (눈으로 확인용)
        browser = p.chromium.launch(headless=True, args=["--start-maximized"])

        # 봇 탐지 회피를 위해 일반 브라우저처럼 보이게 User-Agent 설정
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR"
        )

        page = context.new_page()

        print(f"🔗 이동 중: {TARGET_URL}")
        # commit: 서버 연결 되자마자 제어권 가져옴
        page.goto(TARGET_URL, wait_until="commit", timeout=60000)

        print("⏳ 로딩 대기 중 (화면을 보세요)...")

        try:
            # 제목 요소가 뜰 때까지 최대 10초 대기
            page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=10000)

            # 텍스트 추출
            title = page.locator("[data-qa='mfe-game-title#name']").inner_text()
            price = "가격 정보 없음"

            # 가격 추출 시도 (없을 수도 있음)
            if page.locator("[data-qa^='mfeCtaMain#offer0#finalPrice']").is_visible():
                price = page.locator("[data-qa^='mfeCtaMain#offer0#finalPrice']").inner_text()

            print("\n" + "="*50)
            print("✅ 수집 성공!")
            print(f"🎮 게임명: {title}")
            print(f"💰 가격: {price}")
            print("="*50 + "\n")

        except Exception as e:
            print(f"\n❌ 실패 또는 타임아웃 발생!")
            print(f"에러 내용: {e}")
            print("⚠️ 브라우저 화면에 'Access Denied'나 하얀 화면이 떴는지 확인하세요.")

        # ----------------------------------------------------------------
        # [속도 최적화 검증] __NEXT_DATA__ 스크립트 태그 확인
        # 목적: page.content() (전체 HTML) 대신 이 태그만 가져올 수 있는지 확인
        # ----------------------------------------------------------------
        print("\n" + "="*50)
        print("[검증] __NEXT_DATA__ 태그에서 필요한 데이터 추출 가능 여부 확인")
        print("="*50)

        # 1단계: 태그 존재 여부 + 크기 확인
        next_data_info = page.evaluate("""() => {
            const el = document.getElementById('__NEXT_DATA__');
            if (!el) return { found: false };
            return {
                found: true,
                sizeKB: Math.round(el.textContent.length / 1024),
                hasInvariantName: el.textContent.includes('invariantName'),
                hasImageUrl: el.textContent.includes('image.api.playstation.com/vulcan')
            };
        }""")

        if not next_data_info['found']:
            print("결과: __NEXT_DATA__ 태그 없음 → 최적화 적용 불가, 현재 방식 유지")
        else:
            size_kb = next_data_info['sizeKB']
            has_title = next_data_info['hasInvariantName']
            has_image = next_data_info['hasImageUrl']

            print(f"__NEXT_DATA__ 크기: {size_kb} KB")
            print(f"invariantName 포함: {'있음' if has_title else '없음'}")
            print(f"이미지 URL 포함:    {'있음' if has_image else '없음'}")

            # 2단계: 실제로 데이터가 정상 추출되는지 확인
            if has_title or has_image:
                next_data_text = page.evaluate("() => document.getElementById('__NEXT_DATA__').textContent")

                extracted_title = None
                if has_title:
                    m = re.search(r'"invariantName"\s*:\s*"([^"]+)"', next_data_text)
                    extracted_title = m.group(1) if m else None

                extracted_image = None
                if has_image:
                    m = re.search(r'(https://image\.api\.playstation\.com/vulcan/[^"\'\\s>]+)', next_data_text)
                    extracted_image = m.group(1).split("?")[0] if m else None

                # invariantName 추출 실패 시 → 이스케이프 여부 진단
                if not extracted_title and has_title:
                    idx = next_data_text.find('invariantName')
                    snippet = next_data_text[max(0, idx-5):idx+40]
                    print(f"\n[진단] invariantName 주변 원문 (50자): {repr(snippet)}")
                    # 이스케이프된 따옴표 형태(\")로 재시도
                    m2 = re.search(r'\\"invariantName\\"\s*:\s*\\"([^\\"]+)\\"', next_data_text)
                    if m2:
                        extracted_title = m2.group(1)
                        print("  → 이스케이프 regex로 재시도 성공")

                print(f"\n실제 추출 결과:")
                print(f"  영문 제목: {extracted_title or '추출 실패'}")
                print(f"  이미지 URL: {extracted_image or '추출 실패'}")

                # 3단계: 전체 HTML과 크기 비교
                full_html_size = page.evaluate("() => document.documentElement.outerHTML.length")
                print(f"\n크기 비교:")
                print(f"  현재 page.content() 방식: {round(full_html_size/1024)} KB")
                print(f"  __NEXT_DATA__ 방식:        {size_kb} KB")
                print(f"  → 전송 데이터 {round(full_html_size / max(len(next_data_text), 1))}배 감소 예상")

                if extracted_title and extracted_image:
                    print("\n최종 판정: 최적화 적용 가능")
                elif extracted_title or extracted_image:
                    print("\n최종 판정: 부분 적용 가능 (추출 실패한 항목은 현재 방식 병행 필요)")
                else:
                    print("\n최종 판정: 태그는 있지만 데이터 추출 실패 → 현재 방식 유지")
            else:
                print("\n최종 판정: 태그는 있지만 필요한 필드 없음 → 현재 방식 유지")

        print("="*50)
        print("👀 10초 뒤에 브라우저가 꺼집니다. 결과를 확인하세요.")
        time.sleep(10)
        browser.close()

if __name__ == "__main__":
    run()