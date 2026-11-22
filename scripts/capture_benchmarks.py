import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.abspath("design/references/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

TARGETS = [
    {
        "name": "valentime_noomo",
        "url": "https://valentime.noomoagency.com/",
        "label": "Valentime by Noomo Agency"
    },
    {
        "name": "igloo_inc",
        "url": "https://www.igloo.inc/",
        "label": "Igloo Inc"
    },
    {
        "name": "santioni_spirits",
        "url": "https://santionispirits.com/",
        "label": "Santioni Spirits"
    }
]

def analyze_sites():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for target in TARGETS:
            name = target["name"]
            url = target["url"]
            print(f"\n--- Investigating {target['label']} ({url}) ---")
            
            site_info = {
                "name": name,
                "url": url,
                "label": target["label"],
                "desktop_title": "",
                "desktop_screenshot": "",
                "mobile_screenshot": "",
                "scrolled_screenshot": "",
                "has_canvas": False,
                "canvas_count": 0,
                "fonts_used": [],
                "scripts_detected": [],
                "meta_description": "",
                "error": None
            }
            
            # 1. Desktop Viewport
            try:
                context_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
                page_desktop = context_desktop.new_page()
                page_desktop.goto(url, wait_until="networkidle", timeout=30000)
                time.sleep(3) # allow webgl / animations to settle
                
                site_info["desktop_title"] = page_desktop.title()
                
                # Check canvas / webgl
                canvases = page_desktop.query_selector_all("canvas")
                site_info["canvas_count"] = len(canvases)
                site_info["has_canvas"] = len(canvases) > 0
                
                # Inspect font families
                fonts = page_desktop.evaluate("""() => {
                    const families = new Set();
                    document.querySelectorAll('body, h1, h2, h3, p, span, a').forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.fontFamily) {
                            families.add(style.fontFamily);
                        }
                    });
                    return Array.from(families).slice(0, 10);
                }""")
                site_info["fonts_used"] = fonts
                
                # Capture Initial Desktop Screenshot
                desktop_shot_path = os.path.join(SCREENSHOT_DIR, f"{name}_desktop_initial.png")
                page_desktop.screenshot(path=desktop_shot_path)
                site_info["desktop_screenshot"] = desktop_shot_path
                print(f"Captured desktop initial: {desktop_shot_path}")
                
                # Test scroll and capture scrolled state
                page_desktop.evaluate("window.scrollBy(0, 800)")
                time.sleep(2)
                scrolled_shot_path = os.path.join(SCREENSHOT_DIR, f"{name}_desktop_scrolled.png")
                page_desktop.screenshot(path=scrolled_shot_path)
                site_info["scrolled_screenshot"] = scrolled_shot_path
                print(f"Captured desktop scrolled: {scrolled_shot_path}")
                
                context_desktop.close()
            except Exception as e:
                print(f"Error on desktop {url}: {e}")
                site_info["error"] = str(e)
                
            # 2. Mobile Viewport (390 x 844)
            try:
                context_mobile = browser.new_context(
                    viewport={"width": 390, "height": 844},
                    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
                )
                page_mobile = context_mobile.new_page()
                page_mobile.goto(url, wait_until="networkidle", timeout=30000)
                time.sleep(3)
                
                mobile_shot_path = os.path.join(SCREENSHOT_DIR, f"{name}_mobile_initial.png")
                page_mobile.screenshot(path=mobile_shot_path)
                site_info["mobile_screenshot"] = mobile_shot_path
                print(f"Captured mobile initial: {mobile_shot_path}")
                
                context_mobile.close()
            except Exception as e:
                print(f"Error on mobile {url}: {e}")
                
            results[name] = site_info
            
        browser.close()
        
    out_json = os.path.join(SCREENSHOT_DIR, "benchmark_data.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nAnalysis saved to {out_json}")

if __name__ == "__main__":
    analyze_sites()
