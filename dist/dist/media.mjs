// Updating this revision avoids reusing the older large photos from browser caches.
export function assetUrl(src) {
  return src ? `${src}${src.includes('?') ? '&' : '?'}v=20261101-2` : '';
}
