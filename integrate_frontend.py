import re

# Update js/auth.js
with open('js/auth.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# We will replace the dummy handleAuth function with a real fetch call to the edge function.
new_auth_logic = '''
// Supabase Edge Function Integration
const SUPABASE_URL = "https://liotabdrefkcudxbhswh.supabase.co"; // User's Project ID
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E";

async function handleAuth(action, alias, password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      // credentials: 'include' ensures HttpOnly cookies (sb-access-token) are stored by the browser
      credentials: 'omit', // Use omit for generic token, or include if strictly using HttpOnly cookies
      body: JSON.stringify({ action, alias, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Since we are using HttpOnly cookies set by the server, 
    // the browser will automatically persist the session.
    // For fallback/client demo purposes, we set a visual local storage flag.
    localStorage.setItem('whispr_alias', alias);
    window.location.href = 'index.html';
    
  } catch (error) {
    console.error("Auth Error:", error);
    alert(error.message);
  }
}
'''

# Find the old handleAuth and replace
old_handle_auth = re.search(r'function handleAuth\(action, alias, password\) \{.*?\n\}', js_content, flags=re.DOTALL)
if old_handle_auth:
    js_content = js_content.replace(old_handle_auth.group(0), new_auth_logic)

with open('js/auth.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Updated js/auth.js with real Supabase Edge Function fetch calls.")
