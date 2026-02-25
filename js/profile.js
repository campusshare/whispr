/**
 * Whispr — Profile Module
 * Loads user profile data from Supabase.
 * Works for own profile and public profiles (?user=alias).
 */
'use strict';

const SB_URL = 'https://liotabdrefkcudxbhswh.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E';

const SB_HEADERS = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };

function getEl(id) { return document.getElementById(id); }
function setText(id, val) { const el = getEl(id); if (el) el.textContent = val ?? '—'; }
function setHTML(id, val) { const el = getEl(id); if (el) el.innerHTML = val; }

function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function fmt(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

/* ══════════════════════════════════════════════════════════
   MAIN BOOT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const targetAlias = params.get('user');               // public profile view
    const myAlias = window.Whispr?.Auth?.getAlias();  // logged-in user

    const alias = targetAlias || myAlias;
    const isOwn = !targetAlias || targetAlias === myAlias;

    if (!alias) {
        // Not logged in and no ?user= param — redirect to auth
        location.replace('auth.html');
        return;
    }

    // Show/hide owner-only controls
    document.querySelectorAll('[data-owner-only]').forEach(el => {
        el.style.display = isOwn ? '' : 'none';
    });
    document.querySelectorAll('[data-visitor-only]').forEach(el => {
        el.style.display = isOwn ? 'none' : '';
    });

    // Set page title
    document.title = `@${alias} — Whispr`;

    // Load in parallel
    const [user, posts] = await Promise.all([
        loadUser(alias),
        loadPosts(alias),
    ]);

    if (!user) {
        setHTML('profile-main', `<div style="text-align:center;padding:60px 20px;color:#8E8E93;">
      <div style="font-size:2rem;margin-bottom:12px;">🔍</div>
      <div style="font-weight:600;">User not found</div>
      <a href="feed.html" style="color:#0A84FF;font-size:.9rem;">← Back to feed</a>
    </div>`);
        return;
    }

    renderProfile(user, posts, isOwn);
});

/* ══════════════════════════════════════════════════════════
   FETCH USER
══════════════════════════════════════════════════════════ */
async function loadUser(alias) {
    try {
        const r = await fetch(
            `${SB_URL}/rest/v1/users?alias=eq.${encodeURIComponent(alias)}&select=id,alias,avatar_url,avatar_color,bio,verified,joined_at,followers_count,following_count,reports_count&limit=1`,
            { headers: SB_HEADERS }
        );
        const data = await r.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
        // Offline: return minimal object from localStorage
        const myAlias = window.Whispr?.Auth?.getAlias();
        if (alias === myAlias) {
            return {
                alias: myAlias,
                avatar_url: localStorage.getItem('whispr_avatar_url') || null,
                avatar_color: '#00d4aa',
                bio: '',
                verified: false,
                joined_at: new Date().toISOString(),
                followers_count: 0,
                following_count: 0,
                reports_count: 0,
            };
        }
        return null;
    }
}

/* ══════════════════════════════════════════════════════════
   FETCH USER POSTS
══════════════════════════════════════════════════════════ */
async function loadPosts(alias) {
    try {
        const r = await fetch(
            `${SB_URL}/rest/v1/posts?alias=eq.${encodeURIComponent(alias)}&select=id,title,body,category,sensitivity,likes_count,comments_count,created_at,media_urls&order=created_at.desc&limit=20`,
            { headers: SB_HEADERS }
        );
        const data = await r.json();
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

/* ══════════════════════════════════════════════════════════
   RENDER PROFILE
══════════════════════════════════════════════════════════ */
function renderProfile(user, posts, isOwn) {
    // ── Avatar ──────────────────────────────────────────
    const avatarEl = getEl('profile-avatar');
    if (avatarEl) {
        if (user.avatar_url) {
            avatarEl.src = user.avatar_url;
            avatarEl.style.display = '';
            getEl('profile-avatar-initials')?.remove();
        } else {
            // Show colored initial circle
            avatarEl.style.display = 'none';
            const initCircle = getEl('profile-avatar-initials');
            if (initCircle) {
                initCircle.style.background = user.avatar_color || '#00d4aa';
                initCircle.textContent = user.alias.charAt(0).toUpperCase();
                initCircle.style.display = 'flex';
            }
        }
    }

    // ── Alias & badge ───────────────────────────────────
    const aliasEl = getEl('profile-alias');
    if (aliasEl) {
        aliasEl.innerHTML = `@${user.alias}${user.verified ? ' <span style="color:#0A84FF;font-size:1rem;">✓</span>' : ''}`;
    }

    // ── Bio ─────────────────────────────────────────────
    const bioEl = getEl('profile-bio');
    if (bioEl) {
        bioEl.textContent = user.bio || (isOwn ? 'Add a bio in settings →' : 'No bio.');
        if (isOwn && !user.bio) bioEl.style.color = '#6E6E73';
    }

    // ── Joined date ─────────────────────────────────────
    const joinedEl = getEl('profile-joined');
    if (joinedEl && user.joined_at) {
        const d = new Date(user.joined_at);
        joinedEl.textContent = `Joined ${d.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    }

    // ── Stats ────────────────────────────────────────────
    setText('stat-reports', user.reports_count ?? posts.length);
    setText('stat-followers', user.followers_count ?? 0);
    setText('stat-following', user.following_count ?? 0);

    // ── Follow button (visitor view) ─────────────────────
    if (!isOwn) renderFollowBtn(user);

    // ── Posts ────────────────────────────────────────────
    renderUserPosts(posts);
}

/* ── Follow button ──────────────────────────────────────── */
function renderFollowBtn(user) {
    const btn = getEl('btn-follow');
    if (!btn) return;
    btn.style.display = '';

    const followingKey = 'w_following';
    const set = new Set(JSON.parse(localStorage.getItem(followingKey) || '[]'));
    const isFollowing = set.has(user.alias);
    btn.textContent = isFollowing ? 'Following' : 'Follow';
    btn.style.background = isFollowing ? 'rgba(255,255,255,.1)' : '#0A84FF';

    btn.addEventListener('click', async () => {
        const nowFollowing = set.has(user.alias);
        nowFollowing ? set.delete(user.alias) : set.add(user.alias);
        localStorage.setItem(followingKey, JSON.stringify([...set]));
        btn.textContent = set.has(user.alias) ? 'Following' : 'Follow';
        btn.style.background = set.has(user.alias) ? 'rgba(255,255,255,.1)' : '#0A84FF';

        // Update count optimistically
        const statEl = getEl('stat-followers');
        const myId = window.Whispr?.Auth?.getId();
        if (statEl && myId) {
            const cur = parseInt(statEl.textContent.replace(/K/, '000') || '0', 10);
            statEl.textContent = fmt(Math.max(0, cur + (set.has(user.alias) ? 1 : -1)));
        }

        // Persist to backend
        try {
            const method = set.has(user.alias) ? 'POST' : 'DELETE';
            const url = set.has(user.alias)
                ? `${SB_URL}/rest/v1/follows`
                : `${SB_URL}/rest/v1/follows?follower_id=eq.${window.Whispr?.Auth?.getId()}&following_alias=eq.${encodeURIComponent(user.alias)}`;
            await fetch(url, {
                method,
                headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify({ follower_id: window.Whispr?.Auth?.getId(), following_alias: user.alias }) : undefined,
            });
        } catch { /* offline ok */ }
    });
}

/* ── Render user posts list ─────────────────────────────── */
function renderUserPosts(posts) {
    const list = getEl('profile-posts-list');
    if (!list) return;

    if (!posts.length) {
        list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#8E8E93;font-size:.9rem;">
      No reports yet.
    </div>`;
        return;
    }

    const catColors = { corruption: '#FF453A', government: '#FF9F0A', education: '#0A84FF', healthcare: '#30D158', environment: '#30D158', financial: '#FF9F0A', abuse: '#FF453A', trafficking: '#FF453A' };
    list.innerHTML = posts.map(p => `
    <a href="post.html?id=${p.id}" style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.06);text-decoration:none;color:inherit;cursor:pointer;transition:background .15s;" class="profile-post-row">
      <div style="flex:1;min-width:0;">
        <div style="font-size:.7rem;font-weight:700;color:${catColors[p.category] || '#8E8E93'};text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">${p.category || 'Report'}</div>
        <div style="font-weight:700;font-size:.95rem;margin-bottom:4px;line-height:1.3;">${p.title || 'Untitled'}</div>
        <div style="font-size:.8rem;color:#8E8E93;">${relTime(p.created_at)} · ❤ ${fmt(p.likes_count || 0)} · 💬 ${fmt(p.comments_count || 0)}</div>
      </div>
      ${p.media_urls?.length > 0
            ? `<img src="${p.media_urls[0]}" alt="" style="width:68px;height:68px;border-radius:10px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:68px;height:68px;border-radius:10px;background:#1C1C1E;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg fill="none" viewBox="0 0 24 24" stroke="#6E6E73" stroke-width="1.5" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>`}
    </a>
  `).join('');
}
