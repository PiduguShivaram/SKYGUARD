import os
import sys
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.abspath("docs/screenshots/living_sky")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def capture_living_sky():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Desktop (1440 x 900)
        print("Capturing 1440px desktop...")
        context_1440 = browser.new_context(viewport={"width": 1440, "height": 900})
        page_1440 = context_1440.new_page()
        page_1440.goto("http://localhost:3000/living-sky", wait_until="networkidle", timeout=30000)
        time.sleep(3) # Wait for weather fetch and canvas render
        
        shot_1440 = os.path.join(SCREENSHOT_DIR, "living_sky_1440_desktop.png")
        page_1440.screenshot(path=shot_1440)
        print(f"Captured: {shot_1440}")

        # Test Scrubber Interaction
        print("Testing timeline scrubber interaction...")
        scrubber_items = page_1440.query_selector_all("[role='slider'] > div")
        if len(scrubber_items) > 5:
            # Click hour 6
            scrubber_items[6].click()
            time.sleep(1)
            shot_scrubbed = os.path.join(SCREENSHOT_DIR, "living_sky_1440_scrubbed_hour6.png")
            page_1440.screenshot(path=shot_scrubbed)
            print(f"Captured scrubbed state: {shot_scrubbed}")

        context_1440.close()

        # 2. Widescreen Desktop (1920 x 1080)
        print("Capturing 1920px widescreen...")
        context_1920 = browser.new_context(viewport={"width": 1920, "height": 1080})
        page_1920 = context_1920.new_page()
        page_1920.goto("http://localhost:3000/living-sky", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        shot_1920 = os.path.join(SCREENSHOT_DIR, "living_sky_1920_desktop.png")
        page_1920.screenshot(path=shot_1920)
        print(f"Captured: {shot_1920}")
        context_1920.close()

        # 3. Tablet (768 x 1024)
        print("Capturing 768px tablet...")
        context_768 = browser.new_context(viewport={"width": 768, "height": 1024})
        page_768 = context_768.new_page()
        page_768.goto("http://localhost:3000/living-sky", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        shot_768 = os.path.join(SCREENSHOT_DIR, "living_sky_768_tablet.png")
        page_768.screenshot(path=shot_768)
        print(f"Captured: {shot_768}")
        context_768.close()

        # 4. Mobile (390 x 844)
        print("Capturing 390px mobile...")
        context_390 = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        )
        page_390 = context_390.new_page()
        page_390.goto("http://localhost:3000/living-sky", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        shot_390 = os.path.join(SCREENSHOT_DIR, "living_sky_390_mobile.png")
        page_390.screenshot(path=shot_390)
        print(f"Captured: {shot_390}")
        context_390.close()

        # 5. Reduced-Motion Mode
        print("Capturing Reduced-Motion mode...")
        context_reduced = browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce"
        )
        page_reduced = context_reduced.new_page()
        page_reduced.goto("http://localhost:3000/living-sky", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        shot_reduced = os.path.join(SCREENSHOT_DIR, "living_sky_reduced_motion.png")
        page_reduced.screenshot(path=shot_reduced)
        print(f"Captured: {shot_reduced}")
        context_reduced.close()

        browser.close()
    print("\nAll Living Sky Proof of Concept screenshots captured successfully!")

if __name__ == "__main__":
    capture_living_sky()
