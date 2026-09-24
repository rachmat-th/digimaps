#!/usr/bin/env python3
"""
Digimaps Streaming Scraper - Real-time Database Insert
Output: JSON streaming (one line per business)
"""

from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth
import time
import random
import re
import json
import sys
import os

# Get search query from environment
SEARCH_QUERY = os.environ.get('SEARCH_QUERY', 'Restoran Depok')

# Settings
MAX_SCROLLS = 20
SCROLL_PAUSE = 3

def log(message):
    """Log to stderr (stdout reserved for JSON output)"""
    print(f"[INFO] {message}", file=sys.stderr, flush=True)

def output_business(data):
    """Output business as JSON line to stdout"""
    print(json.dumps(data, ensure_ascii=False), flush=True)

def scroll_feed(page):
    """Scroll to load all listings"""
    log("Scrolling listings...")
    try:
        scrollable = page.locator('div[role="feed"]')
        scrollable.wait_for(state='visible', timeout=10000)
    except:
        return
    
    prev_count = 0
    no_change = 0
    
    for i in range(MAX_SCROLLS):
        page.evaluate('(el) => el.scrollTop = el.scrollHeight', scrollable.element_handle())
        time.sleep(SCROLL_PAUSE)
        
        cards = page.locator('div.Nv2PK').count()
        
        if cards == prev_count:
            no_change += 1
            if no_change >= 2:
                log(f"No new listings (stable at {cards})")
                break
        else:
            no_change = 0
            if i % 3 == 0:
                log(f"Loaded {cards} listings...")
        
        prev_count = cards

def sanitize_text(text):
    """Remove newlines, extra spaces, and clean text"""
    if not text:
        return None
    # Replace newlines with spaces
    text = text.replace('\n', ' ').replace('\r', ' ')
    # Replace multiple spaces with single space
    text = ' '.join(text.split())
    return text.strip()

def clean_url(url):
    """Clean Google redirect URLs"""
    if not url:
        return None
    
    # Handle Google redirect URLs like /url?q=...
    if url.startswith('/url?'):
        # Extract the actual URL from query parameter
        match = re.search(r'[?&]q=([^&]+)', url)
        if match:
            from urllib.parse import unquote
            return unquote(match.group(1))
    
    # Ensure URL has protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    return url

def extract_data(page, index):
    """Extract business data"""
    try:
        card = page.locator('div.Nv2PK').nth(index)
        card.click(timeout=5000)
        time.sleep(1.5)
        
        data = {
            'nama': None,
            'lokasi': None,
            'maps_url': None,
            'email': None,
            'kontak': None,
            'website': None
        }
        
        # Name
        try:
            nama_raw = page.locator('.DUwDvf').first.inner_text(timeout=2000).strip()
            data['nama'] = sanitize_text(nama_raw)
        except:
            pass
        
        # Location + Google Maps URL
        try:
            addr = page.locator('button[data-item-id*="address"]').first
            lokasi_raw = addr.get_attribute('aria-label', timeout=1000).replace('Address: ', '').replace('Alamat: ', '').strip()
            data['lokasi'] = sanitize_text(lokasi_raw)
            
            # Capture current Google Maps URL
            current_url = page.url
            if 'google.com/maps' in current_url:
                data['maps_url'] = current_url
        except:
            pass
        
        # Phone
        try:
            phone = page.locator('button[data-item-id*="phone"]').first
            phone_text = phone.get_attribute('aria-label', timeout=1000) or phone.inner_text(timeout=1000)
            kontak_raw = re.sub(r'(Phone:|Telepon:|Copy.*)', '', phone_text, flags=re.IGNORECASE).strip()
            data['kontak'] = sanitize_text(kontak_raw)
        except:
            pass
        
        # Website
        try:
            web = page.locator('a[data-item-id*="authority"]').first
            href = web.get_attribute('href', timeout=1000)
            if href and 'google.com' not in href:
                cleaned_url = clean_url(href)
                if cleaned_url:
                    data['website'] = cleaned_url
        except:
            pass
        
        # Email (from website or description)
        try:
            text_content = page.locator('[class*="review"], [class*="description"]').first.inner_text(timeout=1000)
            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text_content)
            if email_match:
                data['email'] = sanitize_text(email_match.group(0))
        except:
            pass
        
        return data
    except:
        return None

def main():
    log(f"Starting scrape: {SEARCH_QUERY}")
    
    with sync_playwright() as p:
        log("Launching browser...")
        browser = p.chromium.launch(headless=True)
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            locale='id-ID',
        )
        
        page = context.new_page()
        stealth = Stealth()
        stealth.apply_stealth_sync(page)
        
        try:
            # Navigate to Google Maps
            log("Loading Google Maps...")
            page.goto("https://www.google.com/maps", timeout=60000)
            time.sleep(3)
            
            # Search
            log(f"Searching: {SEARCH_QUERY}")
            try:
                search_box = page.locator('input#searchboxinput').first
                search_box.wait_for(state='visible', timeout=10000)
                search_box.click()
            except:
                try:
                    search_box = page.locator('input[name="q"]').first
                    search_box.wait_for(state='visible', timeout=5000)
                    search_box.click()
                except:
                    log("Could not find search box")
                    return
            
            search_box.fill(SEARCH_QUERY)
            time.sleep(1)
            search_box.press("Enter")
            
            # Wait for results
            page.wait_for_selector('div[role="feed"]', timeout=15000)
            time.sleep(3)
            
            # Scroll
            scroll_feed(page)
            
            # Extract and output immediately (streaming)
            total = page.locator('div.Nv2PK').count()
            log(f"Processing {total} listings...")
            
            processed = 0
            for i in range(total):
                log(f"Extracting {i+1}/{total}...")
                data = extract_data(page, i)
                
                if data and data['nama'] and (data['email'] or data['kontak']):
                    # Output immediately as JSON line
                    output_business(data)
                    processed += 1
                    log(f"✓ Outputted: {data['nama'][:50]}")
            
            log(f"✅ Complete: {processed} businesses outputted")
        
        finally:
            browser.close()
            log("Done!")

if __name__ == "__main__":
    main()
