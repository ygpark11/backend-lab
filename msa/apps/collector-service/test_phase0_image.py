"""
Phase 0 이미지 추출 POC
- 신작 카테고리 1페이지에서 concept URL / product URL 각 1개씩 추출
- extract_gamehub_image_url vs DOM fallback 결과 비교
"""
import re
from playwright.sync_api import sync_playwright

NEW_RELEASES_URL = "https://store.playstation.com/ko-kr/category/e1699f77-77e1-43ca-a296-26d08abacb0f/1"


def extract_gamehub_image_url(json_text: str) -> str:
    m = re.search(
        r'"role"\s*:\s*"GAMEHUB_COVER_ART"[^}]*?"url"\s*:\s*"(https://image\.api\.playstation\.com/vulcan/[^"]+)"',
        json_text
    )
    if not m:
        m = re.search(
            r'"url"\s*:\s*"(https://image\.api\.playstation\.com/vulcan/[^"]+)"[^}]*?"role"\s*:\s*"GAMEHUB_COVER_ART"',
            json_text
        )
    return m.group(1).split("?")[0] if m else ""


def extract_gamehub_image_url_escaped(json_text: str) -> str:
    """이중 직렬화된 JSON (concept 페이지) 대응 - \"role\" 형태 매칭"""
    m = re.search(
        r'\\"role\\"\s*:\s*\\"GAMEHUB_COVER_ART\\"[^}]*?\\"url\\"\s*:\s*\\"(https://image\.api\.playstation\.com/vulcan/[^\\"]+)\\"',
        json_text
    )
    if not m:
        m = re.search(
            r'\\"url\\"\s*:\s*\\"(https://image\.api\.playstation\.com/vulcan/[^\\"]+)\\"[^}]*?\\"role\\"\s*:\s*\\"GAMEHUB_COVER_ART\\"',
            json_text
        )
    return m.group(1).split("?")[0] if m else ""


def test_url(page, url, label, block_images=False):
    print(f"\n{'='*60}")
    print(f"[{label}] {'(이미지 차단 ON)' if block_images else '(이미지 차단 OFF)'}")
    print(f"{url}")
    print('='*60)

    if block_images:
        def route_intercept(route):
            if route.request.resource_type in ["image", "media", "stylesheet", "font"]:
                route.abort()
            else:
                route.continue_()
        page.route("**/*", route_intercept)

    page.goto(url, wait_until="domcontentloaded", timeout=40000)

    # __NEXT_DATA__ 추출
    next_data = page.evaluate(
        "() => { const el = document.getElementById('__NEXT_DATA__'); return el ? el.textContent : ''; }"
    )

    if next_data:
        print(f"__NEXT_DATA__ 크기: {round(len(next_data)/1024)}KB")

        # 일반 GAMEHUB_COVER_ART
        gamehub_url = extract_gamehub_image_url(next_data)
        print(f"GAMEHUB_COVER_ART (일반):   {gamehub_url or '❌ 없음'}")

        # 이중 직렬화 GAMEHUB_COVER_ART
        gamehub_escaped = extract_gamehub_image_url_escaped(next_data)
        print(f"GAMEHUB_COVER_ART (이스케이프): {gamehub_escaped or '❌ 없음'}")

        # vulcan URL 전체 목록 + 주변 문맥 출력 (최대 5개)
        vulcan_matches = list(re.finditer(r'https://image\.api\.playstation\.com/vulcan/[^"\'\s>\\]+', next_data))
        print(f"\nvulcan URL 총 {len(vulcan_matches)}개 발견. 앞 5개 문맥:")
        for i, m in enumerate(vulcan_matches[:5]):
            start = max(0, m.start() - 60)
            end = min(len(next_data), m.end() + 20)
            print(f"  [{i+1}] ...{next_data[start:end]}...")
    else:
        print("❌ __NEXT_DATA__ 없음")

    # DOM fallback
    try:
        img_loc = page.locator("img[data-qa='gameBackgroundImage#heroImage#image']")
        if img_loc.count() > 0:
            dom_url = img_loc.first.get_attribute("src", timeout=3000)
            dom_url = dom_url.split("?")[0] if dom_url else ""
            print(f"DOM fallback:               {dom_url or '❌ src 없음'}")
        else:
            print("DOM fallback:               ❌ 요소 없음")
    except Exception as e:
        print(f"DOM fallback:               ❌ 오류 ({e})")

    if block_images:
        page.unroute("**/*")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR"
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        # 신작 카테고리에서 concept/product URL 수집
        print("신작 카테고리 스캔 중...")
        page.goto(NEW_RELEASES_URL, wait_until="domcontentloaded", timeout=40000)
        page.wait_for_selector("a[href*='/concept/'], a[href*='/product/']", timeout=15000)

        concept_url = None
        product_url = None

        for link in page.locator("a[href*='/concept/'], a[href*='/product/']").all():
            href = link.get_attribute("href")
            if not href:
                continue
            full_url = f"https://store.playstation.com{href}" if href.startswith("/") else href
            if "/concept/" in full_url and not concept_url:
                concept_url = full_url
            if "/product/" in full_url and not product_url:
                product_url = full_url
            if concept_url and product_url:
                break

        print(f"concept URL: {concept_url}")
        print(f"product URL: {product_url}")

        if concept_url:
            test_url(page, concept_url, "CONCEPT - 이미지 차단 OFF", block_images=False)
            test_url(page, concept_url, "CONCEPT - 이미지 차단 ON (실제 크롤러 환경)", block_images=True)

        browser.close()


if __name__ == "__main__":
    run()
