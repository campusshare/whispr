/**
 * Whispr — Search Module (search.html)
 * Handles: search input, category filter, Supabase vector search, rendering results
 */

'use strict';

const { Toast, API } = window.Whispr;

let currentFilter = 'all';
let isSearching = false;

/* ─── Helper ─── */
function setState(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
}

/* ─── Expose for popular-search buttons ─── */
window.runSearch = function (term) {
    const input = document.getElementById('main-search');
    if (input) input.value = term;
    performSearch(term);
};

/* ─── Category pills ─── */
document.querySelectorAll('.category-pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill[data-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        const input = document.getElementById('main-search');
        if (input?.value.trim()) performSearch(input.value.trim());
    });
});

/* ─── Search trigger ─── */
document.getElementById('btn-search')?.addEventListener('click', () => {
    const t = document.getElementById('main-search')?.value.trim();
    if (t) performSearch(t);
});

document.getElementById('main-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const t = e.target.value.trim();
        if (t) performSearch(t);
    }
});

/* ─── Perform Search ─── */
async function performSearch(query) {
    if (isSearching) return;
    isSearching = true;

    setState('default-state', false);
    setState('results-state', false);
    setState('loading-state', true);
    setState('empty-state', false);

    try {
        let results;

        // Setup exact match or semantic search via PostgREST
        const uCat = currentFilter === 'all' ? '' : `&category=eq.${currentFilter}`;
        const queryVal = encodeURIComponent(`%${query}%`);

        try {
            // Because we don't have the RPC pgvector function hooked up on the DB yet,
            // we will fallback to a standard Postgres ILIKE search on story/title.
            const url = `${window.SUPABASE_URL}/rest/v1/posts?select=*,users(alias)&or=(story_sanitized.ilike.${queryVal},story_original.ilike.${queryVal})${uCat}&order=created_at.desc&limit=20`;
            const res = await fetch(url, { headers: window.Whispr.API.headers() });
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();

            results = data.map(dbPost => ({
                id: dbPost.id,
                alias: dbPost.users?.alias || 'Anonymous',
                category: dbPost.category,
                title: 'Whispr Report', // Title is absorbed in story_sanitized for zero-trust
                excerpt: dbPost.story_sanitized || dbPost.story_original,
                time_ago: window.Whispr.Format.timeAgo(dbPost.created_at),
                location: dbPost.location || 'Unknown',
                relevance: 1.0,
                file_count: 0
            }));
        } catch (e) {
            console.error("Search Query Error:", e);
            results = [];
        }

        setState('loading-state', false);

        if (!results || results.length === 0) {
            setState('empty-state', true);
        } else {
            renderResults(results, query);
            setState('results-state', true);
        }

    } finally {
        isSearching = false;
    }
}

/* ─── Render results ─── */
function renderResults(results, query) {
    const countEl = document.getElementById('result-count');
    const termEl = document.getElementById('search-term-display');
    if (countEl) countEl.innerHTML = `Showing ${results.length} result${results.length !== 1 ? 's' : ''} for "<span class="text-accent" id="search-term-display">${escHtml(query)}</span>"`;
    if (termEl) termEl.textContent = query;

    const list = document.getElementById('results-list');
    if (!list) return;

    list.innerHTML = results.map(r => {
        const highlighted_title = highlight(r.title || '', query);
        const highlighted_excerpt = highlight(r.excerpt || '', query);
        return `
      <div class="result-item" onclick="location.href='post.html?id=${r.id}'" role="link" tabindex="0"
           onkeydown="if(event.key==='Enter') location.href='post.html?id=${r.id}'">
        <div class="result-icon" aria-hidden="true">${iconForCategory(r.category)}</div>
        <div class="result-body">
          <div class="flex gap-sm" style="margin-bottom:4px;flex-wrap:wrap">
            <span class="tag" style="font-size:.65rem">${labelForCategory(r.category)}</span>
            ${r.file_count ? `<span class="tag tag--muted text-xs">${r.file_count} file${r.file_count !== 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="result-title">${highlighted_title}</div>
          <div class="result-excerpt">${highlighted_excerpt}</div>
          <div class="result-meta">${r.alias || 'Anonymous'} · ${r.time_ago || 'recently'} · ${r.location || ''} ${r.relevance ? `· ${Math.round(r.relevance * 100)}% relevance` : ''}</div>
        </div>
      </div>`;
    }).join('');
}

/* ─── Highlight ─── */
function highlight(text, query) {
    const escaped = escReg(query.trim());
    return escHtml(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function iconForCategory(cat) {
    const map = { corruption: '💰', abuse: '🚨', trafficking: '⚠️', healthcare: '🏥', environment: '🌿', government: '🏛️', other: '📄' };
    return map[cat] || '📄';
}

function labelForCategory(cat) {
    const map = { corruption: '💰 Corruption', abuse: '🚨 Abuse', trafficking: '⚠️ Trafficking', healthcare: '🏥 Healthcare', environment: '🌿 Environment', government: '🏛️ Government' };
    return map[cat] || '📄 Other';
}

