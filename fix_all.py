"""
fix_all.py — Whispr bottom-nav + branding batch fixer
Fixes:
  1. Remove duplicate text nodes after <span class="bnav-label"> in all html
  2. Rename "Videos" -> "Drops" and "Report" -> "Whispr" in bnav-labels
  3. Change videos tab icon to a "Drops" clapperboard SVG
  4. Increase logo image size in all pages
  5. Update aria-labels and link titles for renamed pages
"""
import re, os

BASE = r'C:\Users\Maikano\Desktop\Whispr'

# New "Drops" icon (film clapperboard / play circle)
DROPS_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>'''

OLD_VIDEO_SVG_PATTERN = r'<svg[^>]*>[^<]*<path[^/]*/>[^<]*</svg>(?=[^<]*(?:<span class="bnav-label">(?:Videos|Drops)</span>|Videos|Drops))'

HTML_FILES = [
    'feed.html', 'profile.html', 'search.html',
    'post.html', 'new-report.html', 'videos.html',
    'messages.html', 'index.html', 'auth.html',
    'about.html', 'admin.html'
]

def fix_file(fname):
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        return False
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    original = html

    # ── 1. Remove duplicate text after </span> before </a> in bottom-nav ──
    # Pattern: bnav-label span, then whitespace, then plain text, then whitespace, then </a>
    def clean_dup(m):
        item = m.group(0)
        # replace spans followed by matching plain text
        item = re.sub(
            r'(<span class="bnav-label">([^<]+)</span>)\s*\n?\s*\2\s*\n?\s*',
            r'\1\n        ',
            item
        )
        return item
    html = re.sub(
        r'<a[^>]*bottom-nav__item[^>]*>.*?</a>',
        clean_dup,
        html,
        flags=re.DOTALL
    )

    # ── 2. Rename "Videos" → "Drops" in bnav-label spans ─────────────────
    html = html.replace('<span class="bnav-label">Videos</span>', '<span class="bnav-label">Drops</span>')
    # Also rename in aria-labels for the videos link
    html = html.replace('aria-label="Videos"', 'aria-label="Drops"')

    # ── 3. Rename "Report" → "Whispr" in bnav-label spans ────────────────
    html = html.replace('<span class="bnav-label">Report</span>', '<span class="bnav-label">Whispr</span>')

    # ── 4. Change the Videos tab icon to the Drops film icon ──────────────
    # Find the bottom-nav item linking to videos.html and swap its SVG
    def replace_videos_icon(m):
        item = m.group(0)
        # Replace the svg block (the old camera/video icon)
        old_svg_pat = r'<svg[^>]*>.*?</svg>'
        # Only replace first SVG (the icon, not bnav-label content)
        item = re.sub(old_svg_pat, DROPS_SVG, item, count=1, flags=re.DOTALL)
        return item
    html = re.sub(
        r'<a[^>]*href="videos\.html"[^>]*class="[^"]*bottom-nav__item[^"]*"[^>]*>.*?</a>',
        replace_videos_icon,
        html,
        flags=re.DOTALL
    )
    # Also handle reversed class/href order
    html = re.sub(
        r'<a[^>]*class="[^"]*bottom-nav__item[^"]*"[^>]*href="videos\.html"[^>]*>.*?</a>',
        replace_videos_icon,
        html,
        flags=re.DOTALL
    )

    # ── 5. Fix FAB — remove bnav-label that leaked inside .bottom-nav__fab ──
    # If span is inside the fab div, remove it
    html = re.sub(
        r'(<div class="bottom-nav__fab"[^>]*>.*?)(</div>)\s*(<span class="bnav-label">[^<]*</span>)',
        r'\1\2',
        html,
        flags=re.DOTALL
    )

    # ── 6. Clean remaining duplicate bare text nodes after bnav spans ──────
    # Pattern: </span>text\n where text equals the span content
    html = re.sub(
        r'(<span class="bnav-label">([^<]+)</span>)\s*\n\s*\2(\s*\n)',
        r'\1\3',
        html
    )

    # ── 7. Increase logo size in nav (img height: 28→40px, 32→40px) ───────
    # Top nav logo
    html = re.sub(
        r'(class="nav__logo"[^>]*>.*?<img[^>]*style=")[^"]*(")',
        r'\1height:44px;\2',
        html,
        flags=re.DOTALL
    )
    # Sidebar/mobile menu logo
    html = re.sub(
        r'(nav__mobile__header.*?<img[^>]*style=")[^"]*(")',
        r'\1height:36px;\2',
        html,
        flags=re.DOTALL
    )

    if html != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        return True
    return False

for fname in HTML_FILES:
    changed = fix_file(fname)
    print(f'{"OK  " if changed else "SKIP"} {fname}')
print('Done.')
