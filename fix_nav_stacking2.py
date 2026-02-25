import re

with open('videos.html', 'r', encoding='utf-8') as f:
    html = f.read()

nav_pattern = r'(<!-- Navigation -->\s*<nav class="nav" role="navigation" aria-label="Main navigation">.*?</nav>\s*<!-- Mobile Menu -->\s*<div class="nav__mobile"[^>]*>.*?</div>)'
nav_match = re.search(nav_pattern, html, re.DOTALL)

if nav_match:
    nav_content = nav_match.group(1)
    
    # Remove nav from its current position
    html = html.replace(nav_content, '')
    
    # Inject it right after <body...>
    body_pattern = r'(<body[^>]*>)'
    body_match = re.search(body_pattern, html)
    
    if body_match:
        html = html.replace(body_match.group(1), body_match.group(1) + '\n\n' + nav_content)

with open('videos.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Nav reparented!")
