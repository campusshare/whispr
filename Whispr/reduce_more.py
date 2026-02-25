import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Margins
html = html.replace(
    'margin: 0 auto 120px;',
    'margin: 0 auto 100px;'
)

# Paddings and Gaps inside cards
html = html.replace(
    'padding: 60px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 60px;',
    'padding: 50px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 50px;'
)

# Community section gaps
html = html.replace(
    'justify-content: space-between; gap: 60px;',
    'justify-content: space-between; gap: 50px;'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Applied an additional 15% reduction to containers in index.html")
