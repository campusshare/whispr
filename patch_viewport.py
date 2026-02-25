import glob, re

# Fix 1: Hero padding on index.html - set to 120px (balanced)
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('padding: 80px 20px 60px;', 'padding: 120px 20px 70px;')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed hero padding to 120px')

# Fix 2: Add user-scalable=no to all HTML pages to prevent mobile zoom-on-tap
pages = glob.glob('*.html')
fixed = 0
for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        c = f.read()
    # Replace viewport without the zoom prevention
    new_c = re.sub(
        r'<meta name="viewport" content="width=device-width, initial-scale=1\.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
        c
    )
    if new_c != c:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_c)
        fixed += 1
        print(f'Fixed viewport: {page}')

print(f'Total viewport fixes applied: {fixed}')
