import os
import re

with open('feed.html', 'r', encoding='utf-8') as f:
    feed_html = f.read()

# Make it specific to Videos
videos_html = feed_html.replace('<title>Public Feed — Whispr</title>', '<title>Video Evidence — Whispr</title>')
videos_html = videos_html.replace('meta name="description" content="Whispr Public Feed — Browse anonymous whistleblower reports and evidence."', 'meta name="description" content="Whispr Video Evidence — Watch and share whistleblower video evidence."')
videos_html = videos_html.replace('href="feed.html" class="nav__link active"', 'href="feed.html" class="nav__link"')
videos_html = videos_html.replace('href="videos.html" class="nav__link"', 'href="videos.html" class="nav__link active"')
videos_html = videos_html.replace('<script src="js/feed.js"></script>', '<script src="js/videos.js"></script>')
videos_html = videos_html.replace('id="feed-container"', 'id="videos-container"')

# Save new videos.html
with open('videos.html', 'w', encoding='utf-8') as f:
    f.write(videos_html)

# Now rewrite videos.js
with open('js/feed.js', 'r', encoding='utf-8') as f:
    feed_js = f.read()

new_demo_data = '''const DEMO_POSTS = [
  {
    id: 'vid-post-001',
    alias: 'SilentFalcon72',
    avatarColor: '#00d4aa',
    time: '4 minutes ago',
    category: 'education',
    sensitivity: 'high',
    title: 'Procurement funds diverted in regional school district over 2 years',
    excerpt: 'Multiple signed purchase orders indicate an organised scheme to redirect public school funds toward a shell company controlled by a district official. Documents obtained show over $2M in irregular payments.',
    likes: 142,
    comments: 38,
    bookmarks: 21,
    verified: true,
    hasMedia: true,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    id: 'vid-post-002',
    alias: 'NorthernWraith',
    avatarColor: '#3d9bff',
    time: '12 minutes ago',
    category: 'corruption',
    sensitivity: 'high',
    title: 'Police officers extorting transport workers at Accra checkpoints',
    excerpt: 'At least 6 officers stationed at three checkpoints have been documented demanding payments from commercial drivers. Dashcam footage shows cash exchanges in exchange for ignoring expired documents.',
    likes: 317,
    comments: 92,
    bookmarks: 54,
    verified: true,
    hasMedia: true,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  {
    id: 'vid-post-003',
    alias: 'GhostPedal9',
    avatarColor: '#ffa502',
    time: '1 hour ago',
    category: 'healthcare',
    sensitivity: 'medium',
    title: 'Hospital management selling donated medical supplies to private clinics',
    excerpt: 'Staff members at a regional hospital report that donations from international NGOs are being systematically diverted to private facilities owned by board members. Stockroom records provided.',
    likes: 88,
    comments: 24,
    bookmarks: 9,
    verified: false,
    hasMedia: true,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  },
  {
    id: 'vid-post-004',
    alias: 'VoidMaple33',
    avatarColor: '#ff4757',
    time: '2 hours ago',
    category: 'government',
    sensitivity: 'medium',
    title: 'Land title documents forged to clear forest reserve for construction',
    excerpt: 'Forged government land titles have been used to approve building permits on protected forest land. Stamp authentication codes on the documents do not match official registry entries.',
    likes: 205,
    comments: 47,
    bookmarks: 33,
    verified: true,
    hasMedia: true,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  }
];
'''

feed_js = re.sub(r"getElementById\('feed-container'\)", "getElementById('videos-container')", feed_js)
feed_js = re.sub(r"const DEMO_POSTS = \[.*?\];", new_demo_data, feed_js, flags=re.DOTALL)

old_media_section = r"const mediaSection = post\.hasMedia \? `.*?</div>` : '';"
new_media_section = '''const mediaSection = post.hasMedia ? `
    <div class="post-card__media-wrap" style="max-height: 500px; padding: 0 16px;">
      <video class="timeline-video" src="${post.videoUrl}" style="width: 100%; border-radius: 12px; max-height: 500px; background: #000;" controls loop muted playsinline></video>
    </div>` : '';'''

feed_js = re.sub(old_media_section, new_media_section, feed_js, flags=re.DOTALL)

observer_logic = '''
/* ─── Intersection Observer for Timeline Videos ─── */
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.5 });
        
        const observeVideos = () => {
            document.querySelectorAll('.timeline-video').forEach(video => {
                observer.observe(video);
            });
        };
        
        const container = document.getElementById('videos-container');
        if (container) {
            new MutationObserver(observeVideos).observe(container, { childList: true, subtree: true });
            observeVideos();
        }
    }, 500);
});
'''

with open('js/videos.js', 'w', encoding='utf-8') as f:
    f.write(feed_js + "\n" + observer_logic)

print("Rewrote videos.html and js/videos.js to use timeline layout")
