import re

with open('js/feed.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Replace the post-card__footer block
new_footer = '''      <div class="post-card__footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; width: 100%;">
        <!-- Comment -->
        <button class="engage-btn" data-comment aria-label="Comments" style="flex: 1; justify-content: flex-start;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <span style="font-size: 0.85rem;">${post.comments}</span>
        </button>
        
        <!-- Repost -->
        <button class="engage-btn" data-repost aria-label="Repost" style="flex: 1; justify-content: flex-start;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span style="font-size: 0.85rem;">${Math.max(1, Math.floor(post.likes * 0.23))}</span>
        </button>
        
        <!-- Like -->
        <button class="engage-btn" data-like aria-label="Like" style="flex: 1; justify-content: flex-start;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span style="font-size: 0.85rem;">${post.likes}</span>
        </button>
        
        <!-- Views -->
        <button class="engage-btn" data-view aria-label="Views" style="flex: 1; justify-content: flex-start;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span style="font-size: 0.85rem;">${Math.floor(post.likes * 14.5) > 999 ? (post.likes * 14.5 / 1000).toFixed(1) + 'k' : Math.floor(post.likes * 14.5)}</span>
        </button>
        
        <!-- Actions Group -->
        <div style="display:flex; justify-content: flex-end; gap: 4px;">
          <!-- Bookmark -->
          <button class="engage-btn" data-bookmark aria-label="Bookmark" style="padding: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </button>
          
          <!-- Share -->
          <button class="engage-btn" data-share aria-label="Share" style="padding: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>
      </div>
    </article>`;'''

# Replace the portion between `<div class="post-card__footer">` and `</article>`;`
pattern = r'<div class="post-card__footer">.*?</article>`;'
js_content = re.sub(pattern, new_footer, js_content, flags=re.DOTALL)

with open('js/feed.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Injected new twitter-style actions bar to feed posts.")
