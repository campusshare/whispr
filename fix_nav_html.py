"""
fix_nav_html.py — Strip stray bare text from bottom-nav items in all HTML files.
Removes any plain text node that appears inside a bottom-nav__item link
but is NOT inside a span (e.g. the bare word "Report" that remained after injection).
"""
import re, os, glob

BASE = r'C:\Users\Maikano\Desktop\Whispr'
HTML_FILES = glob.glob(os.path.join(BASE, '*.html'))

def clean_nav_item(m):
    """Remove bare text that's not wrapped in a tag from a nav item."""
    item = m.group(0)
    # Remove bare text nodes (not inside <tag>) between > and <
    # Strategy: after SVG closing or after </span>, remove bare text before </a>
    # Remove trailing bare words before </a> or </button>
    item = re.sub(
        r'(<\/(?:svg|span|div)>)\s*\n\s*([A-Za-z][A-Za-z ]*)\s*\n\s*(<\/(?:a|button)>)',
        r'\1\n        \3',
        item
    )
    # Also remove inline bare text at end: >SomeText</a>  (text right before closing tag)
    item = re.sub(
        r'>([A-Za-z][A-Za-z ]+)\s*<\/(a|button)>',
        r'></\2>',
        item
    )
    return item

changed_count = 0
for path in HTML_FILES:
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    original = html
    
    # Apply to every bottom-nav__item
    html = re.sub(
        r'<(?:a|button)[^>]*bottom-nav__item[^>]*>.*?</(?:a|button)>',
        clean_nav_item,
        html,
        flags=re.DOTALL
    )
    
    if html != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        changed_count += 1
        print(f'OK   {os.path.basename(path)}')
    else:
        print(f'SKIP {os.path.basename(path)}')

print(f'\nTotal changed: {changed_count}')
