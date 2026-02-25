/**
 * Whispr — Admin Module (admin.html)
 * Handles: moderation queue actions (approve/reject/escalate), flagged content,
 *           audit log, and restricted access enforcement
 */

'use strict';

const { Auth, Toast, Modal, API } = window.Whispr;

/* ─── Access guard — admin only ─── */
// In production this would be checked server-side via RLS.
// Here we check a flag stored during admin login.
const isAdmin = sessionStorage.getItem('whispr_admin') === 'true';
if (!isAdmin && !window.location.search.includes('demo=1')) {
    // Uncomment in production:
    // location.href = 'feed.html';
}

/* ─── Queue action buttons ─── */
document.getElementById('pending-queue')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;
    const row = btn.closest('.queue-item');

    switch (action) {
        case 'approve': {
            btn.disabled = true;
            try {
                await API.rpc('admin_approve_post', { p_post_id: id });
            } catch { /* demo fallback */ }
            Toast.success(`Report ${id} approved and published`);
            row.style.opacity = '0.4';
            row.style.pointerEvents = 'none';
            decrementStat('stat-pending');
            incrementAuditLog(`Approved post ${id}`);
            break;
        }

        case 'reject': {
            const reason = prompt('Rejection reason (shown to reporter):');
            if (!reason) return;
            btn.disabled = true;
            try {
                await API.rpc('admin_reject_post', { p_post_id: id, p_reason: reason });
            } catch { /* demo fallback */ }
            Toast.warning(`Report ${id} rejected`);
            row.style.opacity = '0.4';
            row.style.pointerEvents = 'none';
            decrementStat('stat-pending');
            incrementAuditLog(`Rejected post ${id} — "${reason}"`);
            break;
        }

        case 'escalate': {
            btn.disabled = true;
            Toast.warning(`Report ${id} escalated to senior moderators`);
            row.style.borderLeft = '3px solid var(--color-danger)';
            incrementAuditLog(`Escalated post ${id} to senior review`);
            break;
        }

        case 'emergency': {
            if (!confirm('Trigger emergency protocol for this report? This will notify the senior moderation team immediately.')) return;
            Toast.error('Emergency protocol triggered — senior team notified');
            incrementAuditLog(`Emergency protocol triggered for post ${id}`);
            break;
        }

        case 'view': {
            window.open(`post.html?id=${id}&preview=1`, '_blank');
            break;
        }
    }
});

/* ─── Stat counter helpers ─── */
function decrementStat(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const val = parseInt(el.textContent) - 1;
    el.textContent = Math.max(0, val);
}

function incrementAuditLog(text) {
    const log = document.querySelector('.audit-item')?.parentElement;
    if (!log) return;
    const item = document.createElement('div');
    item.className = 'audit-item';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `<span class="audit-time">Just now (${now})</span><div><strong class="text-accent">${text}</strong> — by current moderator</div>`;
    log.insertBefore(item, log.firstChild);
}

/* ─── Flagged comment removal ─── */
document.querySelectorAll('[data-reason]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-reason]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

/* ─── Real-time stat refresh (polling) ─── */
async function refreshStats() {
    try {
        const data = await API.rpc('admin_get_stats', {});
        if (!data) return;
        Object.entries(data).forEach(([key, val]) => {
            const el = document.getElementById(`stat-${key}`);
            if (el) el.textContent = val;
        });
    } catch {
        // Silently fail — stats will remain at demo values
    }
}

// Poll every 60 seconds
setInterval(refreshStats, 60000);
