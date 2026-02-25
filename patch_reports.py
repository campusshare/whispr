import re

# 1. Update report.js
with open('js/report.js', 'r', encoding='utf-8') as f:
    report_js = f.read()

new_submit_logic = '''
        const SUPABASE_URL = "https://liotabdrefkcudxbhswh.supabase.co";
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E";

        // 1. Process Report (Sanitize and Embed)
        const processRes = await fetch(`${SUPABASE_URL}/functions/v1/process-report`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}` 
            },
            body: JSON.stringify({
                story_original: state.story,
                category: state.category,
                location: state.location,
                incident_date: state.date,
                sensitivity: state.sensitivity
            })
        });

        if (!processRes.ok) throw new Error('Failed to process report');
        const processData = await processRes.json();
        const postId = processData.post_id;

        // 2. Upload Media if any
        if (state.files.length > 0) {
            const txt = document.getElementById('ai-status-text');
            if (txt) txt.textContent = 'Encrypting and uploading evidence...';
            
            for (const file of state.files) {
                const mediaFormData = new FormData();
                mediaFormData.append('file', file);
                mediaFormData.append('post_id', postId);

                await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${ANON_KEY}` },
                    body: mediaFormData
                });
            }
        }

        clearInterval(interval);
        showSuccess(postId || ('WSPR-' + Date.now().toString(36).toUpperCase()));
'''

old_submit_match = re.search(r'// Build form data\s+const formData.*?showSuccess\(data\?.report_id.*?toUpperCase\(\)\)\);', report_js, flags=re.DOTALL)
if old_submit_match:
    report_js = report_js.replace(old_submit_match.group(0), new_submit_logic)
    with open('js/report.js', 'w', encoding='utf-8') as f:
        f.write(report_js)
    print("Updated report.js")

# 2. Update feed.js
with open('js/feed.js', 'r', encoding='utf-8') as f:
    feed_js = f.read()

new_init_fetch = '''
const SUPABASE_URL = "https://liotabdrefkcudxbhswh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E";

async function loadSupabasePosts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=*,users(alias,avatar_url),media(media_type,cloudinary_id)&order=created_at.desc`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch posts');
    const data = await res.json();
    
    DEMO_POSTS = data.map(dbPost => ({
      id: dbPost.id,
      alias: dbPost.users?.alias || 'Anonymous',
      avatarColor: dbPost.users?.avatar_url || '#00d4aa',
      time: new Date(dbPost.created_at).toLocaleString(),
      category: dbPost.category,
      sensitivity: dbPost.sensitivity || 'medium',
      title: 'Whispr Report',
      excerpt: dbPost.story_sanitized || dbPost.story_original || '',
      likes: dbPost.views_count || 0,
      comments: 0,
      bookmarks: 0,
      verified: false,
      hasMedia: dbPost.media && dbPost.media.length > 0
    }));
    
    renderFeed();
  } catch (err) {
    console.error("Error loading Supabase posts:", err);
    // fallback to existing demo posts if DB is empty or fails
    renderFeed();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSupabasePosts();
'''

feed_js = feed_js.replace("document.addEventListener('DOMContentLoaded', () => {", new_init_fetch)
# Make DEMO_POSTS mutable `let` instead of `const`
feed_js = feed_js.replace("const DEMO_POSTS = [", "let DEMO_POSTS = [")

with open('js/feed.js', 'w', encoding='utf-8') as f:
    f.write(feed_js)
print("Updated feed.js")

# 3. Update videos.js
with open('js/videos.js', 'r', encoding='utf-8') as f:
    videos_js = f.read()

videos_js = videos_js.replace("document.addEventListener('DOMContentLoaded', () => {", new_init_fetch)
videos_js = videos_js.replace("const DEMO_POSTS = [", "let DEMO_POSTS = [")

with open('js/videos.js', 'w', encoding='utf-8') as f:
    f.write(videos_js)
print("Updated videos.js")
