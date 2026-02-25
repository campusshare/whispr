/**
 * Whispr — Video Reels Module (FULL INTERACTIONS)
 * videos.js: Full-screen video evidence reels with Like, Repost, and Comment.
 */
'use strict';

const SB_URL = 'https://liotabdrefkcudxbhswh.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E';

/* ── Interaction state ─────────────────────────────────── */
const vLiked = new Set(JSON.parse(localStorage.getItem('v_likes') || '[]'));
const vReposted = new Set(JSON.parse(localStorage.getItem('v_reposts') || '[]'));
const vSave = (k, s) => localStorage.setItem(k, JSON.stringify([...s]));

const fmt = n => { if (!n) return '0'; if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; return String(n); };

let DEMO_POSTS = [
  { id: 'vid-001', alias: 'SilentFalcon72', verified: true, category: 'corruption', likes: 142, reposts: 28, comments: 38, videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', excerpt: 'Video evidence of unauthorized resource extraction. Metadata sanitized and location stripped prior to upload.' },
  { id: 'vid-002', alias: 'NorthernWraith', verified: true, category: 'abuse', likes: 317, reposts: 63, comments: 92, videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', excerpt: 'Dashcam footage of checkpoints. Original audio removed and faces blurred to protect the source.' },
  { id: 'vid-003', alias: 'GhostPedal9', verified: false, category: 'healthcare', likes: 88, reposts: 7, comments: 24, videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', excerpt: 'Stockroom recording showing diverted supplies. Passed through backend moderation filter.' },
];

/* ── Render a single reel slide ────────────────────────── */
function renderReel(post) {
  const isL = vLiked.has(post.id);
  const isRe = vReposted.has(post.id);

  return `
  <div class="reel-slide" data-id="${post.id}">
    <video class="reel-video timeline-video" src="${post.videoUrl}" loop playsinline muted style="background:#1C1C1E;"></video>
    <div class="reel-overlay"></div>

    <div class="reel-actions">

      <!-- Like -->
      <button class="reel-action reel-like-btn${isL ? ' liked' : ''}" data-id="${post.id}" aria-label="Like">
        <div class="reel-action__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="${isL ? '#FF453A' : 'none'}" viewBox="0 0 24 24" stroke="${isL ? '#FF453A' : 'currentColor'}" stroke-width="2" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </div>
        <span class="reel-like-count" data-id="${post.id}">${fmt(post.likes)}</span>
      </button>

      <!-- Comment -->
      <button class="reel-action reel-comment-btn" data-id="${post.id}" aria-label="Comment">
        <div class="reel-action__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <span class="reel-comment-count" data-id="${post.id}">${fmt(post.comments)}</span>
      </button>

      <!-- Repost -->
      <button class="reel-action reel-repost-btn${isRe ? ' reposted' : ''}" data-id="${post.id}" aria-label="Repost">
        <div class="reel-action__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="${isRe ? '#30D158' : 'currentColor'}" stroke-width="2" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <span class="reel-repost-count" data-id="${post.id}" style="color:${isRe ? '#30D158' : ''}">${fmt(post.reposts)}</span>
      </button>

      <!-- Bookmark -->
      <button class="reel-action" aria-label="Save">
        <div class="reel-action__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </div>
        <span>Save</span>
      </button>
    </div>

    <!-- Caption -->
    <div class="reel-caption">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <div class="reel-caption__alias">${post.alias}${post.verified ? '<span style="color:#0A84FF;margin-left:4px;font-size:.85rem;">&#10003;</span>' : ''}</div>
        <span class="tag tag--info" style="font-size:.65rem;padding:2px 8px;">${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>
      </div>
      <div class="reel-caption__text">${post.excerpt}</div>
    </div>

    <!-- Comment drawer -->
    <div class="reel-comment-drawer" id="reel-cd-${post.id}"
      style="position:absolute;bottom:0;left:0;right:0;background:rgba(10,10,15,.95);backdrop-filter:blur(16px);border-radius:20px 20px 0 0;padding:16px;transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:20;max-height:55vh;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:700;font-size:.95rem;">Comments</span>
        <button class="reel-cd-close" data-id="${post.id}" style="background:none;border:none;color:#8E8E93;font-size:1.3rem;cursor:pointer;padding:0;">&times;</button>
      </div>
      <div class="reel-comment-list" id="reel-cl-${post.id}" style="flex:1;overflow-y:auto;margin-bottom:12px;min-height:60px;"></div>
      <div style="display:flex;gap:8px;">
        <input type="text" class="reel-ci form-input" id="reel-ci-${post.id}" placeholder="Add a comment…" style="flex:1;padding:9px 12px;font-size:.85rem;" maxlength="280">
        <button class="reel-cs" data-id="${post.id}" style="background:#0A84FF;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:600;cursor:pointer;font-size:.82rem;">Post</button>
      </div>
    </div>
  </div>`;
}

/* ── Comment helpers ───────────────────────────────────── */
function openCommentDrawer(postId) {
  const drawer = document.getElementById(`reel-cd-${postId}`);
  if (!drawer) return;
  drawer.style.transform = 'translateY(0)';
  loadReelComments(postId);
  setTimeout(() => document.getElementById(`reel-ci-${postId}`)?.focus(), 350);
}
function closeCommentDrawer(postId) {
  const drawer = document.getElementById(`reel-cd-${postId}`);
  if (drawer) drawer.style.transform = 'translateY(100%)';
}

const reelCommentCache = {};

async function loadReelComments(postId) {
  const list = document.getElementById(`reel-cl-${postId}`);
  if (!list) return;
  if (reelCommentCache[postId]) { list.innerHTML = reelCommentCache[postId]; return; }
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#8E8E93;font-size:.82rem;">Loading…</div>';
  try {
    const res = await fetch(`${SB_URL}/rest/v1/comments?post_id=eq.${postId}&select=body,alias,created_at&order=created_at.asc&limit=50`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }
    });
    const data = res.ok ? await res.json() : [];
    if (!data.length) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:#6E6E73;font-size:.8rem;">No comments yet. Be first.</div>';
      return;
    }
    const html = data.map(c => `
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="width:28px;height:28px;border-radius:50%;background:#0A84FF;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#000;flex-shrink:0;">${(c.alias || '?').charAt(0).toUpperCase()}</div>
        <div><div style="font-size:.78rem;font-weight:700;">${c.alias}</div><div style="font-size:.82rem;color:#aeaeb2;margin-top:2px;">${c.body}</div></div>
      </div>`).join('');
    list.innerHTML = html;
    reelCommentCache[postId] = html;
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:12px;color:#6E6E73;font-size:.8rem;">Could not load comments.</div>';
  }
}

async function submitReelComment(postId) {
  const input = document.getElementById(`reel-ci-${postId}`);
  const body = input?.value.trim();
  if (!body) return;
  const alias = window.Whispr?.Auth?.getAlias() || 'Anonymous';
  const userId = window.Whispr?.Auth?.getId();

  // Optimistic render
  const list = document.getElementById(`reel-cl-${postId}`);
  const existing = list?.querySelector('[style*="Loading"]') || list?.querySelector('[style*="No comments"]');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);';
  el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#0A84FF;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#000;flex-shrink:0;">${alias.charAt(0).toUpperCase()}</div><div><div style="font-size:.78rem;font-weight:700;">${alias}</div><div style="font-size:.82rem;color:#aeaeb2;margin-top:2px;">${body}</div></div>`;
  list?.appendChild(el);
  input.value = '';
  delete reelCommentCache[postId];

  // Count bump
  const countEl = document.querySelector(`.reel-comment-count[data-id="${postId}"]`);
  const post = DEMO_POSTS.find(p => p.id === postId);
  if (post) { post.comments++; if (countEl) countEl.textContent = fmt(post.comments); }

  try {
    await fetch(`${SB_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, user_id: userId, alias, body })
    });
  } catch { /* offline ok */ }
}

/* ── Main init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('videos-container');
  if (!container) return;

  container.innerHTML = DEMO_POSTS.map(renderReel).join('');

  /* ── Delegate all interactions ── */
  container.addEventListener('click', e => {
    // Like
    const likeBtn = e.target.closest('.reel-like-btn');
    if (likeBtn) {
      const id = likeBtn.dataset.id;
      const wasL = vLiked.has(id);
      wasL ? vLiked.delete(id) : vLiked.add(id);
      vSave('v_likes', vLiked);
      likeBtn.classList.toggle('liked', !wasL);
      const svg = likeBtn.querySelector('svg');
      if (svg) { svg.setAttribute('fill', !wasL ? '#FF453A' : 'none'); svg.setAttribute('stroke', !wasL ? '#FF453A' : 'currentColor'); }
      likeBtn.classList.add('pop'); setTimeout(() => likeBtn.classList.remove('pop'), 400);
      const post = DEMO_POSTS.find(p => p.id === id);
      if (post) {
        post.likes = Math.max(0, post.likes + (wasL ? -1 : 1));
        const s = container.querySelector(`.reel-like-count[data-id="${id}"]`);
        if (s) s.textContent = fmt(post.likes);
      }
      return;
    }
    // Comment open
    const commentBtn = e.target.closest('.reel-comment-btn');
    if (commentBtn) { openCommentDrawer(commentBtn.dataset.id); return; }
    // Comment close
    const closeBtn = e.target.closest('.reel-cd-close');
    if (closeBtn) { closeCommentDrawer(closeBtn.dataset.id); return; }
    // Comment submit
    const submitBtn = e.target.closest('.reel-cs');
    if (submitBtn) { submitReelComment(submitBtn.dataset.id); return; }
    // Repost
    const repostBtn = e.target.closest('.reel-repost-btn');
    if (repostBtn) {
      const id = repostBtn.dataset.id;
      const wasR = vReposted.has(id);
      wasR ? vReposted.delete(id) : vReposted.add(id);
      vSave('v_reposts', vReposted);
      repostBtn.classList.toggle('reposted', !wasR);
      const svg = repostBtn.querySelector('svg');
      if (svg) svg.setAttribute('stroke', !wasR ? '#30D158' : 'currentColor');
      const post = DEMO_POSTS.find(p => p.id === id);
      if (post) {
        post.reposts = Math.max(0, post.reposts + (wasR ? -1 : 1));
        const s = container.querySelector(`.reel-repost-count[data-id="${id}"]`);
        if (s) { s.textContent = fmt(post.reposts); s.style.color = !wasR ? '#30D158' : ''; }
      }
      return;
    }
  });

  // Enter key on comment input
  container.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('reel-ci')) {
      e.preventDefault();
      submitReelComment(e.target.id.replace('reel-ci-', ''));
    }
  });

  /* ── Mute toggle ── */
  let isMuted = true;
  const muteBtn = document.getElementById('global-mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      document.querySelectorAll('.timeline-video').forEach(v => { v.muted = isMuted; });
      muteBtn.innerHTML = isMuted
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
    });
  }

  /* ── Auto-play on scroll ── */
  setTimeout(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) { v.play().catch(() => { }); }
        else { v.pause(); }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.timeline-video').forEach(v => obs.observe(v));
  }, 500);
});
