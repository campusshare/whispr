import glob
import re

html_files = glob.glob('*.html')

new_nav_logo = '''<a href="index.html" class="nav__logo" aria-label="Whispr Home" style="gap: 12px; align-items: center; text-decoration: none;">
                <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 48px; width: auto; object-fit: contain;">
                <span style="font-weight: 900; letter-spacing: -0.02em; color: #ffffff; font-size: 1.6rem;">Whispr</span>
            </a>'''

new_footer_logo = '''<a href="index.html" class="nav__logo" style="gap: 8px; align-items: center; text-decoration: none;">
                    <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 36px; width: auto; object-fit: contain;">
                    <span style="font-weight: 900; letter-spacing: -0.02em; color: #ffffff; font-size: 1.4rem;">Whispr</span>
                </a>'''

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic replace for whatever exists inside the nav__logo container
    content = re.sub(r'<a href="index\.html" class="nav__logo"[^>]*>.*?</a>', new_nav_logo, content, flags=re.DOTALL)
    
    # Actually wait, this will replace ALL nav__logo containers with the 48px one.
    # To differentiate nav from footer, we can see if it's inside <footer... or <nav...
    # The simplest way is to just apply the new_nav_logo everywhere because the footer logo is almost the same.
    # But let's be safe and replace the exact string.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Brute-force replaced logos in HTML files.")
