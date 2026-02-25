import re

with open('js/videos.js', 'r', encoding='utf-8') as f:
    videos_js = f.read()

# 1. Inject the Global Event Delegation for Video Interactions
live_interactions_script = '''
  // --- Live Supabase Engagement Binding ---
  const vContainer = document.getElementById('videos-container');
  if (vContainer) {
    vContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn || !btn.classList.contains('engage-btn')) return;
      
      const vCard = btn.closest('.video-reel');
      if (!vCard) return;
      
      const postId = vCard.dataset.id;
      const currentAlias = localStorage.getItem('whispr_alias');
      if (!currentAlias) return window.Whispr?.Toast?.error('Please login to interact.');

      let userId = null;
      try {
        const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?alias=eq.${encodeURIComponent(currentAlias)}&select=id`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
        });
        const uData = await uRes.json();
        if (uData.length > 0) userId = uData[0].id;
      } catch (err) {}
      
      if (!userId) return;

      if (btn.hasAttribute('data-like')) {
        const countSpan = btn.querySelector('span');
        try {
          const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/likes?post_id=eq.${postId}&user_id=eq.${userId}`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const checkData = await checkRes.json();
          
          if (checkData.length > 0) {
            // Unlike
            await fetch(`${SUPABASE_URL}/rest/v1/likes?post_id=eq.${postId}&user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
            });
            btn.classList.remove('active');
            countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
            btn.querySelector('svg').setAttribute('fill', 'none');
            btn.querySelector('svg').style.color = '';
          } else {
            // Like
            await fetch(`${SUPABASE_URL}/rest/v1/likes`, {
                method: 'POST',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, user_id: userId })
            });
            btn.classList.add('active');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
            btn.querySelector('svg').setAttribute('fill', '#FF453A');
            btn.querySelector('svg').style.color = '#FF453A';
          }
        } catch (err) { console.error('Video Like Err:', err) }
      } 
      
      else if (btn.hasAttribute('data-bookmark')) {
        try {
          const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?post_id=eq.${postId}&user_id=eq.${userId}`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const checkData = await checkRes.json();
          if (checkData.length > 0) {
            // Remove Bookmark
            await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?post_id=eq.${postId}&user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
            });
            btn.classList.remove('active');
            btn.querySelector('svg').setAttribute('fill', 'none');
          } else {
            // Bookmark
            await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
                method: 'POST',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, user_id: userId })
            });
            btn.classList.add('active');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
          }
        } catch (err) { console.error('Video Bookmark Err:', err) }
      }
    });
  }
});
'''

videos_js = videos_js.replace("window._whisprFilterFeed?.();\n  });\n});", "window._whisprFilterFeed?.();\n  });\n" + live_interactions_script)

render_card_target = '''<article class="video-reel" data-alias="${post.alias}" data-category="${post.category}" role="article">'''
render_card_replace = '''<article class="video-reel" data-id="${post.id}" data-alias="${post.alias}" data-category="${post.category}" role="article">'''
videos_js = videos_js.replace(render_card_target, render_card_replace)

with open('js/videos.js', 'w', encoding='utf-8') as f:
    f.write(videos_js)

print("Updated videos.js with interactive Like and Bookmark REST queries.")
