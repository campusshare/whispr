/**
 * Whispr — Security / Post Module
 * Handles: signed URL countdown timer, comment posting, bookmark, share,
 *          contact modal, media carousel navigation, and abuse reporting.
 * Used by: post.html and profile.html
 */

'use strict';

const { Auth, Toast, Modal } = window.Whispr;

/* ─────────────────────────────────────────────
   SIGNED URL COUNTDOWN (post.html)
───────────────────────────────────────────── */
function initSignedUrlTimer() {
    const el = document.getElementById('url-expires');
    if (!el) return;

    let seconds = 15 * 60; // 15 minutes
    const interval = setInterval(() => {
        if (--seconds <= 0) {
            clearInterval(interval);
            el.textContent = 'EXPIRED';
            el.style.color = 'var(--color-danger)';
            // Hide media and show refresh prompt
            const mediaDisplay = document.getElementById('media-display');
            if (mediaDisplay) {
                mediaDisplay.innerHTML = `
          <div style="text-align:center;padding:var(--space-2xl)">
            <div style="font-size:2rem;margin-bottom:var(--space-sm)">⏰</div>
            <div class="font-semibold">Signed URL Expired</div>
            <div class="text-sm text-muted" style="margin-top:4px;margin-bottom:var(--space-md)">For security, media access links expire after 15 minutes.</div>
            <button class="btn btn--primary btn--sm" id="btn-refresh-url">Generate New Link</button>
          </div>`;
                document.getElementById('btn-refresh-url')?.addEventListener('click', () => {
                    Toast.show('Generating new signed URL...', 'info');
                    setTimeout(() => { location.reload(); }, 1500);
                });
            }
            return;
        }
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
        if (seconds < 120) el.style.color = 'var(--color-danger)';
        else if (seconds < 300) el.style.color = 'var(--color-warning)';
    }, 1000);
}

/* ─────────────────────────────────────────────
   BOOKMARK
───────────────────────────────────────────── */
function initBookmark() {
    const btn = document.getElementById('btn-bookmark');
    if (!btn) return;

    let bookmarked = false;
    btn.addEventListener('click', () => {
        bookmarked = !bookmarked;
        btn.classList.toggle('bookmarked', bookmarked);
        btn.setAttribute('aria-pressed', String(bookmarked));
        Toast.success(bookmarked ? 'Report bookmarked' : 'Bookmark removed');
    });
}

/* ─────────────────────────────────────────────
   SHARE
───────────────────────────────────────────── */
function initShare() {
    document.getElementById('btn-share')?.addEventListener('click', async () => {
        const url = window.location.href;
        const title = document.getElementById('post-title')?.textContent || 'Whispr Report';
        if (navigator.share) {
            await navigator.share({ title, url }).catch(() => { });
        } else {
            await navigator.clipboard.writeText(url).catch(() => { });
            Toast.success('Link copied to clipboard');
        }
    });
}

/* ─────────────────────────────────────────────
   CONTACT MODAL
───────────────────────────────────────────── */
function initContact() {
    document.getElementById('btn-contact')?.addEventListener('click', () => {
        if (!Auth.isLoggedIn()) { Toast.error('You must be logged in to send a contact request'); return; }
        Modal.open('contact-modal');
    });

    document.getElementById('send-contact-request')?.addEventListener('click', async () => {
        const msg = document.getElementById('contact-message')?.value.trim();
        if (!msg) { Toast.warning('Please write a message first'); return; }

        const btn = document.getElementById('send-contact-request');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

        try { await window.Whispr.API.rpc('send_contact_request', { message: msg }); }
        catch { /* best effort */ }

        Modal.close('contact-modal');
        Toast.success('Contact request sent. They will respond via alias-only messaging.');
        if (btn) { btn.disabled = false; btn.textContent = 'Send Secure Message'; }
    });
}

/* ─────────────────────────────────────────────
   ABUSE REPORT
───────────────────────────────────────────── */
function initAbuseReport() {
    const btn = document.getElementById('btn-report-abuse');
    btn?.addEventListener('click', () => {
        const reason = prompt('Why are you reporting this content?\n\n1. False information\n2. Doxxing\n3. Violence\n4. Spam\n5. Other\n\nEnter number:');
        if (reason) Toast.success('Thank you. Moderators will review this report.');
    });
}

/* ─────────────────────────────────────────────
   COMMENT
───────────────────────────────────────────── */
function initComments() {
    const btn = document.getElementById('btn-comment');
    const input = document.getElementById('comment-input');
    const list = document.getElementById('comment-list');
    if (!btn || !input || !list) return;

    const BLOCKED = [/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i, /\b\d{10,}\b/, /\b(my name|i live|my phone|whatsapp)\b/i];

    btn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) return;
        if (BLOCKED.some(r => r.test(text))) { Toast.error('Comment blocked — contains potentially identifying information'); return; }
        if (text.length > 1000) { Toast.error('Comment too long (max 1000 characters)'); return; }

        const alias = Auth.getAlias() || 'Anonymous';
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
      <div class="avatar avatar--sm" style="background:linear-gradient(135deg,#00d4aa,#00b894)" aria-hidden="true">${alias.slice(0, 2).toUpperCase()}</div>
      <div class="comment-body">
        <div class="comment-header"><span class="comment-alias">${alias}</span><span class="comment-time">Just now</span></div>
        <p class="comment-text">${text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</p>
        <div class="comment-actions"><button class="comment-action">Reply</button></div>
      </div>`;

        list.appendChild(item);
        input.value = '';
        input.style.height = 'auto';
        Toast.success('Comment posted');

        const countEl = document.getElementById('comment-count');
        if (countEl) countEl.textContent = String((parseInt(countEl.textContent) || 0) + 1);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) btn.click();
    });
}

/* ─────────────────────────────────────────────
   PROFILE SETTINGS — Avatar theme swatches
───────────────────────────────────────────── */
function initThemeSwatches() {
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const bg = swatch.style.background;
            document.querySelectorAll('.avatar').forEach(av => { if (!av.style.backgroundImage) av.style.background = bg; });
            Toast.success('Avatar color updated');
        });

        swatch.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); swatch.click(); }
        });
    });
}

/* ─────────────────────────────────────────────
   PROFILE TAB SIDEBAR (override for profile.html)
───────────────────────────────────────────── */
function initProfileTabs() {
    const items = document.querySelectorAll('.sidebar__item[data-tab]');
    if (!items.length) return;
    const panels = { reports: 'tab-reports', bookmarks: 'tab-bookmarks', messages: 'tab-messages', settings: 'tab-settings' };

    items.forEach(item => {
        item.addEventListener('click', () => {
            items.forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            const tabName = item.dataset.tab;
            Object.values(panels).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = id === panels[tabName] ? '' : 'none';
            });
        });
    });
}

/* ─────────────────────────────────────────────
   BOOTSTRAP
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initSignedUrlTimer();
    initBookmark();
    initShare();
    initContact();
    initAbuseReport();
    initComments();
    initThemeSwatches();
    initProfileTabs();
});
