import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace local storage Follows and Likes with Supabase Memory Cached versions
new_interactive_models = '''
/* ─────────────────────────────────────────────
   FOLLOWS & LIKES — Live Supabase Remote Cache
───────────────────────────────────────────── */
const Follows = (() => {
  let followingCache = new Set();
  
  async function sync() {
    if (!Auth.getId()) return;
    try {
      const res = await API.get(`/rest/v1/follows?follower_id=eq.${Auth.getId()}&select=users!following_id(alias)`);
      followingCache = new Set(res.map(f => f.users?.alias).filter(Boolean));
    } catch(e) { console.error('Follows Sync Error', e) }
  }

  function isFollowing(alias) { return followingCache.has(alias); }

  async function toggle(alias, authorId) {
    if (!Auth.getId() || !authorId) return false;
    const isF = isFollowing(alias);
    
    try {
      if (isF) {
        await fetch(`${SUPABASE_URL}/rest/v1/follows?follower_id=eq.${Auth.getId()}&following_id=eq.${authorId}`, {
          method: 'DELETE', headers: API.headers()
        });
        followingCache.delete(alias);
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/follows`, {
          method: 'POST', headers: API.headers(),
          body: JSON.stringify({ follower_id: Auth.getId(), following_id: authorId })
        });
        followingCache.add(alias);
      }
      return !isF;
    } catch(e) { console.error(e); return isF; }
  }

  return { sync, isFollowing, toggle };
})();

const Likes = (() => {
  let likesCache = new Set(); // Stores post_ids liked by current user

  async function sync() {
    if (!Auth.getId()) return;
    try {
      const res = await API.get(`/rest/v1/likes?user_id=eq.${Auth.getId()}&select=post_id`);
      likesCache = new Set(res.map(l => l.post_id));
    } catch(e) { console.error('Likes Sync Error', e) }
  }

  function isLiked(postId) { return likesCache.has(String(postId)); }

  return { sync, isLiked };
})();

document.addEventListener('DOMContentLoaded', async () => {
  await Follows.sync();
  await Likes.sync();
});
'''

old_follows_likes = re.search(r'const Follows = \(\(\) => \{.+?return \{ isLiked, getCount, toggle \};\n\}\)\(\);', app_js, flags=re.DOTALL)
if old_follows_likes:
    app_js = app_js.replace(old_follows_likes.group(0), new_interactive_models)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("Updated app.js with live remote cache sync for Follows and Likes.")
