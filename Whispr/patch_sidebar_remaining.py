import re, glob

pages_todo = ['feed.html', 'new-report.html', 'post.html', 'profile.html', 'videos.html', 'search.html', 'messages.html']

sidebar_html = '''    <!-- Mobile Sidebar Overlay -->
    <div class="nav__overlay" id="nav-overlay" aria-hidden="true"></div>

    <!-- Mobile Sidebar Navigation -->
    <div class="nav__mobile" id="mobile-menu" role="dialog" aria-label="Navigation menu" aria-modal="true">
        <div class="nav__mobile__header">
            <a href="index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;">
                <img src="assets/images/whisprlogo.png" alt="Whispr" style="height:32px;">
                <span style="font-weight:900;color:#fff;font-size:1.1rem;">Whispr</span>
            </a>
            <button class="nav__mobile__close" id="nav-close-btn" aria-label="Close menu">&times;</button>
        </div>

        <a href="feed.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            Feed
        </a>
        <a href="videos.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8h8a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z" /></svg>
            Videos
        </a>
        <a href="new-report.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Whispr
        </a>
        <a href="messages.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Messages
        </a>
        <a href="search.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search
        </a>
        <a href="profile.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Profile
        </a>
        <a href="about.html" class="nav__link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>
            About
        </a>

        <div class="sidebar-divider"></div>

        <div class="sidebar-footer">
            <a href="auth.html" class="btn btn--primary btn--block">Create Anonymous Account</a>
        </div>
    </div>'''

for page in pages_todo:
    try:
        with open(page, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'nav__mobile__header' in content:
            print(f"SKIP {page} (already migrated)")
            continue

        # Replace old mobile menu block with the new sidebar
        new_content = re.sub(
            r'    <!-- Mobile (?:Menu|Nav[^-]*).*?-->\s+<div class="nav__mobile"[^>]*>.*?</div>',
            sidebar_html,
            content,
            flags=re.DOTALL
        )
        
        # Also add the overlay div before <body> close if no match (backup)
        if new_content == content:
            new_content = content.replace(
                '</nav>\n\n',
                '</nav>\n\n' + sidebar_html + '\n\n',
                1
            )

        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {page}")
    except FileNotFoundError:
        print(f"SKIP {page} (not found)")

print("Done patching remaining pages")
