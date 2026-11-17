"""End-to-end browser automation test for SkyGuard Phase 2 using Playwright.
Verifies real Open-Meteo weather forecasts and global WMO CAP / GDACS disaster alerts.
"""
import asyncio
import os
from playwright.async_api import async_playwright


async def run_e2e_verification():
    print("=== SkyGuard Phase 2 Browser E2E Verification ===")
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

        # Step 4: Trigger live data via 'New York' location chip (US has active WMO CAP warnings)
        print("Clicking 'New York' location chip...")
        ny_btn = page.locator("button:has-text('New York')")
        await ny_btn.click()

        # Step 5: Wait for live weather card to appear
        print("Waiting for live weather card to appear...")
        await page.wait_for_selector("text=Current Weather Observation", timeout=15000)

        # Step 6: Verify rendered genuine weather metrics
        location_header = await page.locator("h2").first.text_content()
        print(f"Verified Location Header: {location_header}")
        assert "New York" in location_header

        # Check temperature display
        temp_text = await page.locator("text=/\\d+(\\.\\d+)?°/").first.text_content()
        print(f"Verified Live Temperature: {temp_text}")

        # Check humidity & wind
        humidity_visible = await page.locator("text=Relative Humidity").is_visible()
        wind_visible = await page.locator("text=Wind Speed").is_visible()
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

        # Step 9: Verify Global Alerts filtering and tabs
        print("Testing Global Alerts tabs and content...")
        # Check Official CAP Warnings Tab
        cap_tab = page.locator("button:has-text('Official CAP Severe Warnings')")
        assert await cap_tab.is_visible(), "Official CAP tab must be visible"

        # Check GDACS Tab
        gdacs_tab = page.locator("button:has-text('Multi-Hazard Disasters — GDACS')")
        assert await gdacs_tab.is_visible(), "GDACS tab must be visible"
        await gdacs_tab.click()
        await page.wait_for_timeout(500)

        # Toggle to Worldwide View
        print("Toggling to Worldwide View...")
        filter_toggle = page.locator("button[title='Toggle geographic filtering']")
        await filter_toggle.click()
        await page.wait_for_timeout(1000)

        # Step 10: Verify Data Integrity Non-Negotiables
        print("Verifying strict data integrity guarantees...")
        all_clear_banners = await page.locator("h1, h2, h3, h4, h5, [role='alert']").filter(has_text="All Clear").count()
        assert all_clear_banners == 0, "No fake 'All Clear' banner or heading should be displayed"

        no_danger_banners = await page.locator("h1, h2, h3, h4, h5, [role='alert']").filter(has_text="No Danger").count()
        assert no_danger_banners == 0, "No fake 'No Danger' banner or heading should be displayed"

        data_integrity_notice = await page.locator("text=Data Integrity Notice on Emergency Bulletins").is_visible()
        assert data_integrity_notice, "Data Integrity Notice on Emergency Bulletins must be displayed"

        # Step 11: Verify Provenance Footer
        print("Verifying Provenance & Transparency Footer...")
        provenance_visible = await page.locator("text=Open-Meteo").first.is_visible()
        assert provenance_visible, "Open-Meteo provenance must be visible"

        # Step 12: Capture full-page screenshot
        os.makedirs("docs/screenshots", exist_ok=True)
        screenshot_path = "docs/screenshots/phase2_global_alerts_verified.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Captured full-page verification screenshot at: {screenshot_path}")

        await browser.close()
        print("=== Playwright E2E verification successfully finished! ===")


if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
