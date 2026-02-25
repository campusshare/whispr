import re
import os

# 1. Update css/styles.css
with open('css/styles.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Add new CSS rules for the X-style feed
# We will append them, overriding previous .post-card if necessary, but it's better to inject
x_style_css = '''
/* X-Style Feed Overrides */
.feed-layout.x-style {
  display: block;
  max-width: 600px;
  margin: 0 auto;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  background: #000000;
  min-height: 100vh;
}
.feed-layout.x-style aside {
  display: none;
}
.feed-layout.x-style > div {
  width: 100%;
}
.page-body.x-feed-page {
  padding-top: 0;
  background: #000000;
}

.x-post {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #000000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
  cursor: pointer;
}
.x-post:hover {
  background: rgba(255, 255, 255, 0.03);
}

.x-post__avatar {
  flex-shrink: 0;
}

.x-post__content {
  flex: 1;
  min-width: 0;
}

.x-post__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.x-post__alias {
  font-weight: 700;
  color: #ffffff;
  font-size: 0.95rem;
}

.x-post__meta-dot {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.x-post__time {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.x-post__category {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
}

.x-post__text {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-bottom: 12px;
  word-wrap: break-word;
}

.x-post__media-wrap {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
  background: var(--bg-tertiary);
}

.x-post__media-wrap img, .x-post__media-wrap video {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 400px;
}

.x-post__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  max-width: 425px;
}

.x-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.x-action-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
}

.x-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.x-action-btn.like-btn:hover {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.15);
}
.x-action-btn.like-btn:hover svg {
  stroke: #ff3b30;
}

.x-action-btn.share-btn:hover {
  color: #0A84FF;
  background: rgba(10, 132, 255, 0.15);
}
.x-action-btn.share-btn:hover svg {
  stroke: #0A84FF;
}

.x-action-btn.repost-btn:hover {
  color: #34c759;
  background: rgba(52, 199, 89, 0.15);
}
.x-action-btn.repost-btn:hover svg {
  stroke: #34c759;
}

.feed-mode-toggle.sticky-header {
  position: sticky;
  top: 64px; /* Default nav height, will be overwritten if nav is higher */
  z-index: 40;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(28, 28, 30, 0.8);
  margin-bottom: 0;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  justify-content: space-around;
}

.feed-mode-toggle.sticky-header .feed-mode-btn {
  flex: 1;
  border-radius: 0;
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 3px solid transparent;
  padding: 12px 0;
  font-size: 0.95rem;
}

.feed-mode-toggle.sticky-header .feed-mode-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.feed-mode-toggle.sticky-header .feed-mode-btn.active {
  background: transparent;
  color: #ffffff;
  border-bottom: 3px solid #0A84FF;
}

/* Hide old search and category tabs on X style feed */
.x-hide {
  display: none !important;
}

'''
if '/* X-Style Feed Overrides */' not in css_content:
    with open('css/styles.css', 'a', encoding='utf-8') as f:
        f.write("\n" + x_style_css)

# 2. Update feed.html
with open('feed.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Add x-feed-page class to main
html_content = re.sub(r'<main class="page-body has-bottom-nav">', '<main class="page-body has-bottom-nav x-feed-page">', html_content)
# Add x-style class to feed-layout
html_content = re.sub(r'<div class="feed-layout">', '<div class="feed-layout x-style">', html_content)

# Hide search bar and old category tabs
html_content = re.sub(r'<div style="margin-bottom:var\(--space-lg\)">\s*<div class="search-bar"', '<div class="x-hide" style="margin-bottom:var(--space-lg)">\n                <div class="search-bar"', html_content)
html_content = re.sub(r'<div class="category-tabs"', '<div class="category-tabs x-hide"', html_content)

# Modify feed mode toggle to be sticky and adjust inner HTML
old_toggle = r'<div class="feed-mode-toggle" role="group" aria-label="Feed mode" id="feed-mode-toggle">.*?</div>'
new_toggle = '''<div class="feed-mode-toggle sticky-header" role="group" aria-label="Feed mode" id="feed-mode-toggle" style="top: 76px;">
                        <button class="feed-mode-btn active" id="btn-mode-global" data-mode="global">
                            Global Feed
                        </button>
                        <button class="feed-mode-btn" id="btn-mode-following" data-mode="following">
                            Following
                        </button>
                    </div>'''
html_content = re.sub(old_toggle, new_toggle, html_content, flags=re.DOTALL)

# Hide old Sort bar
html_content = re.sub(r'<div class="flex-between" style="margin-bottom:var\(--space-md\)">', '<div class="flex-between x-hide" style="margin-bottom:var(--space-md)">', html_content)

# Strip hyphens globally from visible HTML
# HTML attributes must be preserved, so we are careful. Let's just do targeted replace for visible texts we know about just to be safe.
# Actually we can do a quick replace on the full text of dummy elements.
html_content = html_content.replace('Feed - Whispr', 'Feed Whispr')
html_content = html_content.replace('Video Evidence — Whispr', 'Video Evidence Whispr')
html_content = html_content.replace('Semi-transparent', 'Semi transparent')
html_content = html_content.replace('End-to-End', 'End to End')

with open('feed.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

# 3. Update js/feed.js
with open('js/feed.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Replace dummy data hyphens
js_content = js_content.replace('-', ' ') # Risky for HTML/CSS classes inside js! 
# Let's do selective regex instead for JS content
# Actually, it's safer to just replace inside the DEMO_POSTS block
old_demo = re.search(r'const DEMO_POSTS = \[.*?\];', js_content, flags=re.DOTALL)
if old_demo:
    demo_str = old_demo.group(0)
    demo_str = demo_str.replace('over-2-years', 'over 2 years')
    demo_str = demo_str.replace('high-severity', 'high severity')
    # Remove hyphens from text
    demo_str_clean = ''
    in_string = False
    for char in demo_str:
        if char == "'" or char == "`" or char == '"':
            in_string = not in_string
        if char == '-' and in_string:
            if demo_str[demo_str.find(char)-1] != ' ' and demo_str[demo_str.find(char)+1] != ' ':
                demo_str_clean += ' '
            else:
                demo_str_clean += ' '
        else:
            demo_str_clean += char
            
    # Fix the ID fields that lost hyphens
    demo_str_clean = re.sub(r"id: 'post (.*?)'", r"id: 'post-\1'", demo_str_clean)
    js_content = js_content.replace(old_demo.group(0), demo_str_clean)


# Rewrite renderCard function
old_render_card = re.search(r'function renderCard\(post\) \{.*?\n\}', js_content, flags=re.DOTALL)

new_render_card = '''function renderCard(post) {
  const { Follows } = window.Whispr || {};
  const following = Follows?.isFollowing(post.alias) ?? false;
  
  // Clean hyphens from data
  const cleanCategory = post.category.replace(/-/g, ' ');
  const cleanTime = post.time.replace(/-/g, ' ');

  const mediaSection = post.hasMedia ? `
    <div class="x-post__media-wrap">
      <div style="height:200px;background:linear-gradient(135deg,var(--bg-tertiary),#111);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8h8a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z"/>
        </svg>
      </div>
    </div>` : '';

  return `
    <article class="x-post stagger" data-alias="${post.alias}" data-category="${post.category}" role="article">
      <div class="x-post__avatar">
        ${avatarEl(post.alias, post.avatarColor)}
      </div>
      
      <div class="x-post__content">
        <div class="x-post__header">
          <span class="x-post__alias">${post.alias}${post.verified ? ' <span title="Verified" style="color:#0A84FF;font-size:0.85rem">✓</span>' : ''}</span>
          <span class="x-post__meta-dot">·</span>
          <span class="x-post__time">${cleanTime}</span>
          <span class="x-post__meta-dot">·</span>
          <span class="x-post__category">${cleanCategory.charAt(0).toUpperCase() + cleanCategory.slice(1)}</span>
        </div>
        
        <div class="x-post__text">
          <strong style="display:block;margin-bottom:4px;font-size:1rem;">${post.title.replace(/-/g, ' ')}</strong>
          ${post.excerpt.replace(/-/g, ' ')}
        </div>
        
        ${mediaSection}
        
        <div class="x-post__actions">
          <!-- Comment -->
          <button class="x-action-btn" aria-label="Comment">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span>${post.comments}</span>
          </button>
          
          <!-- Repost -->
          <button class="x-action-btn repost-btn" aria-label="Repost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>${Math.max(1, Math.floor(post.likes * 0.23))}</span>
          </button>
          
          <!-- Like -->
          <button class="x-action-btn like-btn" aria-label="Like">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>${post.likes}</span>
          </button>
          
          <!-- Bookmark -->
          <button class="x-action-btn" aria-label="Bookmark">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </button>
          
          <!-- Share -->
          <button class="x-action-btn share-btn" aria-label="Share">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>
      </div>
    </article>`;
}'''

if old_render_card:
    js_content = js_content.replace(old_render_card.group(0), new_render_card)

# Clean up JS initial skeleton if any matches
skeleton_old = r'<div class="post-card">.*?</div>\s*</div>\s*</div>\s*</div>'
js_content = re.sub(r'Feed - Whispr', 'Feed  Whispr', js_content)

with open('js/feed.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Applied X-style layout and hypen scrubbing to feed!")
