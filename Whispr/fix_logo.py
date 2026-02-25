import glob
import re

html_files = glob.glob('*.html')

old_nav_logo = r'<a href="index\.html" class="nav__logo" aria-label="Whispr Home" style="color: #ffffff !important; gap: 12px;">\s*<img src="assets/images/whisprlogo\.png" alt="Whispr Logo" style="height: 32px; width: auto; object-fit: contain;">\s*<span style="font-weight: 800; letter-spacing: -0\.02em;">Whispr</span>\s*</a>'
new_nav_logo = '''<a href="index.html" class="nav__logo" aria-label="Whispr Home" style="gap: 12px; align-items: center; text-decoration: none;">
                <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 48px; width: auto; object-fit: contain;">
                <span style="font-weight: 900; letter-spacing: -0.02em; color: #ffffff; font-size: 1.6rem;">Whispr</span>
            </a>'''

old_footer_logo = r'<a href="index\.html" class="nav__logo" style="font-size:1\.2rem; color: #ffffff !important; gap: 8px;">\s*<img src="assets/images/whisprlogo\.png" alt="Whispr Logo" style="height: 24px; width: auto; object-fit: contain;">\s*<span style="font-weight: 800; letter-spacing: -0\.02em;">Whispr</span>\s*</a>'
new_footer_logo = '''<a href="index.html" class="nav__logo" style="gap: 8px; align-items: center; text-decoration: none;">
                    <img src="assets/images/whisprlogo.png" alt="Whispr Logo" style="height: 36px; width: auto; object-fit: contain;">
                    <span style="font-weight: 900; letter-spacing: -0.02em; color: #ffffff; font-size: 1.4rem;">Whispr</span>
                </a>'''

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(old_nav_logo, new_nav_logo, content, flags=re.DOTALL)
    content = re.sub(old_footer_logo, new_footer_logo, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated sizes and forced white color for logos in HTML files.")
