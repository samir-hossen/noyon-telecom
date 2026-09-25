import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Client-side navigation keeps the current scroll position by default, so
// clicking a footer link (Privacy Policy, Contact Us, Track order...) opened
// the new page still scrolled down at the footer. This sends every new page
// to the top, jumps to #anchors when a link has one, and puts the reader
// back where they were when they come back with the browser's Back button
// (main.jsx turns the browser's own restoration off, so it's handled here).
const positions = new Map();

// index.css sets `scroll-behavior: smooth` on <html>, which would otherwise
// turn every page change into a long animated slide up from the footer.
const jump = (top) => window.scrollTo({ top, left: 0, behavior: 'instant' });

export default function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navType = useNavigationType();
  const currentKey = useRef(key);

  // Remember how far down each history entry was scrolled. Reads the key
  // from a ref so a scroll caused by the page switch below is never saved
  // against the page being left.
  useEffect(() => {
    const save = () => positions.set(currentKey.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useLayoutEffect(() => {
    currentKey.current = key;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior: 'instant' });
        return;
      }
    }
    const target = navType === 'POP' ? positions.get(key) || 0 : 0;
    jump(target);
    if (target === 0) return;
    // Lazy-loaded pages and fetched data make the page short at first, so
    // keep retrying for a moment until it's tall enough to scroll back to.
    let tries = 0;
    let frame;
    const retry = () => {
      if (Math.abs(window.scrollY - target) < 2 || tries++ > 60) return;
      jump(target);
      frame = window.requestAnimationFrame(retry);
    };
    frame = window.requestAnimationFrame(retry);
    return () => window.cancelAnimationFrame(frame);
    // Only a change of page counts — query-string changes (Shop filters,
    // pagination) manage their own scrolling.
  }, [pathname, hash]);

  return null;
}
