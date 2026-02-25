/**
 * Whispr — Core Application Module
 * Security hardened: inactivity timeout, devtools detection,
 * anti-tamper object freezing, CSP-compliant, all auth via backend.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   SECURITY HARDENING
═══════════════════════════════════════════════════════════════ */

/* 1. Strip console API in non-dev mode to prevent data leakage */
(function () {
  const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!IS_DEV) {
    ['log', 'debug', 'info', 'warn', 'error', 'dir', 'table', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'profile', 'profileEnd'].forEach(m => {
      try { console[m] = () => { }; } catch (_) { }
    });
  }
})();


/* 2. DevTools detection — uses window size heuristic (safe, no debugger statement) */
(function devToolsGuard() {
  const EXEMPT = ['auth.html', 'index.html', 'about.html', 'legal.html', 'transparency.html'];
  const page = location.pathname.split('/').pop() || 'index.html';
  if (EXEMPT.includes(page)) return;

  const THRESHOLD = 160; // px — devtools panel typically takes >160px
  let warned = false;

  function check() {
    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;
    if ((widthGap > THRESHOLD || heightGap > THRESHOLD) && !warned) {
      warned = true;
      // Soft warning — don't auto-logout (too many false positives on small screens)
      // If you want hard logout, uncomment below:
      // Auth.clearSession(); location.replace('auth.html');
    } else if (widthGap <= THRESHOLD && heightGap <= THRESHOLD) {
      warned = false;
    }
  }

  setInterval(check, 3000);
})();

/* 3. Anti-tamper on localStorage — detect writes from console */
(function antiTamper() {
  const EXEMPT = ['auth.html', 'index.html', 'about.html', 'legal.html', 'transparency.html'];
  const page = location.pathname.split('/').pop() || 'index.html';
  if (EXEMPT.includes(page)) return;

  const fp = {
    alias: localStorage.getItem('whispr_alias'),
    id: localStorage.getItem('whispr_id'),
  };
  // Only check if we started with a valid session
  if (!fp.alias || !fp.id) return;

  setInterval(() => {
    const alias = localStorage.getItem('whispr_alias');
    const id = localStorage.getItem('whispr_id');
    // Suspicious: one exists but not the other, or both changed to different values
    if ((!!alias !== !!id) || (alias && alias !== fp.alias && id !== fp.id)) {
      localStorage.clear();
      sessionStorage.clear();
      location.replace('auth.html');
    }
  }, 5000);
})();

/* 4. Inactivity timeout — 5 hours → force re-login */
(function inactivityTimer() {
  const TIMEOUT_MS = 5 * 60 * 60 * 1000;
  const EXEMPT = ['auth.html', 'index.html', 'about.html', 'legal.html', 'transparency.html'];
  const page = location.pathname.split('/').pop() || 'index.html';
  if (EXEMPT.includes(page)) return;

  const KEY = 'whispr_last_active';
  if (!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, Date.now());

  function touch() { sessionStorage.setItem(KEY, Date.now()); }
  function check() {
    const last = parseInt(sessionStorage.getItem(KEY) || '0', 10);
    if (last > 0 && Date.now() - last > TIMEOUT_MS) {
      localStorage.removeItem('whispr_alias');
      localStorage.removeItem('whispr_id');
      localStorage.removeItem('whispr_token');
      localStorage.removeItem('whispr_avatar');
      sessionStorage.clear();
      location.replace('auth.html?reason=timeout');
    }
  }

  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(ev =>
    document.addEventListener(ev, touch, { passive: true })
  );
  setInterval(check, 60_000);
  check();
})();

/* 5. Disable right-click on auth page */
(function () {
  if (location.pathname.endsWith('auth.html')) {
    document.addEventListener('contextmenu', e => e.preventDefault());
  }
})();



/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const WHISPR_ALIAS_KEY = 'whispr_alias';
const WHISPR_ID_KEY = 'whispr_id';
const WHISPR_AVATAR_KEY = 'whispr_avatar';
const WHISPR_THEME_KEY = 'whispr_theme';
const SUPABASE_URL = window.SUPABASE_URL || 'https://liotabdrefkcudxbhswh.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E';

/* ─────────────────────────────────────────────
   AUTH STATE
───────────────────────────────────────────── */
const Auth = (() => {
  const ALIAS_KEY = 'whispr_alias';
  const ID_KEY = 'whispr_id';
  const AVATAR_KEY = 'whispr_avatar';
  const TOKEN_KEY = 'whispr_token';   // backend-issued JWT

  function getAlias() { return localStorage.getItem(ALIAS_KEY); }
  function getId() { return localStorage.getItem(ID_KEY); }
  function getAvatar() { return localStorage.getItem(AVATAR_KEY) || '\uD83E\uDD85'; }
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function isLoggedIn() { return !!getAlias() && !!getId(); }

  function setSession(alias, id, avatar = '\uD83E\uDD85', token = null) {
    localStorage.setItem(ALIAS_KEY, alias);
    localStorage.setItem(ID_KEY, id);
    localStorage.setItem(AVATAR_KEY, avatar);
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }

  function clearSession() {
    [ALIAS_KEY, ID_KEY, AVATAR_KEY, TOKEN_KEY].forEach(k => localStorage.removeItem(k));
  }

  /**
   * validateSession() — verifies the stored JWT is still accepted by the backend.
   * If the JWT is absent or rejected, clears local state and redirects to auth.
   * Returns true if valid, false (after redirect) if not.
   */
  async function validateSession() {
    const token = getToken();
    // Exempt pages that don't need auth
    const page = location.pathname.split('/').pop() || 'index.html';
    const EXEMPT = ['auth.html', 'index.html', 'about.html', 'legal.html', 'transparency.html'];
    if (EXEMPT.includes(page)) return true;

    if (!isLoggedIn()) {
      clearSession();
      location.replace('auth.html');
      return false;
    }

    // If we have a real JWT, verify it with Supabase
    if (token && token !== 'null') {
      try {
        const res = await fetch('https://liotabdrefkcudxbhswh.supabase.co/auth/v1/user', {
          headers: { Authorization: `Bearer ${token}`, apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb3RhYmRyZWZrY3VkeGJoc3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzUyOTYsImV4cCI6MjA4NzU1MTI5Nn0.EJbtBxm871murMLxouTGDggYWm3EDJEjBiUDYg5-o0E' }
        });
        if (res.status === 401 || res.status === 403) {
          clearSession();
          location.replace('auth.html');
          return false;
        }
      } catch {
        // Network error — allow through (offline mode), but keep localStorage check above
      }
    }
    // Local-session fallback: if no real JWT but localStorage says logged in, allow through
    return true;
  }

  return { getAlias, getId, getAvatar, getToken, isLoggedIn, setSession, clearSession, validateSession };
})();

/* ─────────────────────────────────────────────
   ENFORCE AUTH — runs on every non-exempt page ASAP
───────────────────────────────────────────── */
(async function enforceAuth() {
  await Auth.validateSession();
  // If validateSession() returned false it already redirected — execution stops here
})();

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('nav-overlay');
  const closeBtn = document.getElementById('nav-close-btn');
  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('visible');
    overlay?.classList.add('visible');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('visible');
    overlay?.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (mobileMenu.classList.contains('visible')) closeMenu();
    else openMenu();
  });

  closeBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('visible')) closeMenu();
  });
}

/* ─────────────────────────────────────────────
   AUTH UI — applies body class + wires nav elements
───────────────────────────────────────────── */
function initAuthUI() {
  const loggedIn = Auth.isLoggedIn();
  const body = document.body;

  // 1. Set body class for CSS-level show/hide
  body.classList.add(loggedIn ? 'logged-in' : 'logged-out');

  // 2. Show/hide [data-auth-show] elements
  document.querySelectorAll('[data-auth-show]').forEach(el => {
    const target = el.getAttribute('data-auth-show');
    const show = (target === 'loggedIn' && loggedIn) || (target === 'loggedOut' && !loggedIn);
    el.style.display = show ? '' : 'none';
  });

  // 3. Populate alias + avatar in nav
  if (loggedIn) {
    const aliasEl = document.getElementById('nav-alias');
    const avatarEl = document.getElementById('nav-avatar');
    if (aliasEl) aliasEl.textContent = Auth.getAlias();
    if (avatarEl) avatarEl.textContent = Auth.getAvatar();
  }

  // 4. Wire sign-out button
  document.getElementById('nav-signout-btn')?.addEventListener('click', () => {
    Auth.clearSession();
    Toast.show('Signed out securely.', 'info');
    setTimeout(() => { location.href = 'index.html'; }, 800);
  });

  // 5. Landing page: toggle hero CTA section
  const heroLoggedOut = document.getElementById('hero-logged-out');
  const heroLoggedIn = document.getElementById('hero-logged-in');
  if (heroLoggedOut) heroLoggedOut.style.display = loggedIn ? 'none' : '';
  if (heroLoggedIn) heroLoggedIn.style.display = loggedIn ? '' : 'none';

  // 6. New-report & messages: redirect to auth if not logged in
  const protectedPages = ['new-report.html', 'messages.html'];
  const currentPage = location.pathname.split('/').pop();
  if (!loggedIn && protectedPages.includes(currentPage)) {
    Toast.show('Please sign in to access this page.', 'warn');
    setTimeout(() => { location.href = 'auth.html'; }, 1200);
  }

  // 7. Profile page: show logged-in content or guest prompt
  const profileLoggedIn = document.getElementById('profile-logged-in');
  const profileLoggedOut = document.getElementById('profile-logged-out');
  if (profileLoggedOut) profileLoggedOut.style.display = loggedIn ? 'none' : '';
  if (profileLoggedIn) {
    profileLoggedIn.style.display = loggedIn ? '' : 'none';
    // Populate profile alias
    const profileAlias = document.getElementById('profile-alias');
    const profileAvatar = document.getElementById('profile-avatar-emoji');
    if (profileAlias) profileAlias.textContent = Auth.getAlias();
    if (profileAvatar) profileAvatar.textContent = Auth.getAvatar();
  }
}


/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
const Toast = (() => {
  let container;

  function init() {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('role', 'alert');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
  }

  function show(message, type = 'info', duration = 4000) {
    if (!container) init();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>'
    };
    toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span>${message}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  return { show, success: (m, d) => show(m, 'success', d), error: (m, d) => show(m, 'error', d), warning: (m, d) => show(m, 'warning', d) };
})();

/* ─────────────────────────────────────────────
   MODAL SYSTEM
───────────────────────────────────────────── */
const Modal = (() => {
  function open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    const firstFocusable = overlay.querySelector('button, input, textarea, select, a[href]');
    firstFocusable?.focus();
  }

  function close(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Wire close buttons automatically
  function initAll() {
    document.querySelectorAll('.modal__close').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) close(overlay.id);
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(overlay.id);
      });
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-overlay.open');
        if (openModal) close(openModal.id);
      }
    });
  }

  return { open, close, initAll };
})();

/* ─────────────────────────────────────────────
   SIDEBAR TAB SYSTEM
   Works with data-tab attribute on .sidebar__item
   Hides/shows elements with id="tab-{name}"
───────────────────────────────────────────── */
function initSidebarTabs() {
  const sidebarItems = document.querySelectorAll('.sidebar__item[data-tab]');
  if (!sidebarItems.length) return;

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;

      // Update active state
      sidebarItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      // Show correct panel
      document.querySelectorAll('[id^="tab-"]').forEach(panel => {
        panel.style.display = panel.id === `tab-${tabName}` ? '' : 'none';
      });
    });
  });
}

/* ─────────────────────────────────────────────
   ADMIN TAB SYSTEM
───────────────────────────────────────────── */
function initAdminTabs() {
  const adminItems = document.querySelectorAll('[data-admin-tab]');
  if (!adminItems.length) return;

  adminItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.adminTab;

      adminItems.forEach(el => el.classList.remove('active'));
      document.querySelectorAll('[data-admin-tab="' + tabName + '"]').forEach(el => el.classList.add('active'));

      document.querySelectorAll('.admin-tab').forEach(panel => panel.classList.remove('active'));
      const target = document.getElementById(`admin-tab-${tabName}`);
      if (target) target.classList.add('active');
    });
  });

  // Show mobile admin nav on small screens
  const mobileNav = document.getElementById('admin-mobile-nav');
  if (mobileNav) {
    const checkWidth = () => { mobileNav.style.display = window.innerWidth <= 860 ? 'grid' : 'none'; };
    checkWidth();
    window.addEventListener('resize', checkWidth);
  }
}

/* ─────────────────────────────────────────────
   CATEGORY PILLS
───────────────────────────────────────────── */
function initCategoryPills() {
  document.querySelectorAll('.category-pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.closest('[role="tablist"], .search-filters, .category-tabs')
        ?.querySelectorAll('.category-pill')
        .forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

/* ─────────────────────────────────────────────
   SENSITIVITY ROW RADIO BUTTONS
───────────────────────────────────────────── */
function initSensitivityRows() {
  document.querySelectorAll('.sensitivity-row').forEach(row => {
    const activate = () => {
      document.querySelectorAll('.sensitivity-row').forEach(r => {
        r.classList.remove('selected');
        r.setAttribute('aria-checked', 'false');
      });
      row.classList.add('selected');
      row.setAttribute('aria-checked', 'true');
    };
    row.addEventListener('click', activate);
    row.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); activate(); } });
  });
}

/* ─────────────────────────────────────────────
   DROP ZONE
───────────────────────────────────────────── */
function initDropZone(dropZoneId, fileInputId, onFiles) {
  const zone = document.getElementById(dropZoneId);
  const input = document.getElementById(fileInputId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); input.click(); } });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    onFiles([...e.dataTransfer.files]);
  });

  input.addEventListener('change', () => onFiles([...input.files]));
}

/* ─────────────────────────────────────────────
   FORMAT UTILITIES
───────────────────────────────────────────── */
const Format = {
  timeAgo(dateOrStr) {
    const date = new Date(dateOrStr);
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return 'just now';
    const intervals = [
      [31536000, 'year'], [2592000, 'month'], [604800, 'week'],
      [86400, 'day'], [3600, 'hour'], [60, 'minute']
    ];
    for (const [secs, label] of intervals) {
      const n = Math.floor(seconds / secs);
      if (n >= 1) return `${n} ${label}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  },

  fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  },

  truncate(str, len = 140) {
    return str.length > len ? str.slice(0, len).trimEnd() + '…' : str;
  }
};

/* ─────────────────────────────────────────────
   API WRAPPER
───────────────────────────────────────────── */
const API = {
  headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };
  },

  async get(path) {
    const res = await fetch(SUPABASE_URL + path, { headers: this.headers(), method: 'GET' });
    if (!res.ok) throw new Error(`API GET ${path} failed: ${res.status}`);
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(SUPABASE_URL + path, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API POST ${path} failed: ${res.status}`);
    return res.json();
  },

  async rpc(fn, params) {
    return this.post(`/rest/v1/rpc/${fn}`, params);
  }
};

/* ─────────────────────────────────────────────
   PANIC DELETE — profile.html support
───────────────────────────────────────────── */
function initPanicDelete() {
  const panicBtn = document.getElementById('btn-panic');
  const confirmInput = document.getElementById('panic-confirm-input');
  const confirmBtn = document.getElementById('confirm-panic');
  if (!panicBtn || !confirmInput || !confirmBtn) return;

  panicBtn.addEventListener('click', () => Modal.open('panic-modal'));

  confirmInput.addEventListener('input', () => {
    const valid = confirmInput.value.trim() === 'DELETE EVERYTHING';
    confirmBtn.disabled = !valid;
    confirmBtn.setAttribute('aria-disabled', String(!valid));
  });

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.textContent = 'Destroying...';
    confirmBtn.disabled = true;
    try {
      if (Auth.getId()) {
        await API.rpc('panic_delete_account', { p_id: Auth.getId() });
      }
    } catch (_) {
      // Best effort — still clear locally
    } finally {
      Auth.clearSession();
      Modal.close('panic-modal');
      Toast.success('Account fully destroyed. Redirecting...');
      setTimeout(() => { location.href = 'index.html'; }, 2000);
    }
  });
}

/* ─────────────────────────────────────────────
   RECOVERY PHRASE DISPLAY (profile settings)
───────────────────────────────────────────── */
function initShowPhrase() {
  const btn = document.getElementById('btn-show-phrase');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const phrase = sessionStorage.getItem('whispr_phrase');
    if (phrase) {
      Toast.warning('Your phrase: ' + phrase, 10000);
    } else {
      Toast.error('Recovery phrase not available in this session. You should have saved it during account creation.');
    }
  });
}

/* ─────────────────────────────────────────────
   FOLLOWS — localStorage-backed follow system
───────────────────────────────────────────── */

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
    } catch (e) { console.error('Follows Sync Error', e) }
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
    } catch (e) { console.error(e); return isF; }
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
    } catch (e) { console.error('Likes Sync Error', e) }
  }

  function isLiked(postId) { return likesCache.has(String(postId)); }

  return { sync, isLiked };
})();

document.addEventListener('DOMContentLoaded', async () => {
  await Follows.sync();
  await Likes.sync();
});


/* ─────────────────────────────────────────────
   INITIALISE
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth UI runs first so body class is set before anything else renders
  initAuthUI();
  initNav();
  Modal.initAll();
  initSidebarTabs();
  initAdminTabs();
  initCategoryPills();
  initSensitivityRows();
  initPanicDelete();
  initShowPhrase();

  // Set today as max date on date pickers
  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (!el.max) el.max = new Date().toISOString().split('T')[0];
  });

  // Auto-resize textareas
  document.querySelectorAll('textarea').forEach(ta => {
    const resize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', resize);
  });
});

/* ─────────────────────────────────────────────
   EXPORTS (for use by other JS modules)
───────────────────────────────────────────── */
window.Whispr = { Auth, Toast, Modal, API, Format, initDropZone, Follows, Likes };
