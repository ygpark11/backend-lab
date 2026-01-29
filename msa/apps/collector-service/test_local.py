from playwright.sync_api import sync_playwright
import time

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
            print(f"✅ 수집 성공!")
            print(f"🎮 게임명: {title}")
            print(f"💰 가격: {price}")
            print("="*50 + "\n")

        except Exception as e:
            print(f"\n❌ 실패 또는 타임아웃 발생!")
            print(f"에러 내용: {e}")
            print("⚠️ 브라우저 화면에 'Access Denied'나 하얀 화면이 떴는지 확인하세요.")

        print("👀 10초 뒤에 브라우저가 꺼집니다. 결과를 확인하세요.")
        time.sleep(10)
        browser.close()

if __name__ == "__main__":
    run()