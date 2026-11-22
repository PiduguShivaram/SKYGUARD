import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:3000', wait_until='networkidle')
        
        # Click About button in header
        about_btn = page.locator('text=About').first
        await about_btn.click()
        await page.wait_for_selector('div[role="dialog"]', timeout=5000)
        await page.screenshot(path=r'C:/Users/shiva/.gemini/antigravity/brain/2c9beaea-d55d-4302-814b-4349832e1cdf/skyguard_about_modal.png')
        print("About modal screenshot saved!")
        
        # Close dialog
        close_btn = page.locator('button[aria-label="Close About Dialog"]')
        await close_btn.click()
        await asyncio.sleep(0.5)
        
        # Scroll to #about section in footer
        await page.locator('#about').scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        await page.screenshot(path=r'C:/Users/shiva/.gemini/antigravity/brain/2c9beaea-d55d-4302-814b-4349832e1cdf/skyguard_about_footer.png')
        print("About footer screenshot saved!")
        await browser.close()

asyncio.run(run())
