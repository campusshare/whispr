import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Apply aggressive max-width constraint, reduce margin and padding further
# Secure Channel
html = html.replace(
    '<section style="max-width: 1200px; margin: 0 auto 100px; padding: 0 20px;">\n            <div\n                style="background: var(--bg-card); border-radius: 32px; padding: 50px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 50px; flex-wrap: wrap; border: 1px solid var(--border-subtle);">\n                <div style="flex: 1.2; min-width: 300px;">',
    '<section style="max-width: 900px; margin: 0 auto 80px; padding: 0 20px;">\n            <div\n                style="background: var(--bg-card); border-radius: 24px; padding: 40px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 40px; flex-wrap: wrap; border: 1px solid var(--border-subtle);">\n                <div style="flex: 1; min-width: 250px;">'
)

# Institutional Security
html = html.replace(
    '<section style="max-width: 1200px; margin: 0 auto 100px; padding: 0 20px;">\n            <div\n                style="background: var(--bg-card); border-radius: 32px; padding: 50px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 50px; flex-wrap: wrap; border: 1px solid var(--border-subtle);">\n                <div style="flex: 1; min-width: 300px;">',
    '<section style="max-width: 900px; margin: 0 auto 80px; padding: 0 20px;">\n            <div\n                style="background: var(--bg-card); border-radius: 24px; padding: 40px; box-shadow: var(--shadow-deep); display: flex; align-items: center; gap: 40px; flex-wrap: wrap; border: 1px solid var(--border-subtle);">\n                <div style="flex: 1; min-width: 250px;">'
)

# Text scaling to match new small box sizes
html = html.replace(
    'clamp(2rem, 4vw, 3rem)',
    'clamp(1.75rem, 3.5vw, 2.5rem)'
)
html = html.replace(
    'font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 0; line-height: 1.6; font-weight: 500;',
    'font-size: 1rem; color: var(--text-secondary); margin-bottom: 0; line-height: 1.5; font-weight: 500;'
)
html = html.replace(
    'font-size: 1.15rem; color: var(--text-secondary); line-height: 1.8;',
    'font-size: 1rem; color: var(--text-secondary); line-height: 1.6;'
)

# Make the SVG icons for security list match the text scale
html = re.sub(
    r'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#0A84FF"\s*stroke-width="2.5" width="24" height="24">',
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#0A84FF"\n                                stroke-width="2.5" width="20" height="20">',
    html
)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Applied hardcore size reductions")
