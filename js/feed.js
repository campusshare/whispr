/**
 * Whispr — Feed Module
 * Renders posts on feed.html. Shows DEMO_POSTS immediately,
 * then replaces with live Supabase data when available.
 */
'use strict';

const SB_URL = 'https://liotabdrefkcudxbhswh.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E';

const DEMO_POSTS = [
  { id: 'd1', alias: 'SilentFalcon72', avatar_color: '#00d4aa', avatar_url: null, created_at: new Date(Date.now() - 4 * 60000).toISOString(), category: 'corruption', sensitivity: 'high', title: 'Procurement funds diverted in regional school district', body: 'Multiple signed purchase orders indicate an organised scheme to redirect public school funds toward a shell company controlled by a district official. Documents obtained show over $2M in irregular payments.', likes_count: 142, comments_count: 38, bookmarks_count: 21, reposts_count: 32, verified: true, media_urls: [] },
  { id: 'd2', alias: 'NorthernWraith', avatar_color: '#3d9bff', avatar_url: null, created_at: new Date(Date.now() - 12 * 60000).toISOString(), category: 'corruption', sensitivity: 'high', title: 'Police officers extorting transport workers at Accra checkpoints', body: 'At least 6 officers stationed at three checkpoints have been documented demanding payments from commercial drivers. Dashcam footage shows cash exchanges.', likes_count: 317, comments_count: 92, bookmarks_count: 54, reposts_count: 88, verified: true, media_urls: [] },
  { id: 'd3', alias: 'GhostPedal9', avatar_color: '#ffa502', avatar_url: null, created_at: new Date(Date.now() - 60 * 60000).toISOString(), category: 'healthcare', sensitivity: 'medium', title: 'Hospital management selling donated medical supplies to private clinics', body: 'Staff members at a regional hospital report that donations from international NGOs are being systematically diverted to private facilities owned by board members.', likes_count: 88, comments_count: 24, bookmarks_count: 9, reposts_count: 15, verified: false, media_urls: [] },
  { id: 'd4', alias: 'VoidMaple33', avatar_color: '#ff4757', avatar_url: null, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), category: 'government', sensitivity: 'medium', title: 'Land title documents forged to clear forest reserve for construction', body: 'Forged government land titles have been used to approve building permits on protected forest land. Stamp authentication codes do not match official registry entries.', likes_count: 205, comments_count: 47, bookmarks_count: 33, reposts_count: 51, verified: true, media_urls: [] },
  { id: 'd5', alias: 'CrimsonEmber11', avatar_color: '#a29bfe', avatar_url: null, created_at: new Date(Date.now() - 5 * 3600000).toISOString(), category: 'financial', sensitivity: 'high', title: 'Bank branch manager approving fraudulent loan applications for kickbacks', body: 'Loan approval records show a pattern of approvals for non-existent businesses. Whistleblower obtained internal approval override codes used to bypass standard review.', likes_count: 411, comments_count: 103, bookmarks_count: 76, reposts_count: 97, verified: true, media_urls: [] },
  { id: 'd6', alias: 'IronVeil44', avatar_color: '#00f5c4', avatar_url: null, created_at: new Date(Date.now() - 24 * 3600000).toISOString(), category: 'trafficking', sensitivity: 'high', title: 'Fake recruitment agency in Kumasi linked to labour trafficking network', body: 'A travel and recruitment agency has been connected to at least 40 cases of victims promised overseas jobs then forced into domestic servitude.', likes_count: 1203, comments_count: 287, bookmarks_count: 214, reposts_count: 334, verified: true, media_urls: [] },
];

/* ── Interaction state (localStorage backed) ────────────── */
const liked = new Set(JSON.parse(localStorage.getItem('w_likes') || '[]'));
const bookmarked = new Set(JSON.parse(localStorage.getItem('w_bkmarks') || '[]'));
const reposted = new Set(JSON.parse(localStorage.getItem('w_reposts') || '[]'));

const save = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));

/* ── State ───────────────────────────────────────────────── */
let allPosts = [];
let shownPosts = [];
let currentCat = 'all';
let currentSort = 'recent';
let searchQuery = '';
let shownCount = 6;
let liveLoaded = false;

const getEl = id => document.getElementById(id);

/* ── Relative time ───────────────────────────────────────── */
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ── Avatar element ──────────────────────────────────────── */
function avatarHTML(post) {
  if (post.avatar_url) {
    return `<img src="${post.avatar_url}" alt="${post.alias}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  }
  const init = (post.alias || 'W').charAt(0).toUpperCase();
  return `<div style="width:40px;height:40px;border-radius:50%;background:${post.avatar_color || '#0A84FF'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;color:#000;flex-shrink:0;">${init}</div>`;
}

/* ── Sensitivity badge ───────────────────────────────────── */
function badge(s) {
  const c = { high: '#FF453A', medium: '#FF9F0A', low: '#30D158' }[s] || '#8E8E93';
  return `<span style="font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:999px;background:${c}22;color:${c};border:1px solid ${c}44;">${(s || '').charAt(0).toUpperCase() + (s || 'medium').slice(1)}</span>`;
}

/* ── Format counts ───────────────────────────────────────── */
function fmt(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* ── Post card HTML ──────────────────────────────────────── */
function cardHTML(post) {
  const isL = liked.has(post.id);
  const isBk = bookmarked.has(post.id);
  const isRe = reposted.has(post.id);
  const lc = (post.likes_count || 0) + (isL ? 0 : 0); // raw count

  const mediaHTML = post.media_urls?.length > 0
    ? `<div style="border-radius:12px;overflow:hidden;margin:10px 0;"><img src="${post.media_urls[0]}" alt="Media" style="width:100%;max-height:300px;object-fit:cover;display:block;"></div>`
    : '';

  return `
<article class="x-post" data-id="${post.id}" data-category="${post.category || ''}"
  style="cursor:default;animation:fadeSlideUp .3s ease both;" onclick="">
  <div class="x-post__avatar" style="flex-shrink:0;">
    <a href="profile.html?user=${encodeURIComponent(post.alias)}" onclick="event.stopPropagation();">${avatarHTML(post)}</a>
  </div>
  <div class="x-post__content" style="flex:1;min-width:0;">
    <div class="x-post__header" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:4px;">
      <a href="profile.html?user=${encodeURIComponent(post.alias)}" class="x-post__alias"
         style="font-weight:800;font-size:.95rem;color:#fff;text-decoration:none;" onclick="event.stopPropagation();">${post.alias}${post.verified ? '<span style="color:#0A84FF;margin-left:3px;">✓</span>' : ''}</a>
      <span style="color:#6E6E73;font-size:.8rem;">·</span>
      <span style="font-size:.8rem;color:#8E8E93;">${relTime(post.created_at)}</span>
      <span style="color:#6E6E73;font-size:.8rem;">·</span>
      <span style="font-size:.75rem;color:#8E8E93;">${(post.category || '').charAt(0).toUpperCase() + (post.category || '').slice(1)}</span>
      ${badge(post.sensitivity)}
    </div>

    <h3 class="x-post__title" style="font-size:1rem;font-weight:700;margin:0 0 6px;line-height:1.35;">${post.title || 'Untitled Report'}</h3>
    <p  class="x-post__text"  style="font-size:.88rem;color:#aeaeb2;margin:0 0 8px;line-height:1.55;">${(post.body || '').substring(0, 280)}${(post.body || '').length > 280 ? '…' : ''}</p>
    ${mediaHTML}

    <!-- Actions -->
    <div class="x-post__actions" style="display:flex;align-items:center;gap:20px;margin-top:10px;">

      <button class="action-btn like-btn${isL ? ' liked' : ''}" data-id="${post.id}"
        style="display:flex;align-items:center;gap:5px;background:none;border:none;color:${isL ? '#FF453A' : '#8E8E93'};cursor:pointer;font-size:.82rem;padding:4px;border-radius:8px;transition:color .2s;">
        <svg width="18" height="18" fill="${isL ? '#FF453A' : 'none'}" viewBox="0 0 24 24" stroke="${isL ? '#FF453A' : 'currentColor'}" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
        <span id="lc-${post.id}">${fmt(lc)}</span>
      </button>

      <button class="action-btn comment-btn" data-id="${post.id}"
        style="display:flex;align-items:center;gap:5px;background:none;border:none;color:#8E8E93;cursor:pointer;font-size:.82rem;padding:4px;border-radius:8px;transition:color .2s;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span id="cc-${post.id}">${fmt(post.comments_count || 0)}</span>
      </button>

      <button class="action-btn repost-btn${isRe ? ' active' : ''}" data-id="${post.id}"
        style="display:flex;align-items:center;gap:5px;background:none;border:none;color:${isRe ? '#30D158' : '#8E8E93'};cursor:pointer;font-size:.82rem;padding:4px;border-radius:8px;transition:color .2s;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <span id="rc-${post.id}">${fmt(post.reposts_count || 0)}</span>
      </button>

      <button class="action-btn bookmark-btn${isBk ? ' bookmarked' : ''}" data-id="${post.id}"
        style="display:flex;align-items:center;gap:5px;background:none;border:none;color:${isBk ? '#0A84FF' : '#8E8E93'};cursor:pointer;font-size:.82rem;padding:4px;border-radius:8px;transition:color .2s;margin-left:auto;">
        <svg width="18" height="18" fill="${isBk ? '#0A84FF' : 'none'}" viewBox="0 0 24 24" stroke="${isBk ? '#0A84FF' : 'currentColor'}" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      </button>

      <button class="action-btn share-btn" data-id="${post.id}" data-title="${(post.title || '').replace(/"/g, '&quot;')}"
        style="display:flex;align-items:center;gap:5px;background:none;border:none;color:#8E8E93;cursor:pointer;font-size:.82rem;padding:4px;border-radius:8px;transition:color .2s;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
      </button>
    </div>

    <!-- Comment drawer -->
    <div class="comment-panel" id="cp-${post.id}" style="display:none;">
      <div class="comment-list" id="cl-${post.id}" style="max-height:240px;overflow-y:auto;margin-bottom:10px;"></div>
      <div style="display:flex;gap:8px;">
        <input type="text" class="comment-input form-input" id="ci-${post.id}"
          placeholder="Add a comment…" style="flex:1;padding:9px 12px;font-size:.85rem;" maxlength="280">
        <button class="comment-submit" data-id="${post.id}"
          style="background:#0A84FF;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:600;cursor:pointer;white-space:nowrap;font-size:.82rem;">Post</button>
      </div>
    </div>
  </div>
</article>`;
}

/* ── Apply filters + sort ────────────────────────────────── */
function applyFilters() {
  let posts = [...allPosts];
  if (currentCat !== 'all') posts = posts.filter(p => p.category === currentCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    posts = posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q) ||
      (p.alias || '').toLowerCase().includes(q)
    );
  }
  if (currentSort === 'trending') posts.sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count));
  else if (currentSort === 'severity') posts.sort((a, b) => { const m = { high: 3, medium: 2, low: 1 }; return (m[b.sensitivity] || 0) - (m[a.sensitivity] || 0); });
  else posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  shownPosts = posts;
}

/* ── Render feed ─────────────────────────────────────────── */
function renderFeed() {
  const container = getEl('feed-container');
  const skeleton = getEl('feed-skeleton');
  const countEl = getEl('feed-count');
  const moreBtn = getEl('load-more-btn');
  if (!container) return;

  applyFilters();
  if (skeleton) skeleton.style.display = 'none';

  const slice = shownPosts.slice(0, shownCount);

  if (slice.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#8E8E93;">
      <div style="font-size:2rem;margin-bottom:12px;">🔍</div>
      <div style="font-weight:600;margin-bottom:6px;">No reports found</div>
      <div style="font-size:.85rem;">Try a different category or search term</div>
    </div>`;
  } else {
    container.innerHTML = slice.map(p => cardHTML(p)).join('');
  }

  if (countEl) countEl.textContent = `${shownPosts.length} Report${shownPosts.length !== 1 ? 's' : ''}`;
  if (moreBtn) moreBtn.style.display = shownCount >= shownPosts.length ? 'none' : '';

  bindInteractions();
}

/* ── Bind all interactions ───────────────────────────────── */
function bindInteractions() {
  const container = getEl('feed-container');
  if (!container) return;

  // Like
  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const was = liked.has(id);
      was ? liked.delete(id) : liked.add(id);
      save('w_likes', liked);
      const post = allPosts.find(p => p.id === id);
      if (post) {
        post.likes_count = Math.max(0, (post.likes_count || 0) + (was ? -1 : 1));
        const span = getEl(`lc-${id}`);
        if (span) span.textContent = fmt(post.likes_count);
      }
      btn.style.color = liked.has(id) ? '#FF453A' : '#8E8E93';
      btn.querySelector('svg')?.setAttribute('fill', liked.has(id) ? '#FF453A' : 'none');
      btn.querySelector('svg')?.setAttribute('stroke', liked.has(id) ? '#FF453A' : 'currentColor');
    });
  });

  // Bookmark
  container.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      bookmarked.has(id) ? bookmarked.delete(id) : bookmarked.add(id);
      save('w_bkmarks', bookmarked);
      btn.style.color = bookmarked.has(id) ? '#0A84FF' : '#8E8E93';
      btn.querySelector('svg')?.setAttribute('fill', bookmarked.has(id) ? '#0A84FF' : 'none');
      btn.querySelector('svg')?.setAttribute('stroke', bookmarked.has(id) ? '#0A84FF' : 'currentColor');
    });
  });

  // Repost
  container.querySelectorAll('.repost-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const was = reposted.has(id);
      was ? reposted.delete(id) : reposted.add(id);
      save('w_reposts', reposted);
      const post = allPosts.find(p => p.id === id);
      if (post) {
        post.reposts_count = Math.max(0, (post.reposts_count || 0) + (was ? -1 : 1));
        const span = getEl(`rc-${id}`);
        if (span) span.textContent = fmt(post.reposts_count);
      }
      btn.style.color = reposted.has(id) ? '#30D158' : '#8E8E93';
    });
  });

  // Share
  container.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = `${location.origin}/post.html?id=${btn.dataset.id}`;
      const title = btn.dataset.title;
      if (navigator.share) navigator.share({ title, url }).catch(() => { });
      else { navigator.clipboard.writeText(url).then(() => { btn.style.color = '#30D158'; setTimeout(() => btn.style.color = '#8E8E93', 1500); }); }
    });
  });

  // Comments
  container.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const panel = getEl(`cp-${id}`);
      if (!panel) return;
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : '';
      if (!open) {
        loadComments(id);
        getEl(`ci-${id}`)?.focus();
      }
    });
  });

  // Comment submit
  container.querySelectorAll('.comment-submit').forEach(btn => {
    btn.addEventListener('click', () => submitComment(btn.dataset.id));
  });
  container.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(input.dataset.id || input.id.replace('ci-', '')); }
    });
  });
}

/* ── Load comments from Supabase ─────────────────────────── */
const commentCache = {};

async function loadComments(postId) {
  const list = getEl(`cl-${postId}`);
  if (!list) return;
  if (commentCache[postId]) { list.innerHTML = commentCache[postId]; return; }

  list.innerHTML = '<div style="text-align:center;padding:20px;color:#8E8E93;font-size:.82rem;">Loading comments…</div>';
  try {
    const res = await fetch(`${SB_URL}/rest/v1/comments?post_id=eq.${postId}&select=body,alias,created_at&order=created_at.asc&limit=50`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }
    });
    const data = res.ok ? await res.json() : [];
    if (!data.length) { list.innerHTML = '<div style="text-align:center;padding:16px;color:#6E6E73;font-size:.8rem;">No comments yet. Be first.</div>'; return; }
    const html = data.map(c => `
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="width:28px;height:28px;border-radius:50%;background:#0A84FF;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#000;flex-shrink:0;">${(c.alias || '?').charAt(0).toUpperCase()}</div>
        <div><div style="font-size:.78rem;font-weight:700;">${c.alias}</div><div style="font-size:.82rem;color:#aeaeb2;margin-top:2px;">${c.body}</div></div>
      </div>`).join('');
    list.innerHTML = html;
    commentCache[postId] = html;
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:12px;color:#6E6E73;font-size:.8rem;">Could not load comments.</div>';
  }
}

async function submitComment(postId) {
  const input = getEl(`ci-${postId}`);
  const body = input?.value.trim();
  if (!body) return;
  const alias = window.Whispr?.Auth?.getAlias() || 'Anonymous';
  const userId = window.Whispr?.Auth?.getId();

  // Optimistic update
  const list = getEl(`cl-${postId}`);
  const newDiv = document.createElement('div');
  newDiv.style.cssText = 'display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);';
  newDiv.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#0A84FF;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#000;flex-shrink:0;">${alias.charAt(0).toUpperCase()}</div><div><div style="font-size:.78rem;font-weight:700;">${alias}</div><div style="font-size:.82rem;color:#aeaeb2;margin-top:2px;">${body}</div></div>`;
  list?.appendChild(newDiv);
  input.value = '';

  // Count update
  const post = allPosts.find(p => p.id === postId);
  if (post) {
    post.comments_count = (post.comments_count || 0) + 1;
    const span = getEl(`cc-${postId}`);
    if (span) span.textContent = fmt(post.comments_count);
  }
  delete commentCache[postId];

  // Backend
  try {
    await fetch(`${SB_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, user_id: userId, alias, body })
    });
  } catch { /* offline - optimistic is good enough */ }
}

/* ── Load live posts from Supabase ───────────────────────── */
async function loadLivePosts() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/posts?select=id,alias,avatar_color,avatar_url,title,body,category,sensitivity,verified,likes_count,comments_count,bookmarks_count,reposts_count,created_at,media_urls&order=created_at.desc&limit=40`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      allPosts = data;
      liveLoaded = true;
      shownCount = 6;
      renderFeed();
    }
  } catch { /* keep demo posts */ }
}

/* ── Category filter pills ───────────────────────────────── */
function initCategoryPills() {
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentCat = btn.dataset.cat;
      shownCount = 6;
      renderFeed();
    });
  });
}

/* ── Search ──────────────────────────────────────────────── */
function initSearch() {
  const input = getEl('search-input');
  if (!input) return;
  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { searchQuery = input.value.trim(); shownCount = 6; renderFeed(); }, 300);
  });
}

/* ── Sort ────────────────────────────────────────────────── */
function initSort() {
  const sel = getEl('feed-sort');
  if (!sel) return;
  sel.addEventListener('change', () => { currentSort = sel.value; shownCount = 6; renderFeed(); });
}

/* ── Load more ───────────────────────────────────────────── */
function initLoadMore() {
  const btn = getEl('load-more-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { shownCount += 6; renderFeed(); });
}

/* ── New report "whispr" button ──────────────────────────── */
function initNewReportBtn() {
  const btn = getEl('btn-new-report');
  if (btn) btn.addEventListener('click', () => location.href = 'new-report.html');
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Render demo posts immediately so feed is never blank
  allPosts = [...DEMO_POSTS];
  shownCount = 6;
  renderFeed();

  initCategoryPills();
  initSearch();
  initSort();
  initLoadMore();
  initNewReportBtn();

  // Load live data in parallel
  loadLivePosts();
});
