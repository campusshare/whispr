import re

# ─── 1. Fix hero section top padding on index.html ───────────────────────────
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Remove the 180px padding-top which creates the huge gap
index_html = index_html.replace(
    'style="padding: 180px 20px 80px;',
    'style="padding: 80px 20px 60px;'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)
print("Fixed hero padding on index.html")


# ─── 2. Overhaul auth.html alias section ─────────────────────────────────────
with open('auth.html', 'r', encoding='utf-8') as f:
    auth_html = f.read()

new_alias_field = '''                        <div class="form-group">
                            <label class="form-label" for="alias-preview">Your Alias</label>
                            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:10px;">
                                Choose any alias that's not your real name &mdash; or click Generate for a random one. All aliases must be unique.
                            </p>
                            <div class="input-wrapper" style="margin-bottom:8px;">
                                <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <input type="text" class="form-input" id="alias-preview"
                                    placeholder="Enter your alias..."
                                    autocomplete="off" spellcheck="false"
                                    style="color:var(--accent-teal);font-weight:700;font-family:var(--font-mono)">
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                                <button type="button" id="btn-generate-alias"
                                    style="background:#2C2C2E;color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:0.85rem;cursor:pointer;flex-shrink:0;transition:background 0.2s;">
                                    &#x2728; Generate Random
                                </button>
                                <span id="alias-status" style="font-size:0.8rem;"></span>
                            </div>
                            <span class="form-hint">Your alias is permanent and how you appear publicly. Never use your real name.</span>
                        </div>'''

old_alias_field = '''                        <div class="form-group">
                            <label class="form-label" for="alias-preview">Your Alias (auto generated)</label>
                            <div class="input-wrapper">
                                <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <input type="text" class="form-input" id="alias-preview" value="SilentFalcon72" readonly
                                    aria-readonly="true"
                                    style="color:var(--accent-teal);font-weight:700;font-family:var(--font-mono)">
                            </div>
                            <span class="form-hint">This is how you'll appear publicly. You cannot change it.</span>
                        </div>'''

auth_html = auth_html.replace(old_alias_field, new_alias_field)

with open('auth.html', 'w', encoding='utf-8') as f:
    f.write(auth_html)
print("Updated alias section in auth.html")


# ─── 3. Convert mobile nav from dropdown to slide-in sidebar in styles.css ───
with open('css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the existing nav__mobile block with a sidebar drawer
old_mobile_nav_css = """.nav__mobile {
  display: none;
  position: fixed;
  top: var(--nav-height-mobile);
  left: 0;
  right: 0;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--space-md);
  z-index: 999;
  flex-direction: column;
  gap: var(--space-xs)
}

.nav__mobile.visible {
  display: flex
}

.nav__mobile .nav__link {
  font-size: 1rem;
  padding: 12px 16px
}"""

new_mobile_nav_css = """/* Sidebar Overlay */
.nav__overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 998;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.nav__overlay.visible { display: block; }

/* Slide-in Sidebar Drawer */
.nav__mobile {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  right: -320px;
  width: min(320px, 85vw);
  height: 100dvh;
  background: #111113;
  border-left: 1px solid rgba(255,255,255,0.08);
  padding: 28px 20px;
  z-index: 999;
  gap: 4px;
  transition: right 0.35s cubic-bezier(0.4,0,0.2,1);
  overflow-y: auto;
}

.nav__mobile.visible {
  right: 0;
}

/* Sidebar header */
.nav__mobile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.nav__mobile__close {
  background: none;
  border: none;
  color: #8E8E93;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  line-height: 1;
  font-size: 1.4rem;
  transition: color 0.2s;
}
.nav__mobile__close:hover { color: #fff; }

.nav__mobile .nav__link {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  font-weight: 500;
  padding: 13px 16px;
  border-radius: 12px;
  color: var(--text-primary);
  text-decoration: none;
  transition: background 0.2s;
}
.nav__mobile .nav__link:hover { background: rgba(255,255,255,0.06); }
.nav__mobile .nav__link svg { width: 20px; height: 20px; flex-shrink: 0; }

.nav__mobile .sidebar-divider {
  height: 1px;
  background: rgba(255,255,255,0.07);
  margin: 12px 0;
}

.nav__mobile .sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}"""

css = css.replace(old_mobile_nav_css, new_mobile_nav_css)

# Make hamburger hide on desktop in the media query
# Also ensure nav__mobile doesn't show on desktop
old_desktop_nav = """  .nav__mobile {
    display: none
  }"""
new_desktop_nav = """  .nav__mobile {
    right: -320px !important
  }"""
css = css.replace(old_desktop_nav, new_desktop_nav)

with open('css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated styles.css with sidebar drawer nav")


# ─── 4. Update all HTML pages mobile nav from dropdown to sidebar drawer ─────
import glob, os

html_files = glob.glob('*.html')
pages = [f for f in html_files if f not in ['admin.html']]

sidebar_content_template = '''    <!-- Mobile Sidebar Overlay -->
    <div class="nav__overlay" id="nav-overlay" aria-hidden="true"></div>

    <!-- Mobile Sidebar Navigation -->
    <div class="nav__mobile" id="mobile-menu" role="dialog" aria-label="Navigation menu" aria-modal="true">
        <div class="nav__mobile__header">
            <a href="index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;">
                <img src="assets/images/whisprlogo.png" alt="Whispr" style="height:32px;">
                <span style="font-weight:900;color:#fff;font-size:1.1rem;">Whispr</span>
            </a>
            <button class="nav__mobile__close" id="nav-close-btn" aria-label="Close menu">&times;</button>
        </div>

        <a href="feed.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            Feed
        </a>
        <a href="videos.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8h8a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z" /></svg>
            Videos
        </a>
        <a href="new-report.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Whispr
        </a>
        <a href="messages.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Messages
        </a>
        <a href="search.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search
        </a>
        <a href="profile.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Profile
        </a>
        <a href="about.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>
            About
        </a>

        <div class="sidebar-divider"></div>

        <div class="sidebar-footer">
            <a href="auth.html" class="btn btn--primary btn--block">Create Anonymous Account</a>
        </div>
    </div>'''

# Patterns of old mobile menus we will replace
old_mobile_patterns = [
    # pattern with simple links
    r'    <!-- Mobile Menu -->\s+<div class="nav__mobile" id="mobile-menu"[^>]*>.*?</div>',
]

updated = 0
for html_file in pages:
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if they have the old nav__mobile without the sidebar header  
    if 'nav__mobile' in content and 'nav__mobile__header' not in content:
        # Replace the old mobile-menu div
        new_content = re.sub(
            r'    <!-- Mobile (?:Menu|Sidebar[^-]*) -->\s+(?:<div class="nav__overlay"[^>]*>[^<]*</div>\s+)?<div class="nav__mobile" id="mobile-menu"[^>]*>.*?</div>',
            sidebar_content_template,
            content,
            flags=re.DOTALL
        )
        if new_content != content:
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated sidebar in {html_file}")
            updated += 1

print(f"Total pages updated: {updated}")


# ─── 5. Update app.js to handle sidebar close/open (overlay + close btn) ─────
with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Upgrade the hamburger nav to also control the overlay and close btn
new_nav_init = '''function initNav() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay    = document.getElementById('nav-overlay');
  const closeBtn   = document.getElementById('nav-close-btn');
  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('visible');
    overlay?.classList.add('visible');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('visible');
    overlay?.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (mobileMenu.classList.contains('visible')) closeMenu();
    else openMenu();
  });

  closeBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  // ESC key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('visible')) closeMenu();
  });

  // Populate nav avatar / alias if logged in
  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar && Auth.isLoggedIn()) {
    navAvatar.textContent = Auth.getAvatar();
    navAvatar.title       = Auth.getAlias();
    navAvatar.style.cursor = 'pointer';
    navAvatar.addEventListener('click', () => { location.href = 'profile.html'; });
  }
}
'''

old_nav_init = re.search(r'function initNav\(\) \{.*?\n\}', app_js, re.DOTALL)
if old_nav_init:
    app_js = app_js.replace(old_nav_init.group(0), new_nav_init)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
print("Updated app.js nav init for sidebar")
