import re

with open('videos.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The structure goes:
# <body style="background:#000000;overflow:hidden">
# 
#     <div class="reels-container">
# 
#         <!-- Navigation -->
#     <nav class="nav" role="navigation" aria-label="Main navigation">

# We want to move the <nav> element and its mobile menu out of <div class="reels-container">
# Let's extract the nav content first.
nav_match = re.search(r'(<!-- Navigation -->.*?</nav>\s*<!-- Mobile Menu -->\s*<div[^>]*>.*?</div>)', html, re.DOTALL)
if nav_match:
    nav_content = nav_match.group(1)
    # Remove from current location
    html = html.replace(nav_content, '')
    
    # Insert right after <body ...>
    body_match = re.search(r'(<body[^>]*>)', html)
    if body_match:
        body_tag = body_match.group(1)
        html = html.replace(body_tag, body_tag + '\n\n    ' + nav_content)

with open('videos.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Nav reparented.")
