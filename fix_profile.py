"""Remove the stale old profile layout block from profile.html.
The old block starts at the <div class="profile-avatar-container"> line
that appears AFTER the closing </div><!-- /profile-logged-in --> comment,
and ends at the second </div></div> before </main>.
"""
import re, os

path = r'C:\Users\Maikano\Desktop\Whispr\profile.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Marker after the new layout ends
end_marker = '</div><!-- /profile-logged-in -->'
main_close = '</main>'

idx = html.find(end_marker)
main_idx = html.find(main_close, idx)

if idx == -1 or main_idx == -1:
    print('markers not found'); exit(1)

# The content between end_marker and </main> carries the old layout
between = html[idx + len(end_marker):main_idx]

# Build replacement — just whitespace + closing tags  </div> </main>
# We need to keep the </div> (closing page-body main) 
# Find the very last </div> before </main>
last_div = between.rfind('</div>')
if last_div == -1:
    print('no closing div found'); exit(1)
    
# Everything from the end_marker to (but not including) the last </div> before </main> is the junk
between_clean = between[last_div:]  # keep only the final </div>

new_html = html[:idx + len(end_marker)] + '\n\n    ' + between_clean.lstrip() + main_close + html[main_idx + len(main_close):]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print('Done. Removed old profile static layout block.')
