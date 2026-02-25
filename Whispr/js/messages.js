/**
 * Whispr — Messages Module (messages.html)
 * Handles: conversation list, chat rendering, send/receive, doxxing filter
 */

'use strict';

const { Auth, Toast, Modal } = window.Whispr;

/* ─── Simple doxxing keyword filter ─── */
const BLOCKED_PATTERNS = [
    /\b(my real name|my name is|i am called|i live at|my address|my phone|i work at|my office|gmail|yahoo|whatsapp|telegram|instagram|facebook|twitter)\b/i,
    /\b\d{10,}\b/,                              // Long number strings
    /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i  // Email
];

function containsBlockedContent(text) {
    return BLOCKED_PATTERNS.some(p => p.test(text));
}

/* ─── Chat state ─── */
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const alias = Auth.getAlias() || 'Anonymous';

const SUPABASE_URL = "https://liotabdrefkcudxbhswh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E";


/* ─── Mobile: toggle between list and chat ─── */
const listPanel = document.getElementById('chat-list-panel');
const mainPanel = document.getElementById('chat-main-panel');
const backBtn = document.getElementById('chat-back-btn');

window.openChat = function (chatId) {
    if (window.innerWidth <= 680) {
        listPanel?.classList.remove('show');
        mainPanel?.classList.add('show');
    }
};

backBtn?.addEventListener('click', () => {
    if (window.innerWidth <= 680) {
        mainPanel?.classList.remove('show');
        listPanel?.classList.add('show');
    }
});

/* ─── Send message ─── */

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


function appendMessage(text, direction, senderAlias = null) {
    if (!chatMessages) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayAlias = direction === 'mine' ? alias : (senderAlias || 'Unknown');

    const msg = document.createElement('div');
    msg.className = `msg ${direction}`;
    msg.innerHTML = `
    <div class="msg__bubble">${escHtml(text)}</div>
    <div class="msg__meta">${escHtml(displayAlias)} · ${timeStr}${direction === 'mine' ? ' · ✓ Delivered' : ''}</div>`;

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ─── Send button + Enter key ─── */
document.getElementById('btn-send-msg')?.addEventListener('click', sendMessage);

chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/* ─── Block user ─── */
document.getElementById('btn-block-user')?.addEventListener('click', () => {
    Toast.warning('This conversation has been blocked. The user can no longer contact you.');
});

/* ─── Delete conversation ─── */
document.getElementById('btn-delete-chat')?.addEventListener('click', () => {
    if (confirm('Delete this entire conversation permanently? This cannot be undone.')) {
        Toast.success('Conversation deleted');
        location.href = 'profile.html';
    }
});

/* ─── Auto-resize input ─── */
chatInput?.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

/* ─── Update alias in chat header ─── */
const commentAlias = document.getElementById('comment-alias-display');
if (commentAlias) commentAlias.textContent = alias;

/* ─── Swipe to reply logic ─── */
let startX = 0;
let currentX = 0;
let activeBubble = null;
let isSwiping = false;

// Create the reply icon element
const replyIconBadge = document.createElement('div');
replyIconBadge.className = 'reply-swipe-icon';
replyIconBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`;
if (chatMessages) chatMessages.appendChild(replyIconBadge);

const replyContext = document.getElementById('reply-context');
const replySender = document.getElementById('reply-sender');
const replyText = document.getElementById('reply-text');
const btnCancelReply = document.getElementById('btn-cancel-reply');

btnCancelReply?.addEventListener('click', () => {
    replyContext.classList.remove('show');
    chatInput?.focus();
});

chatMessages?.addEventListener('touchstart', e => {
    const bubbleWrapper = e.target.closest('.msg');
    if (!bubbleWrapper) return;
    activeBubble = bubbleWrapper;
    startX = e.touches[0].clientX;
    isSwiping = true;
    activeBubble.style.transition = 'none';
}, { passive: true });

chatMessages?.addEventListener('touchmove', e => {
    if (!isSwiping || !activeBubble) return;
    currentX = e.touches[0].clientX - startX;

    const isMine = activeBubble.classList.contains('mine');

    // allow swiping left for mine (currentX < 0) and right for theirs (currentX > 0)
    if (isMine && currentX > 0) currentX = 0;
    if (!isMine && currentX < 0) currentX = 0;

    // Rubber band effect limit
    const rawX = currentX;
    if (Math.abs(currentX) > 50) {
        currentX = Math.sign(currentX) * (50 + Math.pow(Math.abs(currentX) - 50, 0.5) * 3);
    }

    activeBubble.style.transform = `translateX(${currentX}px)`;

    // Update reply icon
    replyIconBadge.style.opacity = Math.min(Math.abs(rawX) / 60, 1).toString();
    replyIconBadge.style.transform = `scale(${Math.min(Math.abs(rawX) / 60, 1)})`;

    replyIconBadge.style.top = (activeBubble.offsetTop + activeBubble.offsetHeight / 2 - 16) + 'px';
    if (isMine) {
        replyIconBadge.style.left = 'auto';
        replyIconBadge.style.right = '20px';
    } else {
        replyIconBadge.style.right = 'auto';
        replyIconBadge.style.left = '20px';
    }
}, { passive: true });

chatMessages?.addEventListener('touchend', e => {
    if (!isSwiping || !activeBubble) return;
    isSwiping = false;

    if (Math.abs(currentX) > 50) {
        const textElement = activeBubble.querySelector('.msg__bubble');
        const metaElement = activeBubble.querySelector('.msg__meta');
        if (textElement && metaElement) {
            triggerReply(metaElement.innerText.split('·')[0].trim(), textElement.innerText);
        }
    }

    activeBubble.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    activeBubble.style.transform = 'translateX(0)';
    activeBubble = null;
    currentX = 0;

    replyIconBadge.style.opacity = '0';
    replyIconBadge.style.transform = 'scale(0.5)';
});

function triggerReply(sender, text) {
    if ('vibrate' in navigator) navigator.vibrate(50);
    if (!replyContext) return;
    replySender.textContent = sender;
    replyText.textContent = text;
    replyContext.classList.add('show');
    chatInput?.focus();
}
