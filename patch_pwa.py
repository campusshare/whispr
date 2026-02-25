import glob, re

pwa_meta = '''    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#000000">
    <link rel="apple-touch-icon" href="assets/images/whisprlogo.png">'''

pages = glob.glob('*.html')
updated = 0

for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already has manifest
    if 'rel="manifest"' in content:
        print(f'SKIP {page} (already has PWA meta)')
        continue

    # Inject just before </head>
    if '</head>' in content:
        new_content = content.replace('</head>', pwa_meta + '\n</head>', 1)
        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Injected PWA meta: {page}')
        updated += 1

# Also add videos-page class to videos.html body tag
with open('videos.html', 'r', encoding='utf-8') as f:
    videos = f.read()

if 'class="has-bottom-nav"' in videos and 'videos-page' not in videos:
    videos = videos.replace('class="has-bottom-nav"', 'class="has-bottom-nav videos-page"', 1)
    with open('videos.html', 'w', encoding='utf-8') as f:
        f.write(videos)
    print('Added videos-page class to videos.html body')

# Scan for hyphens in visible text in videos.html
with open('videos.html', 'r', encoding='utf-8') as f:
    vhtml = f.read()

# Strip HTML tags and check for user-visible hyphens
import re
visible_text = re.sub(r'<[^>]+>', ' ', vhtml)
lines_with_hyphens = [l.strip() for l in visible_text.split('\n') if ' - ' in l or l.strip().startswith('-')]
if lines_with_hyphens:
    print('WARNING - visible hyphens found:', lines_with_hyphens[:5])
else:
    print('No-hyphen check PASSED: no visible hyphens in videos.html')

print(f'Total PWA meta injections: {updated}')
