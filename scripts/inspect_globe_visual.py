import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        print("Navigating to http://localhost:3000/living-sky ...")
        await page.goto("http://localhost:3000/living-sky", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000)
        
        # Take screenshot of the living sky page
        await page.screenshot(path="design/references/screenshots/current_living_sky_check.png")
        print("Captured living-sky screenshot.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
