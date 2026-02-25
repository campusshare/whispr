import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract the nav and mobile menu
nav_start = html.find('<!-- Navigation -->')
nav_end = html.find('<!-- Hero Section -->')
nav_content = html[nav_start:nav_end].strip()

with open('videos.html', 'r', encoding='utf-8') as f:
    videos_html = f.read()

# Replace the Top overlay nav with standard nav_content
videos_html = re.sub(
    r'<!-- Top overlay nav -->\s*<div[^>]*>.*?</div>\s*(?=<!-- Reel viewport -->)',
    nav_content + '\n\n        ',
    videos_html,
    flags=re.DOTALL
)

# Also, inject the Like button back into the .reel-actions container
like_btn = '''<button class="reel-action" aria-label="Like">
                    <div class="reel-action__icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="26" height="26">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg></div>
                    <span class="reel-action__label">Like</span>
                </button>
                '''

videos_html = re.sub(
    r'(<div class="reel-actions">)',
    r'\1\n                ' + like_btn,
    videos_html
)

with open('videos.html', 'w', encoding='utf-8') as f:
    f.write(videos_html)
