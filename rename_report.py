import glob
import re

html_files = glob.glob('*.html')

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace specific text
    content = content.replace('+ New Report', '+ New Whispr')
    content = content.replace('aria-label="New Report"', 'aria-label="New Whispr"')
    # Also in text elements
    content = re.sub(r'>New Report<', '>New Whispr<', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Replaced 'New Report' with 'New Whispr' in HTML files.")
