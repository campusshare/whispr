"""
patch_auth_ui.py
Injects auth-aware nav elements into all HTML pages and adds the
initAuthUI() function to app.js, enabling distinct logged-in / logged-out views.
"""
import re, glob

HTML_FILES = [f for f in glob.glob('*.html') if f not in ['admin.html', 'auth.html']]

# ── 1. Replace the nav__actions block in each HTML file ──────────────────────
# We inject two slotted zones:
#  • [data-auth-show="loggedOut"]  → shown only when visitor is not signed in
#  • [data-auth-show="loggedIn"]   → shown only when visitor is signed in
NAV_ACTIONS_REPLACEMENT = '''            <div class="nav__actions">
                <div class="security-bar" style="background: rgba(10, 132, 255, 0.1); border-color: rgba(10, 132, 255, 0.3); color: #0A84FF;">
                    <span class="dot" style="background: #0A84FF;"></span> <span class="hide-mobile">Encrypted</span> Feed
                </div>

                <!-- Logged out: show sign in button -->
                <a href="auth.html" class="btn btn--primary btn--sm" id="nav-signin-btn" data-auth-show="loggedOut"
                   style="font-size:.82rem;padding:7px 16px;">
                    Join Whispr
                </a>

                <!-- Logged in: show alias badge + sign out -->
                <div data-auth-show="loggedIn" style="display:flex;align-items:center;gap:10px;">
                    <a href="profile.html" id="nav-user-badge"
                       style="display:flex;align-items:center;gap:8px;text-decoration:none;background:rgba(255,255,255,0.07);padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.09);cursor:pointer;transition:background .2s;">
                        <span id="nav-avatar" style="font-size:1.1rem;line-height:1;">🦅</span>
                        <span id="nav-alias" style="font-size:.85rem;font-weight:700;color:#fff;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
                    </a>
                    <button id="nav-signout-btn" aria-label="Sign out"
                        style="background:rgba(255,69,58,0.12);border:1px solid rgba(255,69,58,0.25);color:#FF453A;border-radius:20px;padding:6px 14px;font-size:.8rem;font-weight:600;cursor:pointer;transition:background .2s;">
                        Sign Out
                    </button>
                </div>

                <button class="nav__hamburger" id="hamburger" aria-label="Open navigation menu" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
            </div>'''

updated_pages = []
for page in HTML_FILES:
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace the entire nav__actions div
    new_content = re.sub(
        r'<div class="nav__actions">.*?</div>\s*</div>\s*</nav>',
        NAV_ACTIONS_REPLACEMENT + '\n        </div>\n    </nav>',
        content,
        count=1,
        flags=re.DOTALL
    )
    
    if new_content != content:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_content)
        updated_pages.append(page)
        print(f'✓ Nav updated: {page}')
    else:
        print(f'⚠ No nav match in: {page}')

print(f'\nTotal pages updated: {len(updated_pages)}')
