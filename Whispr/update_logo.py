import os
import glob
import re

html_files = glob.glob('*.html')

# The exact new logo HTML block
new_logo_html = '''<a href="index.html" class="nav__logo" aria-label="Whispr Home" style="color: #ffffff !important; gap: 12px;">
                <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 32px; width: auto; object-fit: contain;">
                <span style="font-weight: 800; letter-spacing: -0.02em;">Whispr</span>
            </a>'''
            
# Footer logo block (smaller)
new_footer_logo_html = '''<a href="index.html" class="nav__logo" style="font-size:1.2rem; color: #ffffff !important; gap: 8px;">
                    <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 24px; width: auto; object-fit: contain;">
                    <span style="font-weight: 800; letter-spacing: -0.02em;">Whispr</span>
                </a>'''

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace standard navigation logo
    nav_logo_pattern = r'<a href="index\.html" class="nav__logo" aria-label="Whispr Home">.*?</a>'
    content = re.sub(nav_logo_pattern, new_logo_html, content, flags=re.DOTALL)
    
    # Replace footer logo
    footer_logo_pattern = r'<a href="index\.html" class="nav__logo" style="font-size:1\.2rem">.*?</a>'
    content = re.sub(footer_logo_pattern, new_footer_logo_html, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated custom logos in {len(html_files)} HTML files.")

# Tweak index.html container size to precisely 1100px (sweet spot between 1200 and 900)
with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

index_content = index_content.replace('max-width: 1050px;', 'max-width: 1100px;')
index_content = index_content.replace('padding: 45px;', 'padding: 50px;')
index_content = index_content.replace('gap: 45px;', 'gap: 50px;')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_content)
print("Updated index.html layout containers to 1100px.")
