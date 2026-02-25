import re

with open('js/messages.js', 'r', encoding='utf-8') as f:
    messages_js = f.read()

# 1. Provide the live backend parameters
remote_vars = '''
const SUPABASE_URL = "https://liotabdrefkcudxbhswh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E";
'''
messages_js = messages_js.replace("const alias = Auth.getAlias() || 'Anonymous';",
                                  "const alias = Auth.getAlias() || 'Anonymous';\n" + remote_vars)

# 2. Replace sendMessage logic 
new_send_message = '''
async function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text) return;

    if (containsBlockedContent(text)) {
        Toast.error('⚠️ Message blocked — contains information that could identify you. Please rephrase.');
        return;
    }

    const senderAlias = localStorage.getItem('whispr_alias');
    if (!senderAlias) {
        Toast.error("You must be logged in.");
        return;
    }

    // Identify user and recipient
    try {
        const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?alias=eq.${encodeURIComponent(senderAlias)}&select=id`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
        });
        const uData = await uRes.json();
        if (uData.length === 0) return;
        const senderId = uData[0].id;
        
        // For demonstration purposes, we send messages to a global inbox or a fixed journalist UUID if available.
        // In a full production UI, the user selects a conversation partner. Here we assume generic receiver.
        const rRes = await fetch(`${SUPABASE_URL}/rest/v1/users?alias=eq.VerifiedJournalist_GH&select=id`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
        });
        const rData = await rRes.json();
        const receiverId = rData.length > 0 ? rData[0].id : senderId; // Fallback to self if journalist missing

        // Post to remote messages table
        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: senderId,
                receiver_id: receiverId,
                content: text
            })
        });

        if (postRes.ok) {
            appendMessage(text, 'mine');
            if (chatInput) chatInput.value = '';
        } else {
            throw new Error("Delivery failed");
        }
    } catch (e) {
        Toast.error("Message delivery failed.");
        console.error(e);
    }
}
'''
old_send_match = re.search(r'function sendMessage\(\) \{.*?\n\}', messages_js, flags=re.DOTALL)
if old_send_match:
    messages_js = messages_js.replace(old_send_match.group(0), new_send_message)

with open('js/messages.js', 'w', encoding='utf-8') as f:
    f.write(messages_js)

print("Updated messages.js for live Supabase End-to-End messaging emulation.")
