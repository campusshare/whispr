import re

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Extract the <nav> block from index.html
nav_match = re.search(r'(<!-- Navigation -->\s*<nav class="nav".*?</nav>\s*<!-- Mobile Menu -->\s*<div class="nav__mobile"[^>]*>.*?</div>)', index_html, re.DOTALL)
if nav_match:
    nav_content = nav_match.group(1)
else:
    print("Nav not found in index.html!")
    exit(1)

with open('videos.html', 'r', encoding='utf-8') as f:
    videos_html = f.read()

# Remove the old Like buttons entirely
like_btn_pattern = r'<button class="reel-action"(?: id="[^"]*")?(?: aria-label="Like")?(?: engage-btn--like)?>.*?<span class="reel-action__label">Like</span>\s*</button>\s*'
videos_html = re.sub(like_btn_pattern, '', videos_html, flags=re.DOTALL)
# Also catch the exact exact ones we might have injected before
videos_html = re.sub(r'<button class="reel-action engage-btn--like"[^>]*>.*?<span class="reel-action__label">Like</span>\s*</button>\s*', '', videos_html, flags=re.DOTALL)

# Insert the exact Like button the user requested above the Comment button
exact_like_html = '''<button class="reel-action engage-btn--like">
                    <div class="reel-action__icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="26" height="26">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <span class="reel-action__label">Like</span>
                </button>'''

comment_pattern = r'(<button class="reel-action"\s+id="reel\d+-comment"\s+aria-label="Comment">)'
videos_html = re.sub(comment_pattern, exact_like_html + '\\n                \\1', videos_html)


# Now ensure the Nav from index.html is exactly what is in videos.html
# Remove any existing Nav from videos.html
nav_existing = re.search(r'(<!-- Navigation -->\s*<nav class="nav".*?</nav>\s*<!-- Mobile Menu -->\s*<div class="nav__mobile"[^>]*>.*?</div>)', videos_html, re.DOTALL)
if nav_existing:
    videos_html = videos_html.replace(nav_existing.group(1), '')

# Also remove the inline top overlay if it still exists somehow
overlay = re.search(r'<!-- Top overlay nav -->\s*<div[^>]*style="position:fixed;top:0;left:0[^>]*>.*?</div>', videos_html, re.DOTALL)
if overlay:
    videos_html = videos_html.replace(overlay.group(0), '')

# Inject the fresh nav_content right after <body ...>
body_pattern = r'(<body[^>]*>)'
videos_html = re.sub(body_pattern, '\\1\\n\\n    ' + nav_content, videos_html, count=1)

with open('videos.html', 'w', encoding='utf-8') as f:
    f.write(videos_html)
print("Standardized Nav and Like Button successfully.")
