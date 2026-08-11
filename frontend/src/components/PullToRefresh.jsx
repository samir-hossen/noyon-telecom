import { useEffect, useRef, useState } from 'react';

// The site is installable as a PWA (see site.webmanifest, display:
// "standalone"), and standalone/home-screen mode has no browser chrome to
// drive the native "pull down to reload" gesture at all — that's true on
// both iOS and Android regardless of any CSS. This reimplements the
// gesture in JS so refresh-by-pulling still works once installed, and as a
// bonus it also works identically in a normal browser tab.
const PULL_THRESHOLD = 70; // px of downward pull before a release triggers reload
const MAX_PULL = 100; // visual cap so the indicator doesn't drag past the header

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const startX = useRef(null);
  const currentPull = useRef(0);
  // 'pending' = touch started at the top, not yet decided if this is a
  // vertical pull or a horizontal swipe (category chips / carousels also
  // live near the top of the page); 'pulling' = confirmed vertical pull;
  // 'rejected' = turned out to be horizontal or scroll wasn't at the top.
  const mode = useRef('idle');

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY > 0 || e.touches.length > 1) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      mode.current = 'pending';
    }

    function onTouchMove(e) {
      if (mode.current === 'idle' || mode.current === 'rejected' || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;

      if (mode.current === 'pending') {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          mode.current = 'rejected';
          return;
        }
        if (dy < 8) return; // not enough movement yet to tell intent
        mode.current = 'pulling';
      }

      if (dy <= 0 || window.scrollY > 0) {
        mode.current = 'rejected';
        currentPull.current = 0;
        setPull(0);
        return;
      }

      // Confirmed vertical pull at the top of the page — take over from
      // the browser's own scroll/rubber-band so it doesn't fight this.
      e.preventDefault();
      currentPull.current = Math.min(dy, MAX_PULL);
      setPull(currentPull.current);
    }

    function onTouchEnd() {
      if (mode.current !== 'pulling') {
        mode.current = 'idle';
        startY.current = null;
        return;
      }
      mode.current = 'idle';
      startY.current = null;
      if (currentPull.current >= PULL_THRESHOLD) {
        setRefreshing(true);
        window.location.reload();
      } else {
        currentPull.current = 0;
        setPull(0);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;

  const ready = refreshing || pull >= PULL_THRESHOLD;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: `translate(-50%, ${Math.max(pull - 46, -46)}px)`,
        zIndex: 2000,
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 4px 14px rgba(20, 20, 26, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: '2.5px solid var(--berry)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: ready ? 'ptr-spin 0.7s linear infinite' : 'none',
          transform: ready ? 'none' : `rotate(${(pull / PULL_THRESHOLD) * 360}deg)`,
        }}
      />
    </div>
  );
}
