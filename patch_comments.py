import re

# Append comment delegation to js/feed.js right before the closing of the DOMContentLoaded block
with open('js/feed.js', 'r', encoding='utf-8') as f:
    feed_js = f.read()

# Inject the comment modal logic into the existing live interactions block
comment_interactivity = '''
      // Comment button: open inline comment panel (load from DB on click)
      if (btn.closest('.x-action-btn') && btn.hasAttribute('aria-label') && btn.getAttribute('aria-label') === 'Comment') {
        const countSpan = btn.querySelector('span');
        
        // Build and toggle a comment panel below the post
        let panel = postCard.querySelector('.comment-panel');
        if (panel) {
          panel.remove();
          return;
        }
        
        panel = document.createElement('div');
        panel.className = 'comment-panel';
        panel.style.cssText = 'border-top:1px solid #2C2C2E;padding:12px 0;margin-top:8px;';
        
        // Load existing comments from Supabase
        let commentsHtml = '<div style="color:#8E8E93;font-size:0.82rem;margin-bottom:10px;">Loading comments...</div>';
        panel.innerHTML = commentsHtml;
        postCard.querySelector('.x-post__content').appendChild(panel);
        
        try {
          const cRes = await fetch(`${SUPABASE_URL}/rest/v1/comments?post_id=eq.${postId}&select=*,users(alias)&order=created_at.asc`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const cData = await cRes.json();
          
          const commentItems = cData.length > 0
            ? cData.map(c => `<div style="margin-bottom:8px;"><span style="font-weight:600;color:#fff;font-size:0.82rem;">${c.users?.alias || 'Anonymous'}</span><span style="color:#8E8E93;font-size:0.82rem;"> · ${new Date(c.created_at).toLocaleDateString()}</span><div style="color:#fff;font-size:0.9rem;margin-top:2px;">${c.body}</div></div>`).join('')
            : '<div style="color:#8E8E93;font-size:0.82rem;">No comments yet. Be the first.</div>';
          
          panel.innerHTML = `
            <div style="max-height:200px;overflow-y:auto;margin-bottom:10px;">${commentItems}</div>
            <div style="display:flex;gap:8px;">
              <input id="comment-input-${postId}" placeholder="Add a comment..." 
                style="flex:1;background:#2C2C2E;color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:0.88rem;outline:none;" />
              <button id="comment-send-${postId}" style="background:#0A84FF;color:#fff;border:none;border-radius:20px;padding:8px 16px;font-size:0.88rem;cursor:pointer;">Post</button>
            </div>`;
          
          // Add new comment handler
          document.getElementById(`comment-send-${postId}`)?.addEventListener('click', async () => {
            const inputEl = document.getElementById(`comment-input-${postId}`);
            const body = inputEl?.value.trim();
            if (!body || !userId) return;
            
            const postCommentRes = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
              method: 'POST',
              headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ post_id: postId, user_id: userId, body })
            });
            
            if (postCommentRes.ok) {
              if (inputEl) inputEl.value = '';
              const newItem = document.createElement('div');
              newItem.style.cssText = 'margin-bottom:8px;';
              newItem.innerHTML = `<span style="font-weight:600;color:#fff;font-size:0.82rem;">${localStorage.getItem('whispr_alias')}</span><div style="color:#fff;font-size:0.9rem;margin-top:2px;">${body}</div>`;
              panel.querySelector('div:first-child').appendChild(newItem);
              countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }
          });
        } catch(err) {
          panel.innerHTML = '<div style="color:#FF453A;font-size:0.82rem;">Could not load comments.</div>';
          console.error(err);
        }
      }
'''

# Inject comment logic using the userId lookup block inside the live interactions handler
old_target = "if (btn.classList.contains('like-btn')) {"
feed_js = feed_js.replace(old_target, comment_interactivity + "\n      " + old_target)

with open('js/feed.js', 'w', encoding='utf-8') as f:
    f.write(feed_js)

print("Injected live comment toggle panel into feed.js")
