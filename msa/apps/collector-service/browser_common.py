"""크롤러 공통 브라우저 유틸 (batch_crawler / ranking_crawler / rating_worker 공용).

- User-Agent: 실제 엔진(Playwright 1.58 = Chromium 145)과 버전을 맞춘 단일 목록
- setup_page: webdriver 탐지 우회 + 리소스 차단 (차단 대상은 크롤러별로 지정)
- close_with_kill_guard: close() 교착 시 Chromium SIGKILL로 강제 unblock
- BrowserManager: request_count 기반 주기적 브라우저 재시작 (메모리 누수 방지)
"""
from __future__ import annotations

import gc
import logging
import random
import subprocess
import threading
import time
from typing import Any, Collection, Optional, Sequence

# Playwright 버전 업그레이드 시 Chromium 버전에 맞춰 함께 갱신할 것
DESKTOP_USER_AGENTS: tuple[str, ...] = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
)

STEALTH_INIT_SCRIPT = "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"

BASE_CHROMIUM_ARGS: tuple[str, ...] = (
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
)

CLOSE_KILL_TIMEOUT_SEC = 5


def random_user_agent() -> str:
    return random.choice(DESKTOP_USER_AGENTS)


def chromium_args(max_old_space_mb: int, extra: Sequence[str] = ()) -> list[str]:
    return [*BASE_CHROMIUM_ARGS, *extra, f"--js-flags=--max-old-space-size={max_old_space_mb}"]


def kill_chromium(logger: logging.Logger) -> None:
    try:
        subprocess.run(["pkill", "-9", "-f", "chromium"], capture_output=True, timeout=10)
    except Exception as e:
        logger.warning(f"[Browser] Chromium SIGKILL 실패: {e}")


def close_with_kill_guard(objs: Sequence[Any], logger: logging.Logger, label: str) -> None:
    """page/context/browser를 순서대로 close. 전체가 5초 내 끝나지 않으면 Chromium SIGKILL.

    Playwright sync API는 greenlet 바인딩이라 다른 스레드에서 close()를 호출할 수 없다.
    같은 스레드에서 close()를 호출하고, 교착 시 SIGKILL로 blocking call을 예외로 풀어낸다.
    """
    done = threading.Event()

    def _kill_if_stuck() -> None:
        if not done.wait(timeout=CLOSE_KILL_TIMEOUT_SEC):
            logger.warning(f"[{label}] close() 교착 → Chromium SIGKILL")
            kill_chromium(logger)

    threading.Thread(target=_kill_if_stuck, daemon=True).start()
    try:
        for obj in objs:
            if obj is None:
                continue
            try:
                obj.close()
            except Exception as e:
                logger.debug(f"[{label}] close 중 예외 (무시): {e}")
    finally:
        done.set()


def setup_page(context: Any, timeout_ms: int, blocked_resource_types: Collection[str]) -> Any:
    if context is None:
        raise RuntimeError("브라우저 컨텍스트가 존재하지 않습니다. (메모리 부족 의심)")

    page = context.new_page()
    page.set_default_timeout(timeout_ms)
    page.add_init_script(STEALTH_INIT_SCRIPT)

    blocked = frozenset(blocked_resource_types)

    def route_intercept(route: Any) -> None:
        if route.request.resource_type in blocked:
            route.abort()
        else:
            route.continue_()

    page.route("**/*", route_intercept)
    return page


class BrowserManager:
    """request_count가 restart_interval에 도달하면 브라우저를 완전히 종료 후 재기동한다."""

    def __init__(
        self,
        p: Any,
        restart_interval: int,
        launch_args: Sequence[str],
        logger: logging.Logger,
        context_options: Optional[dict] = None,
    ) -> None:
        self.p = p
        self.restart_interval = restart_interval
        self.launch_args = list(launch_args)
        self.context_options = dict(context_options or {})
        self.logger = logger
        self.browser, self.context = self._create_browser()
        self.request_count = 0

    def _create_browser(self) -> tuple[Any, Any]:
        self.logger.info("크롬 브라우저 시작 (메모리 최적화 + 스텔스 옵션)")
        browser = self.p.chromium.launch(headless=True, args=self.launch_args)
        context = browser.new_context(
            user_agent=random_user_agent(),
            viewport={"width": 1920, "height": 1080},
            **self.context_options,
        )
        return browser, context

    def get_context(self) -> Any:
        if self.request_count >= self.restart_interval:
            self.logger.info("[메모리 관리] 브라우저 주기적 재시작")
            close_with_kill_guard((self.context, self.browser), self.logger, "BrowserManager")
            self.context = None
            self.browser = None
            gc.collect()

            self.logger.info("OS 메모리 반환 대기 중... (10초 숨고르기)")
            time.sleep(10)

            try:
                self.browser, self.context = self._create_browser()
            except Exception as e:
                self.logger.error(f"브라우저 재기동 실패, 5초 대기 후 재시도: {e}")
                time.sleep(5)
                self.browser, self.context = self._create_browser()

            self.request_count = 0

        return self.context

    def close(self) -> None:
        close_with_kill_guard((self.context, self.browser), self.logger, "BrowserManager")

    def increment(self) -> None:
        self.request_count += 1
