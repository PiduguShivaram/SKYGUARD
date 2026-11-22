"""Comprehensive End-to-End Playwright Browser Automation Test Suite for SkyGuard.

Validates the full-stack product realignment:
1. Root Homepage (`/`): Local weather intelligence, 24h diurnal scrubber, 7-day outlook, risks, and verified local warnings.
2. Farmer Mode Workbench (`/`): Crop phenology, sowing dates, and strict hardware sensor gating.
3. Push Notification Center: Modal consent, VAPID registration, and preference toggles.
4. Dedicated Global Disaster Radar (`/disasters`): 3D Planetary Disaster Globe, GDACS/WMO CAP filters, and detail inspection.
5. Multi-viewport responsive rendering (1440px, 1024px, 768px, 390px, 360px).
"""
import asyncio
import os
import pytest
from playwright.async_api import async_playwright, Page


@pytest.mark.asyncio
async def test_playwright_root_homepage_weather(page: Page = None):
    """Verify Root Homepage (/) personalized weather intelligence, diurnal scrubber, and risk indicators."""
    print("\n--- Test Suite 1: Root Homepage (/) Weather Intelligence ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True

    try:
        await page.goto("http://localhost:3000/", wait_until="networkidle")
        title = await page.title()
        assert "SkyGuard" in title

        # Verify initial headline and navigation on root homepage
        await page.wait_for_selector("h1", timeout=15000)
        assert await page.locator("text=Global Radar").first.is_visible()

        # Select Tokyo or New Delhi from popular cities
        city_btn = page.locator("button:has-text('New Delhi')").first
        await city_btn.click()
        await page.wait_for_selector("text=New Delhi", timeout=30000)

        # Check grand temperature display
        temp_locator = page.locator("span.text-7xl, span.text-8xl").first
        await temp_locator.wait_for(state="visible", timeout=15000)
        temp_text = await temp_locator.text_content()
        assert len(temp_text.strip()) > 0, f"Expected temperature, got {temp_text}"

        # Check 24-Hour diurnal scrubber in Chapter 2
        await page.wait_for_selector("text=A Day in Motion", timeout=15000)
        assert await page.locator("text=Diurnal Progression").first.is_visible()

        # Check 7-Day Planetary Outlook
        await page.wait_for_selector("text=7-Day Planetary Outlook", timeout=15000)

        # Check Multi-Model Consensus & Observation Grounding
        await page.wait_for_selector("text=Multi-Model Consensus", timeout=15000)
        await page.wait_for_selector("text=0-2h Doppler Precipitation Nowcast", timeout=15000)
        assert await page.locator("text=Physical Ground Station").is_visible()

        # Check Predictive Weather Risk Outlook in Chapter 3
        await page.wait_for_selector("text=Weather Risk Outlook", timeout=15000)

        # Check Chapter 4 Preparedness and Emergency Push Service CTA
        await page.wait_for_selector("text=Direct Emergency Push Service", timeout=15000)
        assert await page.locator("button:has-text('Emergency Alerts')").first.is_visible()

        print("✓ Suite 1 (Root Homepage Weather) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_farmer_mode_workbench(page: Page = None):
    """Verify Farmer Mode crop cycle stress, sowing dates, and strict hardware gating."""
    print("\n--- Test Suite 2: Farmer Mode Workbench ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True
        await page.goto("http://localhost:3000/", wait_until="networkidle")
        city_btn = page.locator("button:has-text('New Delhi')").first
        await city_btn.click()
        await page.wait_for_selector("text=New Delhi, India", timeout=30000)

    try:
        # Switch to Farmer Mode
        farmer_btn = page.locator("button:has-text('Farmer')").first
        await farmer_btn.wait_for(state="visible", timeout=10000)
        await farmer_btn.click()
        await page.wait_for_selector("text=Agrometeorological Intelligence", timeout=10000)

        # Test selecting different crops
        crop_select = page.locator("select")
        for crop in ["Cotton", "Maize", "Tomato"]:
            await crop_select.select_option(crop)
            await page.wait_for_selector(f"text=Field Agromet Watches for {crop}", timeout=10000)

        # Test sowing date input
        date_input = page.locator("input[type='date']")
        await date_input.fill("2026-05-01")
        await page.wait_for_selector("text=days since sowing", timeout=10000)

        # Verify hardware gating invariant badges
        assert await page.locator("text=DISCONNECTED").is_visible()
        gated_count = await page.locator("text=GATED").count()
        assert gated_count >= 2, f"Expected >= 2 GATED badges, got {gated_count}"

        # Switch back to Public Mode
        public_btn = page.locator("button:has-text('Public')").first
        await public_btn.click()
        await page.wait_for_timeout(500)

        print("✓ Suite 2 (Farmer Mode Workbench) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_push_notification_modal(page: Page = None):
    """Verify Push Notification Center modal, voluntary consent, and security toggles."""
    print("\n--- Test Suite 3: Web Push Notification Center ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True
        await page.goto("http://localhost:3000/", wait_until="networkidle")

    try:
        # Open push settings modal via Header bell button
        bell_btn = page.locator("button[aria-label='Push Notification Settings']")
        await bell_btn.wait_for(state="visible", timeout=10000)
        await bell_btn.click()
        await page.wait_for_selector("text=Global Push Notification Center", timeout=10000)

        # Check modal title and elements
        assert await page.locator("text=Global Push Notification Center").is_visible()
        assert await page.locator("text=Browser Permission").is_visible()
        assert await page.locator("button:has-text('Enable Notifications')").is_visible()
        assert await page.locator("text=Receive Country-Wide Emergency Bulletins").is_visible()
        assert await page.locator("text=Privacy & Data Integrity Invariants:").is_visible()

        # Close modal
        close_btn = page.locator("button:has(svg.lucide-x)").first
        await close_btn.click()
        await page.wait_for_timeout(500)
        print("✓ Suite 3 (Push Notification Center) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_global_disasters_page(page: Page = None):
    """Verify Global Disaster Radar (/disasters), 3D globe, category filter, and bulletin modal."""
    print("\n--- Test Suite 4: Global Disaster Radar (/disasters) ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True

    try:
        await page.goto("http://localhost:3000/disasters", wait_until="networkidle")
        title = await page.title()
        assert "SkyGuard" in title

        # Verify page hero & telemetry KPIs
        await page.wait_for_selector("text=Global Disaster Radar", timeout=15000)
        assert await page.locator("text=Planetary Disaster Telemetry").is_visible()
        assert await page.locator("text=Active Bulletins").first.is_visible()
        assert await page.locator("text=WMO Official CAP").first.is_visible()
        assert await page.locator("text=UN / EC GDACS").first.is_visible()

        # Verify 3D Planetary Disaster Globe canvas or radar container
        assert await page.locator("text=Extreme Hazard").first.is_visible()
        assert await page.locator("text=Severe Bulletin").first.is_visible()

        # Test category filters
        extreme_btn = page.locator("button:has-text('Extreme')").first
        if await extreme_btn.is_visible():
            await extreme_btn.click()
            await page.wait_for_timeout(500)

        all_btn = page.locator("button:has-text('All')").first
        await all_btn.click()
        await page.wait_for_timeout(500)

        # Test inspecting bulletin modal if cards exist
        inspect_btn = page.locator("span:has-text('Inspect Bulletin')").first
        if await inspect_btn.is_visible():
            await inspect_btn.click()
            await page.wait_for_timeout(600)
            assert await page.locator("text=Official Advisory Bulletin").is_visible()
            await page.locator("button:has-text('Close')").click()
            await page.wait_for_timeout(300)

        # Navigation back to Local Weather
        back_link = page.locator("a:has-text('Return to Local Weather')")
        assert await back_link.is_visible()

        print("✓ Suite 4 (Global Disaster Radar) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_mobile_responsive_layout():
    """Verify accessible responsive rendering across viewports (1440px, 1024px, 768px, 390px, 360px)."""
    print("\n--- Test Suite 5: Responsive Multi-Viewport Review ---")
    viewports = [
        (1440, 900),
        (1024, 768),
        (768, 1024),
        (390, 844),
        (360, 740),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for width, height in viewports:
            ctx = await browser.new_context(viewport={"width": width, "height": height})
            vp_page = await ctx.new_page()

            # Test root homepage (/)
            await vp_page.goto("http://localhost:3000/", wait_until="domcontentloaded")
            assert await vp_page.locator("text=SkyGuard").first.is_visible()

            # Test disasters page (/disasters)
            await vp_page.goto("http://localhost:3000/disasters", wait_until="domcontentloaded")
            assert await vp_page.locator("text=Global Disaster Radar").is_visible()

            await ctx.close()

        await browser.close()
        print("✓ Suite 5 (Multi-Viewport Responsive: 1440, 1024, 768, 390, 360px) successfully verified.")


async def run_all_e2e_suites():
    print("=== Launching Master Playwright E2E Verification ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        await test_playwright_root_homepage_weather(page)
        await test_playwright_farmer_mode_workbench(page)
        await test_playwright_push_notification_modal(page)
        await test_playwright_global_disasters_page(page)

        await browser.close()

    await test_playwright_mobile_responsive_layout()
    print("=== All 5 Playwright E2E Test Suites Successfully Completed! ===")


@pytest.mark.asyncio
async def test_all_browser_e2e_suites():
    """Single master pytest entrypoint executing the 5 unified E2E user journeys."""
    await run_all_e2e_suites()


if __name__ == "__main__":
    asyncio.run(run_all_e2e_suites())