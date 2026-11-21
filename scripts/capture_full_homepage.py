import asyncio
import os
from playwright.async_api import async_playwright

os.makedirs("design/references/screenshots/transformed_homepage", exist_ok=True)

async def main():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        
        # 1. Desktop 1440x900 - Uninhabited State (Chapter 1 with 3D Living Globe)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        print("Navigating to http://localhost:3000/ ...")
        await page.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3500)
        
        # Capture Chapter 1 Uninhabited 3D Globe
        await page.screenshot(
            path="design/references/screenshots/transformed_homepage/01_desktop_chapter1_uninhabited_globe.png"
        )
        print("Captured 01_desktop_chapter1_uninhabited_globe.png")
        
        # 2. Select City: Click "Tokyo" button on the horizon pill
        tokyo_btn = page.locator("button:has-text('Tokyo')").first
        if await tokyo_btn.is_visible():
            await tokyo_btn.click()
            await page.wait_for_timeout(3000)
            await page.screenshot(
                path="design/references/screenshots/transformed_homepage/02_desktop_chapter1_inhabited_tokyo.png"
            )
            print("Captured 02_desktop_chapter1_inhabited_tokyo.png")

        # 3. Scroll to Chapter 2: A Day in Motion (Scrubber + 7-Day Outlook)
        chapter2 = page.locator("#chapter-2")
        await chapter2.scroll_into_view_if_needed()
        await page.wait_for_timeout(2000)
        await page.screenshot(
            path="design/references/screenshots/transformed_homepage/03_desktop_chapter2_day_in_motion.png"
        )
        print("Captured 03_desktop_chapter2_day_in_motion.png")

        # 4. Scroll to Chapter 3: Beyond Your Horizon (3D Planetary Disaster Globe)
        chapter3 = page.locator("#chapter-3")
        await chapter3.scroll_into_view_if_needed()
        await page.wait_for_timeout(3500)
        await page.screenshot(
            path="design/references/screenshots/transformed_homepage/04_desktop_chapter3_planetary_disaster_globe.png"
        )
        print("Captured 04_desktop_chapter3_planetary_disaster_globe.png")

        # 5. Scroll to Chapter 4: Stay Prepared
        chapter4 = page.locator("#chapter-4")
        await chapter4.scroll_into_view_if_needed()
        await page.wait_for_timeout(2000)
        await page.screenshot(
            path="design/references/screenshots/transformed_homepage/05_desktop_chapter4_stay_prepared.png"
        )
        print("Captured 05_desktop_chapter4_stay_prepared.png")

        # 6. Capture Full Page Scrolling Screenshot
        await page.screenshot(
            path="design/references/screenshots/transformed_homepage/06_desktop_full_page.png",
            full_page=True
        )
        print("Captured 06_desktop_full_page.png")
        await context.close()

        # 7. Mobile Viewport 390x844 (iPhone 14)
        mobile_context = await browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page = await mobile_context.new_page()
        await mobile_page.goto("http://localhost:3000/", wait_until="domcontentloaded")
        await mobile_page.wait_for_timeout(3500)
        await mobile_page.screenshot(
            path="design/references/screenshots/transformed_homepage/07_mobile_chapter1.png"
        )
        print("Captured 07_mobile_chapter1.png")

        # Scroll Chapter 3 on Mobile
        mob_ch3 = mobile_page.locator("#chapter-3")
        await mob_ch3.scroll_into_view_if_needed()
        await mobile_page.wait_for_timeout(2500)
        await mobile_page.screenshot(
            path="design/references/screenshots/transformed_homepage/08_mobile_chapter3_globe.png"
        )
        print("Captured 08_mobile_chapter3_globe.png")
        await mobile_context.close()

        await browser.close()
        print("All visual verification screenshots captured successfully.")

if __name__ == "__main__":
    asyncio.run(main())
