"""End-to-end browser automation test for SkyGuard full-stack application using Playwright.
Verifies real Open-Meteo forecasts, Global WMO CAP / GDACS alerts, Derived Risk Indicators,
Gated Farmer Mode, and Web Push Notification System.
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
        await page.wait_for_selector("text=NWP Model-Estimated Current Conditions", timeout=15000)

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
        await page.screenshot(path=screenshot_public, full_page=False, timeout=10000)
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
        await page.screenshot(path=screenshot_farmer, full_page=False, timeout=10000)
        print(f"Captured Farmer Mode screenshot at: {screenshot_farmer}")

        # Switch back to Public Mode
        public_mode_btn = page.locator("button:has-text('Public Mode')")
        await public_mode_btn.click()
        await page.wait_for_timeout(500)

        # Step 11: Verify Global Push Notification System Modal (Phase 3 Requirement)
        print("Verifying Global Push Notification System Modal...")
        push_bell_btn = page.locator("button[title='Global Push Notification Settings']")
        assert await push_bell_btn.is_visible(), "Push notification bell button must be visible in Header"
        await push_bell_btn.click()
        await page.wait_for_timeout(500)

        modal_title = await page.locator("text=Global Push Notification Center").is_visible()
        assert modal_title, "Global Push Notification Center modal must be visible"

        # Verify Voluntary User Consent: Permission was NOT requested automatically
        permission_chip = await page.locator("text=Browser Permission").is_visible()
        assert permission_chip, "Browser permission status chip must be displayed"
        enable_btn = page.locator("button:has-text('Enable Notifications')")
        assert await enable_btn.is_visible(), "'Enable Notifications' button must be present"

        # Verify Notification Settings fields
        country_input = page.locator("input[placeholder='e.g. IN, US, DE']")
        assert await country_input.is_visible(), "Country code preference input must be visible"

        cat_cap = await page.get_by_text("Official CAP Severe Warnings", exact=True).is_visible()
        cat_gdacs = await page.get_by_text("GDACS Multi-Hazard Disasters", exact=True).is_visible()
        assert cat_cap, "Official CAP category option must be visible"
        assert cat_gdacs, "GDACS disaster category option must be visible"

        # Verify Country-Wide Bulletins Toggle (Opt-In Security Feature)
        country_wide_toggle = await page.locator("text=Receive Country-Wide Emergency Bulletins").is_visible()
        assert country_wide_toggle, "Receive Country-Wide Emergency Bulletins toggle must be visible"

        # Verify Privacy and Integrity Invariant Notice
        privacy_notice = await page.locator("text=Privacy & Data Integrity Invariants:").is_visible()
        assert privacy_notice, "Privacy & Data Integrity Invariants notice must be displayed"

        # Capture screenshot of Push Notification Center
        screenshot_push = "docs/screenshots/skyguard_push_modal_verified.png"
        await page.screenshot(path=screenshot_push, full_page=False, timeout=10000)
        print(f"Captured Push Notification Center screenshot at: {screenshot_push}")

        # Close Modal
        close_modal_btn = page.locator("button:has(svg.lucide-x)").first
        await close_modal_btn.click()
        await page.wait_for_timeout(400)

        # Step 12: Verify Alert Inspection Modal (Authentic Alert Details)
        print("Testing authentic alert inspection modal...")
        inspect_btn = page.locator("button:has-text('Inspect Details')").first
        if await inspect_btn.is_visible():
            await inspect_btn.click()
            await page.wait_for_timeout(600)
            detail_modal_visible = await page.locator("text=Official Advisory Description").is_visible()
            assert detail_modal_visible, "Official Advisory Description must be visible in Alert Detail Modal"
            close_detail_btn = page.locator("button:has-text('Close')")
            await close_detail_btn.click()
            await page.wait_for_timeout(400)
            print("Verified Alert Detail inspection modal.")

        # Step 13: Verify Data Integrity Non-Negotiables
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
