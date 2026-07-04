"""
이미지 추출 버그 수정 검증 POC
- personalizedMeta 우선 탐색 방식이 에디션/번들/기본판 모두에서 올바른 이미지를 반환하는지 확인
"""

import re
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("ImageDebug")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

TEST_CASES = [
    {"id": "UP8236-PPSA19115_00-0298593598299103", "label": "에디션 A (번들)",  "expected": "942cc4120ec4884384edcc71099a738aa9621a54494697e3"},
    {"id": "UP8236-PPSA19115_00-0135377477426782", "label": "에디션 B (DLC?)", "expected": "1b9eee83e750d9b7e36675a52870d72268b422937e823bc1"},
    {"id": "UP8236-PPSA19115_00-0015587721224151", "label": "기본판(base)",    "expected": "cef621908426dde90821d6f6e960e9272a696f7f973466de"},
]


# ────────────────────────────────────────────────────────────────────


def setup_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page


def main():
    all_pass = True

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                  "--disable-blink-features=AutomationControlled",
                  "--js-flags=--max-old-space-size=128"]
        )
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            timezone_id="Asia/Seoul"
        )
        page = setup_page(context)

        try:
            for tc in TEST_CASES:
                url = f"https://store.playstation.com/ko-kr/product/{tc['id']}"
                print(f"\n{'='*60}")
                print(f"[{tc['label']}]")

                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=30000)

                next_data_text = page.evaluate(
                    "() => { const el = document.getElementById('__NEXT_DATA__'); return el ? el.textContent : ''; }"
                )
                normalized = next_data_text.replace('\\"', '"').replace('\\/', '/')

                # ── 진단 1: 정규화 전후 personalizedMeta 존재 여부
                pm_raw = next_data_text.find('"personalizedMeta"')
                pm_esc = next_data_text.find('\\"personalizedMeta\\"')
                pm_norm = normalized.find('"personalizedMeta"')
                print(f"  personalizedMeta 위치 — raw={pm_raw}, escaped={pm_esc}, normalized={pm_norm}")

                # ── 진단 2: 정규화 후 예상 URL 존재 여부
                expected_in_norm = tc["expected"] in normalized
                print(f"  예상 URL in normalized: {expected_in_norm}")

                # ── 진단 3: 예상 URL 주변 컨텍스트 (normalized 기준)
                idx = normalized.find(tc["expected"])
                if idx != -1:
                    ctx = normalized[max(0, idx-150):idx+80]
                    print(f"  예상 URL 앞 150자:\n    {repr(ctx)}")

                # ── 진단 4: personalizedMeta 이후 2000자 substring에서 GAMEHUB_COVER_ART 존재 여부
                if pm_norm != -1:
                    sub = normalized[pm_norm:pm_norm + 2000]
                    has_gca = "GAMEHUB_COVER_ART" in sub
                    print(f"  personalizedMeta 이후 2000자 내 GAMEHUB_COVER_ART: {has_gca}")
                    if has_gca:
                        gi = sub.find("GAMEHUB_COVER_ART")
                        print(f"  GCA 주변:\n    {repr(sub[max(0,gi-30):gi+200])}")

                # ── 최종: JS evaluate로 product ID 기반 탐색
                extracted = page.evaluate("""
                    (psStoreId) => {
                        // script[type="application/json"] 태그에서 product ID로 personalizedMeta 탐색
                        const scripts = document.querySelectorAll('script[type="application/json"]');
                        for (const s of scripts) {
                            const text = s.textContent;
                            if (!text.includes(psStoreId)) continue;

                            const unesc = text.replace(/\\\\"/g, '"').replace(/\\\\\//g, '/');

                            // product ID 위치 탐색
                            let idx = unesc.indexOf('"id":"' + psStoreId + '"');
                            if (idx === -1) idx = unesc.indexOf('"Product:' + psStoreId + '"');
                            if (idx === -1) continue;

                            // product ID 이후 8000자 내 personalizedMeta 탐색
                            const win = unesc.substring(idx, idx + 8000);
                            const pmIdx = win.indexOf('"personalizedMeta"');
                            if (pmIdx === -1) continue;

                            // personalizedMeta 이후 2000자 내 GAMEHUB_COVER_ART 탐색
                            const pmWin = win.substring(pmIdx, pmIdx + 2000);
                            const m = pmWin.match(/"role"\\s*:\\s*"GAMEHUB_COVER_ART"[^}]{0,200}"url"\\s*:\\s*"(https:\\/\\/image\\.api\\.playstation\\.com\\/vulcan\\/[^"]+)"/);
                            if (m) return m[1].split('?')[0];
                        }
                        return '';
                    }
                """, tc["id"]) or ""

                fname = extracted.split('/')[-1][:70] if extracted else "(없음)"
                is_correct = tc["expected"] in extracted
                print(f"\n  추출 결과: {'✅ PASS' if is_correct else '❌ FAIL'} → {fname}")
                if not is_correct:
                    all_pass = False

        finally:
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    print(f"\n{'='*40}")
    print(f"결과: {'전체 통과 ✅' if all_pass else '일부 실패 ❌'}")


if __name__ == "__main__":
    main()
