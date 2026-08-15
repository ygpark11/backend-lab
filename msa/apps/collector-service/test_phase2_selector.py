"""
POC: Phase 2 카테고리 페이지에서 state="visible" vs state="attached" 비교
CSS 차단 여부가 wait_for_selector 결과에 미치는 영향 확인
"""
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

TARGET_URL = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1"
SELECTOR = "a[href*='/product/']"
TIMEOUT = 10000


def make_page(context, block_css: bool):
    page = context.new_page()
    page.set_default_timeout(TIMEOUT)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        r_type = route.request.resource_type
        if r_type in ["image", "media", "font"]:
            route.abort()
            return
        if block_css and r_type == "stylesheet":
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page


def test_case(label: str, page, state: str):
    start = time.time()
    try:
        page.wait_for_selector(SELECTOR, state=state, timeout=TIMEOUT)
        elapsed = round(time.time() - start, 2)
        count = page.locator(SELECTOR).count()
        print(f"  [{label}] state={state!r} → 성공 ({elapsed}s), {count}개 요소")
        return True
    except PlaywrightTimeoutError:
        elapsed = round(time.time() - start, 2)
        count = page.locator(SELECTOR).count()
        print(f"  [{label}] state={state!r} → 타임아웃 ({elapsed}s), DOM엔 {count}개 존재")
        return False


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
              "--disable-blink-features=AutomationControlled"]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080},
        locale="ko-KR",
    )

    print("\n=== [케이스 1] CSS 차단 O + state='visible' (현재 prod 동작) ===")
    page1 = make_page(context, block_css=True)
    page1.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
    test_case("CSS차단+visible", page1, "visible")
    page1.close()

    print("\n=== [케이스 2] CSS 차단 O + state='attached' (수정 후 동작) ===")
    page2 = make_page(context, block_css=True)
    page2.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
    test_case("CSS차단+attached", page2, "attached")
    count = page2.locator(SELECTOR).count()
    print(f"  → 수집 가능한 링크 수: {count}개")
    page2.close()

    print("\n=== [케이스 3] CSS 차단 X + state='visible' (비교용) ===")
    page3 = make_page(context, block_css=False)
    page3.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
    test_case("CSS허용+visible", page3, "visible")
    page3.close()

    context.close()
    browser.close()

print("\nPOC 완료.")
