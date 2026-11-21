import os
import sys
import time
from playwright.sync_api import sync_playwright

url = "https://app.notion.com/p/Modern-Web-Guidance-Setup-Guide-41c466e1853181e89dd8d9078a9b75cf"

def fetch_notion():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        print(f"Navigating to {url} with domcontentloaded...")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(6) # wait for client-side React rendering in Notion
            
            title = page.title()
            print(f"Page Title: {title}")
            
            # Extract text
            text = page.evaluate("""() => {
                const el = document.querySelector('.notion-page-content') || document.body;
                return el.innerText;
            }""")
            
            os.makedirs("design/references/notion", exist_ok=True)
            shot_path = "design/references/notion/modern_web_guidance.png"
            page.screenshot(path=shot_path, full_page=True)
            print(f"Captured screenshot to {shot_path}")
            
            out_txt = "design/references/notion/modern_web_guidance.txt"
            with open(out_txt, "w", encoding="utf-8") as f:
                f.write(f"Title: {title}\nURL: {url}\n\nContent:\n{text}")
            print(f"Saved text content to {out_txt} (length: {len(text)} chars)")
            
            print("\nPreview of extracted content:")
            print(text[:2500])
            
        except Exception as e:
            print(f"Error fetching Notion guide: {e}")
            
        browser.close()

if __name__ == "__main__":
    fetch_notion()
