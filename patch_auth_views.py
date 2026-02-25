import re

# ── 1. Add auth-aware CSS ─────────────────────────────────────────────────────
AUTH_CSS = """
/* ── Auth-aware UI ──────────────────────────────────────────── */

/* Default: hide everything, show after JS applies body class */
[data-auth-show] { display: none; }

/* Logged-Out: hide logged-in elements globally handled by JS.
   These rules are a safety net for flash of wrong content. */
body.logged-out [data-auth-show="loggedIn"]  { display: none !important; }
body.logged-in  [data-auth-show="loggedOut"] { display: none !important; }

/* Nav user badge hover */
#nav-user-badge:hover {
  background: rgba(255,255,255,0.11) !important;
}

/* Sign out button hover */
#nav-signout-btn:hover {
  background: rgba(255,69,58,0.22) !important;
}

/* Profile page guest prompt box */
#profile-logged-out {
  text-align: center;
  padding: 60px 20px;
  max-width: 420px;
  margin: 60px auto;
}
"""

with open('css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

if 'Auth-aware UI' not in css:
    css += AUTH_CSS
    with open('css/styles.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print('Auth CSS added')
else:
    print('Auth CSS already present')


# ── 2. Update index.html hero section ────────────────────────────────────────
with open('index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

# Build the new hero CTA block — only replace if not already done
if 'hero-logged-out' not in idx:
    HERO_LOGGED_OUT = '''                <!-- Logged-out hero CTA -->
                <div id="hero-logged-out">
                    <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:32px;">
                        <a href="auth.html" class="btn btn--primary btn--lg" style="font-size:1rem;padding:14px 32px;">
                            Create Anonymous Account
                        </a>
                        <a href="feed.html" class="btn btn--ghost btn--lg" style="font-size:1rem;padding:14px 32px;">
                            Browse Reports
                        </a>
                    </div>
                    <p style="margin-top:18px;font-size:.82rem;color:#8E8E93;">No email. No phone. No identity. Just truth.</p>
                </div>

                <!-- Logged-in hero CTA -->
                <div id="hero-logged-in" style="display:none;">
                    <div style="margin-top:32px;background:rgba(10,132,255,0.1);border:1px solid rgba(10,132,255,0.25);border-radius:16px;padding:20px 28px;display:inline-block;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                            <span id="hero-avatar-emoji" style="font-size:1.8rem;">🦅</span>
                            <div>
                                <div style="font-size:.75rem;color:#8E8E93;font-weight:600;">SIGNED IN AS</div>
                                <div id="hero-alias" style="font-size:1rem;font-weight:800;color:#fff;"></div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <a href="new-report.html" class="btn btn--primary" style="font-size:.9rem;padding:10px 22px;">New Whispr</a>
                            <a href="feed.html" class="btn btn--ghost" style="font-size:.9rem;padding:10px 22px;">View Feed</a>
                            <a href="profile.html" class="btn btn--ghost" style="font-size:.9rem;padding:10px 22px;">My Profile</a>
                        </div>
                    </div>
                </div>'''

    # Try to inject after existing hero buttons
    idx = re.sub(
        r'(<div[^>]*class="[^"]*btn-group[^"]*"[^>]*>.*?</div>)',
        lambda m: m.group(0) + '\n' + HERO_LOGGED_OUT,
        idx,
        count=1,
        flags=re.DOTALL
    )
    
    # Fallback: inject before </section> of hero
    if 'hero-logged-out' not in idx:
        idx = idx.replace(
            '</section>\n\n    <!-- Features',
            HERO_LOGGED_OUT + '\n            </section>\n\n    <!-- Features',
            1
        )

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(idx)
    print('index.html hero updated')
else:
    print('index.html hero already has auth sections')


# ── 3. Update profile.html ────────────────────────────────────────────────────
with open('profile.html', 'r', encoding='utf-8') as f:
    prof = f.read()

if 'profile-logged-in' not in prof:
    PROFILE_LOGGED_IN_SECTION = '''    <!-- Guest prompt (logged out) -->
    <div id="profile-logged-out" style="display:none;">
        <div class="card" style="max-width:440px;margin:80px auto;text-align:center;padding:40px 32px;">
            <div style="font-size:3rem;margin-bottom:16px;">🦅</div>
            <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:8px;">No account yet</h2>
            <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:24px;line-height:1.6;">
                Create a free anonymous account to submit reports, follow sources, and save bookmarks.
            </p>
            <a href="auth.html" class="btn btn--primary btn--lg btn--block">Create Anonymous Account</a>
            <a href="feed.html" class="btn btn--ghost btn--block" style="margin-top:10px;">Browse as Guest</a>
        </div>
    </div>'''

    # Inject right after <main or before existing profile content
    if '<main' in prof:
        prof = re.sub(
            r'(<main[^>]*>)',
            r'\1\n' + PROFILE_LOGGED_IN_SECTION,
            prof, count=1
        )
    
    with open('profile.html', 'w', encoding='utf-8') as f:
        f.write(prof)
    print('profile.html updated with auth sections')
else:
    print('profile.html already has auth sections')


# ── 4. Wire hero logged-in alias display via inline script in index.html ──────
with open('index.html', 'r', encoding='utf-8') as f:
    idx2 = f.read()

HERO_WIRE_SCRIPT = """    <script>
    // Wire logged-in hero alias before DOMContentLoaded fires (instant)
    (function() {
        var alias = localStorage.getItem('whispr_alias');
        var avatar = localStorage.getItem('whispr_avatar') || '🦅';
        if (alias) {
            var el = document.getElementById('hero-alias');
            var av = document.getElementById('hero-avatar-emoji');
            if (el) el.textContent = alias;
            if (av) av.textContent = avatar;
        }
    })();
    </script>"""

if 'hero-alias' in idx2 and 'Wire logged-in hero alias' not in idx2:
    idx2 = idx2.replace('</body>', HERO_WIRE_SCRIPT + '\n</body>', 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(idx2)
    print('Hero alias wire script added')

print('All done.')
