import re

with open('js/feed.js', 'r', encoding='utf-8') as f:
    feed_js = f.read()

# 1. Inject the Global Event Delegation for Live Supabase Interactions
# We place this at the end of the loadSupabasePosts initialization.
live_interactions_script = '''
  // --- Live Supabase Engagement Binding ---
  const feedContainer = document.getElementById('feed-container');
  if (feedContainer) {
    feedContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const postCard = btn.closest('.x-post');
      if (!postCard) return;
      
      const postId = postCard.dataset.id;
      const currentAlias = localStorage.getItem('whispr_alias');
      if (!currentAlias) return window.Whispr?.Toast?.error('Please login to interact.');

      // We need the numeric/UUID user ID, not just the alias, to insert into the relations table.
      // Since this is a vanilla frontend without a global state manager, we fetch the ID on the fly.
      let userId = null;
      try {
        const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?alias=eq.${encodeURIComponent(currentAlias)}&select=id`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
        });
        const uData = await uRes.json();
        if (uData.length > 0) userId = uData[0].id;
      } catch (err) {}
      
      if (!userId) return;

      if (btn.classList.contains('like-btn')) {
        // Toggle Like functionality against public.likes
        const countSpan = btn.querySelector('span');
        try {
          // Check if already liked
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
          } else {
            // Like
            await fetch(`${SUPABASE_URL}/rest/v1/likes`, {
                method: 'POST',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, user_id: userId })
            });
            btn.classList.add('active');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
            /* Update view scale on backend as well as visual like */
            fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_post_view`, {
                method: 'POST',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId })
            });
          }
        } catch (err) { console.error('Like Err:', err) }
      } 
      
      else if (btn.classList.contains('bookmark-btn')) {
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
          } else {
            // Bookmark
            await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
                method: 'POST',
                headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, user_id: userId })
            });
            btn.classList.add('active');
          }
        } catch (err) { console.error('Bookmark Err:', err) }
      }
    });
  }
});
'''

# We look for the end of the DOMContentLoaded listener and inject our live interaction bindings.
feed_js = feed_js.replace("window._whisprFilterFeed?.();\n  });\n});", "window._whisprFilterFeed?.();\n  });\n" + live_interactions_script)


# We modify renderCard to inject the dataset ID for the interactions to latch onto.
render_card_target = '''<article class="x-post stagger" data-alias="${post.alias}" data-category="${post.category}" role="article">'''
render_card_replace = '''<article class="x-post stagger" data-id="${post.id}" data-alias="${post.alias}" data-category="${post.category}" role="article">'''
feed_js = feed_js.replace(render_card_target, render_card_replace)

# Add the bookmark-btn class so it can be targeted by our script
bookmark_target = '''<button class="x-action-btn" aria-label="Bookmark">'''
bookmark_replace = '''<button class="x-action-btn bookmark-btn" aria-label="Bookmark">'''
feed_js = feed_js.replace(bookmark_target, bookmark_replace)

with open('js/feed.js', 'w', encoding='utf-8') as f:
    f.write(feed_js)

print("Updated feed.js with interactive Like and Bookmark REST queries.")
