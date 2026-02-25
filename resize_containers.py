import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace for 'Secure Channel for Truth' section
html = html.replace(
    'margin: 0 auto 160px;',
    'margin: 0 auto 120px;'
)

html = html.replace(
    'padding: 80px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 80px;',
    'padding: 60px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 60px;'
)

html = html.replace(
    'clamp(2.5rem, 5vw, 3.5rem)',
    'clamp(2rem, 4vw, 3rem)'
)

html = html.replace(
    'style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 0; line-height: 1.6; font-weight: 500;"',
    'style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 0; line-height: 1.6; font-weight: 500;"'
)

# For Security Section font size adjustments
html = html.replace(
    'clamp(2.5rem, 5vw, 3.8rem)',
    'clamp(2rem, 4vw, 3rem)'
)
html = html.replace(
    'font-size: 1.25rem; color: var(--text-secondary); line-height: 2;',
    'font-size: 1.15rem; color: var(--text-secondary); line-height: 1.8;'
)

# Border Resizing
html = html.replace('border-radius: 40px;', 'border-radius: 32px;')
html = html.replace('border-radius: 30px;', 'border-radius: 24px;')

# Community section gaps
html = html.replace('gap: 80px; flex-wrap: wrap-reverse;', 'gap: 60px; flex-wrap: wrap-reverse;')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Resized containers in index.html")
