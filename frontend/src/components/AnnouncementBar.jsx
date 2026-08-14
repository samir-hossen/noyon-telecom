import { useEffect, useState } from 'react';
import { api } from '../api';

// Admin-editable scrolling notice (delivery/return policy, etc.) — see
// Admin > Settings. Text lives in the Setting table (utils/settings.js's
// getAnnouncement/setAnnouncement), same on/off + no-deploy-needed pattern
// as the online-payment toggle. Renders nothing until it's confirmed both
// enabled and non-empty, so there's no empty-bar flash on load.
export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    let current = true;
    api.get('/settings/public').then((d) => {
      if (current) setAnnouncement(d.announcement || null);
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  if (!announcement?.enabled || !announcement.text) return null;

  return (
    <div className="announcement-bar">
      <div className="announcement-track">
        <span className="announcement-text">{announcement.text}</span>
        {/* Exact duplicate, hidden from screen readers — the CSS animation
            scrolls by exactly half the track's width, so this second copy
            is what makes the loop seamless instead of snapping/blank. */}
        <span className="announcement-text" aria-hidden="true">{announcement.text}</span>
      </div>
    </div>
  );
}
