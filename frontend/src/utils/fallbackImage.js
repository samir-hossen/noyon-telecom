// Small inline SVG placeholder shown via onError when a product photo
// 404s or the CDN path is broken — avoids the browser's ugly "broken
// image" icon and keeps card layout intact. No network request involved.
export const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f6f6f8'/%3E%3Cg fill='none' stroke='%23c7c9cf' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='140' y='90' width='120' height='220' rx='18'/%3E%3Cline x1='175' y1='130' x2='225' y2='130'/%3E%3Ccircle cx='200' cy='270' r='14'/%3E%3C/g%3E%3C/svg%3E";
