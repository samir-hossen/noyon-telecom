import { useState } from 'react';

const CHANNELS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    href: 'https://wa.me/8801560047377?text=Hi%2C%20I%20need%20help%20with%20a%20wholesale%20order',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36a9.9 9.9 0 0 0 4.62 1.15h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.1c-.24.68-1.4 1.3-1.94 1.37-.5.07-1.12.1-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.33.02.52-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.29.4-.24.66-.15.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.13.07.72-.17 1.4Z"/>
      </svg>
    ),
  },
  {
    key: 'messenger',
    label: 'Messenger',
    color: '#0084FF',
    href: 'https://m.me/noyontelecom',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.15 2 11.27c0 2.9 1.44 5.49 3.7 7.19V22l3.38-1.86c.9.25 1.87.38 2.92.38 5.52 0 10-4.15 10-9.27S17.52 2 12 2Zm.99 12.49-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z"/>
      </svg>
    ),
  },
  {
    key: 'telegram',
    label: 'Telegram',
    color: '#26A5E4',
    href: 'https://t.me/noyontelecom_support',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M21.9 4.3 18.7 20c-.24.98-.87 1.22-1.76.76l-4.86-3.58-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.97 9.05-8.18c.39-.35-.09-.55-.6-.2L6.3 12.9l-4.87-1.52c-1.06-.33-1.08-1.06.22-1.57L20.6 3.02c.88-.32 1.65.2 1.3 1.28Z"/>
      </svg>
    ),
  },
];

export default function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="support-widget">
      {open && (
        <div className="support-menu">
          <div className="support-menu-title">Need help? Chat with us</div>
          {CHANNELS.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="support-channel"
              style={{ '--channel-color': c.color }}
            >
              <span className="support-channel-icon">{c.icon}</span>
              {c.label}
            </a>
          ))}
        </div>
      )}
      <div className="support-fab-row">
        {!open && <span className="support-fab-label">Chat with us</span>}
        <button className={`support-fab ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Contact support">
          {open ? (
            '✕'
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
              <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
              <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
              <path d="M19.5 19.5A5 5 0 0 1 14 22" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
