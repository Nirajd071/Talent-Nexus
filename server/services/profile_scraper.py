"""
Multi-Platform Profile Scraper Service
Scrapes public profiles from various platforms for talent discovery
Supports: GitHub, Behance, Stack Overflow, Dev.to
Uses Playwright with anti-bot measures
"""

import asyncio
import json
import random
import sys
import re
from typing import List, Dict

try:
    from playwright.async_api import async_playwright, Page
except ImportError:
    print("Error: Playwright not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
    sys.exit(1)

# User agents pool for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]


async def scrape_profiles(
    platform: str = "github",
    query: str = "fullstack",
    location: str = "India",
    max_profiles: int = 10,
    existing_urls: List[str] = []
) -> List[Dict]:
    """Scrape profiles from specified platform."""
    platform = platform.lower()
    print(f"[Scraper] Platform: {platform}, Query: {query}, Location: {location}, Max: {max_profiles}", file=sys.stderr)
    
    if platform == "github":
        return await scrape_github_profiles(query, location, max_profiles, existing_urls)
    elif platform == "behance":
        return await scrape_behance_profiles(query, location, max_profiles, existing_urls)
    elif platform == "stackoverflow":
        return await scrape_stackoverflow_profiles(query, location, max_profiles, existing_urls)
    elif platform == "devto":
        return await scrape_devto_profiles(query, max_profiles, existing_urls)
    else:
        print(f"Unknown platform: {platform}", file=sys.stderr)
        return []


# ==========================================
# GITHUB SCRAPER
# ==========================================
async def scrape_github_profiles(
    query: str, location: str, max_profiles: int, existing_urls: List[str]
) -> List[Dict]:
    """Scrape GitHub user profiles."""
    profiles = []
    browser = None
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            search_url = f"https://github.com/search?q=type%3Auser+location%3A{location}+{query}&type=users"
            print(f"[GitHub] Searching: {search_url}", file=sys.stderr)
            
            await page.goto(search_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            # Collect profile URLs from search results
            profile_urls = []
            
            # Try multiple selectors for GitHub's search results
            selectors = [
                'a[data-hovercard-type="user"]',
                'div[data-testid="results-list"] a',
                '.user-list-item a',
                'a.Link--primary'
            ]
            
            for selector in selectors:
                try:
                    links = await page.query_selector_all(selector)
                    for link in links:
                        href = await link.get_attribute('href')
                        if href and href.startswith('/') and href.count('/') == 1:
                            full_url = f"https://github.com{href}"
                            if full_url not in profile_urls and full_url not in existing_urls:
                                profile_urls.append(full_url)
                except:
                    continue
            
            # Fallback: extract from page content
            if len(profile_urls) < 3:
                content = await page.content()
                matches = re.findall(r'href="(/[a-zA-Z0-9_-]+)"', content)
                skip_paths = ['search', 'explore', 'marketplace', 'features', 'pricing', 
                             'login', 'signup', 'join', 'settings', 'notifications', 'about']
                for match in matches:
                    if match.count('/') == 1:
                        path = match[1:]
                        if path and len(path) > 1 and path.lower() not in skip_paths:
                            full_url = f"https://github.com{match}"
                            if full_url not in profile_urls and full_url not in existing_urls:
                                profile_urls.append(full_url)
            
            print(f"[GitHub] Found {len(profile_urls)} profile URLs", file=sys.stderr)
            
            # Scrape each profile
            for i, profile_url in enumerate(profile_urls[:max_profiles]):
                try:
                    await asyncio.sleep(random.uniform(1.5, 2.5))
                    print(f"[GitHub] Scraping {i+1}/{min(len(profile_urls), max_profiles)}: {profile_url}", file=sys.stderr)
                    
                    await page.goto(profile_url, wait_until='domcontentloaded', timeout=20000)
                    await asyncio.sleep(1)
                    
                    profile = await extract_github_profile(page, profile_url)
                    if profile.get('fullName'):
                        profile['source'] = 'GitHub'
                        profiles.append(profile)
                        print(f"[GitHub] ✓ Scraped: {profile['fullName']}", file=sys.stderr)
                        
                except Exception as e:
                    print(f"[GitHub] Error on {profile_url}: {e}", file=sys.stderr)
                    continue
            
            await browser.close()
            
    except Exception as e:
        print(f"[GitHub] Scraper error: {e}", file=sys.stderr)
        if browser:
            await browser.close()
    
    return profiles


async def extract_github_profile(page: Page, profile_url: str) -> Dict:
    """Extract data from GitHub profile page."""
    profile = {
        'fullName': '', 'email': '', 'bio': '', 'location': '',
        'profileUrl': profile_url, 'skills': [], 'company': '',
        'website': '', 'followers': 0, 'repos': 0
    }
    
    try:
        # Name - try multiple selectors
        for sel in ['span.p-name', '[itemprop="name"]', 'h1.vcard-names span']:
            try:
                name_el = await page.query_selector(sel)
                if name_el:
                    text = (await name_el.inner_text()).strip()
                    if text and len(text) > 1:
                        profile['fullName'] = text
                        break
            except:
                continue
        
        # Fallback to username
        if not profile['fullName']:
            try:
                username_el = await page.query_selector('span.p-nickname, .vcard-username')
                if username_el:
                    profile['fullName'] = (await username_el.inner_text()).strip()
            except:
                pass
        
        # Bio
        for sel in ['div.p-note', '.user-profile-bio', '[data-bio-text]']:
            try:
                bio_el = await page.query_selector(sel)
                if bio_el:
                    text = (await bio_el.inner_text()).strip()
                    if text:
                        profile['bio'] = text[:500]
                        break
            except:
                continue
        
        # Location
        for sel in ['[itemprop="homeLocation"]', '.p-label', 'li[itemprop="homeLocation"] span']:
            try:
                loc_el = await page.query_selector(sel)
                if loc_el:
                    text = (await loc_el.inner_text()).strip()
                    if text:
                        profile['location'] = text
                        break
            except:
                continue
        
        # Company
        try:
            company_el = await page.query_selector('[itemprop="worksFor"] span, .p-org')
            if company_el:
                profile['company'] = (await company_el.inner_text()).strip()
        except:
            pass
        
        # Skills from pinned repos language badges
        try:
            lang_els = await page.query_selector_all('[itemprop="programmingLanguage"], .repo-language-color + span')
            seen = set()
            for el in lang_els:
                skill = (await el.inner_text()).strip()
                if skill and skill not in seen:
                    profile['skills'].append(skill)
                    seen.add(skill)
        except:
            pass
                
    except Exception as e:
        print(f"[GitHub] Extract error: {e}", file=sys.stderr)
    
    return profile


# ==========================================
# BEHANCE SCRAPER (Designers/Creatives)
# ==========================================
async def scrape_behance_profiles(
    query: str, location: str, max_profiles: int, existing_urls: List[str]
) -> List[Dict]:
    """Scrape Behance user profiles."""
    profiles = []
    browser = None
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            search_url = f"https://www.behance.net/search/users?search={query}%20{location}"
            print(f"[Behance] Searching: {search_url}", file=sys.stderr)
            
            await page.goto(search_url, wait_until='networkidle', timeout=45000)
            await asyncio.sleep(4)
            
            # Scroll to load more
            for _ in range(3):
                await page.keyboard.press('End')
                await asyncio.sleep(1.5)
            
            # Extract profile URLs
            profile_urls = []
            content = await page.content()
            
            # Find user profile links
            matches = re.findall(r'href="(https://www\.behance\.net/[a-zA-Z0-9_-]+)"', content)
            skip_paths = ['search', 'galleries', 'joblist', 'adobe', 'features', 
                         'assets', 'onboarding', 'hire', 'login', 'signup', 'privacy',
                         'tos', 'help', 'feedback', 'misc', 'about', 'careers', 'gallery']
            
            for match in matches:
                path = match.replace('https://www.behance.net/', '').split('/')[0].split('?')[0]
                if (path and len(path) > 2 and path.lower() not in skip_paths and
                    not path.startswith('gallery') and
                    match not in profile_urls and match not in existing_urls):
                    profile_urls.append(match)
            
            print(f"[Behance] Found {len(profile_urls)} profile URLs", file=sys.stderr)
            
            # Scrape profiles
            scraped = 0
            for profile_url in profile_urls:
                if scraped >= max_profiles:
                    break
                try:
                    await asyncio.sleep(random.uniform(2, 3))
                    await page.goto(profile_url, wait_until='domcontentloaded', timeout=25000)
                    await asyncio.sleep(2)
                    
                    profile = await extract_behance_profile(page, profile_url)
                    if profile.get('fullName'):
                        profile['source'] = 'Behance'
                        profiles.append(profile)
                        scraped += 1
                        print(f"[Behance] ✓ Scraped: {profile['fullName']}", file=sys.stderr)
                except Exception as e:
                    print(f"[Behance] Error: {e}", file=sys.stderr)
                    continue
            
            await browser.close()
            
    except Exception as e:
        print(f"[Behance] Scraper error: {e}", file=sys.stderr)
        if browser:
            await browser.close()
    
    return profiles


async def extract_behance_profile(page: Page, profile_url: str) -> Dict:
    """Extract data from Behance profile."""
    profile = {
        'fullName': '', 'email': '', 'bio': '', 'location': '',
        'profileUrl': profile_url, 'skills': [], 'company': '',
        'website': '', 'followers': 0, 'repos': 0
    }
    
    try:
        # Name
        for sel in ['h1', '.e2e-Profile-userName', '[class*="userName"]', '.UserInfo-userName']:
            try:
                name_el = await page.query_selector(sel)
                if name_el:
                    text = (await name_el.inner_text()).strip()
                    if text and len(text) > 1 and len(text) < 100:
                        profile['fullName'] = text
                        break
            except:
                continue
        
        # Bio
        for sel in ['[class*="bio"]', '[class*="headline"]', '.UserInfo-bio']:
            try:
                bio_el = await page.query_selector(sel)
                if bio_el:
                    text = (await bio_el.inner_text()).strip()
                    if text and len(text) > 10 and len(text) < 500:
                        profile['bio'] = text
                        break
            except:
                continue
        
        # Location
        for sel in ['[class*="location"]', '[class*="Location"]', '.UserInfo-location']:
            try:
                loc_el = await page.query_selector(sel)
                if loc_el:
                    profile['location'] = (await loc_el.inner_text()).strip()
                    break
            except:
                continue
        
        # Skills from fields
        try:
            skill_els = await page.query_selector_all('[class*="field"], [class*="skill"]')
            for el in skill_els[:10]:
                skill = (await el.inner_text()).strip()
                if skill and len(skill) < 50:
                    profile['skills'].append(skill)
        except:
            pass
                
    except Exception as e:
        print(f"[Behance] Extract error: {e}", file=sys.stderr)
    
    return profile


# ==========================================
# STACK OVERFLOW SCRAPER
# ==========================================
async def scrape_stackoverflow_profiles(
    query: str, location: str, max_profiles: int, existing_urls: List[str]
) -> List[Dict]:
    """Scrape Stack Overflow user profiles."""
    profiles = []
    browser = None
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            # Search users by reputation
            search_url = f"https://stackoverflow.com/users?tab=reputation&filter=all"
            print(f"[StackOverflow] Searching: {search_url}", file=sys.stderr)
            
            await page.goto(search_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            # Get user profile links
            profile_urls = []
            links = await page.query_selector_all('a[href*="/users/"]')
            
            for link in links:
                href = await link.get_attribute('href')
                if href and '/users/' in href:
                    full_url = href if href.startswith('http') else f"https://stackoverflow.com{href}"
                    if (re.match(r'.*/users/\d+/.*', full_url) or re.match(r'.*/users/\d+$', full_url)):
                        if full_url not in profile_urls and full_url not in existing_urls:
                            profile_urls.append(full_url)
            
            print(f"[StackOverflow] Found {len(profile_urls)} profiles", file=sys.stderr)
            
            # Scrape profiles
            for i, profile_url in enumerate(profile_urls[:max_profiles]):
                try:
                    await asyncio.sleep(random.uniform(1.5, 2.5))
                    await page.goto(profile_url, wait_until='domcontentloaded', timeout=20000)
                    await asyncio.sleep(1)
                    
                    profile = await extract_stackoverflow_profile(page, profile_url)
                    if profile.get('fullName'):
                        profile['source'] = 'Stack Overflow'
                        profiles.append(profile)
                        print(f"[StackOverflow] ✓ Scraped: {profile['fullName']}", file=sys.stderr)
                except Exception as e:
                    print(f"[StackOverflow] Error: {e}", file=sys.stderr)
                    continue
            
            await browser.close()
            
    except Exception as e:
        print(f"[StackOverflow] Error: {e}", file=sys.stderr)
        if browser:
            await browser.close()
    
    return profiles


async def extract_stackoverflow_profile(page: Page, profile_url: str) -> Dict:
    """Extract data from Stack Overflow profile."""
    profile = {
        'fullName': '', 'email': '', 'bio': '', 'location': '',
        'profileUrl': profile_url, 'skills': [], 'company': '',
        'website': '', 'followers': 0, 'repos': 0
    }
    
    try:
        # Name
        for sel in ['h1', '.fs-headline2', '[itemprop="name"]', '.user-card-name']:
            try:
                name_el = await page.query_selector(sel)
                if name_el:
                    text = (await name_el.inner_text()).strip()
                    if text and len(text) < 100:
                        profile['fullName'] = text
                        break
            except:
                continue
        
        # Bio
        try:
            bio_el = await page.query_selector('.js-about-me-content, .user-about-me')
            if bio_el:
                profile['bio'] = (await bio_el.inner_text()).strip()[:500]
        except:
            pass
        
        # Location
        try:
            loc_el = await page.query_selector('[itemprop="homeLocation"], .user-card-location')
            if loc_el:
                profile['location'] = (await loc_el.inner_text()).strip()
        except:
            pass
        
        # Tags/Skills
        try:
            tag_els = await page.query_selector_all('.s-tag, .post-tag, .tag')
            seen = set()
            for el in tag_els[:15]:
                tag = (await el.inner_text()).strip()
                if tag and tag not in seen:
                    profile['skills'].append(tag)
                    seen.add(tag)
        except:
            pass
                
    except Exception as e:
        print(f"[StackOverflow] Extract error: {e}", file=sys.stderr)
    
    return profile


# ==========================================
# DEV.TO SCRAPER
# ==========================================
async def scrape_devto_profiles(
    query: str, max_profiles: int, existing_urls: List[str]
) -> List[Dict]:
    """Scrape Dev.to developer profiles."""
    profiles = []
    browser = None
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            await page.goto("https://dev.to/", wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            # Scroll for more content
            for _ in range(3):
                await page.keyboard.press('End')
                await asyncio.sleep(1)
            
            # Extract author profile URLs from articles
            profile_urls = []
            author_links = await page.query_selector_all('a[href^="/"][class*="author"], .crayons-story__secondary a')
            
            for link in author_links:
                try:
                    href = await link.get_attribute('href')
                    if href and href.startswith('/') and href.count('/') == 1:
                        path = href[1:]
                        skip = ['search', 'top', 'latest', 'settings', 'enter', 'signout', 
                               'signin', 'notifications', 'reading', 'new', 'tags', 'about',
                               't', 'html', 'css', 'javascript', 'python', 'webdev', 'react']
                        if path and len(path) > 2 and path.lower() not in skip:
                            full_url = f"https://dev.to{href}"
                            if full_url not in profile_urls and full_url not in existing_urls:
                                profile_urls.append(full_url)
                except:
                    continue
            
            print(f"[Dev.to] Found {len(profile_urls)} profiles", file=sys.stderr)
            
            # Scrape profiles
            scraped = 0
            for profile_url in profile_urls:
                if scraped >= max_profiles:
                    break
                try:
                    await asyncio.sleep(random.uniform(1.5, 2.5))
                    await page.goto(profile_url, wait_until='domcontentloaded', timeout=20000)
                    await asyncio.sleep(1)
                    
                    # Check if it's a user profile
                    profile_check = await page.query_selector('.profile-header, .crayons-card--profile, .profile-details')
                    if not profile_check:
                        continue
                    
                    profile = await extract_devto_profile(page, profile_url)
                    if profile.get('fullName'):
                        profile['source'] = 'Dev.to'
                        profiles.append(profile)
                        scraped += 1
                        print(f"[Dev.to] ✓ Scraped: {profile['fullName']}", file=sys.stderr)
                except Exception as e:
                    print(f"[Dev.to] Error: {e}", file=sys.stderr)
                    continue
            
            await browser.close()
            
    except Exception as e:
        print(f"[Dev.to] Error: {e}", file=sys.stderr)
        if browser:
            await browser.close()
    
    return profiles


async def extract_devto_profile(page: Page, profile_url: str) -> Dict:
    """Extract data from Dev.to profile."""
    profile = {
        'fullName': '', 'email': '', 'bio': '', 'location': '',
        'profileUrl': profile_url, 'skills': [], 'company': '',
        'website': '', 'followers': 0, 'repos': 0
    }
    
    try:
        # Name
        for sel in ['h1', '.profile-header__name', '.crayons-title', '.profile-details h1']:
            try:
                name_el = await page.query_selector(sel)
                if name_el:
                    text = (await name_el.inner_text()).strip()
                    if text and len(text) > 1 and len(text) < 100:
                        profile['fullName'] = text
                        break
            except:
                continue
        
        # Bio
        for sel in ['.profile-header__bio', '.profile-header__summary', '.profile-details p']:
            try:
                bio_el = await page.query_selector(sel)
                if bio_el:
                    text = (await bio_el.inner_text()).strip()
                    if text and len(text) > 5:
                        profile['bio'] = text[:500]
                        break
            except:
                continue
        
        # Location
        try:
            loc_el = await page.query_selector('[class*="location"]')
            if loc_el:
                profile['location'] = (await loc_el.inner_text()).strip()
        except:
            pass
                
    except Exception as e:
        print(f"[Dev.to] Extract error: {e}", file=sys.stderr)
    
    return profile


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-platform profile scraper')
    parser.add_argument('--platform', type=str, default='github', help='Platform to scrape')
    parser.add_argument('--query', type=str, default='fullstack', help='Search query')
    parser.add_argument('--location', type=str, default='India', help='Location filter')
    parser.add_argument('--max', type=int, default=10, help='Max profiles to scrape')
    parser.add_argument('--existing', type=str, default='[]', help='JSON array of existing URLs')
    
    args = parser.parse_args()
    
    try:
        existing_urls = json.loads(args.existing)
    except:
        existing_urls = []
    
    profiles = await scrape_profiles(
        platform=args.platform,
        query=args.query,
        location=args.location,
        max_profiles=args.max,
        existing_urls=existing_urls
    )
    
    # Output JSON to stdout (only profiles, logs go to stderr)
    print(json.dumps(profiles, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
