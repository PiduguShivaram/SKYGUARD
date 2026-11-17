"""End-to-end browser automation test for SkyGuard Phase 1 using Playwright."""
import asyncio
import os
from playwright.async_api import async_playwright


async def run_e2e_verification():
    print("=== SkyGuard Phase 1 Browser E2E Verification ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        # Step 1: Open homepage
        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        title = await page.title()
        print(f"Page title: {title}")
        assert "SkyGuard" in title, f"Expected SkyGuard in title, got: {title}"

        # Step 2: Check initial state requires user selection
        print("Checking initial unselected state...")
        initial_prompt = await page.locator("text=Ready for Real-time Weather Intelligence").is_visible()
        assert initial_prompt, "Initial prompt must be visible when no location is selected"

        # Step 3: Trigger live data via Warangal location chip
        print("Clicking 'Warangal' location chip...")
        warangal_btn = page.locator("button:has-text('Warangal')")
        await warangal_btn.click()

        # Step 4: Wait for live weather card to appear
        print("Waiting for live weather card to appear...")
        await page.wait_for_selector("text=Current Weather Observation", timeout=15000)

        # Step 5: Verify rendered genuine metrics
        location_header = await page.locator("h2").first.text_content()
        print(f"Verified Location Header: {location_header}")
        assert "Warangal" in location_header

        # Check temperature display
        temp_text = await page.locator("text=/\\d+(\\.\\d+)?°/").first.text_content()
        print(f"Verified Live Temperature: {temp_text}")

        # Check humidity & wind
        humidity_visible = await page.locator("text=Relative Humidity").is_visible()
        wind_visible = await page.locator("text=Wind Speed").is_visible()
        assert humidity_visible, "Relative humidity must be displayed"
        assert wind_visible, "Wind speed must be displayed"

        # Step 6: Verify 24-hour SVG chart
        print("Verifying 24-Hour Forecast Chart...")
        chart_svg = await page.locator("svg").first.is_visible()
        assert chart_svg, "24-Hour forecast chart SVG must be visible"

        # Step 7: Verify Seven-day outlook
        print("Verifying Seven-Day Outlook...")
        outlook_visible = await page.locator("text=Seven-Day Forecast Summary").is_visible()
        assert outlook_visible, "Seven-Day forecast summary must be visible"

        # Step 8: Verify Provenance Footer
        print("Verifying Provenance & Transparency Footer...")
        provenance_visible = await page.locator("text=Open-Meteo").first.is_visible()
        assert provenance_visible, "Open-Meteo provenance must be visible"

        # Verify NO official warning or "all clear" banner is shown (milestone requirement)
        all_clear_banners = await page.locator("h1, h2, h3, h4, h5, [role='alert']").filter(has_text="All Clear").count()
        assert all_clear_banners == 0, "No 'All Clear' banner or heading should be displayed"
        official_warnings = await page.locator("text=Authoritative Emergency Warnings").count()
        assert official_warnings == 0, "No official emergency warnings should be displayed in this milestone"

        # Capture full-page screenshot
        os.makedirs("docs/screenshots", exist_ok=True)
        screenshot_path = "docs/screenshots/phase1_live_verified.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Captured full-page verification screenshot at: {screenshot_path}")

        await browser.close()
        print("=== Playwright E2E verification successfully finished! ===")


if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
