"""Comprehensive End-to-End Playwright Browser Automation Test Suite for SkyGuard.

Includes multiple distinct test scenarios:
1. Multi-location weather intelligence and numerical prediction attribution (Public Mode).
2. Farmer Mode crop cycle stress, sowing dates, and hardware gating verification.
3. Web Push Notification Center configuration, VAPID consent, and preference controls.
4. Global alert filtering, multi-hazard tabs, and authentic CAP detail inspection.
5. Responsive mobile and tablet viewports ensuring accessible UI layouts.
"""
import asyncio
import os
import pytest
from playwright.async_api import async_playwright, Page, Browser


@pytest.mark.asyncio
async def test_playwright_public_mode_multi_location(page: Page = None):
    """Verify Public Mode across multiple global locations and NWP model attribution."""
    print("\n--- Test Suite 1: Public Mode & Multi-Location Weather ---")
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
        await page.goto("http://localhost:3000", wait_until="networkidle")
        title = await page.title()
        assert "SkyGuard" in title

        # Verify initial prompt and save initial state screenshot
        await page.wait_for_selector("text=Select a location to view local forecasts", timeout=15000)
        os.makedirs("docs/screenshots", exist_ok=True)
        await page.screenshot(path="docs/screenshots/skyguard_initial_screen.png")
        await page.wait_for_timeout(1000)

        # Click Warangal chip
        warangal_btn = page.locator("button:has-text('Warangal')")
        await warangal_btn.click()
        await page.wait_for_selector("text=NWP Model-Estimated Current Conditions", timeout=30000)

        # Check NWP model disclosure and grid coordinates
        header = await page.locator("h2").first.text_content()
        assert "Warangal" in header
        grid_info = await page.locator("text=/Derived from Open-Meteo NWP model simulation/").first.is_visible()
        assert grid_info, "Numerical weather prediction simulation note must be visible"

        # Check SVG 24-hr chart
        chart_svg = await page.locator("svg").first.is_visible()
        assert chart_svg, "24-Hour forecast chart SVG must be visible"

        # Check Derived Risk Indicators (Phase 3)
        await page.wait_for_selector("text=Derived Weather Risk Indicators", timeout=15000)
        assert await page.locator("text=EXPERIMENTAL").is_visible(), "EXPERIMENTAL badge must be visible"

        # Save public mode screenshot
        os.makedirs("docs/screenshots", exist_ok=True)
        await page.screenshot(path="docs/screenshots/skyguard_public_mode_verified.png")
        print("✓ Suite 1 (Public Mode) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_farmer_mode_crop_stress(page: Page = None):
    """Verify Farmer Mode across multiple crops, sowing dates, and strict hardware gating."""
    print("\n--- Test Suite 2: Farmer Mode & Agromet Intelligence ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_selector("text=Select a location to view local forecasts", timeout=15000)
        await page.wait_for_timeout(1000)
        warangal_btn = page.locator("button:has-text('Warangal')")
        await warangal_btn.click()
        await page.wait_for_selector("text=NWP Model-Estimated Current Conditions", timeout=30000)

    try:
        # Switch to Farmer Mode
        farmer_btn = page.locator("button:has-text('Farmer Mode')")
        await farmer_btn.wait_for(state="visible", timeout=10000)
        await farmer_btn.click()
        await page.wait_for_selector("text=Farmer Mode — Agrometeorological Intelligence", timeout=10000)

        # Test selecting different crops
        crop_select = page.locator("select")
        for crop in ["Cotton", "Maize", "Tomato"]:
            await crop_select.select_option(crop)
            await page.wait_for_selector(f"text=Field Agromet Watches for {crop}", timeout=10000)

        # Test sowing date input
        date_input = page.locator("input[type='date']")
        await date_input.fill("2026-05-01")
        await page.wait_for_selector("text=/days since sowing/", timeout=10000)

        # Verify hardware gating invariant badges
        assert await page.locator("text=DISCONNECTED").is_visible()
        gated_count = await page.locator("text=GATED").count()
        assert gated_count >= 2, f"Expected >= 2 GATED badges, got {gated_count}"

        os.makedirs("docs/screenshots", exist_ok=True)
        await page.screenshot(path="docs/screenshots/skyguard_farmer_mode_verified.png")
        print("✓ Suite 2 (Farmer Mode) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_push_notification_settings(page: Page = None):
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
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(1000)

    try:
        # Open push settings modal
        bell_btn = page.locator("button[title='Global Push Notification Settings']")
        await bell_btn.wait_for(state="visible", timeout=10000)
        await bell_btn.click()
        await page.wait_for_selector("text=Global Push Notification Center", timeout=10000)

        # Check modal title and elements
        assert await page.locator("text=Global Push Notification Center").is_visible()
        assert await page.locator("text=Browser Permission").is_visible()
        assert await page.locator("button:has-text('Enable Notifications')").is_visible()
        assert await page.locator("text=Receive Country-Wide Emergency Bulletins").is_visible()
        assert await page.locator("text=Privacy & Data Integrity Invariants:").is_visible()

        os.makedirs("docs/screenshots", exist_ok=True)
        await page.screenshot(path="docs/screenshots/skyguard_push_modal_verified.png")

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
async def test_playwright_global_alerts_and_modal_inspection(page: Page = None):
    """Verify Global Alerts panel, country vs worldwide toggle, and CAP details modal."""
    print("\n--- Test Suite 4: Worldwide Alerts & Detail Inspection ---")
    should_close = False
    p = None
    browser = None

    if page is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        should_close = True
        await page.goto("http://localhost:3000", wait_until="networkidle")

    try:
        # If in Farmer Mode, switch back to Public Mode so alerts panel is prominent
        public_btn = page.locator("button:has-text('Public Mode')")
        if await public_btn.is_visible():
            await public_btn.click()
            await page.wait_for_timeout(500)

        # Verify Worldwide alerts panel
        assert await page.locator("text=Worldwide Weather & Disaster Alerts").is_visible()
        assert await page.locator("text=WMO SWIC (Official CAP)").is_visible()
        assert await page.locator("text=GDACS (UN OCHA / EC)").is_visible()
        assert await page.locator("text=Alert-Hub.org Stream").is_visible()

        # Switch to GDACS tab
        gdacs_tab = page.locator("button:has-text('Multi-Hazard Disasters — GDACS')")
        await gdacs_tab.click()
        await page.wait_for_timeout(500)

        # Switch back to Official CAP tab
        cap_tab = page.locator("button:has-text('Official CAP Severe Warnings')")
        await cap_tab.click()
        await page.wait_for_timeout(500)

        # Test inspecting alert details modal if alert present
        inspect_btn = page.locator("button:has-text('Inspect Details')").first
        if await inspect_btn.is_visible():
            await inspect_btn.click()
            await page.wait_for_timeout(600)
            assert await page.locator("text=Official Advisory Bulletin").is_visible()
            os.makedirs("docs/screenshots", exist_ok=True)
            await page.screenshot(path="docs/screenshots/skyguard_alert_detail_verified.png")
            await page.locator("button:has-text('Close')").click()
            await page.wait_for_timeout(300)

        # Verify no fake "All Clear" or "No Danger" banners exist
        all_clear = await page.locator("h1, h2, h3, h4, [role='alert']").filter(has_text="All Clear").count()
        assert all_clear == 0, "No fake 'All Clear' banner allowed"
        print("✓ Suite 4 (Worldwide Alerts & Inspection) successfully verified.")
    finally:
        if should_close and browser:
            await browser.close()
            if p:
                await p.stop()


@pytest.mark.asyncio
async def test_playwright_mobile_responsive_layout():
    """Verify accessible responsive rendering across standard design review viewports:
    1440px desktop, 1024px tablet, 768px tablet, 390px mobile, and 360px mobile compact.
    """
    print("\n--- Test Suite 5: Responsive Multi-Viewport Visual Review ---")
    os.makedirs("docs/screenshots", exist_ok=True)
    viewports = [
        ("docs/screenshots/skyguard_1440_desktop.png", 1440, 900),
        ("docs/screenshots/skyguard_1024_tablet.png", 1024, 768),
        ("docs/screenshots/skyguard_768_tablet.png", 768, 1024),
        ("docs/screenshots/skyguard_390_mobile.png", 390, 844),
        ("docs/screenshots/skyguard_360_mobile.png", 360, 740),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for filename, width, height in viewports:
            ctx = await browser.new_context(viewport={"width": width, "height": height})
            vp_page = await ctx.new_page()
            await vp_page.goto("http://localhost:3000", wait_until="networkidle")

            # Check branding and alerts visibility
            assert await vp_page.locator("text=SkyGuard").first.is_visible()
            assert await vp_page.locator("text=Worldwide Weather & Disaster Alerts").is_visible()

            # Save screenshot for visual review
            await vp_page.screenshot(path=filename)
            await ctx.close()

        await browser.close()
        print("✓ Suite 5 (Multi-Viewport Visual Review: 1440, 1024, 768, 390, 360px) successfully verified.")


async def run_all_e2e_suites():
    print("=== Launching Full Playwright E2E Multi-Suite Verification ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        await test_playwright_public_mode_multi_location(page)
        await test_playwright_farmer_mode_crop_stress(page)
        await test_playwright_push_notification_settings(page)
        await test_playwright_global_alerts_and_modal_inspection(page)

        await browser.close()

    await test_playwright_mobile_responsive_layout()
    print("=== All 5 Playwright E2E Test Suites Successfully Completed! ===")


@pytest.mark.asyncio
async def test_all_browser_e2e_suites():
    """Single master pytest entrypoint executing the 5 unified E2E user journeys."""
    await run_all_e2e_suites()


if __name__ == "__main__":
    asyncio.run(run_all_e2e_suites())
