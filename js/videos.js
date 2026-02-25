/**
 * Whispr — Video Reels Module
 * videos.js: Renders full-screen video evidence slides with Like button logic.
 */
'use strict';

let DEMO_POSTS = [
  {
    id: 'vid-post-001',
    alias: 'SilentFalcon72',
    category: 'corruption',
    excerpt: 'Video evidence of unauthorized resource extraction. Metadata has been completely sanitized and location data stripped prior to upload.',
    likes: 142,
    comments: 38,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    id: 'vid-post-002',
    alias: 'NorthernWraith',
    category: 'abuse',
    excerpt: 'Dashcam footage of checkpoints. Original audio removed and faces blurred to protect the identity of the source.',
    likes: 317,
    comments: 92,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  {
    id: 'vid-post-003',
    alias: 'GhostPedal9',
    category: 'healthcare',
    excerpt: 'Stockroom recording showing diverted supplies. This video has passed through the backend LLaMA moderation filter.',
    likes: 88,
    comments: 24,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  }
];

function renderReel(post) {
  return `
  <div class="reel-slide" data-id="${post.id}">
      <video class="reel-video timeline-video" src="${post.videoUrl}" loop playsinline muted style="background: #1C1C1E;"></video>
      <div class="reel-overlay"></div>

      <div class="reel-actions">
          
          <button class="reel-action engage-btn--like">
              <div class="reel-action__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
              </div>
              <span>${post.likes}</span>
          </button>

          <button class="reel-action">
              <div class="reel-action__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
              </div>
              <span>${post.comments}</span>
          </button>

          <button class="reel-action">
              <div class="reel-action__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="24" height="24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
              </div>
              <span>Save</span>
          </button>
      </div>

      <div class="reel-caption">
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <div class="reel-caption__alias">${post.alias}</div>
              <span class="tag tag--info" style="font-size: 0.65rem; padding: 2px 8px;">${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>
          </div>
          <div class="reel-caption__text">${post.excerpt}</div>
      </div>
  </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('videos-container');
  if (!container) return;

  // Render the Reels
  container.innerHTML = DEMO_POSTS.map(renderReel).join('');

  // Handle Like Button Interactivity
  container.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.engage-btn--like');
    if (likeBtn) {
      // Toggle red color state
      likeBtn.classList.toggle('liked');

      // Add pop animation
      likeBtn.classList.add('pop');
      setTimeout(() => likeBtn.classList.remove('pop'), 400);

      // Increment/Decrement the number
      const countSpan = likeBtn.querySelector('span');
      let count = parseInt(countSpan.textContent.replace(/,/g, ''));
      if (likeBtn.classList.contains('liked')) {
        count++;
      } else {
        count--;
      }
      countSpan.textContent = count;
    }
  });

  // Handle Global Mute Toggle
  let isMuted = true;
  const muteBtn = document.getElementById('global-mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      document.querySelectorAll('.timeline-video').forEach(vid => {
        vid.muted = isMuted;
      });
      // Update Icon
      muteBtn.innerHTML = isMuted
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>`;
    });
  }

  // Intersection Observer to Auto-Play/Pause Videos on Scroll
  setTimeout(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.timeline-video').forEach(video => {
      observer.observe(video);
    });
  }, 500);
});
