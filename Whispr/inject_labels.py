import re, os

BASE = r'C:\Users\Maikano\Desktop\Whispr'

# Label text map: aria-label value -> display text
LABEL_MAP = {
    'Home': 'Home',
    'Feed': 'Feed',
    'New Whispr': 'Report',
    'Videos': 'Videos',
    'Profile': 'Profile',
    'Messages': 'Messages',
    'Search': 'Search',
}

def inject_labels(html):
    def fix_item(m):
        full = m.group(0)
        # Skip if already has bnav-label
        if 'bnav-label' in full:
            return full
        # Find aria-label
        al = re.search(r'aria-label=["\']([^"\']+)["\']', full)
        label_text = LABEL_MAP.get(al.group(1), al.group(1)) if al else None
        if not label_text:
            # Try to get text after last SVG
            svg_end = full.rfind('</svg>')
            if svg_end == -1:
                return full
            after = full[svg_end+6:]
            text = after.strip().strip('<').strip()
            if not text or '<' in text:
                return full
            label_text = text

        svg_end = full.rfind('</svg>')
        if svg_end == -1:
            return full

        before = full[:svg_end+6]
        after  = full[svg_end+6:]
        # Remove existing plain text node
        after_clean = re.sub(r'^\s+[A-Za-z &]+\s*', '\n        ', after)
        return before + '\n        <span class="bnav-label">' + label_text + '</span>' + after_clean.rstrip()

    pattern = re.compile(
        r'<(?:a|button)[^>]*bottom-nav__item[^>]*>.*?</(?:a|button)>',
        re.DOTALL
    )
    return pattern.sub(fix_item, html)

files = [
    'feed.html', 'profile.html', 'search.html', 'post.html',
    'new-report.html', 'videos.html', 'messages.html', 'index.html'
]

for fname in files:
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        print(f'SKIP {fname} - not found')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'bottom-nav__item' not in html:
        print(f'SKIP {fname} - no bottom nav')
        continue
    new_html = inject_labels(html)
    if new_html != html:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'OK   {fname}')
    else:
        print(f'NOCHG {fname}')
