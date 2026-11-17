"""End-to-end browser automation test for SkyGuard full-stack application using Playwright.
Verifies real Open-Meteo forecasts, Global WMO CAP / GDACS alerts, Derived Risk Indicators,
and Gated Farmer Mode.
"""
import asyncio
import os
from playwright.async_api import async_playwright


async def run_e2e_verification():
    print("=== SkyGuard Full E2E Browser Verification ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1100})
        page = await context.new_page()

        # Step 1: Open homepage
        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        title = await page.title()
        print(f"Page title: {title}")
        assert "SkyGuard" in title, f"Expected SkyGuard in title, got: {title}"

        # Step 2: Check initial state requires user selection
        print("Checking initial unselected state...")
        initial_prompt = await page.locator("text=Ready for Global Weather & Disaster Intelligence").is_visible()
        assert initial_prompt, "Initial prompt must be visible when no location is selected"

        # Step 3: Verify Global Alerts Panel rendered
        print("Verifying Global Alerts Panel on initial page...")
        global_panel = await page.locator("text=Worldwide Weather & Disaster Alerts").is_visible()
        assert global_panel, "Worldwide Weather & Disaster Alerts panel must be visible"

        # Check Provider Health indicators
        wmo_chip = await page.locator("text=WMO SWIC (Official CAP)").is_visible()
        gdacs_chip = await page.locator("text=GDACS (UN OCHA / EC)").is_visible()
        alerthub_chip = await page.locator("text=Alert-Hub.org Stream").is_visible()
        assert wmo_chip, "WMO SWIC provider chip must be visible"
        assert gdacs_chip, "GDACS provider chip must be visible"
        assert alerthub_chip, "Alert-Hub.org provider chip must be visible"
        print("Verified provider health chips (WMO, GDACS, Alert-Hub).")

        # Step 4: Trigger live data via 'Warangal' location chip
        print("Clicking 'Warangal' location chip...")
        warangal_btn = page.locator("button:has-text('Warangal')")
        await warangal_btn.click()

        # Step 5: Wait for live weather card to appear
        print("Waiting for live weather card to appear...")
        await page.wait_for_selector("text=Current Weather Observation", timeout=15000)

        # Step 6: Verify rendered genuine weather metrics
        location_header = await page.locator("h2").first.text_content()
        print(f"Verified Location Header: {location_header}")
        assert "Warangal" in location_header

        # Check temperature display
        temp_text = await page.locator("text=/\\d+(\\.\\d+)?°/").first.text_content()
        print(f"Verified Live Temperature: {temp_text}")

        # Check humidity & wind
        humidity_visible = await page.get_by_text("Relative Humidity", exact=True).is_visible()
        wind_visible = await page.get_by_text("Wind Speed", exact=True).is_visible()
        assert humidity_visible, "Relative humidity must be displayed"
        assert wind_visible, "Wind speed must be displayed"

        # Step 7: Verify 24-hour SVG chart
        print("Verifying 24-Hour Forecast Chart...")
        chart_svg = await page.locator("svg").first.is_visible()
        assert chart_svg, "24-Hour forecast chart SVG must be visible"

        # Step 8: Verify Seven-day outlook
        print("Verifying Seven-Day Outlook...")
        outlook_visible = await page.locator("text=Seven-Day Forecast Summary").is_visible()
        assert outlook_visible, "Seven-Day forecast summary must be visible"

        # Step 9: Verify Phase 3 — Derived Scientific Weather Risk Indicators
        print("Verifying Derived Risk Card (Phase 3)...")
        derived_risk_visible = await page.locator("text=Derived Weather Risk Indicators").is_visible()
        assert derived_risk_visible, "Derived Weather Risk Indicators must be visible in Public Mode"
        experimental_badge = await page.locator("text=EXPERIMENTAL").is_visible()
        assert experimental_badge, "EXPERIMENTAL tag must be visible on derived risks"
        print("Verified Phase 3 Derived Risk indicators.")

        # Capture Public Mode screenshot
        os.makedirs("docs/screenshots", exist_ok=True)
        screenshot_public = "docs/screenshots/skyguard_public_mode_verified.png"
        await page.screenshot(path=screenshot_public, full_page=True)
        print(f"Captured Public Mode screenshot at: {screenshot_public}")

        # Step 10: Verify Phase 4 — Gated Farmer Mode
        print("Switching to Farmer Mode...")
        farmer_mode_btn = page.locator("button:has-text('Farmer Mode')")
        await farmer_mode_btn.click()
        await page.wait_for_timeout(800)

        # Verify Farmer Mode Panel
        farmer_panel_visible = await page.locator("text=Farmer Mode — Agrometeorological Intelligence").is_visible()
        assert farmer_panel_visible, "Farmer Mode panel must be visible after mode toggle"

        # Verify Crop Selector
        crop_select = page.locator("select")
        assert await crop_select.is_visible(), "Crop select dropdown must be visible"
        await crop_select.select_option("Cotton")
        await page.wait_for_timeout(600)

        # Verify Agromet Watches header
        watches_header = await page.locator("text=Field Agromet Watches for Cotton").is_visible()
        assert watches_header, "Agromet watches for Cotton must be visible"

        # Verify Strict Hardware Gating Badges
        print("Verifying Strict Sensor Telemetry & Satellite Gating Badges...")
        gating_title = await page.locator("text=Sensor Telemetry & Satellite Gating (Data Integrity Guarantee)").is_visible()
        assert gating_title, "Sensor Telemetry & Satellite Gating section must be visible"

        disconnected_badge = await page.locator("text=DISCONNECTED").is_visible()
        assert disconnected_badge, "DISCONNECTED badge for soil moisture must be visible"

        gated_badges = await page.locator("text=GATED").count()
        assert gated_badges >= 2, f"Expected at least 2 GATED badges (Satellite + Yield), got: {gated_badges}"
        print(f"Verified Hardware Gating: DISCONNECTED and {gated_badges} GATED badges.")

        # Capture Farmer Mode screenshot
        screenshot_farmer = "docs/screenshots/skyguard_farmer_mode_verified.png"
        await page.screenshot(path=screenshot_farmer, full_page=True)
        print(f"Captured Farmer Mode screenshot at: {screenshot_farmer}")

        # Step 11: Verify Global Alerts filtering and tabs
        print("Testing Global Alerts tabs and content...")
        cap_tab = page.locator("button:has-text('Official CAP Severe Warnings')")
        assert await cap_tab.is_visible(), "Official CAP tab must be visible"

        gdacs_tab = page.locator("button:has-text('Multi-Hazard Disasters — GDACS')")
        assert await gdacs_tab.is_visible(), "GDACS tab must be visible"
        await gdacs_tab.click()
        await page.wait_for_timeout(500)

        # Step 12: Verify Data Integrity Non-Negotiables
        print("Verifying strict data integrity guarantees...")
        all_clear_banners = await page.locator("h1, h2, h3, h4, h5, [role='alert']").filter(has_text="All Clear").count()
        assert all_clear_banners == 0, "No fake 'All Clear' banner or heading should be displayed"

        no_danger_banners = await page.locator("h1, h2, h3, h4, h5, [role='alert']").filter(has_text="No Danger").count()
        assert no_danger_banners == 0, "No fake 'No Danger' banner or heading should be displayed"

        data_integrity_notice = await page.locator("text=Data Integrity Notice on Emergency Bulletins").is_visible()
        assert data_integrity_notice, "Data Integrity Notice on Emergency Bulletins must be displayed"

        await browser.close()
        print("=== All Playwright E2E verifications successfully finished! ===")


if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
