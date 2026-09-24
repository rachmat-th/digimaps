#!/usr/bin/env python3
"""
🚀 PRODUCTION-GRADE GOOGLE MAPS SCRAPER
==================================================
Technology: Playwright + Stealth Mode
Based on: HasData/google-maps-scraper (community-proven)
Enhanced with: Human-like behavior + Email extraction + Checkpoints

Target: Business
Output: Nama | Lokasi | Email | Kontak | Website
Requirement: Minimal Nama + (Email OR Kontak)

Author: Enhanced for B2B Lead Generation
Version: 2.0 Production
==================================================
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from playwright_stealth import Stealth
import time
import random
import re
import csv
import os
import json
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KONFIGURASI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Get search query from environment variable (for API integration)
SEARCH_QUERY = os.environ.get('SEARCH_QUERY', 'SMP Islam Depok')
SEARCH_QUERIES = [SEARCH_QUERY]  # Single query mode for API

# Output paths
OUTPUT_DIR = "/tmp"
OUTPUT_CSV = f"{OUTPUT_DIR}/digimaps_scrape.csv"
PROGRESS_LOG = f"{OUTPUT_DIR}/digimaps_progress.log"
CHECKPOINT_FILE = f"{OUTPUT_DIR}/digimaps_checkpoint.json"

# Scraping settings
MAX_SCROLLS = 20
SCROLL_PAUSE_MIN = 3  # Human-like delays
SCROLL_PAUSE_MAX = 7

# Human behavior settings
HUMAN_MODE = True
MIN_DELAY = 2
MAX_DELAY = 5
READ_PAUSE_CHANCE = 0.15  # 15% chance to "read" before continuing

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOGGING & UTILITIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def log(message, level="INFO"):
    """Log dengan timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"[{timestamp}] [{level}] {message}"
    
    # Append to file
    with open(PROGRESS_LOG, 'a', encoding='utf-8') as f:
        f.write(log_line + "\n")
    
    # Print to console
    print(log_line)


def human_delay(min_s=None, max_s=None):
    """Random delay untuk human-like behavior"""
    if not HUMAN_MODE:
        time.sleep(0.5)
        return
    
    delay = random.uniform(min_s or MIN_DELAY, max_s or MAX_DELAY)
    time.sleep(delay)


def is_valid_business(text):
    """Accept all businesses - no filtering for Digimaps"""
    return True  # Accept all business types


def extract_email_from_text(text):
    """Extract email dengan regex"""
    if not text:
        return None
    
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text)
    
    if emails:
        valid = [e for e in emails if not e.endswith(('.png', '.jpg', '.gif', '.svg'))]
        return valid[0] if valid else None
    
    return None


def scrape_website_for_email(url, timeout=8):
    """Scrape website untuk cari email"""
    if not url or 'google.com' in url or 'maps' in url:
        return None
    
    try:
        if not url.startswith('http'):
            url = 'https://' + url
        
        response = requests.get(url, timeout=timeout, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Method 1: Find in text
            text = soup.get_text()
            email = extract_email_from_text(text)
            if email:
                return email
            
            # Method 2: mailto links
            for link in soup.find_all('a', href=True):
                if 'mailto:' in link['href']:
                    return link['href'].replace('mailto:', '').strip()
        
        return None
        
    except Exception:
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECKPOINT MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def load_checkpoint():
    """Load checkpoint dari file"""
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                return json.load(f)
        except:
            return {"completed_queries": [], "businesses": []}
    return {"completed_queries": [], "businesses": []}


def save_checkpoint(data):
    """Save checkpoint ke file"""
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    log("💾 Checkpoint saved", "DEBUG")


def save_to_csv(businesses):
    """Save businesses ke CSV"""
    if not businesses:
        log("⚠️  No businesses to save", "WARN")
        return 0
    
    # Filter: must have name + (email OR contact)
    valid = [s for s in businesses if s['nama'] and (s['email'] or s['kontak'])]
    
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Nama', 'Lokasi', 'Email', 'Kontak', 'Website']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for business in valid:
            writer.writerow({
                'Nama': business['nama'],
                'Lokasi': business['lokasi'] or '-',
                'Email': business['email'] or '-',
                'Kontak': business['kontak'] or '-',
                'Website': business['website'] or '-'
            })
    
    log(f"✅ Saved {len(valid)} businesses to CSV (from {len(businesses)} total)")
    return len(valid)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PLAYWRIGHT SCRAPING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def scroll_feed(page):
    """Scroll feed dengan human-like behavior"""
    log("📜 Scrolling search results...")
    
    try:
        scrollable = page.locator('div[role="feed"]')
        scrollable.wait_for(state='visible', timeout=10000)
    except:
        log("⚠️  Feed not found", "WARN")
        return
    
    last_count = 0
    no_change_count = 0
    
    for scroll_num in range(MAX_SCROLLS):
        # Scroll to bottom
        page.evaluate('(el) => el.scrollTop = el.scrollHeight', scrollable.element_handle())
        
        # Human-like pause
        pause = random.uniform(SCROLL_PAUSE_MIN, SCROLL_PAUSE_MAX)
        time.sleep(pause)
        
        # Occasional "reading" pause
        if HUMAN_MODE and random.random() < READ_PAUSE_CHANCE:
            time.sleep(random.uniform(2, 4))
        
        # Check if new listings loaded
        try:
            cards = page.locator('div.Nv2PK').count()
            
            if cards == last_count:
                no_change_count += 1
                if no_change_count >= 3:
                    log(f"  ✅ Scroll complete (no new listings)")
                    break
            else:
                no_change_count = 0
                if scroll_num % 3 == 0:
                    log(f"  📊 Scroll {scroll_num+1}x - {cards} listings loaded")
            
            last_count = cards
        except:
            pass
    
    final_count = page.locator('div.Nv2PK').count()
    log(f"✅ Total listings: {final_count}")


def extract_school_data(page, card_index):
    """Extract data dari satu card listing - OPTIMIZED"""
    try:
        card = page.locator('div.Nv2PK').nth(card_index)
        
        # Click card untuk buka detail panel
        card.click(timeout=5000)
        page.wait_for_load_state('domcontentloaded', timeout=3000)
        time.sleep(random.uniform(0.8, 1.5))  # Minimal delay
        
        data = {
            'nama': None,
            'lokasi': None,
            'email': None,
            'kontak': None,
            'website': None
        }
        
        # NAMA - shorter timeout
        try:
            nama = page.locator('.DUwDvf').first.inner_text(timeout=2000)
            data['nama'] = nama.strip()
        except:
            pass
        
        # LOKASI/ADDRESS - faster
        try:
            addr = page.locator('button[data-item-id*="address"]').first
            data['lokasi'] = addr.get_attribute('aria-label', timeout=1000).replace('Address: ', '').replace('Alamat: ', '').strip()
        except:
            pass
        
        # KONTAK/PHONE - single fast selector
        try:
            phone_elem = page.locator('button[data-item-id*="phone"]').first
            phone_text = phone_elem.get_attribute('aria-label', timeout=1000) or phone_elem.inner_text(timeout=1000)
            phone_clean = re.sub(r'(Phone:|Telepon:|Copy.*)', '', phone_text, flags=re.IGNORECASE).strip()
            if phone_clean and len(phone_clean) > 5:
                data['kontak'] = phone_clean
        except:
            pass
        
        # WEBSITE - single fast selector
        try:
            web_elem = page.locator('a[data-item-id*="authority"]').first
            href = web_elem.get_attribute('href', timeout=1000)
            if href and 'google.com' not in href:
                data['website'] = href
        except:
            pass
        
        # EMAIL - from website if available (DISABLED for speed - can enable later)
        # if data['website'] and not data['email']:
        #     data['email'] = scrape_website_for_email(data['website'])
        
        return data
        
    except Exception as e:
        log(f"❌ Extract error: {str(e)[:100]}", "ERROR")
        return None
        return None


def scrape_query(page, query):
    """Scrape satu query"""
    log(f"\n{'='*70}")
    log(f"🔍 QUERY: {query}")
    log(f"{'='*70}")
    
    # Navigate to Google Maps
    try:
        page.goto("https://www.google.com/maps", timeout=60000)
        page.wait_for_load_state('domcontentloaded')
        
        # Debug screenshot
        os.makedirs(f"{OUTPUT_DIR}/debug", exist_ok=True)
        page.screenshot(path=f"{OUTPUT_DIR}/debug/gmaps_loaded.png")
        log("📸 Screenshot saved for debugging", "DEBUG")
        
        human_delay(3, 5)
    except Exception as e:
        log(f"❌ Failed to load Google Maps: {str(e)[:100]}", "ERROR")
        return []
    
    # Search - Indonesia Google Maps version
    try:
        # Wait for page to be interactive
        page.wait_for_load_state('load')
        human_delay(2, 3)
        
        # Multiple selector strategies for search box
        search_box = None
        selectors = [
            'input#searchboxinput',
            'input[aria-label*="Telusuri"]',
            'input[aria-label*="Search"]',
            'input[name="q"]',
            'input[placeholder*="Search"]',
            'div#searchboxinput',
        ]
        
        for selector in selectors:
            try:
                search_box = page.locator(selector).first
                if search_box.is_visible(timeout=2000):
                    log(f"✅ Found search box: {selector}", "DEBUG")
                    break
            except:
                continue
        
        if not search_box:
            raise Exception("Search box not found with any selector")
        
        # Interact with search box
        search_box.click()
        human_delay(0.5, 1)
        search_box.fill("")  # Clear first
        search_box.type(query, delay=random.randint(50, 150))  # Human-like typing
        human_delay(0.5, 1)
        
        # Take screenshot before search
        page.screenshot(path=f"{OUTPUT_DIR}/debug/before_search.png")
        
        search_box.press("Enter")
        log(f"🔍 Search submitted: {query}")
        
        # Wait for results sidebar to appear (not networkidle - Google Maps never stops loading)
        try:
            page.wait_for_selector('div[role="feed"]', timeout=15000)
            log("✅ Results feed loaded", "DEBUG")
        except:
            # Fallback - wait for any result card
            page.wait_for_selector('div.Nv2PK, a.hfpxzc', timeout=15000)
            log("✅ Result cards loaded", "DEBUG")
        
        human_delay(3, 5)
        
        # Screenshot after search
        page.screenshot(path=f"{OUTPUT_DIR}/debug/after_search.png")
        
    except Exception as e:
        log(f"❌ Search failed: {str(e)[:150]}", "ERROR")
        page.screenshot(path=f"{OUTPUT_DIR}/debug/search_failed.png")
        return []
    
    # Scroll to load all
    scroll_feed(page)
    
    # Get all cards
    try:
        total_cards = page.locator('div.Nv2PK').count()
        log(f"📋 Processing {total_cards} listings...")
    except:
        log("❌ No cards found", "ERROR")
        return []
    
    businesses = []
    processed = 0
    skipped = 0
    
    for i in range(total_cards):
        try:
            log(f"  [{i+1}/{total_cards}] Extracting...")
            
            # Extract detail first (with timeout protection)
            try:
                data = extract_school_data(page, i)
            except Exception as e:
                log(f"    ❌ Extract timeout/error: {str(e)[:80]}", "ERROR")
                skipped += 1
                continue
            
            # Then filter
            if data and data['nama']:
                # Accept all businesses for Digimaps
                if not is_valid_business(data['nama']):
                    skipped += 1
                    log(f"    ⏭️  Invalid business: {data['nama'][:40]}", "DEBUG")
                    continue
                
                # Check if has contact
                if data['email'] or data['kontak']:
                    businesses.append(data)
                    processed += 1
                    
                    contact = data['email'] or data['kontak'] or 'no-contact'
                    log(f"    ✅ {data['nama'][:40]} | {contact[:30]}")
                    
                    if processed % 5 == 0:
                        log(f"    📊 Progress: {processed} valid, {skipped} skipped")
                else:
                    skipped += 1
                    log(f"    ⚠️  No contact: {data['nama'][:40]}", "DEBUG")
            else:
                skipped += 1
                log(f"    ⚠️  Incomplete data - skipped", "DEBUG")
        
        except Exception as e:
            log(f"    ❌ Error: {str(e)[:80]}", "ERROR")
            skipped += 1
            continue
    
    log(f"✅ Query done: {processed} businesses ({skipped} skipped)")
    return businesses


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    log("="*70)
    log("🚀 PLAYWRIGHT GOOGLE MAPS SCRAPER - PRODUCTION")
    log("="*70)
    log(f"Mode: {'🤖 HUMAN-LIKE (slower, safer)' if HUMAN_MODE else '⚡ FAST (higher risk)'}")
    
    # Load checkpoint
    checkpoint = load_checkpoint()
    completed = set(checkpoint.get('completed_queries', []))
    all_businesses = checkpoint.get('businesses', [])
    
    if completed:
        log(f"📌 Resuming: {len(completed)} queries already done")
    
    with sync_playwright() as p:
        # Launch browser
        log("🌐 Launching Chromium with stealth mode...")
        browser = p.chromium.launch(
            headless=False,  # Set True untuk production
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
            ]
        )
        
        # Create context with anti-detection
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale='id-ID',
            timezone_id='Asia/Jakarta',
        )
        
        page = context.new_page()
        
        # Apply stealth mode
        stealth = Stealth()
        stealth.apply_stealth_sync(page)
        log("✅ Stealth mode activated")
        
        try:
            # Process queries
            for query in SEARCH_QUERIES:
                if query in completed:
                    log(f"⏭️  Skipping '{query}' (already done)")
                    continue
                
                try:
                    businesses = scrape_query(page, query)
                    
                    # Deduplicate
                    seen_names = {s['nama'] for s in all_businesses}
                    new_businesses = [s for s in businesses if s['nama'] not in seen_names]
                    
                    all_businesses.extend(new_businesses)
                    completed.add(query)
                    
                    # Save checkpoint
                    checkpoint['completed_queries'] = list(completed)
                    checkpoint['businesses'] = all_businesses
                    save_checkpoint(checkpoint)
                    
                    # Save CSV
                    save_to_csv(all_businesses)
                    
                    log(f"💾 Total unique businesses: {len(all_businesses)}")
                    
                except Exception as e:
                    log(f"❌ Query failed: {e}", "ERROR")
                    continue
            
            # Final summary
            log(f"\n{'='*70}")
            log("🎉 SCRAPING COMPLETE")
            log(f"{'='*70}")
            
            valid_count = save_to_csv(all_businesses)
            
            log(f"📊 SUMMARY:")
            log(f"  - Total businesses scraped: {len(all_businesses)}")
            log(f"  - With contact info: {valid_count}")
            log(f"  - Output CSV: {OUTPUT_CSV}")
            log(f"  - Log file: {PROGRESS_LOG}")
            
        except KeyboardInterrupt:
            log("\n⚠️  Interrupted by user", "WARN")
            log("💾 Saving progress...")
            checkpoint['completed_queries'] = list(completed)
            checkpoint['businesses'] = all_businesses
            save_checkpoint(checkpoint)
            save_to_csv(all_businesses)
        
        finally:
            log("🛑 Closing browser...")
            browser.close()
            log("✅ Done!")


if __name__ == "__main__":
    main()
