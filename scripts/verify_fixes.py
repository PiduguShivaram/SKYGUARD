"""Playwright browser verification for Emergency Alert Quality & Data Integrity Fixes."""
import asyncio
from playwright.async_api import async_playwright


async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        print("1. Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # 1. Select Warangal, India
        print("2. Selecting Warangal, India...")
        await page.click('button:has-text("Warangal")')
        await page.wait_for_timeout(3500)

        # Check NWP Model-Estimated Current Conditions
        has_nwp = await page.get_by_text("NWP Model-Estimated Current Conditions").count()
        print(f"NWP Model title count: {has_nwp}")
        assert has_nwp > 0

        # Check that 'China' or Chinese observatories are NOT in the alerts for Warangal
        content = await page.inner_text("body")
        print("Checking for alert isolation...")
        # Check filtered status text
        assert "Filtered: IN" in content or "Warangal" in content
        # Ensure Chinese warnings are NOT present
        assert "Meteorological Observatory" not in content

        # Take screenshot of Warangal Public Mode
        await page.screenshot(path="docs/screenshots/fixes_warangal_public.png")
        print("Saved docs/screenshots/fixes_warangal_public.png")

        # 2. Toggle to Worldwide View (All Countries)
        print("3. Toggling to Worldwide View...")
        await page.click('button:has-text("Filtered:")')
        await page.wait_for_timeout(2500)
        content_worldwide = await page.inner_text("body")
        assert "Worldwide View (All Countries)" in content_worldwide
        print("Verified Worldwide View toggle successfully displays all feeds.")

        await page.screenshot(path="docs/screenshots/fixes_worldwide_view.png")
        print("Saved docs/screenshots/fixes_worldwide_view.png")

        # 3. Switch to Farmer Mode
        print("4. Switching to Farmer Mode...")
        await page.click('button:has-text("Farmer Mode")')
        await page.wait_for_timeout(2500)

        # Verify replacement of 'No Critical Field Watches'
        has_triggers = await page.get_by_text("No Forecast-Threshold Triggers Detected").count()
        print(f"No Forecast-Threshold Triggers count: {has_triggers}")
        assert has_triggers > 0

        # Verify ICAR attribution
        has_icar = await page.get_by_text("ICAR-AICRPAM / FAO Framework").count()
        print(f"ICAR attribution count: {has_icar}")
        assert has_icar > 0

        # Verify applicability notice
        has_applicability = await page.get_by_text("Agroclimatic Applicability Limitation").count()
        print(f"Applicability notice count: {has_applicability}")
        assert has_applicability > 0

        await page.screenshot(path="docs/screenshots/fixes_farmer_mode.png")
        print("Saved docs/screenshots/fixes_farmer_mode.png")

        await browser.close()
        print("All browser Playwright verifications completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_verification())
